const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole, APPOINTMENT_ROLES } = require('../middleware/auth');

// RBAC: All roles can access appointments
// SENIOR_DOCTOR, PERMANENT_DOCTOR, DOCTOR, SECRETARY

// Helper to check for conflicts
// Returns true if conflict found
const checkConflict = (clinicianId, startAt, endAt, excludeId = null) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE clinician_id = ? 
            AND status != 'cancelled'
            AND (
                (start_at < ? AND end_at > ?)
            )
        `;
        let params = [clinicianId, endAt, startAt];

        if (excludeId) {
            query += ` AND id != ?`;
            params.push(excludeId);
        }

        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row.count > 0);
        });
    });
};

// Helper to check if date is a clinic open day
// Clinic open days: Saturday (6), Sunday (0), Tuesday (2), Wednesday (3)
// Off days: Monday (1), Thursday (4), Friday (5)
const isClinicOpenDay = (dateString) => {
    // Extract just the date portion (YYYY-MM-DD) to avoid timezone issues
    const datePart = dateString.split(' ')[0].split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day); // Local date construction
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const clinicDays = [0, 2, 3, 6]; // Sunday, Tuesday, Wednesday, Saturday
    return clinicDays.includes(dayOfWeek);
};

// Helper to get day name from date string
const getDayName = (dateString) => {
    // Extract just the date portion to avoid timezone issues
    const datePart = dateString.split(' ')[0].split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Helper to validate FREE_RETURN eligibility
// Returns object: { allowed: boolean, message: string }
const validateFreeReturn = (patient_id, appointment_date) => {
    return new Promise((resolve, reject) => {
        // Find most recent PAID appointment for this patient
        const query = `
            SELECT start_at FROM appointments 
            WHERE patient_id = ? AND payment_status = 'PAID'
            ORDER BY start_at DESC 
            LIMIT 1
        `;

        db.get(query, [patient_id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (!row) {
                resolve({
                    allowed: false,
                    message: 'FREE_RETURN not allowed: No paid session found within the last 10 days'
                });
                return;
            }

            // Calculate days between previous paid session and current appointment
            const previousPaidDate = new Date(row.start_at);
            const currentDate = new Date(appointment_date);
            const daysDifference = Math.floor((currentDate - previousPaidDate) / (1000 * 60 * 60 * 24));

            if (daysDifference <= 10) {
                resolve({
                    allowed: true,
                    message: `FREE_RETURN allowed: Previous paid session was ${daysDifference} days ago`
                });
            } else {
                resolve({
                    allowed: false,
                    message: `FREE_RETURN not allowed: Previous paid session was ${daysDifference} days ago (must be ≤ 10 days)`
                });
            }
        });
    });
};

// Helper to get the count of PAID visits for a patient (excludes the current appointment if editing)
// Used for automatic doctor cut calculation
const getPatientPaidVisitCount = (patient_id, excludeAppointmentId = null) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE patient_id = ? AND payment_status = 'PAID'
        `;
        let params = [patient_id];

        if (excludeAppointmentId) {
            query += ` AND id != ?`;
            params.push(excludeAppointmentId);
        }

        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
        });
    });
};

// Helper to compute doctor cut percent based on paid visit count
// Rule: First paid visit = 20%, subsequent visits = 10%
const computeDoctorCutPercent = (paidVisitCount) => {
    return paidVisitCount === 0 ? 20 : 10;
};

