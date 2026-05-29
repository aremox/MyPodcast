const axios = require('axios');
const Parser = require('rss-parser');

async function main() {
  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f11186399_filtro_1.xml';
  console.log(`Fetching feed from: ${feedUrl}`);
  
  try {
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    console.log(`Fetched feed successfully. Length: ${response.data.length} characters`);
    
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
    
    const feed = await parser.parseString(response.data);
    console.log(`Parsed feed title: "${feed.title}"`);
    console.log(`Total episodes parsed: ${feed.items?.length || 0}`);
    
    if (feed.items && feed.items.length > 0) {
      console.log('First 3 items:');
      for (let i = 0; i < Math.min(3, feed.items.length); i++) {
        const item = feed.items[i];
        console.log(`\nItem ${i + 1}:`);
        console.log(`  Title: "${item.title}"`);
        console.log(`  PubDate: "${item.pubDate}"`);
        console.log(`  GUID: "${item.guid || item.link || ''}"`);
        console.log(`  Link: "${item.link}"`);
        console.log(`  Enclosure url: "${item.enclosure?.url}"`);
      }
    }
  } catch (error) {
    console.error('Error fetching or parsing feed:', error.message);
  }
}

main();
