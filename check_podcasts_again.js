const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  const db = mongoose.connection.db;
  
  const podcasts = await db.collection('podcasts').find({}).toArray();
  for (const podcast of podcasts) {
      const count = await db.collection('episodes').countDocuments({ podcastId: podcast._id });
      console.log(`Podcast: ${podcast.title} (${podcast._id}) - DB Count: ${count}`);
      
      const eps = await db.collection('episodes').find({ podcastId: podcast._id }).sort({ publishedAt: -1 }).limit(1).toArray();
      if (eps.length > 0) {
          console.log(`  -> Latest: ${eps[0].title} (${eps[0].publishedAt})`);
      }
  }
  
  process.exit(0);
}
check().catch(console.error);
