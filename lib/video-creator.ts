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
      const bgPath = path.join(process.cwd(), 'public', 'bg.png')
      
      if (!fs.existsSync(bgPath)) {
        reject(new Error('bg.png not found'))
        return
      }
      
      console.log(`Creating video: ${clip.title}`)
      
      // Escape single quotes in title
      const safeTitle = clip.title.replace(/'/g, '')
      
      ffmpeg()
        .input(bgPath)
        .inputOptions(['-loop 1'])
        .input(audioFilePath)
        .inputOptions([`-ss ${clip.start_time}`])
        .outputOptions([
          `-t ${duration}`,
          '-c:v libx264',
          '-c:a aac',
          '-shortest',
          '-pix_fmt yuv420p',
          '-vf',
          `drawtext=text='${safeTitle}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=100:box=1:boxcolor=black@0.7:boxborderw=20,drawtext=text='PodSculpt.com':fontsize=30:fontcolor=white:x=(w-text_w)/2:y=h-100`
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('FFmpeg:', cmd)
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`${Math.round(progress.percent)}%`)
          }
        })
        .on('end', () => {
          console.log('✅ Video created')
          resolve(true)
        })
        .on('error', (err) => {
          console.error('Error:', err.message)
          reject(err)
        })
        .run()
        
    } catch (error) {
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
  const outputDir = path.join(process.cwd(), 'temp', 'clips')
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const outputPath = path.join(outputDir, `${submissionId}_clip_${i + 1}.mp4`)
    
    try {
      await createClipVideo(audioFilePath, clip, outputPath)
      outputPaths.push(outputPath)
      console.log(`✅ ${i + 1}/${clips.length}`)
    } catch (error) {
      console.error(`❌ Clip ${i + 1} failed`)
    }
  }
  
  return outputPaths
}