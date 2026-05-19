const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const subs = await mongoose.connection.db.collection('subscriptions').find({}).toArray();
  console.log('Total subscriptions:', subs.length);
  if (subs.length > 0) {
    console.log('First subscription:', subs[0]);
    console.log('userId type:', typeof subs[0].userId, subs[0].userId.constructor.name);
    console.log('podcastId type:', typeof subs[0].podcastId, subs[0].podcastId.constructor.name);
  }

  const history = await mongoose.connection.db.collection('playhistories').find({}).toArray();
  console.log('Total history records:', history.length);
  if (history.length > 0) {
    console.log('First history:', history[0]);
  }

  const syncconfigs = await mongoose.connection.db.collection('syncconfigs').find({}).toArray();
  console.log('Total syncconfigs:', syncconfigs.length);
  if (syncconfigs.length > 0) {
    console.log('First syncconfig queue:', syncconfigs[0].queue);
  }

  await mongoose.connection.close();
}

main();
