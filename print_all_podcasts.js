const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const podcasts = await mongoose.connection.db.collection('podcasts').find({}).toArray();
  console.log('Total podcasts in DB:', podcasts.length);
  for (const p of podcasts) {
    console.log('Podcast:', JSON.stringify(p, null, 2));
  }

  await mongoose.connection.close();
}

main();
