const Parser = require('rss-parser');

const parser = new Parser();

async function main() {
  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f11248619_filtro_1.xml';
  console.log('Parsing feed:', feedUrl);
  try {
    const feed = await parser.parseURL(feedUrl);
    console.log('Feed title:', feed.title);
    console.log('Total episodes parsed:', feed.items.length);
    
    // Check first 5 episodes
    for (let i = 0; i < Math.min(5, feed.items.length); i++) {
      const item = feed.items[i];
      console.log(`\nEpisode ${i + 1}:`);
      console.log('  Title:', item.title);
      console.log('  pubDate:', item.pubDate);
      console.log('  guid:', item.guid);
      console.log('  link:', item.link);
      console.log('  enclosure url:', item.enclosure?.url);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
