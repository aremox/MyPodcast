const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const url = 'https://www.ivoox.com/perspectivas-mercado-energetico-ia-redes-y-audios-mp3_rf_173725237_1.html';
  console.log(`Scraping episode page: ${url}`);
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      }
    });
    
    const $ = cheerio.load(res.data);
    console.log('Page Title:', $('title').text().trim());

    // Search for program/podcast link (containing _sq_f)
    console.log('\nSearching for program link (containing _sq_f):');
    $('a[href*="_sq_f"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      console.log(`- Link text: "${$(el).text().trim()}" | href: ${href}`);
    });

    console.log('\nTesting Selector 1 (Exclude header wrapper / bg-lightest / header):');
    const sel1 = $('a[href*="_sq_f"]').filter((i, el) => {
      const inHeader = $(el).closest('#header-wrapper, .bg-lightest, header').length > 0;
      return !inHeader;
    }).first();
    console.log(`Resolved: text="${sel1.text().trim()}" href="${sel1.attr('href')}"`);

    console.log('\nTesting Selector 2 (Within "Episodio de" element):');
    const sel2 = $('a[href*="_sq_f"]').filter((i, el) => {
      const parentText = $(el).parent().text() || '';
      return parentText.includes('Episodio de');
    }).first();
    console.log(`Resolved: text="${sel2.text().trim()}" href="${sel2.attr('href')}"`);

    console.log('\nTesting Selector 3 (Inside div with mb-2 that has text "Por " or "del podcast"):');
    const sel3 = $('a[href*="_sq_f"]').filter((i, el) => {
      const container = $(el).parent();
      return container.text().includes('Por ') && container.hasClass('mb-2');
    }).first();
    console.log(`Resolved: text="${sel3.text().trim()}" href="${sel3.attr('href')}"`);


  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
