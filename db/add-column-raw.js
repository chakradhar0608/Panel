const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function getDatabaseUrl() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
    if (match) return match[1];
  }
  return process.env.DATABASE_URL;
}

async function run() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    console.error("DATABASE_URL not found in .env or process.env");
    process.exit(1);
  }
  console.log("Connecting to:", dbUrl.replace(/:[^:@]+@/, ':****@')); // hide password
  
  try {
    const connection = await mysql.createConnection(dbUrl);
    await connection.query("ALTER TABLE Offer ADD COLUMN isLimited TINYINT(1) DEFAULT 0");
    console.log("Column isLimited added successfully!");
    await connection.end();
  } catch (err) {
    console.error("Error/Warning running query:", err.message);
  }
  process.exit(0);
}

run();
