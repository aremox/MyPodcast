const Parser = require('rss-parser');

async function main() {
  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f11186399_filtro_1.xml';
  console.log(`Parsing feed: ${feedUrl}`);
  
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
    console.log(`Parsed ${feed.items.length} items.`);
    
    for (let i = 0; i < 5; i++) {
      const item = feed.items[i];
      console.log(`\nItem ${i + 1}: "${item.title}"`);
      console.log(`  guid field type: ${typeof item.guid}`);
      console.log(`  guid field value:`, item.guid);
      
      let finalGuid = item.guid || item.link || '';
      if (typeof finalGuid === 'object' && finalGuid !== null) {
        // If it's an object, check its string representation or structure
        console.log(`  finalGuid is an object! String representation: ${String(finalGuid)}`);
      } else {
        console.log(`  finalGuid string: "${finalGuid}"`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
