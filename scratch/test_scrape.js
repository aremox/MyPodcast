const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.ivoox.com/podcast-fallo-sistema_sq_f112852_1.html';
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      timeout: 15000,
    });
    const $ = cheerio.load(response.data);
    
    console.log('Title in HTML:', $('title').text());
    
    // Look for RSS links
    console.log('--- RSS Links found ---');
    $('a[href*="feeds.ivoox.com"]').each((_, el) => {
      console.log('A tag:', $(el).attr('href'));
    });
    $('link[type="application/rss+xml"]').each((_, el) => {
      console.log('Link tag:', $(el).attr('href'));
    });
    
    // Look for all anchors containing 'feed'
    $('a[href*="feed"]').each((_, el) => {
      console.log('Feed A tag:', $(el).attr('href'));
    });
  } catch (error) {
    console.error('Error scraping:', error);
  }
}

main();
