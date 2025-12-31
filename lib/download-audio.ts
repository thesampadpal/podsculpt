import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

export async function downloadAudio(audioUrl: string, submissionId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use /tmp for serverless environments (Vercel)
    const tempDir = '/tmp'
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    // File path: temp/[submissionId].mp3
    const filePath = path.join(tempDir, `${submissionId}.mp3`)
    const fileStream = fs.createWriteStream(filePath)
    
    // Determine protocol
    const protocol = audioUrl.startsWith('https') ? https : http
    
    console.log('Downloading audio from:', audioUrl)
    
    protocol.get(audioUrl, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          return downloadAudio(redirectUrl, submissionId)
            .then(resolve)
            .catch(reject)
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }
      
      response.pipe(fileStream)
      
      fileStream.on('finish', () => {
        fileStream.close()
        console.log('Audio downloaded to:', filePath)
        resolve(filePath)
      })
      
      fileStream.on('error', (err) => {
        fs.unlink(filePath, () => {}) // Delete partial file
        reject(err)
      })
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}) // Delete partial file
      reject(err)
    })
  })
}