// Helper to check if income event already exists for an appointment
const hasExistingIncomeEvent = (appointmentId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id FROM financial_events 
            WHERE reference_type = 'APPOINTMENT' AND reference_id = ?
        `;
        db.get(query, [appointmentId], (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
        });
    });
};

// Helper to generate income event for PAID appointments
// Returns the created financial_event or null if not applicable
const generateIncomeEvent = (appointment) => {
    return new Promise((resolve, reject) => {
        // Only generate for PAID appointments
        if (appointment.payment_status !== 'PAID') {
            resolve(null);
            return;
        }

        // Determine amount and category based on session_type
        let amount, category;
        if (appointment.session_type === 'IN_CLINIC') {
            amount = 15000;
            category = 'IN_CLINIC_VISIT';
        } else if (appointment.session_type === 'ONLINE') {
            amount = 20000;
            category = 'ONLINE_SESSION';
        } else {
            resolve(null);
            return;
        }

        // Extract date from start_at (format: YYYY-MM-DD HH:MM:SS)
        const eventDate = appointment.start_at.split(' ')[0];
        const description = `Income from ${appointment.session_type} visit - Appointment #${appointment.id}`;

        // Create financial_event
        const insertQuery = `
            INSERT INTO financial_events 
            (event_date, event_type, category, amount, description, reference_type, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertQuery, [eventDate, 'INCOME', category, amount, description, 'APPOINTMENT', appointment.id], function (err) {
            if (err) {
                reject(err);
                return;
            }

            // Fetch the created event
            db.get('SELECT * FROM financial_events WHERE id = ?', [this.lastID], (err, event) => {
                if (err) reject(err);
                else resolve(event);
            });
        });
    });
};

// Helper to generate doctor cut expense for PAID appointments
// Returns the created financial_event or null if not applicable
const generateDoctorCutExpense = (appointment, incomeAmount) => {
    return new Promise((resolve, reject) => {
        // No cut if no percentage specified
        if (!appointment.doctor_cut_percent) {
            resolve(null);
            return;
        }

        // For online sessions, check if doctor was involved
        if (appointment.session_type === 'ONLINE' && !appointment.doctor_involved) {
            resolve(null);
            return;
        }

        // Calculate doctor cut amount
        const cutAmount = Math.round(incomeAmount * (appointment.doctor_cut_percent / 100));

        // Extract date from start_at
        const eventDate = appointment.start_at.split(' ')[0];
        const description = `Doctor cut (${appointment.doctor_cut_percent}%) - Appointment #${appointment.id}`;

        // Create expense financial_event
        const insertQuery = `
            INSERT INTO financial_events 
            (event_date, event_type, category, amount, description, reference_type, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertQuery, [eventDate, 'EXPENSE', 'DOCTOR_CUT', cutAmount, description, 'APPOINTMENT', appointment.id], function (err) {
            if (err) {
                reject(err);
                return;
            }

            // Fetch the created event
            db.get('SELECT * FROM financial_events WHERE id = ?', [this.lastID], (err, event) => {
                if (err) reject(err);
                else resolve(event);
            });
        });
    });
};

// Helper to generate online secretary cut for ONLINE PAID appointments
// Returns the created financial_event or null if not applicable
const generateOnlineSecretaryCut = (appointment, incomeAmount) => {
    return new Promise((resolve, reject) => {
        // Only for ONLINE PAID sessions
        if (appointment.session_type !== 'ONLINE' || appointment.payment_status !== 'PAID') {
            resolve(null);
            return;
        }

        // Always 10% for online secretary
        const cutAmount = Math.round(incomeAmount * 0.10);

        // Extract date from start_at
        const eventDate = appointment.start_at.split(' ')[0];
        const description = `Online secretary cut (10%) - Appointment #${appointment.id}`;

        // Create expense financial_event
        const insertQuery = `
            INSERT INTO financial_events 
            (event_date, event_type, category, amount, description, reference_type, reference_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertQuery, [eventDate, 'EXPENSE', 'ONLINE_SECRETARY_CUT', cutAmount, description, 'APPOINTMENT', appointment.id], function (err) {
            if (err) {
                reject(err);
                return;
            }

            // Fetch the created event
            db.get('SELECT * FROM financial_events WHERE id = ?', [this.lastID], (err, event) => {
                if (err) reject(err);
                else resolve(event);
            });
        });
    });
};

// GET /appointments/:id
router.get('/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    // Regular list query handles ?date, so we need to be careful with route matching. 
    // Express routes are matched in order. /:id might capture "upcoming" if we had that.
    // Ideally put specific routes before parameterized ones.
    // But here 'id' is numeric usually.

    // Logic: fetch single appointment
    db.get('SELECT * FROM appointments WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Appointment not found' });
        // Optional: Check ownership? For now let's allow read if Auth.
        res.json(row);
    });
});

// GET /appointments?date=YYYY-MM-DD&search=term
router.get('/', requireAuth, (req, res) => {
    const { date, search } = req.query;
    if (!date) {
        return res.status(400).json({ error: 'Date query parameter (YYYY-MM-DD) is required' });
    }

    // Build query with patient details including phone and date_of_birth
    // Note: All authenticated users can see all appointments (role-based access, not per-user)
    let query = `
        SELECT a.*, 
               p.first_name as patient_first_name, 
               p.last_name as patient_last_name,
               p.phone as patient_phone,
               p.date_of_birth as patient_dob
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE substr(a.start_at, 1, 10) = ?
    `;

    let params = [date];

    // Add optional search filter (by patient name or phone)
    if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone LIKE ? 
                   OR (p.first_name || ' ' || p.last_name) LIKE ?)`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY a.start_at ASC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /appointments
router.post('/', requireAuth, async (req, res) => {
    const { patient_id, start_at, end_at, session_type, payment_status, free_return_reason, doctor_cut_percent, doctor_cut_override, doctor_involved } = req.body;
    // Use roleId since this is a role-based system, not individual user accounts
    const clinician_id = req.session.roleId || null;

    if (!patient_id || !start_at || !end_at) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate session_type
    if (!session_type) {
        return res.status(400).json({ error: 'session_type is required and must be IN_CLINIC or ONLINE' });
    }
    if (!['IN_CLINIC', 'ONLINE'].includes(session_type)) {
        return res.status(400).json({ error: 'session_type must be IN_CLINIC or ONLINE' });
    }

    // Validate clinic schedule for IN_CLINIC sessions
    if (session_type === 'IN_CLINIC') {
        if (!isClinicOpenDay(start_at)) {
            const dayName = getDayName(start_at);
            return res.status(400).json({
                error: `IN_CLINIC appointments not allowed on ${dayName}. Clinic is closed. Open days: Saturday, Sunday, Tuesday, Wednesday.`
            });
        }
    }

    // Validate payment_status
    if (!payment_status) {
        return res.status(400).json({ error: 'payment_status is required and must be PAID, UNPAID, or FREE_RETURN' });
    }
    if (!['PAID', 'UNPAID', 'FREE_RETURN'].includes(payment_status)) {
        return res.status(400).json({ error: 'payment_status must be PAID, UNPAID, or FREE_RETURN' });
    }

    // Validate doctor_cut_percent if override is explicitly requested
    if (doctor_cut_override && doctor_cut_percent !== undefined && doctor_cut_percent !== null) {
        if (typeof doctor_cut_percent !== 'number' || doctor_cut_percent < 10 || doctor_cut_percent > 20) {
            return res.status(400).json({ error: 'doctor_cut_percent must be a number between 10 and 20' });
        }
    }

    if (new Date(start_at) >= new Date(end_at)) {
        return res.status(400).json({ error: 'Start time must be before end time' });
    }

    try {
        // Validate FREE_RETURN eligibility if applicable
        if (payment_status === 'FREE_RETURN') {
            const freeReturnValidation = await validateFreeReturn(patient_id, start_at);
            if (!freeReturnValidation.allowed) {
                return res.status(400).json({ error: freeReturnValidation.message });
            }
        }

        const hasConflict = await checkConflict(clinician_id, start_at, end_at);
        if (hasConflict) {
            return res.status(409).json({ message: 'Appointment overlaps with an existing one.' });
        }

        // Auto-compute doctor cut percent for PAID appointments
        let finalDoctorCutPercent = null;
        let isAutoComputed = false;
        if (payment_status === 'PAID') {
            if (doctor_cut_override && doctor_cut_percent) {
                // Use manually specified override
                finalDoctorCutPercent = doctor_cut_percent;
                console.log(`[DOCTOR CUT] Using override: ${finalDoctorCutPercent}%`);
            } else {
                // Auto-compute based on patient's paid visit count
                const paidVisitCount = await getPatientPaidVisitCount(patient_id);
                console.log(`[DOCTOR CUT] Patient ${patient_id} has ${paidVisitCount} prior PAID visits`);
                finalDoctorCutPercent = computeDoctorCutPercent(paidVisitCount);
                console.log(`[DOCTOR CUT] Computed cut: ${finalDoctorCutPercent}% (first visit = 20%, subsequent = 10%)`);
                isAutoComputed = true;
            }
        }

        const insertSql = `
            INSERT INTO appointments (patient_id, clinician_id, start_at, end_at, status, session_type, payment_status, free_return_reason, doctor_cut_percent, doctor_involved)
            VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)
        `;
        const params = [patient_id, clinician_id, start_at, end_at, session_type, payment_status, free_return_reason || null, finalDoctorCutPercent, doctor_involved !== undefined ? (doctor_involved ? 1 : 0) : 1];

        db.run(insertSql, params, async function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const appointmentId = this.lastID;
            const createdAppointment = {
                id: appointmentId,
                patient_id,
                clinician_id,
                start_at,
                end_at,
                status: 'scheduled',
                session_type,
                payment_status,
                free_return_reason: free_return_reason || null,
                doctor_cut_percent: finalDoctorCutPercent,
                doctor_cut_auto_computed: isAutoComputed,
                doctor_involved: doctor_involved !== undefined ? doctor_involved : true
            };

            // Auto-generate income event if PAID
            if (payment_status === 'PAID') {
                try {
                    const incomeEvent = await generateIncomeEvent(createdAppointment);

                    // Also generate doctor cut expense if applicable
                    let doctorCutEvent = null;
                    let secretaryCutEvent = null;
                    if (incomeEvent) {
                        doctorCutEvent = await generateDoctorCutExpense(createdAppointment, incomeEvent.amount);
                        secretaryCutEvent = await generateOnlineSecretaryCut(createdAppointment, incomeEvent.amount);
                    }

                    res.status(201).json({
                        ...createdAppointment,
                        income_generated: incomeEvent ? incomeEvent.amount : null,
                        financial_event_id: incomeEvent ? incomeEvent.id : null,
                        doctor_cut_generated: doctorCutEvent ? doctorCutEvent.amount : null,
                        doctor_cut_event_id: doctorCutEvent ? doctorCutEvent.id : null,
                        online_secretary_cut_generated: secretaryCutEvent ? secretaryCutEvent.amount : null,
                        online_secretary_cut_event_id: secretaryCutEvent ? secretaryCutEvent.id : null
                    });
                } catch (incomeErr) {
                    console.error('Error generating financial events:', incomeErr);
                    // Return appointment but note generation failed
                    res.status(201).json({
                        ...createdAppointment,
                        financial_generation_error: 'Failed to generate financial events'
                    });
                }
            } else {
                res.status(201).json(createdAppointment);
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /appointments/:id
router.put('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { start_at, end_at, status, session_type, payment_status, free_return_reason, doctor_cut_percent, doctor_involved } = req.body;
    // Use roleId since this is a role-based system
    const clinician_id = req.session.roleId || null;

    // Check if appointment exists
    db.get('SELECT * FROM appointments WHERE id = ?', [id], async (err, appointment) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        // Role-based access: all authenticated users can edit appointments (no ownership check)

        const newStart = start_at || appointment.start_at;
        const newEnd = end_at || appointment.end_at;
        const newStatus = status || appointment.status;
        const newSessionType = session_type || appointment.session_type;
        const newPaymentStatus = payment_status || appointment.payment_status;
        const newFreeReturnReason = free_return_reason !== undefined ? free_return_reason : appointment.free_return_reason;
        const newDoctorCutPercent = doctor_cut_percent !== undefined ? doctor_cut_percent : appointment.doctor_cut_percent;
        const newDoctorInvolved = doctor_involved !== undefined ? doctor_involved : appointment.doctor_involved;

        // Validate session_type if provided
        if (session_type && !['IN_CLINIC', 'ONLINE'].includes(session_type)) {
            return res.status(400).json({ error: 'session_type must be IN_CLINIC or ONLINE' });
        }

        // Validate payment_status if provided
        if (payment_status && !['PAID', 'UNPAID', 'FREE_RETURN'].includes(payment_status)) {
            return res.status(400).json({ error: 'payment_status must be PAID, UNPAID, or FREE_RETURN' });
        }

        // Validate doctor_cut_percent if provided
        if (doctor_cut_percent !== undefined && doctor_cut_percent !== null) {
            if (typeof doctor_cut_percent < 10 || doctor_cut_percent > 20) {
                return res.status(400).json({ error: 'doctor_cut_percent must be a number between 10 and 20' });
            }
        }

        // Validate clinic schedule for IN_CLINIC sessions
        // Check if changing TO IN_CLINIC or changing date for existing IN_CLINIC
        if (newSessionType === 'IN_CLINIC') {
            if (!isClinicOpenDay(newStart)) {
                const dayName = getDayName(newStart);
                return res.status(400).json({
                    error: `IN_CLINIC appointments not allowed on ${dayName}. Clinic is closed. Open days: Saturday, Sunday, Tuesday, Wednesday.`
                });
            }
        }

        if (new Date(newStart) >= new Date(newEnd)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        try {
            // Validate FREE_RETURN eligibility if changing to FREE_RETURN
            if (payment_status === 'FREE_RETURN' && appointment.payment_status !== 'FREE_RETURN') {
                const freeReturnValidation = await validateFreeReturn(appointment.patient_id, newStart);
                if (!freeReturnValidation.allowed) {
                    return res.status(400).json({ error: freeReturnValidation.message });
                }
            }

            // Only check conflict if time changed
            if (start_at || end_at) {
                const hasConflict = await checkConflict(clinician_id, newStart, newEnd, id);
                if (hasConflict) {
                    return res.status(409).json({ message: 'Appointment overlaps with an existing one.' });
                }
            }

            db.run(
                `UPDATE appointments 
                 SET start_at = ?, end_at = ?, status = ?, session_type = ?, payment_status = ?, free_return_reason = ?, doctor_cut_percent = ?, doctor_involved = ?
                 WHERE id = ?`,
                [newStart, newEnd, newStatus, newSessionType, newPaymentStatus, newFreeReturnReason, newDoctorCutPercent, newDoctorInvolved ? 1 : 0, id],
                async function (err) {
                    if (err) return res.status(500).json({ error: err.message });

                    // Check if payment_status changed to PAID
                    const changedToPaid = payment_status === 'PAID' && appointment.payment_status !== 'PAID';

                    if (changedToPaid) {
                        try {
                            // Check if income event already exists (prevent duplicates)
                            const hasIncome = await hasExistingIncomeEvent(id);
                            if (!hasIncome) {
                                const updatedAppointment = {
                                    id: parseInt(id),
                                    patient_id: appointment.patient_id,
                                    start_at: newStart,
                                    session_type: newSessionType,
                                    payment_status: newPaymentStatus,
                                    doctor_cut_percent: newDoctorCutPercent,
                                    doctor_involved: newDoctorInvolved
                                };
                                const incomeEvent = await generateIncomeEvent(updatedAppointment);

                                // Also generate doctor cut if applicable
                                let doctorCutEvent = null;
                                let secretaryCutEvent = null;
                                if (incomeEvent) {
                                    doctorCutEvent = await generateDoctorCutExpense(updatedAppointment, incomeEvent.amount);
                                    secretaryCutEvent = await generateOnlineSecretaryCut(updatedAppointment, incomeEvent.amount);
                                }

                                res.json({
                                    message: 'Appointment updated successfully',
                                    income_generated: incomeEvent ? incomeEvent.amount : null,
                                    financial_event_id: incomeEvent ? incomeEvent.id : null,
                                    doctor_cut_generated: doctorCutEvent ? doctorCutEvent.amount : null,
                                    doctor_cut_event_id: doctorCutEvent ? doctorCutEvent.id : null,
                                    online_secretary_cut_generated: secretaryCutEvent ? secretaryCutEvent.amount : null,
                                    online_secretary_cut_event_id: secretaryCutEvent ? secretaryCutEvent.id : null
                                });
                            } else {
                                res.json({
                                    message: 'Appointment updated successfully',
                                    note: 'Income event already exists for this appointment'
                                });
                            }
                        } catch (incomeErr) {
                            console.error('Error generating income event:', incomeErr);
                            res.json({
                                message: 'Appointment updated successfully',
                                income_generation_error: 'Failed to generate income event'
                            });
                        }
                    } else {
                        res.json({ message: 'Appointment updated successfully' });
                    }
                }
            );

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

// DELETE /appointments/:id
router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM appointments WHERE id = ?', [id], (err, appointment) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        // Role-based access: all authenticated users can delete appointments

        db.run('DELETE FROM appointments WHERE id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Appointment deleted successfully' });
        });
    });
});

// GET /appointments/:id/income - Get income event for appointment
router.get('/:id/income', requireAuth, (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT * FROM financial_events 
        WHERE reference_type = 'APPOINTMENT' AND reference_id = ?
    `;

    db.get(query, [id], (err, event) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!event) return res.status(404).json({ message: 'No income event found for this appointment' });
        res.json({ financial_event: event });
    });
});

// PATCH /appointments/:id/payment - Lightweight payment status update
router.patch('/:id/payment', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { session_type, payment_status, free_return_reason, doctor_cut_percent, doctor_cut_override, doctor_involved } = req.body;

    // Fetch existing appointment
    db.get('SELECT * FROM appointments WHERE id = ?', [id], async (err, appointment) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        // Role-based access: all authenticated users can update payment status

        // Determine new values (use provided or keep existing)
        const newSessionType = session_type || appointment.session_type;
        const newPaymentStatus = payment_status || appointment.payment_status;
        const newFreeReturnReason = free_return_reason !== undefined ? free_return_reason : appointment.free_return_reason;
        const newDoctorInvolved = doctor_involved !== undefined ? doctor_involved : appointment.doctor_involved;

        // Validate session_type if provided
        if (session_type && !['IN_CLINIC', 'ONLINE'].includes(session_type)) {
            return res.status(400).json({ error: 'session_type must be IN_CLINIC or ONLINE' });
        }

        // Validate payment_status if provided
        if (payment_status && !['PAID', 'UNPAID', 'FREE_RETURN'].includes(payment_status)) {
            return res.status(400).json({ error: 'payment_status must be PAID, UNPAID, or FREE_RETURN' });
        }

        // Validate doctor_cut_percent if override is explicitly requested
        if (doctor_cut_override && doctor_cut_percent !== undefined && doctor_cut_percent !== null) {
            if (typeof doctor_cut_percent !== 'number' || doctor_cut_percent < 10 || doctor_cut_percent > 20) {
                return res.status(400).json({ error: 'doctor_cut_percent must be a number between 10 and 20' });
            }
        }

        try {
            // Validate FREE_RETURN eligibility if changing to FREE_RETURN
            if (payment_status === 'FREE_RETURN' && appointment.payment_status !== 'FREE_RETURN') {
                const freeReturnValidation = await validateFreeReturn(appointment.patient_id, appointment.start_at);
                if (!freeReturnValidation.allowed) {
                    return res.status(400).json({
                        error: freeReturnValidation.message,
                        last_paid_date: freeReturnValidation.last_paid_date
                    });
                }
            }

            // Auto-compute doctor cut percent when changing to PAID
            let newDoctorCutPercent = appointment.doctor_cut_percent;
            let isAutoComputed = false;
            const changedToPaid = payment_status === 'PAID' && appointment.payment_status !== 'PAID';

            if (changedToPaid) {
                if (doctor_cut_override && doctor_cut_percent) {
                    // Use manually specified override
                    newDoctorCutPercent = doctor_cut_percent;
                } else {
                    // Auto-compute based on patient's paid visit count (excluding this appointment)
                    const paidVisitCount = await getPatientPaidVisitCount(appointment.patient_id, id);
                    newDoctorCutPercent = computeDoctorCutPercent(paidVisitCount);
                    isAutoComputed = true;
                }
            } else if (doctor_cut_override && doctor_cut_percent !== undefined) {
                newDoctorCutPercent = doctor_cut_percent;
            }

            // Update the appointment
            db.run(
                `UPDATE appointments 
                 SET session_type = ?, payment_status = ?, free_return_reason = ?, doctor_cut_percent = ?, doctor_involved = ?
                 WHERE id = ?`,
                [newSessionType, newPaymentStatus, newFreeReturnReason, newDoctorCutPercent, newDoctorInvolved ? 1 : 0, id],
                async function (err) {
                    if (err) return res.status(500).json({ error: err.message });

                    // Check if payment_status changed to PAID
                    const changedToPaid = payment_status === 'PAID' && appointment.payment_status !== 'PAID';

                    const responseData = {
                        message: 'Payment status updated successfully',
                        appointment: {
                            id: parseInt(id),
                            session_type: newSessionType,
                            payment_status: newPaymentStatus,
                            free_return_reason: newFreeReturnReason,
                            doctor_cut_percent: newDoctorCutPercent,
                            doctor_involved: newDoctorInvolved
                        }
                    };

                    if (changedToPaid) {
                        try {
                            // Check if income event already exists (prevent duplicates)
                            const hasIncome = await hasExistingIncomeEvent(id);
                            if (!hasIncome) {
                                const updatedAppointment = {
                                    id: parseInt(id),
                                    patient_id: appointment.patient_id,
                                    start_at: appointment.start_at,
                                    session_type: newSessionType,
                                    payment_status: newPaymentStatus,
                                    doctor_cut_percent: newDoctorCutPercent,
                                    doctor_involved: newDoctorInvolved
                                };
                                const incomeEvent = await generateIncomeEvent(updatedAppointment);

                                // Also generate doctor cut and secretary cut if applicable
                                let doctorCutEvent = null;
                                let secretaryCutEvent = null;
                                if (incomeEvent) {
                                    doctorCutEvent = await generateDoctorCutExpense(updatedAppointment, incomeEvent.amount);
                                    secretaryCutEvent = await generateOnlineSecretaryCut(updatedAppointment, incomeEvent.amount);
                                }

                                responseData.income_generated = incomeEvent ? incomeEvent.amount : null;
                                responseData.financial_event_id = incomeEvent ? incomeEvent.id : null;
                                responseData.doctor_cut_generated = doctorCutEvent ? doctorCutEvent.amount : null;
                                responseData.doctor_cut_event_id = doctorCutEvent ? doctorCutEvent.id : null;
                                responseData.online_secretary_cut_generated = secretaryCutEvent ? secretaryCutEvent.amount : null;
                                responseData.online_secretary_cut_event_id = secretaryCutEvent ? secretaryCutEvent.id : null;
                            } else {
                                responseData.note = 'Income event already exists for this appointment';
                            }
                        } catch (incomeErr) {
                            console.error('Error generating financial events:', incomeErr);
                            responseData.financial_generation_error = 'Failed to generate financial events';
                        }
                    }

                    res.json(responseData);
                }
            );

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

// GET /appointments/patient/:patient_id/last-paid - Get last paid appointment for a patient
router.get('/patient/:patient_id/last-paid', requireAuth, (req, res) => {
    const { patient_id } = req.params;

    const query = `
        SELECT id, start_at, session_type FROM appointments 
        WHERE patient_id = ? AND payment_status = 'PAID'
        ORDER BY start_at DESC 
        LIMIT 1
    `;

    db.get(query, [patient_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.json({ last_paid: null, message: 'No paid appointments found' });
        res.json({
            last_paid: {
                id: row.id,
                date: row.start_at.split(' ')[0],
                session_type: row.session_type
            }
        });
    });
});

// GET /appointments/patient/:patient_id/free-return-eligibility - Check FREE_RETURN eligibility
router.get('/patient/:patient_id/free-return-eligibility', requireAuth, async (req, res) => {
    const { patient_id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    try {
        const eligibility = await validateFreeReturn(patient_id, today);

        // Also get the last paid appointment details
        const query = `
            SELECT id, start_at, session_type FROM appointments 
            WHERE patient_id = ? AND payment_status = 'PAID'
            ORDER BY start_at DESC 
            LIMIT 1
        `;

        db.get(query, [patient_id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            let days_since_last_paid = null;
            let last_paid = null;

            if (row) {
                const lastPaidDate = new Date(row.start_at);
                const currentDate = new Date();
                days_since_last_paid = Math.floor((currentDate - lastPaidDate) / (1000 * 60 * 60 * 24));
                last_paid = {
                    id: row.id,
                    date: row.start_at.split(' ')[0],
                    session_type: row.session_type
                };
            }

            res.json({
                eligible: eligibility.allowed,
                message: eligibility.message,
                days_since_last_paid,
                days_remaining: last_paid ? Math.max(0, 10 - days_since_last_paid) : 0,
                last_paid,
                policy: '10-day free return policy: FREE_RETURN is only allowed within 10 days of a PAID session'
            });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
