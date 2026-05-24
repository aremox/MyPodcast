const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');

const parser = new Parser();

function extractIvooxId(url) {
  // Matches podcast ID pattern: _sq_f{ID}_
  const match = url.match(/_sq_f(\d+)_/);
  if (match) return match[1];

  // Matches episode ID pattern: _rf_{ID}_
  const matchRf = url.match(/_rf_(\d+)_/);
  if (matchRf) return matchRf[1];

  return '';
}

async function main() {
  const episodeUrl = 'https://www.ivoox.com/perspectivas-mercado-energetico-ia-redes-y-audios-mp3_rf_173725237_1.html';
  console.log(`Episode URL to test: ${episodeUrl}`);
  
  const ivooxId = extractIvooxId(episodeUrl);
  console.log(`Extracted iVoox ID: ${ivooxId}`);
  
  const constructedRssFeedUrl = `https://feeds.ivoox.com/feed_fg_f${ivooxId}_filtro_1.xml`;
  console.log(`Constructed RSS Feed URL: ${constructedRssFeedUrl}`);
  
  try {
    const feed = await parser.parseURL(constructedRssFeedUrl);
    console.log(`Feed Title: ${feed.title}`);
    console.log(`Feed Items Count: ${feed.items?.length}`);
    if (feed.items?.length > 0) {
      console.log('Sample Episode Titles:');
      feed.items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.title}`);
      });
    }
  } catch (err) {
    console.error(`Failed to parse feed: ${err.message}`);
  }
}

main();
