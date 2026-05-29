const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  try {
    console.log('Logging in to production API...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    
    const headers = {
      Authorization: `Bearer ${token}`
    };

    const targetPodcastId = '6a024ea48a030b7b478e19f0'; // Fallo de sistema
    console.log(`\nRefreshing podcast ID: ${targetPodcastId} ("Fallo de sistema")...`);
    const refreshRes = await axios.post(`${baseUrl}/podcasts/${targetPodcastId}/refresh`, {}, { headers });
    console.log('Refresh result:', refreshRes.data);

    // Let's count actual episodes in DB
    const epRes = await axios.get(`${baseUrl}/episodes/podcast/${targetPodcastId}?page=1&limit=5`, { headers });
    console.log(`Actual episodes in DB now: ${epRes.data.total}`);

  } catch (error) {
    console.error('Error querying production API:', error.response?.data || error.message);
  }
}

main();
