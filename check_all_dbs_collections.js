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
        const docs = await db.collection(collName).find({}).limit(5).toArray();
        console.log(`  Samples from "${collName}":`);
        docs.forEach((doc, i) => {
          console.log(`    [${i}] _id: ${doc._id}, name/title/email: ${doc.title || doc.name || doc.email || doc.username || doc.guid}`);
        });
      }
    }
  }

  await mongoose.connection.close();
}

main();
