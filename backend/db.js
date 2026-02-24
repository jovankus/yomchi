/**
 * Database abstraction layer
 * Uses PostgreSQL in production (DATABASE_URL set) or SQLite for local development
 */

const isProduction = !!process.env.DATABASE_URL;

let db;

if (isProduction) {
    // PostgreSQL for production
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Create SQLite-compatible interface for PostgreSQL
    db = {
        // db.all(sql, params, callback) - returns array of rows
        all: (sql, params, callback) => {
            // Handle optional params
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            // Convert ? placeholders to $1, $2, etc for PostgreSQL
            const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
            let paramIndex = 0;
            const finalSql = pgSql.replace(/\$\d+/g, () => `$${++paramIndex}`);

            pool.query(finalSql, params || [])
                .then(result => callback(null, result.rows))
                .catch(err => callback(err));
        },

        // db.get(sql, params, callback) - returns single row or undefined
        get: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            let paramIndex = 0;
            const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);

            pool.query(pgSql, params || [])
                .then(result => callback(null, result.rows[0]))
                .catch(err => callback(err));
        },

        // db.run(sql, params, callback) - for INSERT/UPDATE/DELETE
        run: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            let paramIndex = 0;
            let pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);

            // Handle INSERT with RETURNING for lastID
            const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
            if (isInsert && !pgSql.includes('RETURNING')) {
                pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id;');
            }

            pool.query(pgSql, params || [])
                .then(result => {
                    // Create context object similar to SQLite
                    const context = {
                        lastID: result.rows[0]?.id || null,
                        changes: result.rowCount
                    };
                    if (callback) callback.call(context, null);
                })
                .catch(err => {
                    if (callback) callback.call({ lastID: null, changes: 0 }, err);
                });
        },

        // db.serialize(callback) - PostgreSQL doesn't need this, just run the callback
        serialize: (callback) => {
            if (callback) callback();
        },

        // Close the pool
        close: (callback) => {
            pool.end()
                .then(() => callback && callback(null))
                .catch(err => callback && callback(err));
        },

        // Direct query access for complex operations
        query: (sql, params) => pool.query(sql, params),

        // Pool reference for advanced usage
        pool
    };

    console.log('Connected to PostgreSQL database.');

} else {
    // SQLite for local development
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');

    const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.sqlite');

    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database', err.message);
        } else {
            console.log('Connected to the SQLite database.');
        }
    });
}

module.exports = db;
