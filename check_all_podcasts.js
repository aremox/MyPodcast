const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const podcasts = await mongoose.connection.db.collection('podcasts').find({}).toArray();
  console.log('Total podcasts:', podcasts.length);
  for (const p of podcasts) {
    console.log(`- Title: ${p.title}`);
    console.log(`  ID: ${p._id.toString()}`);
    console.log(`  RSS: ${p.rssFeedUrl}`);
    console.log(`  Last Fetched At: ${p.lastFetchedAt}`);
    console.log(`  Episode Count in Podcast Doc: ${p.episodeCount}`);
    
    // Get actual count in episodes collection
    const realCount = await mongoose.connection.db.collection('episodes').countDocuments({ podcastId: p._id });
    console.log(`  Real Episode Count in DB: ${realCount}`);
    
    if (realCount > 0) {
      const latest = await mongoose.connection.db.collection('episodes')
        .find({ podcastId: p._id })
        .sort({ publishedAt: -1 })
        .limit(1)
        .toArray();
      console.log(`  Latest Episode in DB: "${latest[0].title}" (Published: ${latest[0].publishedAt})`);
    }
  }

  await mongoose.connection.close();
}

main();
