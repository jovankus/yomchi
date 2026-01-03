/**
 * Script to update all frontend files to use API_BASE_URL
 * Run from frontend directory: node update-api-urls.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const filesToUpdate = [];

// Recursively find all .jsx and .js files
function findFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && file !== 'node_modules') {
            findFiles(fullPath);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            filesToUpdate.push(fullPath);
        }
    }
}

findFiles(srcDir);

let updatedCount = 0;

for (const filePath of filesToUpdate) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip config.js and apiUtils.js - they're already set up
    if (filePath.endsWith('config.js') || filePath.endsWith('apiUtils.js')) {
        continue;
    }

    // Check if file contains localhost:3001
    if (!content.includes('localhost:3001')) {
        continue;
    }

    // Check if already imports API_BASE_URL
    const hasImport = content.includes("import { API_BASE_URL }") ||
        content.includes("import {API_BASE_URL}");

    // Add import if needed
    if (!hasImport) {
        // Find relative path to config
        const relativePath = path.relative(path.dirname(filePath), path.join(srcDir, 'config.js'))
            .replace(/\\/g, '/')
            .replace('.js', '');

        const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
        const importStatement = `import { API_BASE_URL } from '${importPath}';\n`;

        // Add import after first line (usually React import)
        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                insertIndex = i + 1;
            }
        }
        lines.splice(insertIndex, 0, importStatement.trim());
        content = lines.join('\n');
    }

    // Replace hardcoded URLs
    // Pattern 1: 'http://localhost:3001/path'
    content = content.replace(/'http:\/\/localhost:3001([^']+)'/g, '`${API_BASE_URL}$1`');

    // Pattern 2: "http://localhost:3001/path"
    content = content.replace(/"http:\/\/localhost:3001([^"]+)"/g, '`${API_BASE_URL}$1`');

    // Pattern 3: `http://localhost:3001/...`
    content = content.replace(/`http:\/\/localhost:3001([^`]+)`/g, '`${API_BASE_URL}$1`');

    // Pattern 4: const API_URL = 'http://localhost:3001/...'
    content = content.replace(/const API_URL = 'http:\/\/localhost:3001([^']+)'/g,
        "const API_URL = `${API_BASE_URL}$1`");
    content = content.replace(/const API_BASE = 'http:\/\/localhost:3001'/g,
        "const API_BASE = API_BASE_URL");

    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log(`Updated: ${path.relative(__dirname, filePath)}`);
}

console.log(`\nDone! Updated ${updatedCount} files.`);
