const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  const episodeId = '6a167a5cef5fb60caf6cce8e'; // The first episode in the user's list

  try {
    console.log('Logging in to production API...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    console.log('Authentication successful.');
    
    const proxyUrl = `${baseUrl}/proxy/audio/${episodeId}?token=${token}`;
    console.log(`\nFetching proxy URL: ${proxyUrl}`);

    try {
      const res = await axios.get(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });
      console.log(`SUCCESS! Status: ${res.status} ${res.statusText}`);
      console.log('Headers:', res.headers);
    } catch (e) {
      console.error('Request failed!');
      if (e.response) {
        console.error(`Status: ${e.response.status} ${e.response.statusText}`);
        console.error('Headers:', e.response.headers);
        console.error('Body:', JSON.stringify(e.response.data));
      } else {
        console.error('Error:', e.message);
      }
    }

  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

main();
