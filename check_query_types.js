const http = require('http');

async function test() {
    // Need to login to get a token, but let's see if we can just test the DB directly with the exact query Mongoose is running.
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://localhost:27017/mypodcast');
    const db = mongoose.connection.db;

    const podcastIdStr = '6a0c1cbee6d5ea4a4431979b';
    const objectId = new mongoose.Types.ObjectId(podcastIdStr);

    console.log("Querying with string:", await db.collection('episodes').countDocuments({ podcastId: podcastIdStr }));
    console.log("Querying with ObjectId:", await db.collection('episodes').countDocuments({ podcastId: objectId }));

    process.exit(0);
}

test().catch(console.error);
