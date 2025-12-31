import { AssemblyAI } from 'assemblyai'

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!
})

export async function transcribeAudio(audioFilePath: string) {
  try {
    console.log('Starting transcription...')
    
    const transcript = await client.transcripts.transcribe({
      audio: audioFilePath
    })
    
    if (transcript.status === 'error') {
      console.error('Transcription failed:', transcript.error)
      return null
    }
    
    console.log('Transcription complete!')
    
    return {
      text: transcript.text || '',
      words: transcript.words || [] // Array of {text, start, end} for each word
    }
    
  } catch (error) {
    console.error('Transcription error:', error)
    return null
  }
}