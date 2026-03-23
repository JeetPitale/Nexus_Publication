require('dotenv').config();
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');

async function migrate() {
    console.log("🚀 Starting Migration Process...");

    // Connect to MySQL
    const mysqlHost = process.env.MYSQL_HOST || '127.0.0.1';
    const mysqlUser = process.env.MYSQL_USER || 'root';
    const mysqlPass = process.env.MYSQL_PASS || '';
    const mysqlDb = process.env.MYSQL_DB || 'publications_nexus_dashboard_db';

    console.log(`Connecting to MySQL Database: ${mysqlDb} on ${mysqlHost}...`);
    let connection;
    try {
        connection = await mysql.createConnection({
            host: mysqlHost,
            user: mysqlUser,
            password: mysqlPass,
            database: mysqlDb
        });
        console.log("✅ Connected to MySQL successfully!");
    } catch (err) {
        console.error("❌ Failed to connect to MySQL:", err.message);
        process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error("❌ MONGODB_URI is missing in .env file.");
        process.exit(1);
    }
    
    console.log(`Connecting to MongoDB Database...`);
    try {
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB successfully!");
    } catch (err) {
        console.error("❌ Failed to connect to MongoDB:", err.message);
        process.exit(1);
    }

    // Prepare Collections
    const publicationSchema = new mongoose.Schema({}, { strict: false, collection: 'publications' });
    const Publication = mongoose.model('Publication', publicationSchema);

    const columnSchema = new mongoose.Schema({
        key: { type: String, required: true, unique: true },
        label: { type: String, required: true }
    }, { collection: 'columns' });
    const ColumnDef = mongoose.model('ColumnDef', columnSchema);

    console.log("🧹 Clearing existing MongoDB collections to prevent duplicates...");
    await Publication.deleteMany({});
    await ColumnDef.deleteMany({});

    // Read Data from MySQL
    console.log("📥 Fetching data from MySQL...");
    const [columnsInfo] = await connection.query("SHOW COLUMNS FROM publications");
    const [rows] = await connection.query("SELECT * FROM publications");

    console.log(`Found ${rows.length} rows to migrate.`);

    // Migrate Columns
    const columnsToInsert = [];
    for (const col of columnsInfo) {
        if (col.Field !== 'id') {
            const label = col.Field.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            columnsToInsert.push({ key: col.Field, label: label });
        }
    }
    await ColumnDef.insertMany(columnsToInsert);
    console.log(`✅ Migrated ${columnsToInsert.length} backend column definitions.`);

    // Migrate Rows
    const rowsToInsert = rows.map(row => {
        const newRow = { ...row };
        delete newRow.id; // Let Mongo generate its own _id
        return newRow;
    });

    if (rowsToInsert.length > 0) {
        await Publication.insertMany(rowsToInsert);
        console.log(`✅ Migrated ${rowsToInsert.length} publication records.`);
    }

    console.log("\n🎉 Migration completed successfully! You can now use the MongoDB backend.");
    await connection.end();
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch(err => {
    console.error("❌ Migration failed with error:", err);
    process.exit(1);
});
