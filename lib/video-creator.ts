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
  outputPath: string,
  words?: any[]
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
      
      const safeTitle = clip.title.replace(/'/g, '').replace(/:/g, '')
      
      // WITHOUT captions first - to test
      const videoFilter = `drawtext=text='${safeTitle}':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=100:box=1:boxcolor=black@0.7:boxborderw=20,drawtext=text='PodSculpt.com':fontsize=30:fontcolor=white:x=(w-text_w)/2:y=h-100`
      
      // Generate and add SRT captions
      let srtPath = ''
      if (words && words.length > 0) {
        const { generateSRT } = require('./generate-captions')
        srtPath = path.join(path.dirname(outputPath), `temp_${Date.now()}.srt`)
        
        try {
          generateSRT(words, clip.start_time, clip.end_time, srtPath)
          console.log('✅ SRT file created:', srtPath)
        } catch (err) {
          console.error('SRT generation failed:', err)
          srtPath = '' // Continue without captions
        }
      }
      
      const command = ffmpeg()
        .input(bgPath)
        .inputOptions(['-loop 1'])
        .input(audioFilePath)
        .inputOptions([`-ss ${clip.start_time}`])
      
      // Add subtitles as separate filter if SRT exists
      if (srtPath && fs.existsSync(srtPath)) {
        const srtPathEscaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:')
        
        command.outputOptions([
          `-t ${duration}`,
          '-c:v libx264',
          '-c:a aac',
          '-shortest',
          '-pix_fmt yuv420p',
          '-vf',
          `${videoFilter},subtitles='${srtPathEscaped}':force_style='FontName=Arial,FontSize=48,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Outline=3,Shadow=0,Alignment=2,MarginV=150'`
        ])
      } else {
        command.outputOptions([
          `-t ${duration}`,
          '-c:v libx264',
          '-c:a aac',
          '-shortest',
          '-pix_fmt yuv420p',
          '-vf',
          videoFilter
        ])
      }
      
      command
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('FFmpeg command:', cmd)
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`${Math.round(progress.percent)}%`)
          }
        })
        .on('end', () => {
          // Clean up SRT
          if (srtPath && fs.existsSync(srtPath)) {
            try {
              fs.unlinkSync(srtPath)
            } catch (e) {
              console.log('Could not delete SRT file')
            }
          }
          console.log('✅ Video created with captions')
          resolve(true)
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err.message)
          // Clean up SRT on error too
          if (srtPath && fs.existsSync(srtPath)) {
            try {
              fs.unlinkSync(srtPath)
            } catch (e) {}
          }
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
  submissionId: string,
  words?: any[]
): Promise<string[]> {
  const outputPaths: string[] = []
  // Use /tmp for serverless environments (Vercel)
  const outputDir = '/tmp/clips'
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const outputPath = path.join(outputDir, `${submissionId}_clip_${i + 1}.mp4`)
    
    try {
      await createClipVideo(audioFilePath, clip, outputPath, words)
      outputPaths.push(outputPath)
      console.log(`✅ ${i + 1}/${clips.length}`)
    } catch (error) {
      console.error(`❌ Clip ${i + 1} failed`)
    }
  }
  
  return outputPaths
}