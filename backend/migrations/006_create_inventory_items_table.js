const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        generic_name TEXT NOT NULL,
        brand_name TEXT,
        manufacturer TEXT,
        form TEXT,
        strength_mg REAL,
        strength_unit TEXT,
        pack_size INTEGER,
        barcode TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_items_generic_name ON inventory_items (generic_name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items (barcode)`);

    console.log('Inventory Items table created with indexes.');
});
