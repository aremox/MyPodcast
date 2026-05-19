const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  
  const podcastId = '6a0c1cbee6d5ea4a4431979b';
  const episodes = await mongoose.connection.db.collection('episodes').find({ podcastId: new mongoose.Types.ObjectId(podcastId) }).sort({ publishedAt: -1 }).toArray();
  
  console.log(`Total episodes for La Ruina: ${episodes.length}`);
  if (episodes.length > 0) {
    console.log('Latest 5 episodes:');
    episodes.slice(0, 5).forEach((ep, i) => {
      console.log(`  ${i + 1}. Title: ${ep.title}, Date: ${ep.publishedAt}, GUID: ${ep.guid}`);
    });
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
