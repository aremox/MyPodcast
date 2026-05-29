const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching subscriptions...');
    const subsRes = await axios.get(`${baseUrl}/library/subscriptions`, { headers });
    const subs = subsRes.data.data || subsRes.data || [];
    console.log(`Total subscriptions: ${subs.length}`);
    
    for (const sub of subs) {
      const podcast = sub.podcastId;
      if (podcast) {
        console.log(`\nPodcast: ${podcast.title}`);
        console.log(`  _id: ${podcast._id}`);
        console.log(`  imageUrl: ${podcast.imageUrl}`);
        console.log(`  ivooxUrl: ${podcast.ivooxUrl}`);
        console.log(`  rssFeedUrl: ${podcast.rssFeedUrl}`);
        console.log(`  ivooxId: ${podcast.ivooxId}`);
      } else {
        console.log(`\nSubscription ${sub._id} has null podcastId! Raw:`, sub);
      }
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
