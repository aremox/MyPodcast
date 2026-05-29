const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  // Let's create a clean test collection
  try {
    await db.collection('test_episodes').drop();
    console.log('Cleared existing test collection.');
  } catch (e) {
    // Ignore if not exists
  }

  // Insert two test records: one with string podcastId, one with ObjectId podcastId
  const podcastIdStr = '6a024ea48a030b7b478e19f0';
  const podcastIdObj = new mongoose.Types.ObjectId(podcastIdStr);

  console.log('Inserting test documents...');
  await db.collection('test_episodes').insertMany([
    {
      title: 'String Episode',
      podcastId: podcastIdStr, // stored as string
      guid: 'guid-1',
      publishedAt: new Date()
    },
    {
      title: 'ObjectId Episode',
      podcastId: podcastIdObj, // stored as ObjectId
      guid: 'guid-2',
      publishedAt: new Date()
    },
    {
      title: 'Invalid String Episode',
      podcastId: 'not-a-valid-hex-id', // should be ignored by regex filter
      guid: 'guid-3',
      publishedAt: new Date()
    }
  ]);

  console.log('\n--- Before Migration ---');
  let docs = await db.collection('test_episodes').find({}).toArray();
  for (const doc of docs) {
    console.log(`Document "${doc.title}":`);
    console.log(`  podcastId: ${JSON.stringify(doc.podcastId)}`);
    console.log(`  type: ${doc.podcastId.constructor.name || typeof doc.podcastId}`);
  }

  console.log('\nRunning migration query...');
  const result = await db.collection('test_episodes').updateMany(
    { 
      podcastId: { $type: 'string', $regex: /^[0-9a-fA-F]{24}$/ } 
    },
    [
      { $set: { podcastId: { $toObjectId: '$podcastId' } } }
    ]
  );
  console.log('Migration query executed.');
  console.log(`Matched: ${result.matchedCount} | Modified: ${result.modifiedCount}`);

  console.log('\n--- After Migration ---');
  docs = await db.collection('test_episodes').find({}).toArray();
  for (const doc of docs) {
    console.log(`Document "${doc.title}":`);
    console.log(`  podcastId: ${JSON.stringify(doc.podcastId)}`);
    console.log(`  type: ${doc.podcastId.constructor.name || typeof doc.podcastId}`);
  }

  // Clean up
  await db.collection('test_episodes').drop();
  console.log('\nTest collection dropped.');

  await mongoose.connection.close();
}

main().catch(console.error);
