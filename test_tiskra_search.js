const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const query = 'Tiskra';
  const searchUrl = `https://www.ivoox.com/${encodeURIComponent(query)}_sw_1_1.html`;
  console.log('Searching iVoox:', searchUrl);

  const response = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });

  const $ = cheerio.load(response.data);
  $('.modulo-type-programa').each((_, el) => {
    const $el = $(el);
    const title = $el.find('meta[itemprop="name"]').attr('content') || $el.find('a[href*="_sq_f"]').first().attr('title') || '';
    const url = $el.find('meta[itemprop="url"]').attr('content') || $el.find('a[href*="_sq_f"]').first().attr('href') || '';
    console.log(`Title: ${title}`);
    console.log(`URL: ${url}`);
  });
}

main();
