const Parser = require('rss-parser');
const parser = new Parser();

async function check() {
  const url = 'https://feeds.ivoox.com/feed_fg_f1661078_filtro_1.xml';
  console.log("Fetching...", url);
  const feed = await parser.parseURL(url);
  console.log(`Feed title: ${feed.title}`);
  console.log(`Number of episodes: ${feed.items.length}`);
  if (feed.items.length > 0) {
      console.log(`Latest episode: ${feed.items[0].title} (${feed.items[0].pubDate})`);
  }
}
check().catch(console.error);
