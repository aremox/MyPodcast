const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.ivoox.com/podcast-ruina_sq_f1661078_1.html';
  console.log('Scraping iVoox podcast page:', url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(res.data);
    console.log('Page Title:', $('title').text().trim());
    
    // Let's find episode items
    console.log('--- Scraped episodes from HTML list ---');
    const episodes = [];
    $('.modulo-type-episodio').each((idx, el) => {
      const titleEl = $(el).find('.title-wrapper a');
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      const dateEl = $(el).find('.date');
      const date = dateEl.text().trim();
      episodes.push({ title, link, date });
    });

    console.log(`Found ${episodes.length} episodes on HTML page:`);
    episodes.slice(0, 10).forEach((ep, idx) => {
      console.log(`${idx + 1}. ${ep.title} (${ep.date}) -> ${ep.link}`);
    });
  } catch (err) {
    console.error('Error scraping iVoox page:', err.message);
  }
}

main();
