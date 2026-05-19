const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected');
  const episodes = await mongoose.connection.db.collection('episodes').find({}).toArray();
  console.log('Episodes count:', episodes.length);
  episodes.forEach((ep, idx) => {
    if (idx < 5) {
      console.log(`Episode ${idx}:`);
      console.log(`  Title: ${ep.title}`);
      console.log(`  guid: ${JSON.stringify(ep.guid)} (type: ${typeof ep.guid})`);
    }
  });
  await mongoose.connection.close();
}

main();
