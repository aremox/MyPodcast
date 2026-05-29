const axios = require('axios');

async function main() {
  const baseUrl = 'https://podcast.aremox.com/api';
  try {
    console.log('Sending a simple GET request to production podcasts endpoint...');
    const res = await axios.get(`${baseUrl}/podcasts`, { timeout: 8000 });
    console.log(`Response status: ${res.status}`);
    console.log(`Success! API is up. Number of podcasts: ${res.data.data?.length || res.data.length}`);
  } catch (error) {
    if (error.response) {
      console.error(`FAILED: API returned status ${error.response.status}`);
      console.error('Response body:', error.response.data);
    } else {
      console.error(`FAILED: ${error.message}`);
    }
  }
}

main();
