const Parser = require('rss-parser');
const parser = new Parser();

async function main() {
  const feed = await parser.parseURL('https://feeds.ivoox.com/feed_fg_f11103_filtro_1.xml');
  console.log('Parsed episodes:', feed.items.length);
  for (let i = 0; i < 5; i++) {
    const item = feed.items[i];
    console.log(`Episode ${i}:`);
    console.log(`  Title: ${item.title}`);
    console.log(`  guid: ${JSON.stringify(item.guid)} (type: ${typeof item.guid})`);
    console.log(`  link: ${item.link}`);
  }
}

main();
