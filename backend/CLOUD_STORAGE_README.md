/**
 * Cloud Storage - Quick Start
 * Essential commands and configuration for R2 storage
 */

# Cloud Storage Quick Reference

## Installation Status

✅ **Dependencies Installed**
- @aws-sdk/client-s3@3.975.0
- @aws-sdk/s3-request-presigner@3.975.0  
- multer@1.4.5-lts.1

## Storage Modes

The system automatically selects storage based on environment:

- **Development (Local):** Files stored in `uploads/documents/`
- **Production (R2):** Files stored in Cloudflare R2 when configured

**Detection Logic:**
```javascript
const isProduction = !!process.env.DATABASE_URL;
const useCloudStorage = isProduction && isR2Available();
```

## Quick Commands

```bash
# Test R2 connection
node test_r2_storage.js

# View document statistics
node document_upload_utility.js

# Migrate files to cloud
node migrate_to_r2.js

# Rollback migration
node rollback_migration.js
```

## Environment Variables

Required for production R2 storage:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=yomchi-prescriptions
R2_PUBLIC_URL=https://... # Optional
```

## File Structure

```
backend/
├── services/
│   └── r2-storage.js           # Cloud storage service
├── routes/
│   └── documents.js            # Document upload/download API
├── uploads/documents/          # Local storage (dev)
├── test_r2_storage.js         # R2 connection test
├── document_upload_utility.js  # Storage analyzer
├── migrate_to_r2.js           # Migration script
├── rollback_migration.js      # Rollback script
└── R2_SETUP_GUIDE.md          # Full setup guide
```

## API Endpoints

### Upload Document
```http
POST /patients/:id/documents
Content-Type: multipart/form-data
Authorization: Required

Form Data:
- file: [File]
- doc_type: "PRESCRIPTION" | "LAB_RESULT" | "SCAN" | "OTHER"
- doc_date: "YYYY-MM-DD" (optional)
```

### List Documents
```http
GET /patients/:id/documents?doc_type=PRESCRIPTION
```

### Get File
```http
GET /documents/:documentId/file
```

### Delete Document
```http
DELETE /documents/:documentId
```

## Current Status

```
Environment: Development
Storage: Local Disk
Documents: 1 prescription
Status: ✓ Healthy (no orphaned/loose files)
```

## Next Steps

1. **For Development:** Nothing needed - local storage works automatically
2. **For Production:** Follow `R2_SETUP_GUIDE.md` to configure Cloudflare R2
3. **Migration:** Run `migrate_to_r2.js` to move existing files to cloud

## Support

- Full Setup Guide: `R2_SETUP_GUIDE.md`
- Implementation Plan: See artifacts
- Troubleshooting: Check guide Section "Troubleshooting"
