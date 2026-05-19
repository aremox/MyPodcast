const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.ivoox.com/podcast-ruina_sq_f1661078_1.html';
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find all links containing '_rf_'
    const rfLinks = [];
    $('a[href*="_rf_"]').each((_, el) => {
      rfLinks.push({
        text: $(el).text().trim(),
        href: $(el).attr('href'),
        parentClasses: $(el).parent().attr('class'),
        grandParentClasses: $(el).parent().parent().attr('class')
      });
    });
    
    console.log(`Found ${rfLinks.length} links with _rf_:`);
    for (let i = 0; i < Math.min(10, rfLinks.length); i++) {
      console.log(rfLinks[i]);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
