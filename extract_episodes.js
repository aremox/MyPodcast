const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('page.html', 'utf8');
const $ = cheerio.load(html);

console.log('--- Matches ---');
$('a[href*="_rf_"]').each((i, el) => {
  const $el = $(el);
  const href = $el.attr('href');
  const title = $el.attr('title') || $el.text().trim();
  console.log(`${i}: href="${href}" title="${title}"`);
});
