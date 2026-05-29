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
    const subs = subsRes.data.data || [];
    console.log(`Total subscriptions returned: ${subs.length}`);
    
    subs.forEach((sub, i) => {
      console.log(`\nSubscription ${i + 1}:`);
      console.log(`  _id: ${sub._id}`);
      console.log(`  userId: ${sub.userId}`);
      console.log(`  podcastId: ${JSON.stringify(sub.podcastId)}`);
      console.log(`  podcastId Type: ${sub.podcastId ? typeof sub.podcastId : 'null'}`);
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
