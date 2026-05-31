const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});
client.connect()
  .then(() => {
    console.log('CONNECTED successfully to default postgres DB!');
    process.exit(0);
  })
  .catch(err => {
    console.error('CONNECTION FAILED:', err.message);
    process.exit(1);
  });
