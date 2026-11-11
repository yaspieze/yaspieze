# Optional music automation

This is prepared but is not active until the repository owner enables the workflow below. It checks the regular-video-only YouTube feed hourly. It downloads the newest item whose title explicitly contains `music video` and does not contain trailer, teaser, preview, short, snippet, announcement, behind-the-scenes, instrumental, karaoke, or lyric video. Videos not titled this way are intentionally skipped; classification by title cannot guarantee perfect results. The YouTube playlist feed is unofficial and can change, and YouTube/yt-dlp may temporarily block downloads. Failed runs leave the old playlist untouched. Downloads and Git history consume repository space over time.

1. Create a fine-grained GitHub personal access token limited to this repository with **Contents: Read and write**, and an expiration date. Do not share it in chat or commit it. The separate token is needed so the resulting push can trigger the repository's Pages build; pushes made using the built-in GITHUB_TOKEN may not trigger other workflows.
2. Add it in the repository's **Settings → Secrets and variables → Actions → New repository secret** with the name `MUSIC_UPDATE_TOKEN`.
3. On GitHub, add a file named `.github/workflows/update-music.yml` containing the contents of `automation/update-music-workflow.yml` from this repository. Commit it to `main` using the GitHub editor. This step is necessary because the existing deployment credential cannot create workflows.
4. In **Actions**, open **Update background music** and choose **Run workflow** to test it. Confirm the job succeeds and that GitHub Pages deploys a resulting update. Subsequent checks run hourly (GitHub can delay scheduled jobs).

No automation can guarantee unmuted autoplay in every browser. When autoplay is blocked, the visitor can press the speaker button. New audio is only published after a successful run and site deployment.
