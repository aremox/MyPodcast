const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const podcasts = await mongoose.connection.db.collection('podcasts').find({}).toArray();
  console.log('Podcasts:');
  for (const p of podcasts) {
    console.log(`- ID: ${p._id}, Title: ${p.title}, Feed: ${p.rssFeedUrl}, Episodes count field: ${p.episodeCount}`);
    const count = await mongoose.connection.db.collection('episodes').countDocuments({ podcastId: p._id });
    console.log(`  Actual episodes in DB: ${count}`);
    
    const sample = await mongoose.connection.db.collection('episodes').find({ podcastId: p._id }).sort({ publishedAt: -1 }).limit(3).toArray();
    console.log(`  Sample episodes:`);
    sample.forEach(s => console.log(`    * ${s.title} (${s.publishedAt}) guid: ${s.guid}`));
  }

  await mongoose.connection.close();
}

main();
