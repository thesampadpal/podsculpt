import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clipNumber: string }> }
) {
  try {
    // Await the params
    const { id, clipNumber } = await params;
    
    const supabase = getSupabaseClient();

    // Get the clip video URL from storage
    const { data, error } = await supabase
      .storage
      .from('clips')
      .createSignedUrl(`${id}/clip_${clipNumber}.mp4`, 3600);

    if (error || !data) {
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Error fetching clip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clip' },
      { status: 500 }
    );
  }
}

