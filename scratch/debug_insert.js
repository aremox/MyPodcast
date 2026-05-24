const mongoose = require('mongoose');

async function debug() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  // Let's find the podcast ID or create a dummy one
  let podcast = await mongoose.connection.db.collection('podcasts').findOne({ title: /Apasionados/i });
  if (!podcast) {
    console.log('Apasionados podcast not found in podcasts, finding in testpodcasts...');
    podcast = await mongoose.connection.db.collection('testpodcasts').findOne({ title: /Apasionados/i });
    if (podcast) {
      console.log('Found in testpodcasts. Inserting into podcasts...');
      const pCopy = { ...podcast };
      // Delete _id to let it auto-generate, or keep it
      await mongoose.connection.db.collection('podcasts').deleteOne({ title: /Apasionados/i });
      await mongoose.connection.db.collection('podcasts').insertOne(pCopy);
      podcast = pCopy;
    } else {
      console.log('Apasionados not found anywhere. Exiting.');
      process.exit(1);
    }
  }

  console.log('Podcast ID for Apasionados:', podcast._id);

  // Let's find all test episodes
  const testEps = await mongoose.connection.db.collection('testepisodes').find({}).toArray();
  console.log(`Found ${testEps.length} test episodes to copy.`);

  // Let's delete existing episodes for this podcast in episodes collection first
  await mongoose.connection.db.collection('episodes').deleteMany({ podcastId: podcast._id });

  let insertedCount = 0;
  for (let i = 0; i < testEps.length; i++) {
    const ep = testEps[i];
    const epCopy = {
      ...ep,
      podcastId: podcast._id, // ensure it uses the correct podcast ID
    };
    try {
      await mongoose.connection.db.collection('episodes').insertOne(epCopy);
      insertedCount++;
    } catch (err) {
      console.log(`Error inserting episode at index ${i} (${ep.title}):`);
      console.error(err);
      break;
    }
  }

  console.log(`Inserted ${insertedCount} episodes out of ${testEps.length}`);
  await mongoose.connection.close();
}

debug().catch(console.error);
