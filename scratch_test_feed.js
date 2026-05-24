const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');

const parser = new Parser();

async function main() {
  const query = 'Apasionados por la tecnología';
  const searchUrl = `https://www.ivoox.com/${encodeURIComponent(query)}_sw_1_1.html`;
  console.log(`Searching iVoox: ${searchUrl}`);
  
  const response = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  
  const $ = cheerio.load(response.data);
  const results = [];
  
  $('.modulo-type-programa').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.content a').first().text().trim() || $el.find('a[href*="_sq_f"]').first().attr('title');
    let url = $el.find('a[href*="_sq_f"]').first().attr('href');
    if (url && !url.startsWith('http')) {
      url = `https://www.ivoox.com${url}`;
    }
    results.push({ title, url });
  });
  
  console.log('Search Results:', results);
  
  if (results.length > 0) {
    const targetUrl = results[0].url;
    console.log(`Scraping target URL: ${targetUrl}`);
    
    const pageResponse = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const $page = cheerio.load(pageResponse.data);
    
    let rssFeedUrl = '';
    $page('a[href*="feeds.ivoox.com/feed_fg"]').each((_, el) => {
      rssFeedUrl = $page(el).attr('href') || '';
    });
    
    if (!rssFeedUrl) {
      $page('link[type="application/rss+xml"]').each((_, el) => {
        rssFeedUrl = $page(el).attr('href') || '';
      });
    }
    
    if (!rssFeedUrl) {
      const match = targetUrl.match(/_sq_f(\d+)_/);
      if (match) {
        rssFeedUrl = `https://feeds.ivoox.com/feed_fg_f${match[1]}_filtro_1.xml`;
      }
    }
    
    console.log(`Resolved RSS Feed URL: ${rssFeedUrl}`);
    
    if (rssFeedUrl) {
      console.log('Parsing RSS feed...');
      const feed = await parser.parseURL(rssFeedUrl);
      console.log(`Feed Title: ${feed.title}`);
      console.log(`Feed Items Count: ${feed.items?.length}`);
      if (feed.items?.length > 0) {
        console.log('Sample Episode Titles:');
        feed.items.slice(0, 5).forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.title} (${item.pubDate})`);
        });
      }
    }
  }
}

main().catch(err => {
  console.error(err);
});
