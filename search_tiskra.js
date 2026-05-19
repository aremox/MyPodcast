const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const p = await mongoose.connection.db.collection('podcasts').findOne({ title: /tiskra/i });
  console.log('Podcast by title:', p);

  if (p) {
    const eps = await mongoose.connection.db.collection('episodes').find({ podcastId: p._id }).toArray();
    console.log('Episodes count by ObjectId:', eps.length);

    const epsStr = await mongoose.connection.db.collection('episodes').find({ podcastId: String(p._id) }).toArray();
    console.log('Episodes count by String:', epsStr.length);
  }

  await mongoose.connection.close();
}

main();
