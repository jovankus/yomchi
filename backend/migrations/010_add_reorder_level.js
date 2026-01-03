const db = require('../db');

db.serialize(() => {
    db.run(`ALTER TABLE inventory_items ADD COLUMN reorder_level INTEGER DEFAULT 10`);

    console.log('Added reorder_level column to inventory_items table.');
});
