const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, ADMIN_ROLES } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// ADMIN_ROLES only (SENIOR_DOCTOR, PERMANENT_DOCTOR)

// List financial events with optional filters
router.get('/', requireAuth, (req, res) => {
    const { event_type, category, start_date, end_date } = req.query;
    let query = 'SELECT * FROM financial_events WHERE 1=1';
    let params = [];

    if (event_type) {
        query += ' AND event_type = ?';
        params.push(event_type);
    }

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    if (start_date) {
        query += ' AND event_date >= ?';
        params.push(start_date);
    }

    if (end_date) {
        query += ' AND event_date <= ?';
        params.push(end_date);
    }

    query += ' ORDER BY event_date DESC, created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ financial_events: rows });
    });
});

// Get daily accounting summary
router.get('/daily-summary', requireAuth, (req, res) => {
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'date parameter is required (format: YYYY-MM-DD)' });
    }

    // Validate date format (basic check)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const query = 'SELECT * FROM financial_events WHERE event_date = ? ORDER BY event_type, category, created_at';

    db.all(query, [date], (err, events) => {
        if (err) return res.status(500).json({ error: err.message });

        // Separate income and expenses
        const incomeEvents = events.filter(e => e.event_type === 'INCOME');
        const expenseEvents = events.filter(e => e.event_type === 'EXPENSE');

        // Calculate income breakdown
        const incomeBreakdown = {};
        incomeEvents.forEach(e => {
            incomeBreakdown[e.category] = (incomeBreakdown[e.category] || 0) + e.amount;
        });
        const totalIncome = incomeEvents.reduce((sum, e) => sum + e.amount, 0);

        // Calculate expense breakdown
        const expenseBreakdown = {};
        expenseEvents.forEach(e => {
            expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
        });
        const totalExpenses = expenseEvents.reduce((sum, e) => sum + e.amount, 0);

        // Calculate net profit
        const netProfit = totalIncome - totalExpenses;

        // Return structured summary
        res.json({
            date,
            income: {
                total: totalIncome,
                breakdown: incomeBreakdown,
                count: incomeEvents.length
            },
            expenses: {
                total: totalExpenses,
                breakdown: expenseBreakdown,
                count: expenseEvents.length
            },
            net_profit: netProfit,
            events: {
                income_events: incomeEvents,
                expense_events: expenseEvents
            }
        });
    });
});

// Get monthly accounting report
router.get('/monthly-report', requireAuth, (req, res) => {
    const { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).json({ error: 'year and month parameters are required' });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ error: 'Invalid year or month. Month must be 1-12' });
    }

    // Format month as YYYY-MM
    const monthStr = String(monthNum).padStart(2, '0');
    const yearMonthStr = `${yearNum}-${monthStr}`;

    // Query all events for the month (event_date starts with YYYY-MM)
    const query = `SELECT * FROM financial_events 
                   WHERE substr(event_date, 1, 7) = ? 
                   ORDER BY event_date, event_type, category, created_at`;

    db.all(query, [yearMonthStr], (err, events) => {
        if (err) return res.status(500).json({ error: err.message });

        // Separate income and expenses
        const incomeEvents = events.filter(e => e.event_type === 'INCOME');
        const expenseEvents = events.filter(e => e.event_type === 'EXPENSE');

        // Calculate income breakdown
        const incomeBreakdown = {};
        incomeEvents.forEach(e => {
            incomeBreakdown[e.category] = (incomeBreakdown[e.category] || 0) + e.amount;
        });
        const totalIncome = incomeEvents.reduce((sum, e) => sum + e.amount, 0);

        // Calculate expense breakdown
        const expenseBreakdown = {};
        expenseEvents.forEach(e => {
            expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
        });
        const totalExpenses = expenseEvents.reduce((sum, e) => sum + e.amount, 0);

        // Group expenses by type for better reporting
        const doctorCuts = expenseBreakdown['DOCTOR_CUT'] || 0;
        const onlineSecretaryCuts = expenseBreakdown['ONLINE_SECRETARY_CUT'] || 0;
        const inClinicSalary = expenseBreakdown['IN_CLINIC_SECRETARY_SALARY'] || 0;
        const onlineBaseSalary = expenseBreakdown['ONLINE_SECRETARY_BASE_SALARY'] || 0;

        // Calculate total secretary costs
        const totalSecretaryCosts = onlineSecretaryCuts + inClinicSalary + onlineBaseSalary;

        // Dynamic expenses (everything else)
        const dynamicExpenseCategories = Object.keys(expenseBreakdown).filter(cat =>
            !['DOCTOR_CUT', 'ONLINE_SECRETARY_CUT', 'IN_CLINIC_SECRETARY_SALARY', 'ONLINE_SECRETARY_BASE_SALARY'].includes(cat)
        );
        const dynamicExpenses = {};
        let totalDynamicExpenses = 0;
        dynamicExpenseCategories.forEach(cat => {
            dynamicExpenses[cat] = expenseBreakdown[cat];
            totalDynamicExpenses += expenseBreakdown[cat];
        });

        // Calculate net profit
        const netProfit = totalIncome - totalExpenses;

        // Get month name
        const monthName = new Date(yearNum, monthNum - 1).toLocaleString('en-US', { month: 'long' });

        // Return structured monthly report
        res.json({
            year: yearNum,
            month: monthNum,
            month_name: monthName,
            period: `${monthName} ${yearNum}`,
            income: {
                total: totalIncome,
                breakdown: incomeBreakdown,
                in_clinic: incomeBreakdown['IN_CLINIC_VISIT'] || 0,
                online: incomeBreakdown['ONLINE_SESSION'] || 0,
                count: incomeEvents.length
            },
            expenses: {
                total: totalExpenses,
                breakdown: expenseBreakdown,
                doctor_cuts: doctorCuts,
                secretary_costs: {
                    total: totalSecretaryCosts,
                    salaries: inClinicSalary + onlineBaseSalary,
                    session_cuts: onlineSecretaryCuts,
                    breakdown: {
                        in_clinic_salary: inClinicSalary,
                        online_base_salary: onlineBaseSalary,
                        online_session_cuts: onlineSecretaryCuts
                    }
                },
                dynamic_expenses: {
                    total: totalDynamicExpenses,
                    breakdown: dynamicExpenses
                },
                count: expenseEvents.length
            },
            net_profit: netProfit,
            profit_margin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0,
            summary: {
                total_days_with_activity: new Set(events.map(e => e.event_date)).size,
                total_events: events.length
            }
        });
    });
});

