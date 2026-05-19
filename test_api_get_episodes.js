const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast', required: true, index: true },
  title: { type: String, required: true },
  publishedAt: { type: Date, required: true },
});
const EpisodeModel = mongoose.model('Episode', EpisodeSchema);

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const podcastIdStr = '6a0c1cbee6d5ea4a4431979b';
  
  // Try querying with string ID
  const epsWithString = await EpisodeModel.find({ podcastId: podcastIdStr }).limit(5);
  console.log('Querying with string:', epsWithString.length, 'episodes found');
  
  // Try querying with ObjectId
  const epsWithObjectId = await EpisodeModel.find({ podcastId: new mongoose.Types.ObjectId(podcastIdStr) }).limit(5);
  console.log('Querying with ObjectId:', epsWithObjectId.length, 'episodes found');

  await mongoose.connection.close();
}

main();
