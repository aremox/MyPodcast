const Parser = require('rss-parser');
const parser = new Parser();

async function main() {
  const url = 'https://feeds.ivoox.com/feed_fg_f11031082_filtro_1.xml';
  console.log('Parsing feed:', url);
  const feed = await parser.parseURL(url);
  console.log(`Total items in feed: ${feed.items?.length}`);
  
  const guids = new Set();
  const duplicateGuids = [];
  const emptyGuids = [];
  
  feed.items.forEach((item, idx) => {
    const guid = item.guid || '';
    const link = item.link || '';
    if (!guid) {
      emptyGuids.push({ idx, title: item.title, link });
    } else if (guids.has(guid)) {
      duplicateGuids.push({ idx, title: item.title, guid });
    } else {
      guids.add(guid);
    }
    
    if (idx < 5) {
      console.log(`Episode ${idx + 1}:`);
      console.log(`  Title: ${item.title}`);
      console.log(`  GUID: "${item.guid}"`);
      console.log(`  Link: "${item.link}"`);
      console.log(`  Enclosure length/type: ${item.enclosure?.length} / ${item.enclosure?.type}`);
    }
  });
  
  console.log(`Unique GUIDs: ${guids.size}`);
  console.log(`Duplicate GUIDs count: ${duplicateGuids.length}`);
  console.log(`Empty GUIDs count: ${emptyGuids.length}`);
}

main().catch(err => console.error(err));
