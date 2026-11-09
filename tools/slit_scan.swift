// Photo-finish image: one vertical slit of a clip, read across time.
// usage: slit_scan <clip.mp4> <out.jpg> <slit x 0..1> <px per frame> [start s] [end s]
import AVFoundation
import AppKit
let A=CommandLine.arguments
let asset=AVURLAsset(url:URL(fileURLWithPath:A[1]))
let tr=asset.tracks(withMediaType:.video)[0]
let sx=Double(A[3])!, pw=Int(A[4])!
let t0=A.count>5 ? Double(A[5])! : 0, t1=A.count>6 ? Double(A[6])! : asset.duration.seconds
let rd=try! AVAssetReader(asset:asset)
rd.timeRange=CMTimeRange(start:CMTime(seconds:t0,preferredTimescale:600),end:CMTime(seconds:t1,preferredTimescale:600))
let o=AVAssetReaderTrackOutput(track:tr,outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
rd.add(o);rd.startReading()
var cols:[CGImage]=[]; let ci=CIContext()
while let b=o.copyNextSampleBuffer(){guard let p=CMSampleBufferGetImageBuffer(b) else{continue}
 let im=CIImage(cvPixelBuffer:p);let w=im.extent.width,h=im.extent.height
 if let g=ci.createCGImage(im,from:CGRect(x:sx*Double(w),y:0,width:Double(pw),height:Double(h))){cols.append(g)}}
let h=cols[0].height,W=cols.count*pw
let ctx=CGContext(data:nil,width:W,height:h,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
for(i,c)in cols.enumerated(){ctx.draw(c,in:CGRect(x:i*pw,y:0,width:pw,height:h))}
try! NSBitmapImageRep(cgImage:ctx.makeImage()!).representation(using:.jpeg,properties:[.compressionFactor:0.7])!.write(to:URL(fileURLWithPath:A[2]))
print(W,h)
