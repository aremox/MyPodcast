const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017/mypodcast');
  await client.connect();
  const db = client.db('mypodcast');
  
  const episodes = await db.collection('episodes').find({}).limit(5).toArray();
  for (const ep of episodes) {
    console.log('Title:', ep.title);
    console.log('  podcastId value:', ep.podcastId, 'Type:', typeof ep.podcastId, 'isObjectId:', ep.podcastId instanceof ObjectId);
  }
  
  // Try querying with string vs ObjectId in raw driver
  const countStr = await db.collection('episodes').countDocuments({ podcastId: '6a0c1cbee6d5ea4a4431979b' });
  const countObj = await db.collection('episodes').countDocuments({ podcastId: new ObjectId('6a0c1cbee6d5ea4a4431979b') });
  
  console.log('Raw query count with string:', countStr);
  console.log('Raw query count with ObjectId:', countObj);
  
  await client.close();
}

main();
