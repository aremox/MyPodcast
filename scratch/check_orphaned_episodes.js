const axios = require('axios');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching recent episodes globally to see if any recent DevTalles episodes exist...');
    const recentRes = await axios.get(`${baseUrl}/episodes/recent?limit=100`, { headers });
    const recents = recentRes.data.data || [];
    
    const devTallesRecent = recents.filter(e => e.title.toLowerCase().includes('devtalles') || e.title.toLowerCase().includes('spec-driven') || e.title.toLowerCase().includes('spec driven'));
    console.log(`Found ${devTallesRecent.length} DevTalles/Spec-related episodes in recent:`);
    for (const ep of devTallesRecent) {
      console.log(`- Title: "${ep.title}"`);
      console.log(`  ID: ${ep._id} | guid: "${ep.guid}"`);
      console.log(`  podcastId:`, JSON.stringify(ep.podcastId));
    }

    console.log('\nFetching ALL podcasts to check if there are multiple DevTalles entries...');
    const podcastsRes = await axios.get(`${baseUrl}/podcasts`, { headers });
    const podcasts = podcastsRes.data.data || [];
    for (const p of podcasts) {
      console.log(`- "${p.title}" | ID: ${p._id} | rssFeedUrl: ${p.rssFeedUrl}`);
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
