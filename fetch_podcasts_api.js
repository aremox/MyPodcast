const axios = require('axios');
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  
  const bcrypt = require('bcryptjs');
  const tempUsername = 'temp_test_user_p';
  const tempEmail = 'temp_p@example.com';
  const tempPassword = 'password123';
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await mongoose.connection.db.collection('users').deleteOne({ username: tempUsername });
  await mongoose.connection.db.collection('users').insertOne({
    username: tempUsername,
    email: tempEmail,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: tempEmail,
      password: tempPassword
    });
    
    const token = loginRes.data.accessToken;
    console.log('Token acquired!');

    const podcastsRes = await axios.get('http://localhost:3000/api/podcasts', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Podcasts from API:', podcastsRes.data);

    // Let's also check all subscriptions
    const subsRes = await axios.get('http://localhost:3000/api/library/subscriptions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Subscriptions from API:', subsRes.data);

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  } finally {
    await mongoose.connection.db.collection('users').deleteOne({ username: tempUsername });
    await mongoose.connection.close();
  }
}

main();
