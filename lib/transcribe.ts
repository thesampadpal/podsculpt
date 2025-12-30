import { AssemblyAI } from 'assemblyai'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!
})

export async function transcribeAudio(audioFilePath: string): Promise<string | null> {
  try {
    console.log('Starting transcription...')
    
    // Upload and transcribe
    const transcript = await client.transcripts.transcribe({
      audio: audioFilePath
    })
    
    if (transcript.status === 'error') {
      console.error('Transcription failed:', transcript.error)
      return null
    }
    
    console.log('Transcription complete!')
    return transcript.text || null
    
  } catch (error) {
    console.error('Transcription error:', error)
    return null
  }
}

// Function to get transcript with timestamps (for clips later)
export async function transcribeWithTimestamps(audioFilePath: string) {
  try {
    const transcript = await client.transcripts.transcribe({
      audio: audioFilePath
    })
    
    if (transcript.status === 'error') {
      return null
    }
    
    return {
      text: transcript.text,
      words: transcript.words // Array of {text, start, end} for each word
    }
    
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}