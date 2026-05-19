const Parser = require('rss-parser');

async function test() {
  const parser = new Parser({
    customFields: {
      item: [
        ['itunes:duration', 'itunesDuration'],
        ['itunes:image', 'itunesImage'],
        ['itunes:episodeType', 'episodeType'],
      ],
      feed: [
        ['itunes:author', 'itunesAuthor'],
        ['itunes:image', 'itunesImage'],
        ['itunes:category', 'itunesCategory'],
      ],
    },
  });

  const url = 'https://feeds.ivoox.com/feed_fg_f1661078_filtro_1.xml';
  console.log('Parsing URL:', url);
  try {
    const feed = await parser.parseURL(url);
    console.log('Feed title:', feed.title);
    console.log('Feed description:', feed.description ? feed.description.substring(0, 100) : 'None');
    console.log('Number of items in feed:', feed.items ? feed.items.length : 0);
    if (feed.items && feed.items.length > 0) {
      console.log('First item structure:', JSON.stringify(feed.items[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
