const Parser = require('rss-parser');
const parser = new Parser();

async function main() {
  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f1627406_filtro_1.xml';
  try {
    const feed = await parser.parseURL(feedUrl);
    console.log('Total items in feed:', feed.items.length);
    if (feed.items.length > 0) {
      for (let i = 0; i < Math.min(5, feed.items.length); i++) {
        const item = feed.items[i];
        console.log(`\n[Item ${i}] Title: "${item.title}"`);
        console.log('  item.guid typeof:', typeof item.guid);
        console.log('  item.guid:', item.guid);
        console.log('  item.link:', item.link);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

main();
