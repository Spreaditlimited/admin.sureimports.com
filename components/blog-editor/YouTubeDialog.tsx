'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Youtube } from 'lucide-react';

interface YouTubeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

export const YouTubeDialog = ({
  isOpen,
  onClose,
  onSubmit,
}: YouTubeDialogProps) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setError('');
      setVideoId(null);
    }
  }, [isOpen]);

  const extractVideoId = (inputUrl: string): string | null => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = inputUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError('');

    if (value.trim()) {
      const id = extractVideoId(value.trim());
      setVideoId(id);
      if (!id) {
        setError('Invalid YouTube URL');
      }
    } else {
      setVideoId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    const id = extractVideoId(url.trim());
    if (!id) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    // Submit the full embed URL
    onSubmit(`https://www.youtube.com/embed/${id}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !mounted) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Insert YouTube Video
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="youtube-url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              YouTube URL <span className="text-red-500">*</span>
            </label>
            <input
              id="youtube-url"
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                ${error
                  ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-200 dark:focus:ring-indigo-900 focus:border-indigo-500'
                }
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supports: youtube.com/watch, youtu.be, shorts, and embed URLs
            </p>
          </div>

          {/* Preview */}
          {videoId && (
            <div className="rounded-lg overflow-hidden bg-gray-900">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                  title="YouTube video preview"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Sample URLs */}
          <div className="pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Supported formats:
            </p>
            <div className="space-y-1 text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <p>youtube.com/watch?v=VIDEO_ID</p>
              <p>youtu.be/VIDEO_ID</p>
              <p>youtube.com/shorts/VIDEO_ID</p>
              <p>youtube.com/embed/VIDEO_ID</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!videoId}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Insert Video
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

export default YouTubeDialog;
