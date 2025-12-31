import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { parseRSSFeed } from '@/lib/rss-parser';
import { downloadAudio } from '@/lib/download-audio';
import { transcribeAudio } from '@/lib/transcribe';
import { generateShowNotes } from '@/lib/generate-notes';
import { selectClips } from '@/lib/select-clips';
import { createAllClips } from '@/lib/video-creator';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export const maxDuration = 300; // 5 minutes for processing

export async function POST(request: NextRequest) {
  const processingId = randomUUID();
  
  // Use /tmp for Vercel serverless functions
  const tempDir = path.join('/tmp', processingId);
  
  try {
    const { submissionId } = await request.json();
    
    const supabase = getSupabaseClient();

    // Get submission
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      throw new Error('Submission not found');
    }

    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Update status
    await supabase
      .from('submissions')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', submissionId);

    // 1. Parse RSS feed (returns latest episode directly)
    const latestEpisode = await parseRSSFeed(submission.rss_url);
    if (!latestEpisode) {
      throw new Error('No episodes found in RSS feed');
    }

    // 2. Download audio
    const audioPath = path.join(tempDir, 'episode.mp3');
    await downloadAudio(latestEpisode.audioUrl, audioPath);

    // 3. Transcribe
    const transcription = await transcribeAudio(audioPath);
    if (!transcription) {
      throw new Error('Transcription failed');
    }

    // 4. Generate show notes
    const showNotes = await generateShowNotes(transcription.text, latestEpisode.title);

    // 5. Select clips
    const clips = await selectClips(transcription.text, latestEpisode.title);
    if (!clips || clips.length === 0) {
      throw new Error('No clips selected');
    }

    // 6. Create video clips
    const videoFiles = await createAllClips(
      audioPath,
      clips,
      randomUUID(),
      transcription.words
    );

    // 7. Upload videos to Supabase Storage
    const clipUrls: string[] = [];
    
    for (let i = 0; i < videoFiles.length; i++) {
      const videoPath = videoFiles[i];
      const videoBuffer = fs.readFileSync(videoPath);
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('clips')
        .upload(`${submissionId}/clip_${i + 1}.mp4`, videoBuffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('clips')
        .getPublicUrl(`${submissionId}/clip_${i + 1}.mp4`);
      
      clipUrls.push(urlData.publicUrl);
    }

    // 8. Save results to database
    await supabase
      .from('submissions')
      .update({
        status: 'completed',
        episode_title: latestEpisode.title,
        show_notes: showNotes,
        clips: clips,
        clip_urls: clipUrls,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    return NextResponse.json({ 
      success: true,
      submissionId,
      clipUrls
    });

  } catch (error) {
    console.error('Processing error:', error);

    // Cleanup temp files on error
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    // Update status to failed
    const supabase = getSupabaseClient();
    let submissionId: string | undefined;
    try {
      const body = await request.json();
      submissionId = body.submissionId;
    } catch {
      // Request body already consumed
    }
    
    if (submissionId) {
      await supabase
        .from('submissions')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}