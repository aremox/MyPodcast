const axios = require('axios');
const Parser = require('rss-parser');

const parser = new Parser();

async function main() {
  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f120398_filtro_1.xml';
  
  // 1. Fetch with standard node-xml/generic UA (or axios default)
  try {
    console.log('--- Fetching with generic/axios user-agent ---');
    const res = await axios.get(feedUrl);
    const feed = await parser.parseString(res.data);
    console.log('Generic UA Success! Items count:', feed.items?.length);
  } catch (err) {
    console.error('Generic UA Error:', err.message);
  }

  // 2. Fetch using rss-parser's parseURL directly (which uses rss-parser's default UA)
  try {
    console.log('--- Fetching with rss-parser parseURL directly ---');
    const feed = await parser.parseURL(feedUrl);
    console.log('parseURL Success! Items count:', feed.items?.length);
  } catch (err) {
    console.error('parseURL Error:', err.message);
  }
}

main();
