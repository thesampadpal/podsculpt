import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'

interface Clip {
  start_time: number
  end_time: number
  title: string
  hook: string
}

export async function createClipVideo(
  audioFilePath: string,
  clip: Clip,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      const duration = clip.end_time - clip.start_time
      
      console.log(`Creating clip: ${clip.title}`)
      console.log(`Duration: ${duration}s (${clip.start_time}s - ${clip.end_time}s)`)
      
      // Create audio clip with proper options
      ffmpeg()
        .input(audioFilePath)
        .inputOptions([`-ss ${clip.start_time}`])
        .outputOptions([
          `-t ${duration}`,
          '-acodec copy'  // Copy audio codec instead of re-encoding
        ])
        .output(outputPath.replace('.mp4', '.mp3'))
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine)
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Processing: ${Math.round(progress.percent)}% done`)
          }
        })
        .on('end', () => {
          console.log(`Audio clip created!`)
          resolve(true)
        })
        .on('error', (err, stdout, stderr) => {
          console.error('FFmpeg error:', err.message)
          console.error('FFmpeg stderr:', stderr)
          reject(err)
        })
        .run()
        
    } catch (error) {
      console.error('Video creation error:', error)
      reject(error)
    }
  })
}

export async function createAllClips(
  audioFilePath: string,
  clips: Clip[],
  submissionId: string
): Promise<string[]> {
  const outputPaths: string[] = []
  
  // Create outputs directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'temp', 'clips')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Verify input file exists
  if (!fs.existsSync(audioFilePath)) {
    console.error('Audio file not found:', audioFilePath)
    return []
  }
  
  console.log('Input file size:', fs.statSync(audioFilePath).size, 'bytes')
  
  // Create each clip
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const outputPath = path.join(outputDir, `${submissionId}_clip_${i + 1}.mp3`)
    
    try {
      await createClipVideo(audioFilePath, clip, outputPath)
      outputPaths.push(outputPath)
      console.log(`✅ Clip ${i + 1} created successfully`)
    } catch (error) {
      console.error(`❌ Failed to create clip ${i + 1}:`, error)
    }
  }
  
  return outputPaths
}