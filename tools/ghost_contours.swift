// Per-frame outline of one player, from macOS Vision person segmentation.
// usage: ghost_contours <clip.mp4> <out.json> <startX 0..1> <startY 0..1>  (start point: on the player in frame 0, top-left origin)
import AVFoundation
import Vision
import Foundation
let A=CommandLine.arguments
let asset=AVURLAsset(url:URL(fileURLWithPath:A[1]))
let track=asset.tracks(withMediaType:.video)[0]
let rd=try! AVAssetReader(asset:asset)
let out=AVAssetReaderTrackOutput(track:track,outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
rd.add(out); rd.startReading()
var cx=Double(A[3])!, cy=1-Double(A[4])!
var frames:[[Double]]=[]; var centers:[[Double]]=[]; var miss=0
while let sb=out.copyNextSampleBuffer(){
 guard let pb=CMSampleBufferGetImageBuffer(sb) else{continue}
 let seg=VNGeneratePersonSegmentationRequest(); seg.qualityLevel = .accurate; seg.outputPixelFormat=kCVPixelFormatType_OneComponent8
 try! VNImageRequestHandler(cvPixelBuffer:pb).perform([seg])
 guard let mask=seg.results?.first?.pixelBuffer else{frames.append(frames.last ?? []);centers.append([cx,1-cy]);miss+=1;continue}
 let cr=VNDetectContoursRequest(); cr.contrastAdjustment=1; cr.detectsDarkOnLight=false; cr.maximumImageDimension=768
 try! VNImageRequestHandler(cvPixelBuffer:mask).perform([cr])
 var best:(VNContour,Double,Double)?=nil; var bd=1e9
 for c in cr.results?.first?.topLevelContours ?? []{
  let p=c.normalizedPoints; if p.count<20{continue}
  var x0=9.0,x1=(-9.0),y0=9.0,y1=(-9.0)
  for q in p{x0=min(x0,Double(q.x));x1=max(x1,Double(q.x));y0=min(y0,Double(q.y));y1=max(y1,Double(q.y))}
  if y1-y0<0.1{continue}
  let mx=(x0+x1)/2,my=(y0+y1)/2; let d=abs(mx-cx)+abs(my-cy)*0.5
  if d<bd{bd=d;best=(c,mx,my)}
 }
 guard let b=best,bd<0.2,let ap=try? b.0.polygonApproximation(epsilon:0.0012) else{frames.append(frames.last ?? []);centers.append([cx,1-cy]);miss+=1;continue}
 cx=b.1;cy=b.2
 var f:[Double]=[]; for q in ap.normalizedPoints{f.append((Double(q.x)*1000).rounded()/1000);f.append(((1-Double(q.y))*1000).rounded()/1000)}
 frames.append(f); centers.append([(cx*1000).rounded()/1000,((1-cy)*1000).rounded()/1000])
}
let data=try! JSONSerialization.data(withJSONObject:["fps":25,"n":frames.count,"c":centers,"p":frames])
try! data.write(to:URL(fileURLWithPath:A[2]))
print("frames",frames.count,"missed",miss,"bytes",data.count)
