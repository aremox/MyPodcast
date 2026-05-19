const mongoose = require('mongoose');

async function checkUrl(url) {
  console.log(`Checking ${url}...`);
  try {
    const conn = await mongoose.createConnection(url, { serverSelectionTimeoutMS: 2000 }).asPromise();
    const dbList = await conn.db.admin().listDatabases();
    console.log(`  Databases:`, dbList.databases.map(d => d.name));
    if (dbList.databases.some(d => d.name === 'mypodcast')) {
      const db = conn.useDb('mypodcast');
      const podcasts = await db.collection('podcasts').find({}).toArray();
      console.log(`  mypodcast podcasts count:`, podcasts.length);
      for (const p of podcasts) {
        console.log(`    - "${p.title}" (ID: ${p._id}, episodeCount: ${p.episodeCount})`);
        const eps = await db.collection('episodes').countDocuments({ podcastId: p._id });
        console.log(`      Actual episodes with ObjectId podcastId: ${eps}`);
        const epsStr = await db.collection('episodes').countDocuments({ podcastId: String(p._id) });
        console.log(`      Actual episodes with String podcastId: ${epsStr}`);
      }
    }
    await conn.close();
  } catch (err) {
    console.log(`  Failed to connect:`, err.message);
  }
}

async function main() {
  await checkUrl('mongodb://127.0.0.1:27017');
  await checkUrl('mongodb://[::1]:27017');
  await checkUrl('mongodb://localhost:27017');
}

main();
