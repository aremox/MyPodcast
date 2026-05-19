const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017');
  console.log('Connected to MongoDB');

  const admin = mongoose.connection.db.admin();
  const dbList = await admin.listDatabases();
  
  for (const dbInfo of dbList.databases) {
    const dbName = dbInfo.name;
    if (['admin', 'config', 'local'].includes(dbName)) continue;
    
    console.log(`\n--- DB: ${dbName} ---`);
    const db = mongoose.connection.useDb(dbName);
    const collections = await db.db.listCollections().toArray();
    
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const count = await db.collection(collName).countDocuments();
      console.log(`Collection "${collName}" has ${count} documents.`);
      
      if (count > 0) {
        // Search for "Tiskra" or "Bitcoin"
        const samples = await db.collection(collName).find({
          $or: [
            { title: /tiskra/i },
            { name: /tiskra/i },
            { guid: /tiskra/i },
            { description: /tiskra/i },
            { url: /tiskra/i },
            { audioUrl: /tiskra/i },
            { title: /bitcoin/i },
            { description: /bitcoin/i }
          ]
        }).toArray();
        if (samples.length > 0) {
          console.log(`  FOUND matches in "${collName}":`, samples.length);
          samples.forEach(s => {
            console.log(`    - _id: ${s._id}, title/name: ${s.title || s.name || s.username}`);
          });
        }
      }
    }
  }

  await mongoose.connection.close();
}

main();
