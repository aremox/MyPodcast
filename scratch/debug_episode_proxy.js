const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  const episodesToTest = [
    '6a183c5cb92f259e7eb97e09',
    '6a182e40f1145078f93de158',
    '6a197fc0837708a4cfabd307',
    '6a191d5a5ac7a7560b3c285a',
    '6a13d76487aec269274d8699',
    '6a153df1fdcb24f0274e3431',
    '6a17c4f0eb2f8699d3b0fb7b',
    '6a167a5cef5fb60caf6cce8e',
    '6a1835547638eb699e566a3b'
  ];

  try {
    console.log('Logging in to production API...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    console.log('Authentication successful.');
    
    const headers = { Authorization: `Bearer ${token}` };

    console.log('\nTesting proxy/audio endpoint on production server for each episode:');
    for (const id of episodesToTest) {
      try {
        const proxyRes = await axios.get(`${baseUrl}/proxy/audio/${id}`, {
          headers,
          timeout: 10000
        });
        console.log(`- Episode ${id}: SUCCESS (Status ${proxyRes.status})`);
      } catch (e) {
        if (e.response) {
          console.log(`- Episode ${id}: FAILED (Status ${e.response.status}) - ${JSON.stringify(e.response.data)}`);
        } else {
          console.log(`- Episode ${id}: FAILED (Error: ${e.message})`);
        }
      }
    }

  } catch (error) {
    console.error('Error in script:', error.response?.data || error.message);
  }
}

main();
