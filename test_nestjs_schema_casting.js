const mongoose = require('mongoose');
const { SchemaFactory } = require('@nestjs/mongoose');
const { Prop, Schema } = require('@nestjs/mongoose');
const { Types } = mongoose;

@Schema()
class Episode {
  @Prop({ type: Types.ObjectId, ref: 'Podcast', required: true, index: true })
  podcastId;
}

const EpisodeSchema = SchemaFactory.createForClass(Episode);
const EpisodeModel = mongoose.model('Episode_Nest', EpisodeSchema);

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  
  const podcastIdStr = '6a0c1cbee6d5ea4a4431979b';
  
  // Create an instance and see how it casts
  const testEp = new EpisodeModel({
    podcastId: podcastIdStr,
    title: 'test'
  });
  console.log('Casted podcastId on save/instance creation:', testEp.podcastId, typeof testEp.podcastId, testEp.podcastId instanceof mongoose.Types.ObjectId);

  // Run a find query using a string
  // Let's use the real 'episodes' collection with our compiled NestJS schema
  const RealEpisodeModel = mongoose.model('Episode_Real', EpisodeSchema, 'episodes');
  const epsStr = await RealEpisodeModel.find({ podcastId: podcastIdStr }).limit(5);
  console.log('Query with string on NestJS-like model:', epsStr.length);
  
  const epsObj = await RealEpisodeModel.find({ podcastId: new Types.ObjectId(podcastIdStr) }).limit(5);
  console.log('Query with ObjectId on NestJS-like model:', epsObj.length);

  await mongoose.close();
}

// Since decorators aren't supported in plain JS without babel/ts-node, we can run this by installing/running ts-node or transpiling.
// Actually, let's just write a TS file and run it with ts-node!
