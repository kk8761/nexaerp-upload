const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  password: 'postgres',
  database: 'nexaerp',
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
