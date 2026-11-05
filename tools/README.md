# Hero machine layer — how the data is made

The hero plays real clips from the AIM film. The machine layer is drawn from per-frame
model output stored next to each clip (`assets/video/<clip>.json`).

1. Cut a clip (macOS built-in, H.264 720p):
   `avconvert -s SOURCE.mp4 -o assets/video/clip-05-name.mp4 -p Preset1280x720 --start 123.4 --duration 8`
2. Poster: first frame saved as `assets/video/clip-05-name.jpg`.
3. Model data (needs `pip install ultralytics lap`; weights download on first run):
   - close/medium shots (pose + tracking + ball): `python tools/hero_pose.py assets/video/clip.mp4 assets/video/clip.json 960`
   - wide aerial shots (detection + tracking + ball): `python tools/hero_detect.py assets/video/clip.mp4 assets/video/clip.json`
4. Add the clip to `CLIPS` in `hero.js` and a button in the `.reel` block of `index.html`.

Model: off-the-shelf YOLO11 (pose / COCO detection) + ByteTrack. It is shown on the site as
an illustration of the machine view — not as an AIM Labs validated result.
