const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  const db = mongoose.connection.db;
  
  const podcasts = await db.collection('podcasts').find().toArray();
  console.log("Podcasts in DB:");
  for (const p of podcasts) {
      console.log(`- ${p.title} (${p._id})`);
      const eps = await db.collection('episodes').countDocuments({ podcastId: p._id });
      console.log(`  Episodes: ${eps}`);
  }
  
  process.exit(0);
}
check().catch(console.error);
