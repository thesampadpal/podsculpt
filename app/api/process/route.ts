import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseRSSFeed } from '@/lib/rss-parser'
import { downloadAudio } from '@/lib/download-audio'

export async function POST(request: Request) {
  try {
    const { submissionId } = await request.json()
    
    // Get submission from database
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()
    
    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }
    
    // Update status to processing
    await supabase
      .from('submissions')
      .update({ status: 'processing' })
      .eq('id', submissionId)
    
    // Parse RSS feed
    const episode = await parseRSSFeed(submission.rss_url)
    
    if (!episode) {
      await supabase
        .from('submissions')
        .update({ 
          status: 'failed',
          error_message: 'Could not parse RSS feed'
        })
        .eq('id', submissionId)
      
      return NextResponse.json(
        { error: 'Failed to parse RSS feed' },
        { status: 400 }
      )
    }
    
    // Save episode info to database
    await supabase
      .from('submissions')
      .update({
        episode_title: episode.title,
        episode_url: episode.audioUrl,
        status: 'downloading'
      })
      .eq('id', submissionId)
    
    // Download the audio file
    const audioFilePath = await downloadAudio(episode.audioUrl, submissionId)
    
    // Update status to downloaded
    await supabase
      .from('submissions')
      .update({
        status: 'downloaded'
      })
      .eq('id', submissionId)
    
    return NextResponse.json({
      success: true,
      episode: {
        title: episode.title,
        audioUrl: episode.audioUrl,
        localPath: audioFilePath
      }
    })
  } catch (error) {
    console.error('Processing error:', error)
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    )
  }
}