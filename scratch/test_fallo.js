const Parser = require('rss-parser');
const parser = new Parser();

async function main() {
  const url = 'https://feeds.ivoox.com/feed_fg_f120398_filtro_1.xml';
  try {
    const feed = await parser.parseURL(url);
    console.log('Total items:', feed.items.length);
    feed.items.forEach((item, index) => {
      console.log(`[${index}] guid: ${JSON.stringify(item.guid)} | link: ${item.link}`);
    });
  } catch (err) {
    console.error(err);
  }
}

main();
