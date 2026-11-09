import AVFoundation
import CoreImage
import AppKit
// segments: start, end, speed, mobile focus x
let segs:[(Double,Double,Double,Double,Double)]=[
 (434.0,436.0,1.25,0.62,0.50),
 (114.0,117.0,1.30,0.68,0.50),
 (458.7,460.7,1.20,0.33,0.68),
 (62.7,63.9,1.40,0.72,0.66),(63.9,65.1,0.55,0.66,0.60),(65.1,65.5,1.40,0.60,0.60),
 (327.5,328.7,1.10,0.34,0.30),
 (222.0,224.4,1.30,0.42,0.50)]
let src=AVURLAsset(url:URL(fileURLWithPath:"/Users/mymac/Desktop/00_AIM_AI_FILM_GENERIC_B_ROLL.mp4"))
let st=src.tracks(withMediaType:.video)[0]
let comp=AVMutableComposition()
let ct=comp.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!
var cur=CMTime.zero; var bounds:[(Double,Double,Double,Double)]=[]
let ts:CMTimeScale=600
for s in segs{
 let r=CMTimeRange(start:CMTime(seconds:s.0,preferredTimescale:ts),end:CMTime(seconds:s.1,preferredTimescale:ts))
 try! ct.insertTimeRange(r,of:st,at:cur)
 let nd=CMTime(seconds:(s.1-s.0)/s.2,preferredTimescale:ts)
 ct.scaleTimeRange(CMTimeRange(start:cur,duration:r.duration),toDuration:nd)
 let t0=cur.seconds; cur=cur+nd; bounds.append((t0,cur.seconds,s.3,s.4))
}
print("duration",cur.seconds)
func render(_ W:Int,_ H:Int,_ br:Int,_ out:String,_ poster:String){
 let usableH=996.0
 let vc=AVMutableVideoComposition(asset:comp){req in
  let t=req.compositionTime.seconds
  var fx=0.5; if let b=bounds.first(where:{t<$0.1}){fx=b.2+(b.3-b.2)*(t-b.0)/(b.1-b.0)}
  var ch=usableH, cw=ch*Double(W)/Double(H)
  if cw>1900{cw=1900;ch=cw*Double(H)/Double(W)}
  let x=fx*1920-cw/2, y=(1080-ch)/2
  var im=req.sourceImage.cropped(to:CGRect(x:max(0,min(1920-cw,x)),y:y,width:cw,height:ch))
  im=im.transformed(by:CGAffineTransform(translationX:-im.extent.minX,y:-im.extent.minY))
  let sc=Double(H)/ch
  im=im.transformed(by:CGAffineTransform(scaleX:sc,y:sc))
  im=im.applyingFilter("CIToneCurve",parameters:["inputPoint0":CIVector(x:0,y:0),"inputPoint1":CIVector(x:0.25,y:0.13),"inputPoint2":CIVector(x:0.5,y:0.44),"inputPoint3":CIVector(x:0.75,y:0.78),"inputPoint4":CIVector(x:1,y:1)])
  im=im.applyingFilter("CIColorControls",parameters:["inputSaturation":1.32,"inputContrast":1.06,"inputBrightness":-0.02])
  req.finish(with:im.cropped(to:CGRect(x:0,y:0,width:W,height:H)),context:nil)
 }
 vc.renderSize=CGSize(width:W,height:H); vc.frameDuration=CMTime(value:1,timescale:25)
 try? FileManager.default.removeItem(atPath:out)
 let rd=try! AVAssetReader(asset:comp)
 let ro=AVAssetReaderVideoCompositionOutput(videoTracks:[ct],videoSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
 ro.videoComposition=vc; rd.add(ro)
 let wr=try! AVAssetWriter(outputURL:URL(fileURLWithPath:out),fileType:.mp4); wr.shouldOptimizeForNetworkUse=true
 let wi=AVAssetWriterInput(mediaType:.video,outputSettings:[AVVideoCodecKey:AVVideoCodecType.h264,AVVideoWidthKey:W,AVVideoHeightKey:H,AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:br,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel,AVVideoMaxKeyFrameIntervalKey:50]])
 wi.expectsMediaDataInRealTime=false; wr.add(wi)
 rd.startReading(); wr.startWriting(); wr.startSession(atSourceTime:.zero)
 var first=true
 while let b=ro.copyNextSampleBuffer(){
  while !wi.isReadyForMoreMediaData{usleep(2000)}
  if first,let pb=CMSampleBufferGetImageBuffer(b){first=false
   let ci=CIImage(cvPixelBuffer:pb); let c=CIContext(); let cg=c.createCGImage(ci,from:ci.extent)!
   try! NSBitmapImageRep(cgImage:cg).representation(using:.jpeg,properties:[.compressionFactor:0.72])!.write(to:URL(fileURLWithPath:poster))}
  wi.append(b)
 }
 wi.markAsFinished(); let g=DispatchSemaphore(value:0); wr.finishWriting{g.signal()}; g.wait()
 print(out,rd.status.rawValue,wr.status.rawValue,wr.error as Any)
}
let D="/Users/mymac/Desktop/AIM Labs/assets/video/"
render(1280,720,1_900_000,D+"run.mp4",D+"run.jpg")
render(540,960,1_300_000,D+"run-m.mp4",D+"run-m.jpg")
