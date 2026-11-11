#!/usr/bin/env python3
"""Find new full music videos in YouTube's regular-upload feed.
Conservative title filter: only explicitly labelled music videos, never trailers.
Requires yt-dlp and ffmpeg. Runs without credentials for public videos.
"""
import json
import re
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'fresh' / 'audio'
MANIFEST = AUDIO / 'playlist.json'
FEED = 'https://www.youtube.com/feeds/videos.xml?playlist_id=UULFjZ31sAP7v7aXQCpNvdX0lg'
NS = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}
EXCLUDED = re.compile(r'\b(trailer|teaser|preview|shorts?|snippet|announcement|behind.the.scenes|instrumental|karaoke|lyric.video)\b', re.I)
MUSIC_VIDEO = re.compile(r'\bmusic\s+video\b', re.I)

def eligible(title):
    return bool(MUSIC_VIDEO.search(title)) and not EXCLUDED.search(title)

def clean_title(title):
    # Artists' titles are typically "Song ▶ [...] | Artist [Official Music Video]".
    title = re.split(r'\s*(?:▶|\|)', title, maxsplit=1)[0]
    title = re.sub(r'\s*\[[^\]]*music\s+video[^\]]*\]', '', title, flags=re.I)
    return title.strip(' \t-–—')[:120] or 'Music video'

def main():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    existing = manifest.get('tracks', [])
    if not isinstance(existing, list):
        raise ValueError('Invalid playlist manifest')
    request = urllib.request.Request(FEED, headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        xml = response.read(1024 * 1024)
    root = ET.fromstring(xml)
    candidates = []
    for entry in root.findall('a:entry', NS):
        video_id = entry.findtext('yt:videoId', default='', namespaces=NS)
        title = entry.findtext('a:title', default='', namespaces=NS)
        date = entry.findtext('a:published', default='', namespaces=NS)
        if re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id) and eligible(title):
            candidates.append((date, video_id, title))
    if not candidates:
        print('No explicitly labelled full music videos in the recent videos-only feed. Leaving playlist unchanged.')
        return
    candidates.sort(reverse=True)
    _, video_id, title = candidates[0]
    if existing and existing[0].get('id') == video_id:
        print('Latest music video is already present:', video_id)
        return
    present = next((track for track in existing if track.get('id') == video_id and (ROOT / track.get('src', '').lstrip('/')).is_file()), None)
    if present:
        item = present
    else:
        target = AUDIO / f'{video_id}.mp3'
        temporary = AUDIO / f'pending-{video_id}.%(ext)s'
        subprocess.run([sys.executable, '-m', 'yt_dlp', '--no-playlist', '--no-progress', '-x', '--audio-format', 'mp3', '--audio-quality', '5', '-o', str(temporary), f'https://www.youtube.com/watch?v={video_id}'], check=True, timeout=600)
        downloaded = AUDIO / f'pending-{video_id}.mp3'
        if not downloaded.is_file() or not (0 < downloaded.stat().st_size < 50_000_000):
            downloaded.unlink(missing_ok=True)
            raise ValueError('Downloaded audio is missing or exceeds 50 MB')
        downloaded.replace(target)
        item = {'id':video_id, 'title':clean_title(title), 'src':f'/fresh/audio/{video_id}.mp3'}
    tracks = [item] + [entry for entry in existing if entry.get('id') != video_id]
    MANIFEST.write_text(json.dumps({'tracks': tracks}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Updated latest music video:', video_id, item['title'])

if __name__ == '__main__':
    main()
