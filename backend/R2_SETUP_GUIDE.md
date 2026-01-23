/**
 * Cloud Storage Setup Guide
 * Step-by-step guide to configure Cloudflare R2 for document storage
 */

# Cloud Storage Setup - Cloudflare R2

## Why Cloudflare R2?

✅ **FREE egress** (data transfer out) - save ~$0.09/GB vs AWS S3
✅ **S3-compatible API** - easy integration with existing tools
✅ **Global CDN** - fast document delivery worldwide
✅ **Affordable storage** - $0.015/GB/month
✅ **No bandwidth fees** - unlimited downloads at no extra cost

## Prerequisites

- Cloudflare account (free tier works)
- Production backend deployed
- Access to environment variables on hosting platform

---

## Step 1: Create R2 Bucket

1. **Login to Cloudflare Dashboard**
   - Navigate to https://dash.cloudflare.com

2. **Go to R2 Object Storage**
   - Sidebar → R2 Object Storage
   - Click "Create bucket"

3. **Configure Bucket**
   - **Name:** `yomchi-prescriptions` (or your preferred name)
   - **Location:** Auto (or select closest region)
   - Click "Create bucket"

4. **Save Bucket Name**
   ```
   R2_BUCKET_NAME=yomchi-prescriptions
   ```

---

## Step 2: Generate API Tokens

1. **Create API Token**
   - R2 → Overview → Manage R2 API Tokens
   - Click "Create API token"

2. **Configure Permissions**
   - **Token name:** Yomchi Document Storage
   - **Permissions:** 
     - ✅ Object Read & Write
     - ✅ Admin Read & Write (for deletion)
   - **TTL:** Never expire (or set expiration)
   - Click "Create API token"

3. **Save Credentials**
   ⚠️ **IMPORTANT:** Save these immediately - they won't be shown again!
   
   ```
   R2_ACCESS_KEY_ID=<your_access_key_id>
   R2_SECRET_ACCESS_KEY=<your_secret_access_key>
   ```

---

## Step 3: Get Account ID

1. **Find Account ID**
   - Dashboard → Any page → Right sidebar
   - Copy "Account ID"

2. **Save Account ID**
   ```
   R2_ACCOUNT_ID=<your_account_id>
   ```

---

## Step 4: Configure Public Access (Optional)

### Option A: Public Bucket (Simpler)

1. **Enable Public Access**
   - R2 → Your bucket → Settings
   - Public access → "Allow Access"
   - Copy the public URL shown

2. **Save Public URL**
   ```
   R2_PUBLIC_URL=https://pub-<id>.r2.dev
   ```

### Option B: Custom Domain (Advanced)

1. **Add Custom Domain**
   - Bucket Settings → Custom Domains
   - Click "Connect Domain"
   - Enter: `prescriptions.yourdomain.com`
   - Add suggested DNS records in Cloudflare DNS

2. **Save Custom Domain**
   ```
   R2_PUBLIC_URL=https://prescriptions.yourdomain.com
   ```

**Note:** If you skip this step, the app will use signed URLs (more secure, but temporary access).

---

## Step 5: Set Environment Variables

Add these to your production environment:

### For Render.com:

1. Dashboard → Your Service → Environment
2. Add variables:
   ```
   R2_ACCOUNT_ID=<from_step_3>
   R2_ACCESS_KEY_ID=<from_step_2>
   R2_SECRET_ACCESS_KEY=<from_step_2>
   R2_BUCKET_NAME=yomchi-prescriptions
   R2_PUBLIC_URL=<from_step_4> (optional)
   ```

### For Vercel/Netlify:

1. Project Settings → Environment Variables
2. Add the same variables as above

### For Heroku:

```bash
heroku config:set R2_ACCOUNT_ID=<value>
heroku config:set R2_ACCESS_KEY_ID=<value>
heroku config:set R2_SECRET_ACCESS_KEY=<value>
heroku config:set R2_BUCKET_NAME=yomchi-prescriptions
heroku config:set R2_PUBLIC_URL=<value>
```

---

## Step 6: Test Configuration

1. **Redeploy Backend**
   - Trigger a new deployment to load environment variables
   - Or restart the service

2. **Check Logs**
   - Look for: `Document storage: Cloudflare R2`
   - If you see: `Document storage: Local disk` → R2 not configured

