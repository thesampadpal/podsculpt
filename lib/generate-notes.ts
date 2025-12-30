import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
})

export async function generateShowNotes(transcript: string, episodeTitle: string): Promise<string | null> {
  try {
    console.log('Generating show notes with Groq...')
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional podcast editor. Create concise, engaging show notes from transcripts.'
        },
        {
          role: 'user',
          content: `Create professional show notes for this podcast episode titled "${episodeTitle}".

Transcript:
${transcript.slice(0, 8000)}

Format:
- Brief episode summary (2-3 sentences)
- Key topics discussed
- 3-5 key takeaways or quotes

Keep it concise and scannable.`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000
    })
    
    const showNotes = completion.choices[0]?.message?.content
    console.log('Show notes generated with Groq!')
    
    return showNotes || null
    
  } catch (error) {
    console.error('Show notes generation error:', error)
    return null
  }
}