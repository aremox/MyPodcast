const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.ivoox.com/podcast-ruina_sq_f1661078_1.html';
  console.log('Scraping HTML of:', url);
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      }
    });
    
    const $ = cheerio.load(response.data);
    console.log('Page Title:', $('title').text().trim());
    
    // Episodes are usually in elements with class '.modulo-type-audio' or similar
    console.log('Searching for episodes in HTML...');
    const episodes = [];
    $('.modulo-type-audio').each((_, el) => {
      const $el = $(el);
      const title = $el.find('.title-audio').text().trim() || $el.find('a[href*="_rf_"]').first().attr('title') || $el.find('.content a').first().text().trim();
      const date = $el.find('.date').text().trim() || $el.find('.time').text().trim() || $el.find('.fecha').text().trim();
      let link = $el.find('a[href*="_rf_"]').first().attr('href');
      if (link && !link.startsWith('http')) {
        link = `https://www.ivoox.com${link}`;
      }
      episodes.push({ title, date, link });
    });
    
    console.log(`Found ${episodes.length} episodes on the page:`);
    for (let i = 0; i < Math.min(10, episodes.length); i++) {
      console.log(`- ${episodes[i].title} (${episodes[i].date})`);
      console.log(`  Link: ${episodes[i].link}`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
