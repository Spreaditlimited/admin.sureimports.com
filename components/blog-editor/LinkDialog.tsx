'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Link as LinkIcon, ExternalLink } from 'lucide-react';

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, text?: string) => void;
  initialUrl?: string;
}

export const LinkDialog = ({
  isOpen,
  onClose,
  onSubmit,
  initialUrl = '',
}: LinkDialogProps) => {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setText('');
      setError('');
    }
  }, [isOpen, initialUrl]);

  const validateUrl = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setError('URL is required');
      return false;
    }

    // Allow relative URLs and common protocols
    if (value.startsWith('/') || value.startsWith('#')) {
      setError('');
      return true;
    }

    try {
      new URL(value);
      setError('');
      return true;
    } catch {
      // Try adding https:// prefix
      try {
        new URL(`https://${value}`);
        setError('');
        return true;
      } catch {
        setError('Please enter a valid URL');
        return false;
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let finalUrl = url.trim();

    if (!validateUrl(finalUrl)) return;

    // Auto-add https:// if no protocol specified
    if (!finalUrl.startsWith('/') && !finalUrl.startsWith('#') && !finalUrl.includes('://')) {
      finalUrl = `https://${finalUrl}`;
    }

    onSubmit(finalUrl, text.trim() || undefined);
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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Insert Link
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
              htmlFor="link-url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="link-url"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) validateUrl(e.target.value);
                }}
                placeholder="https://example.com"
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                  ${error
                    ? 'border-red-500 focus:ring-red-200 dark:focus:ring-red-900'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-200 dark:focus:ring-indigo-900 focus:border-indigo-500'
                  }
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                autoFocus
              />
              <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="link-text"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Link Text <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              id="link-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Click here"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to apply link to selected text
            </p>
          </div>

          {/* Quick Links */}
          <div className="pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setUrl('mailto:')}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setUrl('tel:')}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                Phone
              </button>
              <button
                type="button"
                onClick={() => setUrl('#')}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                Anchor
              </button>
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
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Insert Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

export default LinkDialog;
