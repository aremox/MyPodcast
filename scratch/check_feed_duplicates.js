const Parser = require('rss-parser');
const parser = new Parser();

async function checkFeed(name, url) {
  try {
    const feed = await parser.parseURL(url);
    console.log(`\n=== Feed: ${name} (${url}) ===`);
    console.log('Total items:', feed.items.length);
    
    const guids = {};
    const audioUrls = {};
    let nullGuidCount = 0;
    let duplicateGuidCount = 0;
    
    for (let i = 0; i < feed.items.length; i++) {
      const item = feed.items[i];
      const guid = item.guid || item.link || '';
      const audioUrl = item.enclosure?.url || '';
      
      if (!guid) {
        nullGuidCount++;
      } else if (guids[guid]) {
        duplicateGuidCount++;
        if (duplicateGuidCount <= 5) {
          console.log(`  Duplicate GUID found: "${guid}"`);
          console.log(`    First seen on item ${guids[guid].index}: "${guids[guid].title}"`);
          console.log(`    Now seen on item ${i}: "${item.title}"`);
        }
      } else {
        guids[guid] = { index: i, title: item.title };
      }
    }
    
    console.log(`Results: Null/empty GUIDs: ${nullGuidCount} | Duplicate GUIDs: ${duplicateGuidCount}`);
  } catch (err) {
    console.error(`Error checking ${name}:`, err.message);
  }
}

async function main() {
  await checkFeed('Somos Eléctricos', 'https://feeds.ivoox.com/feed_fg_f1627406_filtro_1.xml');
  await checkFeed('TISKRA', 'https://feeds.ivoox.com/feed_fg_f11248619_filtro_1.xml');
  await checkFeed('Fallo de sistema', 'https://feeds.ivoox.com/feed_fg_f120398_filtro_1.xml');
  await checkFeed('monos estocásticos', 'https://feeds.ivoox.com/feed_fg_f11795412_filtro_1.xml');
}

main();
