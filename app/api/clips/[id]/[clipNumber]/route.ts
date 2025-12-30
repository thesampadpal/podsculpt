import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: { id: string; clipNumber: string } }
) {
  try {
    const { id, clipNumber } = params
    
    // Get submission to find clip path
    const { data: submission } = await supabase
      .from('submissions')
      .select(`clip_${clipNumber}_url`)
      .eq('id', id)
      .single()
    
    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }
    
    const clipUrl = submission[`clip_${clipNumber}_url` as keyof typeof submission] as string | null
    
    if (!clipUrl) {
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      )
    }
    
    // Check if file exists
    if (!fs.existsSync(clipUrl)) {
      return NextResponse.json(
        { error: 'Clip file not found' },
        { status: 404 }
      )
    }
    
    // Read and serve the file
    const fileBuffer = fs.readFileSync(clipUrl)
    const ext = path.extname(clipUrl).toLowerCase()
    
    // Determine content type
    const contentType = ext === '.mp4' 
      ? 'video/mp4' 
      : ext === '.mp3' 
      ? 'audio/mpeg' 
      : 'application/octet-stream'
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
    
  } catch (error) {
    console.error('Error serving clip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

