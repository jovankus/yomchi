const db = require('../db');
const bcrypt = require('bcrypt');

const seedAdmin = async () => {
    const passwordHash = await bcrypt.hash('admin123', 10);

    db.run(`INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
        ['admin', passwordHash, 'admin'],
        function (err) {
            if (err) {
                console.error('Error seeding admin:', err);
            } else {
                if (this.changes > 0) {
                    console.log('Admin user seeded successfully.');
                } else {
                    console.log('Admin user already exists.');
                }
            }
        });
};

seedAdmin();
