const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS inventory_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pharmacy_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        supplier_id INTEGER NOT NULL,
        batch_no TEXT NOT NULL,
        expiry_date DATE,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        qty_received_units INTEGER NOT NULL,
        qty_on_hand_units INTEGER NOT NULL,
        purchase_unit_price REAL DEFAULT 0,
        sale_unit_price REAL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id),
        FOREIGN KEY (item_id) REFERENCES inventory_items(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_batches_pharmacy_id ON inventory_batches (pharmacy_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_batches_item_id ON inventory_batches (item_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON inventory_batches (expiry_date)`);

    console.log('Inventory Batches table created with indexes.');
});
