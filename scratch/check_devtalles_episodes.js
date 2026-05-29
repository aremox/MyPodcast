const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Searching recent episodes for "Spec Driven Design" or "Realidades"...');
    // Let's use search or just fetch the podcasts
    const searchRes1 = await axios.get(`${baseUrl}/episodes/search?q=Spec+Driven+Design`, { headers });
    console.log('Search "Spec Driven Design" results:', JSON.stringify(searchRes1.data, null, 2));

    const searchRes2 = await axios.get(`${baseUrl}/episodes/search?q=Realidades+de+un+Departamento`, { headers });
    console.log('Search "Realidades de un Departamento" results:', JSON.stringify(searchRes2.data, null, 2));

    console.log('Querying all episodes in DB matching GUIDs...');
    // We can search for any episode with podcastId = DevTalles ID
    const devTallesId = '6a0c36570a0726a16aa04d23';
    const epRes = await axios.get(`${baseUrl}/episodes/podcast/${devTallesId}?page=1&limit=100`, { headers });
    console.log(`Total episodes for DevTalles ID in DB: ${epRes.data.total}`);
    console.log('Episodes list:', (epRes.data.episodes || []).map(e => ({ title: e.title, guid: e.guid, podcastId: e.podcastId })));

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
