import Parser from 'rss-parser'

interface PodcastEpisode {
  title: string
  audioUrl: string
  description?: string
}

export async function parseRSSFeed(rssUrl: string): Promise<PodcastEpisode | null> {
  try {
    const parser = new Parser()
    const feed = await parser.parseURL(rssUrl)
    
    // Get the latest episode
    const latestEpisode = feed.items[0]
    
    if (!latestEpisode) {
      throw new Error('No episodes found in feed')
    }
    
    // Find the audio URL (MP3)
    const audioUrl = latestEpisode.enclosure?.url || ''
    
    if (!audioUrl) {
      throw new Error('No audio file found in episode')
    }
    
    return {
      title: latestEpisode.title || 'Untitled Episode',
      audioUrl: audioUrl,
      description: latestEpisode.contentSnippet || latestEpisode.content
    }
    
  } catch (error) {
    console.error('RSS parsing error:', error)
    return null
  }
}