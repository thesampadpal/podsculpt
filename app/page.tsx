'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()
  const [rssUrl, setRssUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Step 1: Save submission
      const submitResponse = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rssUrl })
      })
      
      // Check if response is actually JSON
      const contentType = submitResponse.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON:', await submitResponse.text())
        alert('Server error - check console')
        setLoading(false)
        return
      }
      
      const submitData = await submitResponse.json()
      
      if (!submitResponse.ok) {
        alert(`Error: ${submitData.error}`)
        setLoading(false)
        return
      }
      
      console.log('Submission saved:', submitData.submissionId)
      
      // Step 2: Process the RSS feed
      const processResponse = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submitData.submissionId })
      })
      
      const processContentType = processResponse.headers.get('content-type')
      if (!processContentType || !processContentType.includes('application/json')) {
        console.error('Process response is not JSON:', await processResponse.text())
        alert('Processing error - check console')
        setLoading(false)
        return
      }
      
      const processData = await processResponse.json()
      
      if (processResponse.ok) {
        // Redirect to results page
        router.push(`/results/${submitData.submissionId}`)
      } else {
        alert(`Processing error: ${processData.error}`)
      }
      
    } catch (error) {
      console.error('Error:', error)
      alert('Something went wrong. Check console.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" 
         style={{ background: 'linear-gradient(135deg, #1a1612 0%, #2a241f 25%, #3d3428 50%, #2a241f 75%, #1a1612 100%)' }}>
      
      <div className="bg-[#2a241f]/95 backdrop-blur-sm p-10 rounded-3xl shadow-2xl max-w-2xl w-full border border-[#AD6E30]/30">
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image 
            src="/PodSculpt.svg" 
            alt="PodSculpt" 
            width={200} 
            height={200}
            className="drop-shadow-2xl"
          />
        </div>
        
        {/* Headline */}
        <h1 className="text-5xl font-bold text-center mb-4 text-[#F5E6D3]">
          Turn Your Podcast Into<br/>
          <span className="bg-gradient-to-r from-[#AD6E30] via-[#C97D3A] to-[#AE9865] bg-clip-text text-transparent">
            Viral Clips
          </span>
        </h1>
        
        {/* Subheadline */}
        <p className="text-[#D4C4B0] text-center mb-8 text-lg">
          Get timestamped show notes + 3 ready-to-share video clips<br/>
          from any podcast RSS feed
        </p>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="url"
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            placeholder="Paste your podcast RSS feed URL"
            className="w-full px-6 py-4 bg-[#1a1612]/60 border-2 border-[#AD6E30]/40 rounded-2xl 
                     focus:ring-4 focus:ring-[#AD6E30]/20 focus:border-[#C97D3A] 
                     focus:outline-none transition-all text-[#F5E6D3] placeholder-[#AE9865]/60 text-lg"
            required
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white
                     bg-gradient-to-r from-[#AD6E30] via-[#C97D3A] to-[#D4A574]
                     hover:from-[#B8773A] hover:via-[#D48A4A] hover:to-[#E4B584]
                     disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-600
                     transform hover:scale-[1.02] active:scale-[0.98]
                     transition-all shadow-lg hover:shadow-[#AD6E30]/50"
          >
            {loading ? 'Processing...' : '✨ Get My Clips'}
          </button>
        </form>
        
        {/* Footer */}
        <p className="text-sm text-[#AE9865]/80 text-center mt-6">
          Built by <a href="https://twitter.com/sampad_ai" className="text-[#C97D3A] hover:text-[#D4A574] hover:underline transition-colors">@sampad_ai</a>
        </p>
      </div>
    </div>
  )
}