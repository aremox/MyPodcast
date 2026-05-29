const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Triggering refresh for DevTalles (6a0c36570a0726a16aa04d23)...');
    const refreshRes = await axios.post(`${baseUrl}/podcasts/6a0c36570a0726a16aa04d23/refresh`, {}, { headers });
    console.log('Refresh response:', JSON.stringify(refreshRes.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