// Get doctor cuts owed for a month
router.get('/doctor-cuts', requireAuth, (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ error: 'month parameter is required (format: YYYY-MM)' });
    }

    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }

    // Query all doctor cut events for the month with appointment details
    const query = `
        SELECT 
            fe.id,
            fe.event_date,
            fe.amount,
            fe.description,
            fe.reference_id as appointment_id,
            a.session_type,
            a.patient_id,
            a.doctor_cut_percent,
            p.first_name || ' ' || p.last_name as patient_name
        FROM financial_events fe
        LEFT JOIN appointments a ON fe.reference_type = 'APPOINTMENT' AND fe.reference_id = a.id
        LEFT JOIN patients p ON a.patient_id = p.id
        WHERE fe.category = 'DOCTOR_CUT'
        AND fe.event_type = 'EXPENSE'
        AND substr(fe.event_date, 1, 7) = ?
        ORDER BY fe.event_date DESC, fe.id DESC
    `;

    db.all(query, [month], (err, events) => {
        if (err) return res.status(500).json({ error: err.message });

        // Calculate totals
        const totalOwed = events.reduce((sum, e) => sum + e.amount, 0);

        // Breakdown by session type
        const inClinicEvents = events.filter(e => e.session_type === 'IN_CLINIC');
        const onlineEvents = events.filter(e => e.session_type === 'ONLINE');

        const inClinicTotal = inClinicEvents.reduce((sum, e) => sum + e.amount, 0);
        const onlineTotal = onlineEvents.reduce((sum, e) => sum + e.amount, 0);

        // Parse month for display
        const [yearStr, monthStr] = month.split('-');
        const monthName = new Date(parseInt(yearStr), parseInt(monthStr) - 1).toLocaleString('en-US', { month: 'long' });

        // Format sessions for response
        const sessions = events.map(e => ({
            id: e.id,
            date: e.event_date,
            patient_name: e.patient_name || 'Unknown',
            session_type: e.session_type || 'Unknown',
            cut_percent: e.doctor_cut_percent || null,
            amount: e.amount,
            appointment_id: e.appointment_id
        }));

        res.json({
            month,
            period: `${monthName} ${yearStr}`,
            total_owed: totalOwed,
            session_count: events.length,
            breakdown: {
                in_clinic: {
                    total: inClinicTotal,
                    count: inClinicEvents.length
                },
                online: {
                    total: onlineTotal,
                    count: onlineEvents.length
                }
            },
            sessions
        });
    });
});

// Get single financial event

router.get('/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM financial_events WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ message: 'Financial event not found' });
        res.json({ financial_event: row });
    });
});

