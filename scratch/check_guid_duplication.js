const axios = require('axios');
const Parser = require('rss-parser');

async function main() {
  const email = 'arenasmorante@gmail.com';
  const password = 'AB09041984qs.';
  const baseUrl = 'https://podcast.aremox.com/api';
  
  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password });
    const token = loginRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching feed to get GUIDs...');
    const parser = new Parser();
    const feed = await parser.parseURL('https://feeds.ivoox.com/feed_fg_f11186399_filtro_1.xml');
    
    console.log(`Feed has ${feed.items.length} items.`);
    
    // Let's check a few GUIDs in the DB by searching or matching
    const sampleGuids = feed.items.slice(0, 10).map(item => item.guid || item.link);
    console.log('Checking first 10 GUIDs in DB...');
    
    for (const guid of sampleGuids) {
      // Since we don't have a direct guid lookup endpoint, let's see if we can search for the title
      const item = feed.items.find(i => (i.guid || i.link) === guid);
      console.log(`Checking title: "${item.title}" | GUID: "${guid}"`);
      
      const searchRes = await axios.get(`${baseUrl}/episodes/search?q=${encodeURIComponent(item.title)}`, { headers })
        .catch(err => ({ data: { error: err.message } }));
        
      if (searchRes.data && Array.isArray(searchRes.data.data)) {
        const found = searchRes.data.data;
        console.log(`  Found ${found.length} matching episodes in search:`);
        for (const f of found) {
          console.log(`    - ID: ${f._id} | PodcastId: ${JSON.stringify(f.podcastId)} | GUID: "${f.guid}"`);
        }
      } else {
        console.log(`  Search failed or returned no array:`, searchRes.data);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
