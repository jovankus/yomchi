const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const patientId = req.params.id;
        const uploadDir = path.join(__dirname, '..', 'uploads', 'documents', patientId);

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp_originalname
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${sanitizedName}`);
    }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, WEBP) are allowed'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST - Upload document
router.post('/:id/documents', requireAuth, upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { doc_type, doc_date } = req.body;
    const userId = req.session.userId;

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!doc_type) {
        return res.status(400).json({ message: 'doc_type is required' });
    }

    // Store relative path
    const relativePath = path.join('documents', id, req.file.filename);

    const sql = `INSERT INTO patient_documents 
                (patient_id, doc_type, file_path, original_name, doc_date, uploaded_by)
                VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(sql, [id, doc_type, relativePath, req.file.originalname, doc_date, userId], function (err) {
        if (err) {
            // Clean up uploaded file on database error
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
            message: 'Document uploaded successfully',
            document: {
                id: this.lastID,
                patient_id: id,
                doc_type,
                original_name: req.file.originalname,
                doc_date,
                uploaded_at: new Date().toISOString()
            }
        });
    });
});

// GET - List documents for a patient
router.get('/:id/documents', requireAuth, (req, res) => {
    const { id } = req.params;
    const { doc_type } = req.query;

    let sql = 'SELECT * FROM patient_documents WHERE patient_id = ?';
    let params = [id];

    if (doc_type) {
        sql += ' AND doc_type = ?';
        params.push(doc_type);
    }

    sql += ' ORDER BY uploaded_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ documents: rows });
    });
});

// GET - Serve document file
router.get('/documents/:documentId/file', requireAuth, (req, res) => {
    const { documentId } = req.params;

    db.get('SELECT * FROM patient_documents WHERE id = ?', [documentId], (err, doc) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        const filePath = path.join(__dirname, '..', 'uploads', doc.file_path);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on disk' });
        }

        // Determine content type
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);

        // Stream file to response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    });
});

module.exports = router;
