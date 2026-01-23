const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { uploadToR2, isR2Available } = require('../services/r2-storage');

// Detect environment
const isProduction = !!process.env.DATABASE_URL;
const useCloudStorage = isProduction && isR2Available();

console.log(`Document storage: ${useCloudStorage ? 'Cloudflare R2' : 'Local disk'}`);

// Configure multer based on environment
const storage = useCloudStorage
    ? multer.memoryStorage() // Store in memory for R2 upload
    : multer.diskStorage({
        destination: function (req, file, cb) {
            const patientId = req.params.id;
            const uploadDir = path.join(__dirname, '..', 'uploads', 'documents', patientId);

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const timestamp = Date.now();
            const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            cb(null, `${timestamp}_${sanitizedName}`);
        }
    });

// File filter - only allow images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, WEBP) and PDF are allowed'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST - Upload document
router.post('/:id/documents', requireAuth, upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { doc_type, doc_date } = req.body;
    const userId = req.session.userId;

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!doc_type) {
        return res.status(400).json({ message: 'doc_type is required' });
    }

    try {
        let filePath;

        if (useCloudStorage) {
            // Upload to R2
            const timestamp = Date.now();
            const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `documents/${id}/${timestamp}_${sanitizedName}`;

            filePath = await uploadToR2(req.file.buffer, key, req.file.mimetype);
            console.log(`✓ Uploaded to R2: ${filePath}`);
        } else {
            // Local storage - store relative path
            filePath = path.join('documents', id, req.file.filename);
        }

        const sql = `INSERT INTO patient_documents 
                    (patient_id, doc_type, filename, file_path, original_name, doc_date, uploaded_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [id, doc_type, req.file.originalname, filePath, req.file.originalname, doc_date, userId], function (err) {
            if (err) {
                // Clean up uploaded file on database error (local only)
                if (!useCloudStorage && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: 'Document uploaded successfully',
                document: {
                    id: this.lastID,
                    patient_id: id,
                    doc_type,
                    original_name: req.file.originalname,
                    file_path: filePath,
                    doc_date,
                    uploaded_at: new Date().toISOString()
                }
            });
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
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

        // Check if file_path is a URL (cloud storage)
        if (doc.file_path.startsWith('http://') || doc.file_path.startsWith('https://')) {
            // Cloud storage - redirect to R2 URL
            return res.redirect(doc.file_path);
        }

        // Local storage - serve from disk
        const filePath = path.join(__dirname, '..', 'uploads', doc.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on disk' });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    });
});

module.exports = router;
