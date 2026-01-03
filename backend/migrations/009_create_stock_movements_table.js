const db = require('../db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pharmacy_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        batch_id INTEGER,
        type TEXT NOT NULL,
        qty_units INTEGER NOT NULL,
        unit_price_at_time REAL DEFAULT 0,
        reference TEXT,
        source TEXT DEFAULT 'manual',
        patient_id INTEGER,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id),
        FOREIGN KEY (item_id) REFERENCES inventory_items(id),
        FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_movements_pharmacy_id ON stock_movements (pharmacy_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_movements_item_id ON stock_movements (item_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_movements_batch_id ON stock_movements (batch_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements (type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements (created_at)`);

    console.log('Stock Movements table created with indexes.');
});
