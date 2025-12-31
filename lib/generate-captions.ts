import fs from 'fs'
import path from 'path'

interface Word {
  text: string
  start: number
  end: number
}

export function generateSRT(words: Word[], startTime: number, endTime: number, outputPath: string): string {
  // Filter words within the clip timeframe
  const clipWords = words.filter(word => 
    word.start >= startTime * 1000 && word.end <= endTime * 1000
  )
  
  if (clipWords.length === 0) {
    console.log('No words in this time range')
    return ''
  }
  
  // Group words into subtitle chunks (3-5 words per line)
  const chunks: Word[][] = []
  const wordsPerChunk = 4
  
  for (let i = 0; i < clipWords.length; i += wordsPerChunk) {
    chunks.push(clipWords.slice(i, i + wordsPerChunk))
  }
  
  // Generate SRT format
  let srtContent = ''
  
  chunks.forEach((chunk, index) => {
    const startMs = chunk[0].start - (startTime * 1000) // Relative to clip start
    const endMs = chunk[chunk.length - 1].end - (startTime * 1000)
    
    const startTimestamp = msToSRTTime(startMs)
    const endTimestamp = msToSRTTime(endMs)
    
    const text = chunk.map(w => w.text).join(' ')
    
    srtContent += `${index + 1}\n`
    srtContent += `${startTimestamp} --> ${endTimestamp}\n`
    srtContent += `${text}\n\n`
  })
  
  // Write to file
  fs.writeFileSync(outputPath, srtContent, 'utf-8')
  console.log('SRT file created:', outputPath)
  
  return outputPath
}

function msToSRTTime(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000
  
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`
}

function pad(num: number, size: number = 2): string {
  let s = num.toString()
  while (s.length < size) s = '0' + s
  return s
}