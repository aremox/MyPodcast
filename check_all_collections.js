const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments({});
    console.log(`Collection: ${col.name} - Count: ${count}`);
    if (count > 0) {
      const samples = await db.collection(col.name).find({}).limit(3).toArray();
      console.log(`  Samples from ${col.name}:`);
      samples.forEach(s => {
        console.log(`    - ${JSON.stringify(s).substring(0, 300)}`);
      });
    }
  }

  await mongoose.connection.close();
}

main();
