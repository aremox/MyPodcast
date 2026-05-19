const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/admin');
  console.log('Connected to MongoDB admin');

  const adminDb = mongoose.connection.useDb('admin').db;
  const result = await adminDb.admin().listDatabases();
  console.log('Databases:', result.databases);

  await mongoose.connection.close();
}

main();
