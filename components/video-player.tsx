'use client'

interface VideoPlayerProps {
  videoUrl: string
  title?: string
}

export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  return (
    <div className="my-4">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      )}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <video
          controls
          className="w-full max-w-lg h-auto"
          preload="metadata"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Generated video • Click to play
      </p>
    </div>
  )
}