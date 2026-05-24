const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  
  // List indexes on episodes
  console.log('Indexes on episodes collection:');
  const indexes = await db.collection('episodes').indexes();
  console.log(JSON.stringify(indexes, null, 2));

  // Count empty or null guids in episodes
  console.log('\nChecking for null or empty guids:');
  const emptyGuids = await db.collection('episodes').countDocuments({ guid: { $in: [null, "", undefined] } });
  console.log('Episodes with empty or null guid:', emptyGuids);

  // Find any duplicate guids in the episodes collection
  console.log('\nChecking for duplicate guids:');
  const duplicates = await db.collection('episodes').aggregate([
    { $group: { _id: "$guid", count: { $sum: 1 }, titles: { $push: "$title" } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log('Duplicate guids found:', duplicates.length);
  for (const dup of duplicates.slice(0, 5)) {
    console.log(`- GUID: "${dup._id}" (Count: ${dup.count})`);
    console.log(`  Titles: ${JSON.stringify(dup.titles)}`);
  }

  await mongoose.connection.close();
}

main().catch(console.error);
