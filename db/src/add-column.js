const { sequelize } = require('./index');
async function run() {
  try {
    await sequelize.query("ALTER TABLE Offer ADD COLUMN isLimited TINYINT(1) DEFAULT 0");
    console.log("Column isLimited added successfully!");
  } catch (err) {
    console.error("Error adding column:", err.message);
  }
  process.exit(0);
}
run();
