import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseRSSFeed } from '@/lib/rss-parser'
import { downloadAudio } from '@/lib/download-audio'
import { transcribeAudio } from '@/lib/transcribe'
import { generateShowNotes } from '@/lib/generate-notes'
import { selectClips } from '@/lib/select-clips'
import { createAllClips } from '@/lib/video-creator'

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
    
    // Update status to transcribing
    await supabase
      .from('submissions')
      .update({
        status: 'transcribing'
      })
      .eq('id', submissionId)
    
    // Transcribe the audio
    console.log('Starting transcription for:', audioFilePath)
    const transcript = await transcribeAudio(audioFilePath)
    
    if (!transcript) {
      await supabase
        .from('submissions')
        .update({
          status: 'failed',
          error_message: 'Transcription failed'
        })
        .eq('id', submissionId)
      
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 500 }
      )
    }
    
    // Save transcript to database
    await supabase
      .from('submissions')
      .update({
        transcript: transcript,
        status: 'transcribed'
      })
      .eq('id', submissionId)
    
    // Generate show notes
    await supabase
      .from('submissions')
      .update({
        status: 'generating_notes'
      })
      .eq('id', submissionId)
    
    console.log('Generating show notes...')
    const showNotes = await generateShowNotes(transcript, episode.title)
    
    if (!showNotes) {
      console.error('Failed to generate show notes')
    }
    
    // Save show notes to database
    await supabase
      .from('submissions')
      .update({
        show_notes: showNotes || 'Failed to generate show notes',
        status: 'notes_complete'
      })
      .eq('id', submissionId)
    
    // Select viral clips
    await supabase
      .from('submissions')
      .update({
        status: 'selecting_clips'
      })
      .eq('id', submissionId)
    
    console.log('Selecting clips...')
    const clips = await selectClips(transcript, episode.title)
    
    if (!clips || clips.length === 0) {
      console.error('Failed to select clips')
      // Continue anyway, we'll handle this later
    }
    
    // Save clips to database
    await supabase
      .from('submissions')
      .update({
        clips: clips || [],
        status: 'clips_selected'
      })
      .eq('id', submissionId)
    
    // Create video clips
    let videoPaths: string[] = []
    if (clips && clips.length > 0) {
      await supabase
        .from('submissions')
        .update({
          status: 'creating_videos'
        })
        .eq('id', submissionId)
      
      console.log('Creating video clips...')
      
      try {
        videoPaths = await createAllClips(audioFilePath, clips, submissionId)
        
        console.log(`Created ${videoPaths.length} video clips`)
        
        // For now, just save the local paths
        // Later we'll upload to Supabase Storage
        await supabase
          .from('submissions')
          .update({
            clip_1_url: videoPaths[0] || null,
            clip_2_url: videoPaths[1] || null,
            clip_3_url: videoPaths[2] || null,
            status: 'complete'
          })
          .eq('id', submissionId)
        
      } catch (error) {
        console.error('Video creation failed:', error)
        await supabase
          .from('submissions')
          .update({
            status: 'failed',
            error_message: 'Video creation failed'
          })
          .eq('id', submissionId)
      }
    }
    
    return NextResponse.json({
      success: true,
      episode: {
        title: episode.title,
        audioUrl: episode.audioUrl,
        transcriptLength: transcript.length,
        showNotes: showNotes,
        clipsSelected: clips?.length || 0,
        clipsCreated: videoPaths.length
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