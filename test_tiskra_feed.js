const Parser = require('rss-parser');
const parser = new Parser();

async function main() {
  const url = 'https://feeds.ivoox.com/feed_fg_f11248619_filtro_1.xml';
  console.log('Fetching:', url);
  try {
    const feed = await parser.parseURL(url);
    console.log('Title:', feed.title);
    console.log('Total episodes:', feed.items.length);
    console.log('Latest 5 episodes:');
    for (let i = 0; i < Math.min(5, feed.items.length); i++) {
      const item = feed.items[i];
      console.log(`- [${item.pubDate}] ${item.title}`);
      console.log(`  Guid: ${item.guid}`);
      console.log(`  Link: ${item.link}`);
      console.log(`  Enclosure: ${item.enclosure?.url}`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
