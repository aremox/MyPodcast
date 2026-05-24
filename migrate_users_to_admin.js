const mongoose = require('mongoose');

async function main() {
  const ports = ['27018', '27017'];
  let connected = false;

  for (const port of ports) {
    try {
      const uri = `mongodb://localhost:${port}/mypodcast`;
      console.log(`Intentando conectar a ${uri}...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log(`Conectado exitosamente en el puerto ${port}`);
      connected = true;
      break;
    } catch (err) {
      console.log(`No se pudo conectar en el puerto ${port}: ${err.message}`);
    }
  }

  if (!connected) {
    console.error('Error: No se pudo conectar a ninguna base de datos MongoDB local.');
    process.exit(1);
  }

  try {
    const result = await mongoose.connection.db.collection('users').updateMany(
      {},
      { $set: { role: 'administrador' } }
    );
    console.log(`Éxito: Se han migrado ${result.modifiedCount} usuario(s) al rol de 'administrador'.`);
  } catch (err) {
    console.error('Error durante la migración:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('Conexión cerrada.');
  }
}

main();