// Create financial event
router.post('/', requireAuth, (req, res) => {
    const { event_date, event_type, category, amount, description, reference_type, reference_id } = req.body;

    // Validation
    if (!event_date || !event_type || !category || !amount) {
        return res.status(400).json({ message: 'event_date, event_type, category, and amount are required' });
    }

    if (!['INCOME', 'EXPENSE'].includes(event_type)) {
        return res.status(400).json({ message: 'event_type must be INCOME or EXPENSE' });
    }

    if (amount <= 0) {
        return res.status(400).json({ message: 'amount must be a positive number' });
    }

    if (reference_type && !['PATIENT', 'APPOINTMENT', 'EXPENSE', 'SYSTEM'].includes(reference_type)) {
        return res.status(400).json({ message: 'reference_type must be PATIENT, APPOINTMENT, EXPENSE, or SYSTEM' });
    }

    const sql = `INSERT INTO financial_events 
                (event_date, event_type, category, amount, description, reference_type, reference_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [event_date, event_type, category, amount, description, reference_type, reference_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Return the created event
        db.get('SELECT * FROM financial_events WHERE id = ?', [this.lastID], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req, {
                action: 'CREATE',
                entityType: 'FINANCIAL_EVENT',
                entityId: row.id,
                details: { event_type, category, amount, description }
            });
            res.status(201).json({ message: 'Financial event created', financial_event: row });
        });
    });
});

// Update financial event
router.put('/:id', requireAuth, (req, res) => {
    const { event_date, event_type, category, amount, description, reference_type, reference_id } = req.body;
    const { id } = req.params;

    // Validation
    if (event_type && !['INCOME', 'EXPENSE'].includes(event_type)) {
        return res.status(400).json({ message: 'event_type must be INCOME or EXPENSE' });
    }

    if (amount !== undefined && amount <= 0) {
        return res.status(400).json({ message: 'amount must be a positive number' });
    }

    if (reference_type && !['PATIENT', 'APPOINTMENT', 'EXPENSE', 'SYSTEM'].includes(reference_type)) {
        return res.status(400).json({ message: 'reference_type must be PATIENT, APPOINTMENT, EXPENSE, or SYSTEM' });
    }

    const sql = `UPDATE financial_events 
                 SET event_date = ?, event_type = ?, category = ?, amount = ?, 
                     description = ?, reference_type = ?, reference_id = ?
                 WHERE id = ?`;

    db.run(sql, [event_date, event_type, category, amount, description, reference_type, reference_id, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Financial event not found' });

        // Return the updated event
        db.get('SELECT * FROM financial_events WHERE id = ?', [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            logAudit(req, {
                action: 'UPDATE',
                entityType: 'FINANCIAL_EVENT',
                entityId: parseInt(id),
                details: { event_type, category, amount, description }
            });
            res.json({ message: 'Financial event updated', financial_event: row });
        });
    });
});

// Delete financial event
router.delete('/:id', requireAuth, (req, res) => {
    db.run('DELETE FROM financial_events WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: 'Financial event not found' });
        logAudit(req, {
            action: 'DELETE',
            entityType: 'FINANCIAL_EVENT',
            entityId: parseInt(req.params.id),
            details: { note: 'Financial event deleted' }
        });
        res.json({ message: 'Financial event deleted' });
    });
});

// Generate monthly secretary salaries
router.post('/monthly-salaries', requireAuth, (req, res) => {
    const { year, month } = req.body;

    if (!year || !month) {
        return res.status(400).json({ error: 'year and month are required' });
    }

    if (month < 1 || month > 12) {
        return res.status(400).json({ error: 'month must be between 1 and 12' });
    }

    // Format event_date as YYYY-MM-01 (first day of month)
    const monthStr = String(month).padStart(2, '0');
    const eventDate = `${year}-${monthStr}-01`;
    const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
    const yearMonthStr = `${year}-${monthStr}`;

    // Check if salaries already exist for this month
    const checkQuery = `
        SELECT COUNT(*) as count FROM financial_events 
        WHERE category IN ('IN_CLINIC_SECRETARY_SALARY', 'ONLINE_SECRETARY_BASE_SALARY')
        AND substr(event_date, 1, 7) = ?
    `;

    db.get(checkQuery, [yearMonthStr], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row.count > 0) {
            return res.status(400).json({
                error: `Salaries already generated for ${monthName} ${year}`
            });
        }

        // Create both salary expenses
        const salaries = [
            {
                category: 'IN_CLINIC_SECRETARY_SALARY',
                amount: 250000,
                description: `In-clinic secretary monthly salary - ${monthName} ${year}`
            },
            {
                category: 'ONLINE_SECRETARY_BASE_SALARY',
                amount: 100000,
                description: `Online secretary base monthly salary - ${monthName} ${year}`
            }
        ];

        const createdSalaries = [];
        let completed = 0;

        salaries.forEach(salary => {
            const insertQuery = `
                INSERT INTO financial_events 
                (event_date, event_type, category, amount, description, reference_type, reference_id) 
                VALUES (?, 'EXPENSE', ?, ?, ?, 'SYSTEM', NULL)
            `;

            db.run(insertQuery, [eventDate, salary.category, salary.amount, salary.description], function (err) {
                if (err) {
                    console.error('Error creating salary:', err);
                    return res.status(500).json({ error: err.message });
                }

                db.get('SELECT * FROM financial_events WHERE id = ?', [this.lastID], (err, event) => {
                    if (err) return res.status(500).json({ error: err.message });

                    createdSalaries.push(event);
                    completed++;

                    if (completed === salaries.length) {
                        res.status(201).json({
                            message: `Monthly salaries generated for ${monthName} ${year}`,
                            salaries: createdSalaries
                        });
                    }
                });
            });
        });
    });
});

module.exports = router;
