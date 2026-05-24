const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');

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
  return (desc || '')
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

function extractFeedImageUrl(feed) {
  if (feed.itunesImage?.href) return feed.itunesImage.href;
  if (feed.itunesImage && typeof feed.itunesImage === 'string') return feed.itunesImage;
  if (feed.image?.url) return feed.image.url;
  return '';
}

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  // Define schemas inline
  const PodcastSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    author: String,
    imageUrl: String,
    ivooxUrl: String,
    rssFeedUrl: { type: String, required: true },
    ivooxId: { type: String, required: true, unique: true },
    category: String,
    language: String,
    lastFetchedAt: Date,
    episodeCount: { type: Number, default: 0 },
  }, { timestamps: true });

  const EpisodeSchema = new mongoose.Schema({
    podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    audioUrl: { type: String, required: true },
    imageUrl: String,
    duration: String,
    durationSeconds: { type: Number, default: 0 },
    publishedAt: { type: Date, required: true, index: true },
    guid: { type: String, required: true, unique: true },
    ivooxUrl: String,
    fileSize: { type: Number, default: 0 },
  }, { timestamps: true });

  EpisodeSchema.index({ podcastId: 1, publishedAt: -1 });

  const PodcastModel = mongoose.model('TestPodcast', PodcastSchema);
  const EpisodeModel = mongoose.model('TestEpisode', EpisodeSchema);

  // Clean old test runs
  await PodcastModel.deleteMany({ ivooxId: '11031082' });
  await EpisodeModel.deleteMany({});

  const ivooxUrl = 'https://www.ivoox.com/podcast-apasionados-tecnologia_sq_f11031082_1.html';
  const rssFeedUrl = 'https://feeds.ivoox.com/feed_fg_f11031082_filtro_1.xml';

  console.log('Parsing feed...');
  const feed = await parser.parseURL(rssFeedUrl);
  console.log(`Feed parsed. Total items: ${feed.items?.length}`);

  // Create podcast
  const podcast = await PodcastModel.create({
    title: feed.title,
    description: cleanDescription(feed.description || ''),
    author: feed['itunesAuthor'] || feed.creator || '',
    imageUrl: extractFeedImageUrl(feed),
    ivooxUrl,
    rssFeedUrl,
    ivooxId: '11031082',
    category: feed.itunesCategory?.text || '',
    language: feed.language || 'es',
    lastFetchedAt: new Date(),
    episodeCount: feed.items.length,
  });
  console.log(`Podcast created in DB with ID: ${podcast._id}`);

  // Prepare episodes
  const parsedEpisodes = feed.items.map((item) => ({
    title: item.title || 'Sin título',
    description: cleanDescription(item.contentSnippet || item.content || ''),
    audioUrl: item.enclosure?.url || '',
    imageUrl: extractImageUrl(item),
    duration: item.itunesDuration || '00:00',
    durationSeconds: parseDuration(item.itunesDuration || '0'),
    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    guid: item.guid || item.link || '',
    ivooxUrl: item.link || '',
    fileSize: parseInt(String(item.enclosure?.length || '0'), 10),
  }));

  console.log('Inserting episodes...');
  const newEpisodeIds = [];
  let index = 0;
  for (const ep of parsedEpisodes) {
    index++;
    try {
      const existing = await EpisodeModel.findOne({ guid: ep.guid }).select('_id').exec();
      if (!existing) {
        const newEpisode = await EpisodeModel.create({
          podcastId: podcast._id,
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          imageUrl: ep.imageUrl,
          duration: ep.duration,
          durationSeconds: ep.durationSeconds,
          publishedAt: ep.publishedAt,
          guid: ep.guid,
          ivooxUrl: ep.ivooxUrl,
          fileSize: ep.fileSize,
        });
        newEpisodeIds.push(newEpisode._id.toString());
      }
    } catch (err) {
      console.error(`ERROR at episode index ${index} (${ep.title}):`, err.message);
      break; // Stop on first error to match backend behavior
    }
  }

  console.log(`Successfully inserted ${newEpisodeIds.length} episodes out of ${parsedEpisodes.length}`);
  
  await mongoose.connection.close();
}

main().catch(err => console.error(err));
