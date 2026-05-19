const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  const db = mongoose.connection.db;
  
  const podcast = await db.collection('podcasts').findOne({ title: /TISKRA/i });
  if (!podcast) {
    console.log("TISKRA not found. Showing all podcasts:");
    const all = await db.collection('podcasts').find().toArray();
    all.forEach(p => console.log(p.title));
    process.exit(0);
  }
  
  console.log("Podcast:", podcast.title);
  console.log("Podcast episodeCount field:", podcast.episodeCount);
  
  const total = await db.collection('episodes').countDocuments({ podcastId: podcast._id });
  console.log("Episodes in 'episodes' collection:", total);
  
  const episodes = await db.collection('episodes').find({ podcastId: podcast._id }).sort({ publishedAt: -1 }).toArray();
  console.log("Array length:", episodes.length);
  if (episodes.length > 0) {
      console.log("First episode:", episodes[0].title);
      console.log("Last episode:", episodes[episodes.length-1].title);
  }
  
  process.exit(0);
}
check().catch(console.error);
