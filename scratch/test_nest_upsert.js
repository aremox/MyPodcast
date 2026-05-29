const mongoose = require('mongoose');
const Parser = require('rss-parser');

const EpisodeSchema = new mongoose.Schema({
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast', required: true },
  title: { type: String, required: true },
  description: String,
  audioUrl: { type: String, required: true },
  imageUrl: String,
  duration: String,
  durationSeconds: { type: Number, default: 0 },
  publishedAt: { type: Date, required: true },
  guid: { type: String, required: true, unique: true },
  ivooxUrl: String,
  fileSize: { type: Number, default: 0 },
}, { timestamps: true });

EpisodeSchema.index({ podcastId: 1, publishedAt: -1 });

const Episode = mongoose.model('Episode', EpisodeSchema);

async function runFeed(feedUrl) {
  console.log('\n========================================');
  console.log('Parsing RSS feed:', feedUrl);
  const parser = new Parser();
  const feed = await parser.parseURL(feedUrl);
  console.log('Total episodes in feed:', feed.items?.length);

  const podcastId = new mongoose.Types.ObjectId(); // mock podcastId
  const parsedEpisodes = feed.items.map((item) => ({
    title: item.title || 'Sin título',
    description: item.contentSnippet || '',
    audioUrl: item.enclosure?.url || '',
    imageUrl: item.itunes?.image || '',
    duration: item.itunes?.duration || '00:00',
    durationSeconds: 0,
    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    guid: item.guid || item.link || '',
    ivooxUrl: item.link || '',
    fileSize: parseInt(String(item.enclosure?.length || '0'), 10),
  }));

  console.log(`Running upsertMany simulation for ${feed.title}...`);
  const newEpisodeIds = [];
  let errorCount = 0;
  
  for (const ep of parsedEpisodes) {
    try {
      const existing = await Episode.findOne({ guid: ep.guid }).select('_id').exec();
      
      if (!existing) {
        const newEpisode = await Episode.create({
          podcastId,
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
      } else {
        await Episode.updateOne(
          { _id: existing._id },
          {
            $set: {
              audioUrl: ep.audioUrl,
              duration: ep.duration,
              imageUrl: ep.imageUrl,
            }
          }
        ).exec();
      }
    } catch (err) {
      errorCount++;
      if (errorCount <= 5) {
        console.error(`  -> ERROR processing "${ep.title}" (GUID: "${ep.guid}"):`, err.message);
      }
    }
  }

  console.log(`Feed simulation completed. Inserted: ${newEpisodeIds.length} | Errors: ${errorCount}`);
}

async function main() {
  try {
    console.log('Connecting to local MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/mypodcast');
    console.log('Connected! Dropping existing episodes collection for a clean slate...');
    try {
      await Episode.collection.drop();
      console.log('Collection dropped.');
    } catch (e) {
      console.log('Collection does not exist yet.');
    }
    
    console.log('Syncing indexes...');
    await Episode.syncIndexes();
    console.log('Indexes synced.');

    const feeds = [
      'https://feeds.ivoox.com/feed_fg_f1627406_filtro_1.xml', // Somos Eléctricos (1000+ eps)
      'https://feeds.ivoox.com/feed_fg_f11248619_filtro_1.xml', // TISKRA
      'https://feeds.ivoox.com/feed_fg_f120398_filtro_1.xml'    // Fallo de sistema
    ];

    for (const feedUrl of feeds) {
      await runFeed(feedUrl);
    }

    const finalCount = await Episode.countDocuments();
    console.log(`\nTotal episodes in database now: ${finalCount}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
