const mongoose = require('mongoose');

async function main() {
  const uri = 'mongodb://localhost:27017/mypodcast';
  
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB via Mongoose');
    
    // Check podcasts
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const podcasts = await db.collection('podcasts').find({}).toArray();
    console.log(`\nFound ${podcasts.length} podcasts:`);
    for (const p of podcasts) {
      console.log(`- Title: ${p.title}`);
      console.log(`  ID: ${p._id}`);
      console.log(`  iVoox URL: ${p.ivooxUrl}`);
      console.log(`  RSS Feed URL: ${p.rssFeedUrl}`);
      console.log(`  iVoox ID: ${p.ivooxId}`);
      console.log(`  Last Fetched At: ${p.lastFetchedAt}`);
      console.log(`  Episode Count: ${p.episodeCount}`);
      
      // Get the latest episodes for this podcast
      const episodes = await db.collection('episodes')
        .find({ podcastId: p._id.toString() })
        .sort({ publishedAt: -1 })
        .limit(5)
        .toArray();
      
      console.log('  Latest episodes in DB:');
      for (const ep of episodes) {
        console.log(`    * [${ep.publishedAt.toISOString().slice(0, 10)}] ${ep.title}`);
        console.log(`      Audio URL: ${ep.audioUrl}`);
        console.log(`      iVoox URL: ${ep.ivooxUrl}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

main();
