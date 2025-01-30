'use client'

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock } from 'lucide-react'
import Hls from 'hls.js'
import { useRef, useEffect } from 'react'

const VideoPlayer = ({ url }: { url: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls()
        hls.loadSource(url)
        hls.attachMedia(videoRef.current)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(e => console.log('Playback not started yet'))
        })

        return () => {
          hls.destroy()
        }
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = url
      }
    }
  }, [url])

  return (
    <video
      ref={videoRef}
      className="w-full h-full rounded-t-lg object-cover"
      controls
      preload="none"
      playsInline
      crossOrigin="anonymous"
      disablePictureInPicture={false}
      controlsList="nodownload"
      allowFullScreen
    >
      <track
        kind="subtitles"
        label="English"
        srcLang="en"
        src=""
        default
      />
      Your browser does not support the video tag.
    </video>
  )
}

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  title: string
  isCompleted: boolean
  onMarkAsWatched: () => void
}

export function VideoModal({ 
  isOpen, 
  onClose, 
  url, 
  title,
  isCompleted,
  onMarkAsWatched
}: VideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <div className="aspect-video w-full">
          <VideoPlayer url={url} />
        </div>
        <div className="p-4 bg-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500">Watched</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">Not watched yet</span>
              </>
            )}
          </div>
          {!isCompleted && (
            <Button onClick={onMarkAsWatched}>
              Mark as Watched
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 