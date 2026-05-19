const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  const db = mongoose.connection.db;
  
  const podcast = await db.collection('podcasts').findOne({ title: /La Ruina/i });
  
  const episodes = await db.collection('episodes').find({ podcastId: podcast._id }).sort({ _id: -1 }).limit(10).toArray();
  console.log("Top 10 Episodes by ID (most recently added):");
  episodes.forEach(e => {
      console.log(`- ${e.title} (Published: ${e.publishedAt})`);
  });
  
  process.exit(0);
}
check().catch(console.error);
