const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.ivoox.com/perspectivas-mercado-energetico-ia-redes-y-audios-mp3_rf_173725237_1.html';
  console.log('Scraping iVoox episode page:', url);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(res.data);
    console.log('Page Title:', $('title').text().trim());
    
    // Find all links containing feed, xml, or rss
    console.log('--- Links containing feed, xml, or rss ---');
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('feed') || href.includes('xml') || href.includes('rss')) {
        console.log(`Link: ${href} - text: ${$(el).text().trim()}`);
      }
    });

    console.log('--- Link rels ---');
    $('link').each((_, el) => {
      const rel = $(el).attr('rel') || '';
      const href = $(el).attr('href') || '';
      const type = $(el).attr('type') || '';
      if (rel.includes('alternate') || type.includes('rss') || type.includes('xml')) {
        console.log(`Link rel: ${rel} | type: ${type} | href: ${href}`);
      }
    });

    console.log('--- Links containing _sq_f (program link) ---');
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('_sq_f')) {
        console.log(`Program Link: ${href} - text: ${$(el).text().trim()}`);
      }
    });

  } catch (err) {
    console.error('Error scraping iVoox page:', err.message);
  }
}

main();
