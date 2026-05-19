const Parser = require('rss-parser');
const parser = new Parser();

async function checkUrl(url) {
  try {
    console.log(`\nFetching ${url}...`);
    const feed = await parser.parseURL(url);
    console.log(`  Success! Title: ${feed.title}`);
    console.log(`  Total episodes: ${feed.items.length}`);
    if (feed.items.length > 0) {
      console.log(`  Latest: ${feed.items[0].title} (${feed.items[0].pubDate})`);
    }
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
  }
}

async function main() {
  await checkUrl('https://feeds.ivoox.com/feed_fg_f1661078_1.xml');
  await checkUrl('https://feeds.ivoox.com/feed_fg_f1661078.xml');
  await checkUrl('https://feeds.ivoox.com/feed_fg_f1661078_filtro_1.xml');
}

main();
