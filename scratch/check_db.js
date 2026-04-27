const Database = require("better-sqlite3");
const db = new Database("data/app.db");
const info = db.prepare("PRAGMA table_info(sales)").all();
console.log(JSON.stringify(info, null, 2));
db.close();
