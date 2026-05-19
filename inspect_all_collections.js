const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const collections = ['users', 'podcasts', 'episodes', 'subscriptions', 'syncconfigs', 'favorites', 'playhistories'];
  for (const coll of collections) {
    const docs = await mongoose.connection.db.collection(coll).find({}).toArray();
    console.log(`Collection "${coll}" has ${docs.length} documents.`);
    if (docs.length > 0 && coll !== 'episodes') {
      console.log(`Sample document from "${coll}":`, JSON.stringify(docs[0], null, 2));
    }
  }

  await mongoose.connection.close();
}

main();
