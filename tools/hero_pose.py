# Run an off-the-shelf pose + detection model over hero clips and export per-frame JSON.
# usage: venv/bin/python infer.py <clip.mp4> <out.json> [imgsz]
import json, sys
import cv2
from ultralytics import YOLO

src, out = sys.argv[1], sys.argv[2]
imgsz = int(sys.argv[3]) if len(sys.argv) > 3 else 960

pose = YOLO('yolo11m-pose.pt')
det = YOLO('yolo11m.pt')

cap = cv2.VideoCapture(src)
W, H = cap.get(3), cap.get(4)
fps = cap.get(cv2.CAP_PROP_FPS) or 25
frames = []
r3 = lambda v: round(float(v), 4)

while True:
    ok, im = cap.read()
    if not ok:
        break
    res = pose.track(im, persist=True, imgsz=imgsz, conf=0.25, iou=0.5, tracker='bytetrack.yaml', verbose=False, device='mps')[0]
    people = []
    if res.boxes is not None and len(res.boxes):
        ids = res.boxes.id.tolist() if res.boxes.id is not None else [-1] * len(res.boxes)
        kps = res.keypoints.data.tolist() if res.keypoints is not None else [[]] * len(res.boxes)
        for b, c, i, k in zip(res.boxes.xywhn.tolist(), res.boxes.conf.tolist(), ids, kps):
            flat = []
            for (x, y, kc) in k:
                flat += [r3(x / W), r3(y / H), round(float(kc), 2)]
            people.append([int(i), r3(b[0]), r3(b[1]), r3(b[2]), r3(b[3]), round(float(c), 2), flat])
    d = det(im, imgsz=imgsz, conf=0.12, classes=[32], verbose=False, device='mps')[0]
    ball = None
    if d.boxes is not None and len(d.boxes):
        j = int(d.boxes.conf.argmax())
        bb = d.boxes.xywhn[j].tolist()
        ball = [r3(bb[0]), r3(bb[1]), r3(bb[2]), r3(bb[3]), round(float(d.boxes.conf[j]), 2)]
    frames.append({'p': people, 'b': ball})

json.dump({'model': 'YOLO11m-pose + YOLO11m (COCO), ByteTrack', 'fps': fps, 'w': int(W), 'h': int(H), 'n': len(frames), 'frames': frames},
          open(out, 'w'), separators=(',', ':'))
nb = sum(1 for f in frames if f['b'])
print(src.split('/')[-1], len(frames), 'frames;', 'avg people', round(sum(len(f['p']) for f in frames) / max(1, len(frames)), 1), '; ball in', nb)
