const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * Google Sheets Backup Service
 * Handles authentication and data export to Google Sheets
 */

// Configuration from environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    path.resolve(__dirname, '../google-credentials.json');

let sheetsClient = null;

/**
 * Initialize the Google Sheets API client using service account credentials
 */
async function authorize() {
    if (sheetsClient) return sheetsClient;

    try {
        // Check if credentials file exists
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            throw new Error(`Google credentials file not found at: ${CREDENTIALS_PATH}. ` +
                'Please download your service account JSON from Google Cloud Console.');
        }

        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const authClient = await auth.getClient();
        sheetsClient = google.sheets({ version: 'v4', auth: authClient });

        return sheetsClient;
    } catch (error) {
        console.error('Google Sheets authorization failed:', error.message);
        throw error;
    }
}

/**
 * Clear a sheet and write new data
 * @param {string} sheetName - Name of the sheet tab
 * @param {Array<Array>} data - 2D array of data (first row = headers)
 */
async function writeSheet(sheetName, data) {
    const sheets = await authorize();

    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SPREADSHEET_ID environment variable not set');
    }

    // Clear existing data
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:ZZ`,
    });

    // Write new data
    if (data.length > 0) {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: data,
            },
        });
    }

    return data.length - 1; // Return row count excluding header
}

/**
 * Ensure a sheet exists, create if it doesn't
 * @param {string} sheetName - Name of the sheet tab
 */
async function ensureSheet(sheetName) {
    const sheets = await authorize();

    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const existingSheets = response.data.sheets.map(s => s.properties.title);

        if (!existingSheets.includes(sheetName)) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: { title: sheetName }
                        }
                    }]
                }
            });
        }
    } catch (error) {
        // If we can't check, try to write anyway
        console.warn(`Could not verify sheet exists: ${error.message}`);
    }
}

/**
 * Export patients to Google Sheets
 * @param {Array} patients - Array of patient objects
 */
async function exportPatients(patients) {
    await ensureSheet('Patients');

    const headers = [
        'ID', 'First Name', 'Last Name', 'Date of Birth', 'Phone', 'Email',
        'Address', 'Place of Living', 'Education Level', 'Marital Status',
        'Occupation', 'Living With', 'Has ASD', 'Created At', 'Updated At'
    ];

    const rows = patients.map(p => [
        p.id, p.first_name, p.last_name, p.date_of_birth, p.phone, p.email,
        p.address, p.place_of_living, p.education_level, p.marital_status,
        p.occupation, p.living_with, p.has_asd ? 'Yes' : 'No', p.created_at, p.updated_at
    ]);

    return await writeSheet('Patients', [headers, ...rows]);
}

/**
 * Export appointments to Google Sheets
 * @param {Array} appointments - Array of appointment objects
 */
async function exportAppointments(appointments) {
    await ensureSheet('Appointments');

    const headers = [
        'ID', 'Patient ID', 'Patient Name', 'Clinician ID', 'Clinician',
        'Start Time', 'End Time', 'Status', 'Session Type', 'Payment Status',
        'Amount', 'Doctor Cut %', 'Doctor Involved', 'Free Return Reason',
        'Notes', 'Created At'
    ];

    const rows = appointments.map(a => [
        a.id, a.patient_id, a.patient_name || `${a.first_name || ''} ${a.last_name || ''}`.trim(),
        a.clinician_id, a.clinician_username || a.clinician_name,
        a.start_at, a.end_at, a.status, a.session_type, a.payment_status,
        a.amount, a.doctor_cut_percent, a.doctor_involved, a.free_return_reason,
        a.notes, a.created_at
    ]);

    return await writeSheet('Appointments', [headers, ...rows]);
}

/**
 * Export clinical notes to Google Sheets
 * @param {Array} notes - Array of clinical note objects
 */
async function exportClinicalNotes(notes) {
    await ensureSheet('Clinical Notes');

    const headers = [
        'ID', 'Patient ID', 'Patient Name', 'Author ID', 'Author',
        'Note Type', 'Content', 'Created At'
    ];

    const rows = notes.map(n => [
        n.id, n.patient_id, n.patient_name || '', n.author_id, n.author_username || '',
        n.note_type, n.content, n.created_at
    ]);

    return await writeSheet('Clinical Notes', [headers, ...rows]);
}

/**
 * Check if Google Sheets integration is configured
 */
function isConfigured() {
    return !!(SPREADSHEET_ID && fs.existsSync(CREDENTIALS_PATH));
}

/**
 * Get configuration status for debugging
 */
function getConfigStatus() {
    return {
        spreadsheetId: SPREADSHEET_ID ? 'Set' : 'Not set',
        credentialsPath: CREDENTIALS_PATH,
        credentialsExists: fs.existsSync(CREDENTIALS_PATH),
    };
}

module.exports = {
    authorize,
    exportPatients,
    exportAppointments,
    exportClinicalNotes,
    isConfigured,
    getConfigStatus,
};
