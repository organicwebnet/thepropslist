import React from 'react';

interface VideoPlayerProps {
  url: string;
  title: string;
}

export function VideoPlayer({ url, title }: VideoPlayerProps) {
  if (!url) return null;

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-[#0A0A0A] border border-gray-800">
      <video
        src={url}
        title={title}
        className="w-full h-full"
        controls
        controlsList="nodownload"
        playsInline
      >
        <track kind="captions" />
        Your browser does not support the video element.
      </video>
    </div>
  );
}