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

# Iteration 2 hero film

`assets/video/run.mp4` (1280×720) and `run-m.mp4` (540×960, framing follows the action) are one hard-cut montage from the AIM film, with the speed ramp and grade baked in. Edit the cut list at the top of `tools/hero_film.swift`, then:

`swiftc -O tools/hero_film.swift -o /tmp/hero_film && /tmp/hero_film`

macOS only (AVFoundation + Core Image). Paths to the source film and output folder are at the top and bottom of the script.

# Section 03 ghost

`assets/video/why-run.mp4` is B-roll 1:43.8–1:47.9 at 0.8×, same grade as the hero film. `why-run.json` holds the runner's outline per frame:

`swiftc -O tools/ghost_contours.swift -o /tmp/ghost && /tmp/ghost assets/video/why-run.mp4 assets/video/why-run.json 0.6 0.64`

The last two numbers are a point on the player in the first frame. Uses macOS Vision person segmentation. Some frames come back incomplete; `motion.js` skips those for the ghost.

# Section 07 photo finish

`assets/video/photo-finish.jpg` is a real slit scan: one vertical slit of B-roll 1:49–1:57.5, read across time, then graded.

`swiftc -O tools/slit_scan.swift -o /tmp/slit && /tmp/slit SOURCE.mp4 out.jpg 0.6 6 109 117.5`

# Insights illustrations

`assets/notes/note-1.jpg` … `note-6.jpg` are drawn by `tools/note-grabs.html` from real AIM frames and the model JSON (knee angle, low-confidence detections, possession changes, ball-found rates, body-height scale are all computed there, not typed). To rebuild: serve the project, open http://127.0.0.1:5180/tools/note-grabs.html, and save each canvas as JPEG (the session used a headless-Chrome script that calls `canvas.toDataURL('image/jpeg', .82)`). `assets/notes/duel-f145-src.jpg` is frame 145 of `clip-01-duel.mp4`, matching the JSON exactly.
