import React, { useState } from 'react';

interface YouTubeVideoProps {
  videoId: string;
  title?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  className?: string;
}

const YouTubeVideo: React.FC<YouTubeVideoProps> = ({
  videoId,
  title = 'YouTube video player',
  width = '100%',
  height = '480',
  autoplay = false,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(true);

  const src = `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}`;

  return (
    <div className={`youtube-video-container ${className}`}>
      {isLoading && (
        <div className="flex items-center justify-center bg-gray-100 animate-pulse" style={{ width, height }}>
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-text-secondary">Loading video...</p>
          </div>
        </div>
      )}
      <iframe
        width={width}
        height={height}
        src={src}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
        style={{ display: isLoading ? 'none' : 'block' }}
        className="rounded-lg shadow-lg"
      ></iframe>
    </div>
  );
};

export default YouTubeVideo;