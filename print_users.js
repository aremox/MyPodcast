const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected');
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('Users count:', users.length);
  for (const u of users) {
    console.log('User:', JSON.stringify(u, null, 2));
  }
  await mongoose.connection.close();
}

main();
