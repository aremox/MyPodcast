const mongoose = require('mongoose');

// Let's define the schema exactly as NestJS would, utilizing SchemaFactory.createForClass or plain mongoose.
// Wait, NestJS @Prop({ type: Types.ObjectId }) maps to type: mongoose.Schema.Types.ObjectId.
const { Schema } = mongoose;

const EpisodeSchema = new Schema({
  podcastId: { type: mongoose.Schema.Types.ObjectId, ref: 'Podcast', required: true, index: true },
  title: String,
  publishedAt: Date,
}, { timestamps: true });

const EpisodeModel = mongoose.model('Episode', EpisodeSchema);

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  console.log('Connected to MongoDB');

  const podcastIdStr = '6a0c1cbee6d5ea4a4431979b';

  // Let's find one raw episode from the DB
  const rawEpisode = await mongoose.connection.db.collection('episodes').findOne({});
  console.log('Raw episode podcastId type in DB:', typeof rawEpisode.podcastId, rawEpisode.podcastId);

  // Let's query using the schema and string
  const epsStr = await EpisodeModel.find({ podcastId: podcastIdStr });
  console.log('Querying with string:', epsStr.length);

  // Let's query using schema and ObjectId
  const epsObj = await EpisodeModel.find({ podcastId: new mongoose.Types.ObjectId(podcastIdStr) });
  console.log('Querying with ObjectId:', epsObj.length);

  // Wait! Let's check what collection NestJS is actually using!
  // Is it possible that NestJS is looking at a different collection?
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:', collections.map(c => c.name));

  await mongoose.connection.close();
}

main();
