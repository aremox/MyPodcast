const Parser = require('rss-parser');

function cleanIvooxUrl(url) {
  return url; // simple mock for now
}

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

function cleanDescription(desc) {
  return desc
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .substring(0, 2000);
}

function parseDuration(duration) {
  if (!duration) return 0;
  if (/^\d+$/.test(duration)) {
    return parseInt(duration, 10);
  }
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function extractImageUrl(item) {
  if (item.itunesImage?.href) return item.itunesImage.href;
  if (item.itunesImage && typeof item.itunesImage === 'string') return item.itunesImage;
  if (item['itunes:image']?.$?.href) return item['itunes:image'].$.href;
  return '';
}

async function main() {
  const feedUrl = 'https://feeds.ivoox.com/feed_fg_f120398_filtro_1.xml';
  try {
    const feed = await parser.parseURL(feedUrl);
    const episodes = (feed.items || []).map((item) => ({
      title: item.title || 'Sin título',
      description: cleanDescription(item.contentSnippet || item.content || ''),
      audioUrl: cleanIvooxUrl(item.enclosure?.url || ''),
      imageUrl: extractImageUrl(item),
      duration: item['itunesDuration'] || '00:00',
      durationSeconds: parseDuration(item['itunesDuration'] || '0'),
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      guid: item.guid || item.link || '',
      ivooxUrl: item.link || '',
      fileSize: parseInt(String(item.enclosure?.length || '0'), 10),
    }));

    console.log('Parsed total:', episodes.length);
    episodes.forEach((ep, index) => {
      console.log(`[${index}] Title: ${ep.title}`);
      console.log(`    guid: ${ep.guid}`);
      console.log(`    audioUrl: ${ep.audioUrl}`);
    });
  } catch (err) {
    console.error(err);
  }
}

main();
