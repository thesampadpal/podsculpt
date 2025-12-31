import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { rssUrl } = await request.json();

    if (!rssUrl) {
      return NextResponse.json(
        { error: 'RSS URL is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Create submission record
    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        rss_url: rssUrl,
        status: 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      );
    }

    // Trigger background processing (fire and forget)
    // We don't await this - it runs in the background
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://podsculpt.com'}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: submission.id })
    }).catch(error => {
      console.error('Failed to trigger processing:', error);
    });

    // Return immediately with submission ID
    return NextResponse.json({
      submissionId: submission.id,
      status: 'processing'
    });

  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}