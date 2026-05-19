const mongoose = require('mongoose');

// Define Episode Schema matching the NestJS schema
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

const EpisodeModel = mongoose.model('Episode', EpisodeSchema);

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

const PodcastModel = mongoose.model('Podcast', PodcastSchema);

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

function cleanIvooxUrl(url) {
  if (!url) return url;
  if (!url.includes('ivoox.com')) {
    return url;
  }
  // extract ID
  const match = url.match(/_(?:mf|rf)_(\d+)/i);
  if (match) {
    return `https://www.ivoox.com/listen_mn_${match[1]}_1.mp3`;
  }
  return url;
}

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  // Find the podcast "La Ruina"
  const podcast = await PodcastModel.findOne({ title: 'La Ruina' });
  if (!podcast) {
    console.log('Podcast La Ruina not found in DB');
    await mongoose.connection.close();
    return;
  }

  console.log('Podcast found in DB:', podcast._id.toString());
  console.log('Fetching feed:', podcast.rssFeedUrl);

  try {
    const feed = await parser.parseURL(podcast.rssFeedUrl);
    console.log(`Parsed ${feed.items?.length || 0} episodes from RSS`);

    const episodes = (feed.items || []).map((item) => ({
      title: item.title || 'Sin título',
      description: cleanDescription(item.contentSnippet || item.content || ''),
      audioUrl: cleanIvooxUrl(item.enclosure?.url || ''),
      imageUrl: extractImageUrl(item),
      duration: item.itunesDuration || '00:00',
      durationSeconds: parseDuration(item.itunesDuration || '0'),
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      guid: item.guid || item.link || '',
      ivooxUrl: item.link || '',
      fileSize: parseInt(String(item.enclosure?.length || '0'), 10),
    }));

    console.log(`Prepared ${episodes.length} episodes for saving`);
    
    // Test saving episodes manually
    const newEpisodeIds = [];
    for (const ep of episodes) {
      const existing = await EpisodeModel.findOne({ guid: ep.guid }).select('_id').exec();
      if (!existing) {
        try {
          const newEp = await EpisodeModel.create({
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
          newEpisodeIds.push(newEp._id.toString());
        } catch (e) {
          console.error(`Failed to save episode "${ep.title}":`, e.message);
          break;
        }
      } else {
        // exists, check it
      }
    }

    console.log(`Created ${newEpisodeIds.length} new episodes in DB`);
    
    const count = await EpisodeModel.countDocuments({ podcastId: podcast._id });
    console.log(`Total episodes for this podcast in DB:`, count);

    podcast.episodeCount = count;
    await podcast.save();
    console.log('Saved podcast with updated count:', podcast.episodeCount);

  } catch (err) {
    console.error('Error during update:', err);
  } finally {
    await mongoose.connection.close();
  }
}

main();
