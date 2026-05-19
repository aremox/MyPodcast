const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  const db = mongoose.connection.db;
  
  const podcast = await db.collection('podcasts').findOne();
  console.log(podcast);
  
  process.exit(0);
}
check().catch(console.error);
