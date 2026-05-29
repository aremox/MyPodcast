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
    
    console.log('Fetching all podcasts...');
    const podcastsRes = await axios.get(`${baseUrl}/podcasts`, { headers });
    const podcasts = podcastsRes.data.data || [];
    console.log(`Found ${podcasts.length} podcasts in database:`);
    
    for (const p of podcasts) {
      console.log(`- Title: "${p.title}" | ID: ${p._id} | EpisodeCount field: ${p.episodeCount} | rssFeedUrl: ${p.rssFeedUrl}`);
      // Let's count actual episodes in DB
      const epRes = await axios.get(`${baseUrl}/episodes/podcast/${p._id}?page=1&limit=5`, { headers });
      console.log(`  Actual episodes in DB: ${epRes.data.total}`);
      const episodes = epRes.data.episodes || epRes.data.data || [];
      for (const ep of episodes) {
        console.log(`    * Title: "${ep.title}"`);
        console.log(`      ID: ${ep._id} | guid: "${ep.guid}" | publishedAt: ${ep.publishedAt}`);
        console.log(`      audioUrl: "${ep.audioUrl}"`);
      }
    }

    console.log('\nFetching recent episodes globally...');
    const recentRes = await axios.get(`${baseUrl}/episodes/recent?limit=50`, { headers });
    const recents = recentRes.data.data || [];
    console.log(`Found ${recents.length} recent episodes in DB:`);
    for (const ep of recents) {
      console.log(`- Title: "${ep.title}"`);
      console.log(`  Episode ID: ${ep._id} | guid: "${ep.guid}"`);
      console.log(`  podcastId: ${JSON.stringify(ep.podcastId)}`);
    }
  } catch (error) {
    console.error('Error querying production API:', error.response?.data || error.message);
  }
}

main();
