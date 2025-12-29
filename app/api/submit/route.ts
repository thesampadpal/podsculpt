import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { rssUrl } = await request.json()
    
    // Validate URL
    if (!rssUrl || typeof rssUrl !== 'string' || !rssUrl.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid RSS URL. Please provide a valid URL starting with http:// or https://' },
        { status: 400 }
      )
    }
    
    // Save to database
    const { data, error } = await supabase
      .from('submissions')
      .insert([
        { 
          rss_url: rssUrl,
          status: 'pending'
        }
      ])
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      // Provide more specific error messages
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database table not found. Please create the "submissions" table in Supabase.' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      submissionId: data.id 
    })
    
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}