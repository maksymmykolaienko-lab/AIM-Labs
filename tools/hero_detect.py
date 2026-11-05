# Wide aerial clip: players are small, so use detection + tracking at high resolution (no pose).
import json, sys, cv2
from ultralytics import YOLO
src, out = sys.argv[1], sys.argv[2]
det = YOLO('yolo11m.pt')
cap = cv2.VideoCapture(src); W, H = cap.get(3), cap.get(4); fps = cap.get(cv2.CAP_PROP_FPS) or 25
r3 = lambda v: round(float(v), 4); frames = []
while True:
    ok, im = cap.read()
    if not ok: break
    im2 = cv2.resize(im, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    r = det.track(im2, persist=True, imgsz=1920, conf=0.15, classes=[0, 32], tracker='bytetrack.yaml', verbose=False, device='mps')[0]
    people, ball = [], None
    if r.boxes is not None and len(r.boxes):
        ids = r.boxes.id.tolist() if r.boxes.id is not None else [-1] * len(r.boxes)
        for b, c, cl, i in zip(r.boxes.xywhn.tolist(), r.boxes.conf.tolist(), r.boxes.cls.tolist(), ids):
            if int(cl) == 0: people.append([int(i), r3(b[0]), r3(b[1]), r3(b[2]), r3(b[3]), round(c, 2), []])
            elif c >= .3 and (ball is None or c > ball[4]): ball = [r3(b[0]), r3(b[1]), r3(b[2]), r3(b[3]), round(c, 2)]
    frames.append({'p': people, 'b': ball})
json.dump({'model': 'YOLO11m (COCO), ByteTrack', 'fps': fps, 'w': int(W), 'h': int(H), 'n': len(frames), 'frames': frames}, open(out, 'w'), separators=(',', ':'))
print('avg people', round(sum(len(f['p']) for f in frames) / len(frames), 1), 'ball', sum(1 for f in frames if f['b']))
