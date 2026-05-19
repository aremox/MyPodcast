const Parser = require('rss-parser');
const parser = new Parser();

async function main() {
  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f1661078_filtro_1.xml';
  console.log('Fetching feed:', feedUrl);
  
  try {
    const feed = await parser.parseURL(feedUrl);
    console.log('Feed title:', feed.title);
    console.log('Total episodes in feed:', feed.items.length);
    console.log('Latest 5 episodes:');
    feed.items.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.title}`);
      console.log(`   Published: ${item.pubDate}`);
      console.log(`   Link: ${item.link}`);
      console.log(`   Enclosure: ${item.enclosure?.url}`);
    });
  } catch (err) {
    console.error('Error fetching feed:', err.message);
  }
}

main();
