const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching sync-config...');
    const configRes = await axios.get(`${baseUrl}/library/sync-config`, { headers });
    console.log('Sync Config response:', JSON.stringify(configRes.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
