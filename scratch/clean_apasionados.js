const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Delete Apasionados podcast from both collections
  const laRuina = await db.collection('podcasts').findOne({ title: /La Ruina/i });
  
  let pResult;
  if (laRuina) {
    pResult = await db.collection('podcasts').deleteMany({ _id: { $ne: laRuina._id } });
  } else {
    pResult = await db.collection('podcasts').deleteMany({});
  }
  console.log(`Deleted ${pResult.deletedCount} other podcasts from podcasts collection.`);

  let eResult;
  if (laRuina) {
    eResult = await db.collection('episodes').deleteMany({ podcastId: { $ne: laRuina._id } });
  } else {
    eResult = await db.collection('episodes').deleteMany({});
  }
  console.log(`Deleted ${eResult.deletedCount} episodes from episodes collection.`);

  // Verify
  const podcasts = await db.collection('podcasts').find({}).toArray();
  console.log('Current podcasts in DB:', podcasts.map(p => p.title));

  await mongoose.connection.close();
}

main().catch(console.error);
