const axios = require('axios');
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  // Let's find the user
  const user = await mongoose.connection.db.collection('users').findOne({ username: 'testuser' });
  if (!user) {
    console.log('User testuser not found');
    await mongoose.connection.close();
    return;
  }
  console.log('Found user:', user.username, user.email);

  // Since we don't know the plain password, let's create a temporary user with a known password to test!
  const bcrypt = require('bcryptjs');
  const tempUsername = 'temp_test_user';
  const tempEmail = 'temp@example.com';
  const tempPassword = 'password123';
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // Delete if exists
  await mongoose.connection.db.collection('users').deleteOne({ username: tempUsername });
  await mongoose.connection.db.collection('users').insertOne({
    username: tempUsername,
    email: tempEmail,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('Inserted temp user');

  try {
    // Log in via the API
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: tempEmail,
      password: tempPassword
    });
    
    // Correct token key: accessToken
    const token = loginRes.data.accessToken;
    console.log('Login successful! Token acquired:', token ? 'YES' : 'NO');

    // Request episodes for "La Ruina" (ID: 6a0c1cbee6d5ea4a4431979b)
    console.log('Requesting episodes...');
    const episodesRes = await axios.get('http://localhost:3000/api/episodes/podcast/6a0c1cbee6d5ea4a4431979b', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Episodes API Response status:', episodesRes.status);
    console.log('Response data keys:', Object.keys(episodesRes.data));
    console.log('Success:', episodesRes.data.success);
    console.log('Total:', episodesRes.data.total);
    console.log('Data length:', episodesRes.data.data?.length);
    if (episodesRes.data.data?.length > 0) {
      console.log('First episode:', episodesRes.data.data[0].title);
    }
  } catch (err) {
    console.error('API request failed:', err.response ? err.response.data : err.message);
  } finally {
    // Clean up temp user
    await mongoose.connection.db.collection('users').deleteOne({ username: tempUsername });
    await mongoose.connection.close();
  }
}

main();
