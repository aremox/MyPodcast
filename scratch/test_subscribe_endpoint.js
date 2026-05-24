const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const tempUsername = 'test_subscribe_user';
  const tempEmail = 'test_sub@example.com';
  const tempPassword = 'password123';
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // Re-create temporary user
  await mongoose.connection.db.collection('users').deleteOne({ username: tempUsername });
  await mongoose.connection.db.collection('users').insertOne({
    username: tempUsername,
    email: tempEmail,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  try {
    // 1. Login
    console.log('Logging in to acquire JWT token...');
    const loginRes = await axios.post('http://localhost:3333/api/auth/login', {
      email: tempEmail,
      password: tempPassword
    });
    const token = loginRes.data.accessToken;
    console.log('Token acquired successfully!');

    // 2. Subscribe to the episode URL
    const episodeUrl = 'https://www.ivoox.com/perspectivas-mercado-energetico-ia-redes-y-audios-mp3_rf_173725237_1.html';
    console.log(`Sending subscription request for episode URL: ${episodeUrl}`);

    const subRes = await axios.post('http://localhost:3333/api/podcasts/subscribe', 
      { url: episodeUrl },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('Subscription response status:', subRes.status);
    console.log('Podcast subscribed data:', JSON.stringify(subRes.data, null, 2));

    // 3. Verify in MongoDB how many episodes were actually inserted
    const podcastDoc = await mongoose.connection.db.collection('podcasts').findOne({ title: /Apasionados/i });
    if (podcastDoc) {
      console.log('\n--- MongoDB Verification ---');
      console.log(`Podcast found in DB: "${podcastDoc.title}" (ID: ${podcastDoc._id})`);
      console.log(`Podcast document episodeCount: ${podcastDoc.episodeCount}`);
      
      const count = await mongoose.connection.db.collection('episodes').countDocuments({ podcastId: podcastDoc._id });
      console.log(`Actual episodes count in MongoDB for this podcast: ${count}`);
    } else {
      console.log('ERROR: Podcast was not found in podcasts collection!');
    }

  } catch (err) {
    console.error('API Error:', err.response ? err.response.data : err.message);
  } finally {
    // Cleanup temporary user
    await mongoose.connection.db.collection('users').deleteOne({ username: tempUsername });
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

main().catch(err => {
  console.error('Fatal Error:', err);
});
