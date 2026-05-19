const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  
  const podcasts = await mongoose.connection.db.collection('podcasts').find({}).toArray();
  console.log(`Total podcasts in DB: ${podcasts.length}`);
  podcasts.forEach((p, i) => {
    console.log(`${i + 1}. ID: ${p._id}, Title: ${p.title}, Feed URL: ${p.rssFeedUrl}, Count: ${p.episodeCount}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
