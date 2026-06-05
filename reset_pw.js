const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27018/mypodcast').then(async () => {
  const hash = await bcrypt.hash('password123', 12);
  await mongoose.connection.db.collection('users').updateOne(
    { username: 'testuser' },
    { $set: { password: hash } }
  );
  console.log('Password reset successfully');
  process.exit(0);
});
