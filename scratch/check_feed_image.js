const Parser = require('rss-parser');
const axios = require('axios');

async function main() {
  const parser = new Parser({
    customFields: {
      item: [
        ['itunes:duration', 'itunesDuration'],
        ['itunes:image', 'itunesImage'],
      ],
      feed: [
        ['itunes:author', 'itunesAuthor'],
        ['itunes:image', 'itunesImage'],
        ['itunes:category', 'itunesCategory'],
      ],
    },
  });

  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f11186399_filtro_1.xml';
  try {
    console.log(`Downloading and parsing ${feedUrl}...`);
    const feed = await parser.parseURL(feedUrl);
    
    console.log('--- Feed Level Keys ---');
    console.log('Keys:', Object.keys(feed));
    console.log('title:', feed.title);
    console.log('image:', feed.image);
    console.log('itunesImage:', feed.itunesImage);
    console.log('itunes:image raw:', feed['itunes:image']);
    console.log('itunesImage raw:', feed['itunesImage']);
    
    if (feed.items && feed.items.length > 0) {
      console.log('\n--- First Item Level Keys ---');
      const item = feed.items[0];
      console.log('title:', item.title);
      console.log('itunesImage:', item.itunesImage);
      console.log('itunes:image raw:', item['itunes:image']);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
