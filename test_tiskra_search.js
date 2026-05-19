const axios = require('axios');
const cheerio = require('cheerio');

async function search() {
  const query = 'TISKRA';
  const searchUrl = `https://www.ivoox.com/${encodeURIComponent(query)}_sw_1_1.html`;
  console.log('Searching:', searchUrl);

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const $ = cheerio.load(response.data);
    const results = [];
    $('.modulo-type-programa').each((_, el) => {
      const $el = $(el);
      const title = $el.find('a[href*="_sq_f"]').first().attr('title') || $el.find('.content a').first().text().trim();
      let url = $el.find('a[href*="_sq_f"]').first().attr('href');
      if (url && !url.startsWith('http')) {
        url = `https://www.ivoox.com${url}`;
      }
      results.push({ title, url });
    });
    console.log('Results:', results);
  } catch (err) {
    console.error('Error:', err);
  }
}

search();
