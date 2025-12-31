import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
})

interface Clip {
  start_time: number  // seconds
  end_time: number    // seconds
  title: string
  hook: string
}

export async function selectClips(transcript: string, episodeTitle: string): Promise<Clip[] | null> {
  try {
    console.log('Selecting viral clips with Groq...')
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a social media expert for podcasters. Identify engaging 30-60 second moments that would work as standalone viral clips.'
        },
        {
          role: 'user',
          content: `Analyze this podcast transcript and identify the 3 most engaging moments for social media clips.

Episode: ${episodeTitle}

Transcript:
${transcript.slice(0, 12000)}

Criteria for clips:
- 30-60 seconds long
- Complete thought (not cut off mid-sentence)
- Surprising, controversial, or valuable insight
- Hook within first 5 seconds
- Works as standalone content

Return ONLY valid JSON (no markdown, no explanation):
{
  "clips": [
    {
      "start_time": 120,
      "end_time": 165,
      "title": "Why AI will replace developers",
      "hook": "The surprising prediction nobody expected"
    }
  ]
}

Estimate timestamps based on natural conversation pacing (150-180 words per minute).`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 800
    })
    
    const response = completion.choices[0]?.message?.content
    
    if (!response) {
      console.error('No response from Groq')
      return null
    }
    
    // Clean the response - remove markdown code blocks
    const cleanedResponse = response
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    
    // Parse JSON response
    const parsed = JSON.parse(cleanedResponse)
    console.log('Clips selected:', parsed.clips.length)
    
    return parsed.clips || null
    
  } catch (error) {
    console.error('Clip selection error:', error)
    return null
  }
}