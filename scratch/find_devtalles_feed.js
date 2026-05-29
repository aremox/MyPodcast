const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    const podcastsRes = await axios.get(`${baseUrl}/podcasts`, { headers });
    const podcasts = podcastsRes.data.data || podcastsRes.data || [];
    
    const devTalles = podcasts.find(p => p.title.toLowerCase().includes('devtalles'));
    if (devTalles) {
      console.log('DevTalles Podcast:', JSON.stringify(devTalles, null, 2));
    } else {
      console.log('DevTalles not found in podcasts:', podcasts.map(p => p.title));
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
