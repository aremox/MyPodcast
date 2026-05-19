const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  const db = mongoose.connection.db;
  
  const podcast = await db.collection('podcasts').findOne();
  
  const eps = await db.collection('episodes').find({}).limit(10).toArray();
  for (const ep of eps) {
      console.log(`Episode: ${ep.title} - podcastId type: ${typeof ep.podcastId}, isObjectId: ${ep.podcastId instanceof mongoose.Types.ObjectId}`);
  }
  
  process.exit(0);
}
check().catch(console.error);
