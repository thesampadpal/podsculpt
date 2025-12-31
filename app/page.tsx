'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [rssUrl, setRssUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const router = useRouter();

  // Poll for status updates
  useEffect(() => {
    if (!submissionId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status/${submissionId}`);
        const data = await response.json();

        setStatus(data.status);

        if (data.status === 'completed') {
          // Redirect to results page
          router.push(`/results/${submissionId}`);
        } else if (data.status === 'failed') {
          setError('Processing failed. Please try again.');
          setLoading(false);
          setSubmissionId(null);
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(pollStatus, 3000);
    
    // Initial check
    pollStatus();

    return () => clearInterval(interval);
  }, [submissionId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rssUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmissionId(data.submissionId);
      setStatus(data.status);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return 'Processing your podcast... This may take a few minutes.';
      case 'completed':
        return 'Complete! Redirecting...';
      case 'failed':
        return 'Processing failed.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            PodSculpt
          </h1>
          <p className="text-xl text-gray-300">
            Turn Your Podcast Into Viral Video Clips
          </p>
          <p className="text-gray-400 mt-2">
            Get time-stamped show notes and 3 viral moment clips with captions in minutes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="rss" className="block text-sm font-medium text-gray-300 mb-2">
              Podcast RSS Feed URL
            </label>
            <input
              id="rss"
              type="url"
              required
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://feeds.example.com/podcast"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {status && (
            <div className="bg-blue-500/10 border border-blue-500 text-blue-400 px-4 py-3 rounded-lg">
              {getStatusMessage()}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? 'Processing...' : 'Process Podcast'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-400">
          Built by{' '}
          <a
            href="https://twitter.com/sampad_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300"
          >
            @sampad_ai
          </a>
        </div>
      </div>
    </div>
  );
}