const mongoose = require('mongoose');

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected!');

  // Define schemas inline to perform database operations
  const Podcast = mongoose.model('Podcast', new mongoose.Schema({}, { strict: false }));
  const Subscription = mongoose.model('Subscription', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    podcastId: mongoose.Schema.Types.ObjectId,
    notifications: { type: Boolean, default: true }
  }, { timestamps: true }));
  const Episode = mongoose.model('Episode', new mongoose.Schema({
    podcastId: mongoose.Schema.Types.ObjectId,
    publishedAt: Date
  }, { strict: false }));
  const SyncConfig = mongoose.model('SyncConfig', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    queue: [mongoose.Schema.Types.ObjectId]
  }, { strict: false }));

  const userIdStr = '6a09c96b9a0d4e42caa847a8'; // testuser ID
  const userId = new mongoose.Types.ObjectId(userIdStr);

  // 1. Find La Ruina
  const podcast = await Podcast.findOne({ title: 'La Ruina' });
  if (!podcast) {
    console.error('La Ruina not found in database!');
    await mongoose.connection.close();
    return;
  }
  console.log(`Found La Ruina with ID: ${podcast._id}`);

  // 2. Add subscription
  const sub = await Subscription.findOneAndUpdate(
    { userId, podcastId: podcast._id },
    { userId, podcastId: podcast._id },
    { upsert: true, new: true }
  );
  console.log(`Created/Updated user subscription:`, sub);

  // 3. Find episodes of La Ruina
  const episodes = await Episode.find({ podcastId: podcast._id }).sort({ publishedAt: -1 }).exec();
  console.log(`Found ${episodes.length} episodes for La Ruina`);

  // 4. Populated user's sync config queue with those episodes (e.g. latest 25 episodes to be safe and clean)
  const episodeIds = episodes.slice(0, 25).map(ep => ep._id);
  const syncConfig = await SyncConfig.findOneAndUpdate(
    { userId },
    { $set: { queue: episodeIds } },
    { upsert: true, new: true }
  );
  console.log(`Updated sync config queue with ${episodeIds.length} episodes:`, syncConfig.queue.length);

  await mongoose.connection.close();
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
