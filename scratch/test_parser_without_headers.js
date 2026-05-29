const Parser = require('rss-parser');

async function main() {
  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f11186399_filtro_1.xml';
  console.log(`Fetching feed using direct parseURL: ${feedUrl}`);
  
  try {
    const parser = new Parser({
      customFields: {
        item: [
          ['itunes:duration', 'itunesDuration'],
          ['itunes:image', 'itunesImage'],
          ['itunes:episodeType', 'episodeType'],
        ],
        feed: [
          ['itunes:author', 'itunesAuthor'],
          ['itunes:image', 'itunesImage'],
          ['itunes:category', 'itunesCategory'],
        ],
      },
    });
    
    const feed = await parser.parseURL(feedUrl);
    console.log(`Parsed feed title: "${feed.title}"`);
    console.log(`Total episodes parsed: ${feed.items?.length || 0}`);
    
  } catch (error) {
    console.error('Error with direct parseURL:', error.message);
  }
}

main();
