import React, { useState } from 'react';
import YouTubeVideo from './YouTubeVideo';
import { Search, Play } from 'lucide-react';

const VideoDemo: React.FC = () => {
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ'); // Default video
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError('');
  };

  const extractVideoId = (input: string): string | null => {
    // Match YouTube URL patterns
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    
    if (match && match[2].length === 11) {
      return match[2];
    } else if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
      // Input is already a video ID
      return input;
    }
    
    return null;
  };

  const loadVideo = () => {
    const extractedId = extractVideoId(inputValue);
    
    if (extractedId) {
      setVideoId(extractedId);
      setError('');
    } else {
      setError('Please enter a valid YouTube URL or video ID');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-card">
      <h2 className="text-2xl font-bold text-text-primary mb-6">YouTube Video Player</h2>
      
      <div className="mb-6">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Enter YouTube URL or video ID"
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && loadVideo()}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <button
            onClick={loadVideo}
            className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 flex items-center space-x-2"
          >
            <Play className="h-5 w-5" />
            <span>Load Video</span>
          </button>
        </div>
        {error && (
          <p className="mt-2 text-red-500 text-sm">{error}</p>
        )}
      </div>
      
      <div className="rounded-lg overflow-hidden">
        <YouTubeVideo videoId={videoId} height={480} />
      </div>
      
      <div className="mt-4 text-sm text-text-secondary">
        <p>Examples:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>YouTube URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
          <li>Short URL: https://youtu.be/dQw4w9WgXcQ</li>
          <li>Video ID: dQw4w9WgXcQ</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoDemo;