const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/mypodcast');
  
  const Podcast = mongoose.model('Podcast', new mongoose.Schema({}, { strict: false }));
  const Episode = mongoose.model('Episode', new mongoose.Schema({}, { strict: false }));
  
  const podcasts = await Podcast.find({}).exec();
  console.log(`Found ${podcasts.length} podcasts in database:`);
  for (const p of podcasts) {
    const epCount = await Episode.countDocuments({ podcastId: p._id }).exec();
    console.log(`- ID: ${p._id}, Title: "${p.title}", EpisodeCount in Podcast: ${p.episodeCount}, Count in DB: ${epCount}, RSS: ${p.rssFeedUrl}`);
  }
  
  await mongoose.connection.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
