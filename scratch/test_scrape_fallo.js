const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.ivoox.com/podcast-fallo-sistema_sq_f1115852_1.html';
  try {
    console.log('Scraping URL:', url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      timeout: 15000,
    });
    console.log('Response Status:', response.status);
    const $ = cheerio.load(response.data);
    
    console.log('Title in HTML:', $('title').text());
    
    // Look for RSS links
    console.log('--- RSS Links found ---');
    $('a[href*="feeds.ivoox.com"]').each((_, el) => {
      console.log('A tag feeds.ivoox.com:', $(el).attr('href'));
    });
    $('link[type="application/rss+xml"]').each((_, el) => {
      console.log('Link tag application/rss+xml:', $(el).attr('href'));
    });
    
    // Look for any href containing feed or rss
    $('a[href*="feed"], a[href*="rss"], link[href*="feed"], link[href*="rss"]').each((_, el) => {
      console.log('Matched tag href:', $(el).attr('href'));
    });
  } catch (error) {
    console.error('Error scraping:', error.message);
  }
}

main();