3. **Upload Test Document**
   - Go to your app → Upload a document
   - Check R2 dashboard → Objects
   - Verify file appears in the bucket

4. **Test Access**
   - Click on the document in your app
   - Verify it opens/downloads correctly

---

## Step 7: Migrate Existing Files (If Any)

If you have existing documents on local/disk storage:

1. **SSH into Production Server** (if applicable)

2. **Run Migration Script**
   ```bash
   node migrate_to_r2.js
   ```

3. **Follow Prompts**
   - Review files to migrate
   - Confirm migration
   - Wait for completion

4. **Verify Migration**
   ```bash
   node document_upload_utility.js
   ```
   - Check "Cloud Storage" count

5. **Backup Created**
   - File: `migration_backup.json`
   - Keep this for rollback if needed

---

## Verification Checklist

Run through this checklist to ensure everything works:

- [ ] R2 bucket created and visible in dashboard
- [ ] API tokens generated and saved
- [ ] All 4-5 environment variables set in production
- [ ] Backend redeployed/restarted
- [ ] Logs show "Cloudflare R2" storage mode
- [ ] Test upload succeeds
- [ ] Uploaded file visible in R2 console
- [ ] File accessible via app
- [ ] File deletion works (removes from R2)

---

## Cost Monitoring

### View R2 Usage

1. **Navigate to R2 Dashboard**
   - R2 → Analytics

2. **Check Metrics**
   - Storage used (GB)
   - Requests (Class A & B operations)
   - Data transfer

### Estimated Costs

For 10GB storage with moderate usage:
- **Storage:** 10GB × $0.015 = $0.15/month
- **Operations:** ~$0.03/month
- **Egress:** FREE ✅

**Total: ~$0.20/month** (extremely affordable)

---

## Security Best Practices

✅ **DO:**
- Use API tokens with minimal permissions
- Set token expiration dates
- Rotate tokens periodically
- Enable public access ONLY if needed
- Use signed URLs for sensitive documents

❌ **DON'T:**
- Share API tokens in code repositories
- Use root account credentials
- Enable public write access
- Store credentials in frontend code

---

## Troubleshooting

### Error: "R2 not configured"

**Cause:** Missing or incorrect environment variables

**Solution:**
1. Verify all 4 variables are set:
   ```bash
   echo $R2_ACCOUNT_ID
   echo $R2_ACCESS_KEY_ID
   echo $R2_SECRET_ACCESS_KEY
   echo $R2_BUCKET_NAME
   ```
2. Ensure no extra spaces or quotes
3. Restart server after setting variables

### Error: "Access Denied"

**Cause:** Incorrect API token permissions

**Solution:**
1. Regenerate API token with correct permissions
2. Update `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`
3. Redeploy

### Files Not Accessible

**Cause:** Bucket not public or custom domain not set up

**Solution:**
1. Option A: Enable public access on bucket
2. Option B: Use signed URLs (remove `R2_PUBLIC_URL`)
3. Option C: Set up custom domain correctly

---

## Rollback Plan

If you need to revert to local storage:

1. **Remove R2 Environment Variables**
   - Delete or comment out R2_* variables

2. **Redeploy Backend**
   - App will fall back to local disk storage

3. **Run Rollback Script** (if you migrated files)
   ```bash
   node rollback_migration.js
   ```

---

## Support Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing Details](https://www.cloudflare.com/plans/developer-platform/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/s3/api/)

---

## Quick Reference

### Environment Variables Template

```env
R2_ACCOUNT_ID=abc123def456
R2_ACCESS_KEY_ID=1234567890abcdef
R2_SECRET_ACCESS_KEY=abcdefghijklmnop1234567890
R2_BUCKET_NAME=yomchi-prescriptions
R2_PUBLIC_URL=https://pub-xyz.r2.dev  # Optional
```

### Helpful Commands

```bash
# Test R2 connection
node test_r2_storage.js

# View document statistics
node document_upload_utility.js

# Migrate files to R2
node migrate_to_r2.js

# Rollback migration
node rollback_migration.js
```

---

**Setup Complete! 🎉**

Your document storage is now powered by Cloudflare R2 with automatic cloud sync for production environments.
