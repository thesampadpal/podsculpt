'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface Submission {
  id: string
  rss_url: string
  episode_title: string | null
  episode_url: string | null
  transcript: string | null
  show_notes: string | null
  clips: any[] | null
  status: string
  clip_1_url: string | null
  clip_2_url: string | null
  clip_3_url: string | null
  created_at: string
}

export default function ResultsPage() {
  const params = useParams()
  const id = params.id as string
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedShowNotes, setCopiedShowNotes] = useState(false)
  const [copiedTranscript, setCopiedTranscript] = useState(false)

  const copyToClipboard = async (text: string, type: 'showNotes' | 'transcript') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'showNotes') {
        setCopiedShowNotes(true)
        setTimeout(() => setCopiedShowNotes(false), 2000)
      } else {
        setCopiedTranscript(true)
        setTimeout(() => setCopiedTranscript(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  useEffect(() => {
    async function fetchSubmission() {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', id)
          .single()
  
        if (error) {
          throw new Error('Failed to fetch submission')
        }
        
        setSubmission(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
  
    if (id) {
      fetchSubmission()
      // Poll every 5 seconds if not complete
      const interval = setInterval(fetchSubmission, 5000)
      return () => clearInterval(interval)
    }
  }, [id])
   
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" 
           style={{ background: 'linear-gradient(135deg, #1a1612 0%, #2a241f 25%, #3d3428 50%, #2a241f 75%, #1a1612 100%)' }}>
        <div className="text-[#F5E6D3] text-xl">Loading...</div>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" 
           style={{ background: 'linear-gradient(135deg, #1a1612 0%, #2a241f 25%, #3d3428 50%, #2a241f 75%, #1a1612 100%)' }}>
        <div className="bg-[#2a241f]/95 backdrop-blur-sm p-10 rounded-3xl shadow-2xl max-w-2xl w-full border border-[#AD6E30]/30 text-center">
          <h1 className="text-2xl font-bold text-[#F5E6D3] mb-4">Error</h1>
          <p className="text-[#D4C4B0]">{error || 'Submission not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8" 
         style={{ background: 'linear-gradient(135deg, #1a1612 0%, #2a241f 25%, #3d3428 50%, #2a241f 75%, #1a1612 100%)' }}>
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-center mb-8">
          <Image 
            src="/PodSculpt.svg" 
            alt="PodSculpt" 
            width={150} 
            height={150}
            className="drop-shadow-2xl"
          />
        </div>

        {/* Episode Title */}
        {submission.episode_title && (
          <div className="bg-[#2a241f]/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl mb-6 border border-[#AD6E30]/30">
            <h1 className="text-3xl font-bold text-[#F5E6D3] mb-2">
              {submission.episode_title}
            </h1>
            <div className="text-sm text-[#AE9865]/80">
              Status: <span className="text-[#C97D3A]">{submission.status}</span>
            </div>
          </div>
        )}

        {/* Show Notes */}
        {submission.show_notes && (
          <div className="bg-[#2a241f]/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl mb-6 border border-[#AD6E30]/30 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#F5E6D3]">Show Notes</h2>
              <button
                onClick={() => copyToClipboard(submission.show_notes!, 'showNotes')}
                className="p-2 rounded-lg hover:bg-[#AD6E30]/20 transition-colors group"
                title="Copy to clipboard"
              >
                {copiedShowNotes ? (
                  <span className="text-[#C97D3A] text-sm font-medium">Copied!</span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#D4C4B0] group-hover:text-[#C97D3A] transition-colors"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-[#D4C4B0] whitespace-pre-wrap leading-relaxed">
              {submission.show_notes}
            </div>
          </div>
        )}

        {/* Clips */}
        {(submission.clips && submission.clips.length > 0) || submission.clip_1_url ? (
          <div className="bg-[#2a241f]/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl mb-6 border border-[#AD6E30]/30">
            <h2 className="text-2xl font-bold text-[#F5E6D3] mb-6">Video Clips</h2>
            
            <div className="space-y-6">
              {submission.clips?.map((clip, index) => (
                <div key={index} className="bg-[#1a1612]/60 p-6 rounded-2xl border border-[#AD6E30]/20">
                  <h3 className="text-xl font-semibold text-[#F5E6D3] mb-2">{clip.title}</h3>
                  <p className="text-[#AE9865] mb-3">{clip.hook}</p>
                  <div className="text-sm text-[#D4C4B0]">
                    Time: {Math.floor(clip.start_time / 60)}:{(clip.start_time % 60).toFixed(0).padStart(2, '0')} - 
                    {Math.floor(clip.end_time / 60)}:{(clip.end_time % 60).toFixed(0).padStart(2, '0')}
                  </div>
                  {(() => {
                    const clipUrl = submission[`clip_${index + 1}_url` as keyof Submission] as string | null
                    if (!clipUrl) return null
                    
                    // Convert local file path to a URL that can be accessed via API route
                    const isLocalPath = clipUrl.includes('\\') || clipUrl.startsWith('/')
                    const videoSrc = isLocalPath 
                      ? `/api/clips/${submission.id}/${index + 1}` 
                      : clipUrl
                    
                    return (
                      <div className="mt-4">
                        <video 
                          src={videoSrc}
                          controls
                          className="w-full rounded-xl"
                        />
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Transcript Preview */}
        {submission.transcript && (
          <div className="bg-[#2a241f]/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl mb-6 border border-[#AD6E30]/30 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-[#F5E6D3]">Transcript</h2>
              <button
                onClick={() => copyToClipboard(submission.transcript!, 'transcript')}
                className="p-2 rounded-lg hover:bg-[#AD6E30]/20 transition-colors group"
                title="Copy to clipboard"
              >
                {copiedTranscript ? (
                  <span className="text-[#C97D3A] text-sm font-medium">Copied!</span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#D4C4B0] group-hover:text-[#C97D3A] transition-colors"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-[#D4C4B0] max-h-96 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {submission.transcript.slice(0, 2000)}
                {submission.transcript.length > 2000 && '...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

