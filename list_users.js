const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  console.log('Users in DB:');
  for (const u of users) {
    console.log(`- Username: ${u.username}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Password Hash: ${u.password}`);
  }
  await mongoose.connection.close();
}

main();
