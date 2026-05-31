const db = require('../db/index');

// Helper to verify project assignment
async function isProjectAssigned(projectId, userId, role) {
    if (role === 'super_admin' || role === 'deputy_md' || role === 'finance_manager') return true;
    const queryText = `
        SELECT 1 FROM projects 
        WHERE id = $1 AND (
            pm_id = $2 OR 
            procurement_engineer_id = $2 OR 
            EXISTS (SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2)
        ) AND deleted_at IS NULL
    `;
    const res = await db.query(queryText, [projectId, userId]);
    return res.rowCount > 0;
}

// --- EXPENSES (LEDGER RECORDS) ---

// Get expenses
async function getExpenses(req, res) {
    const { id: userId, role } = req.user;
    const { project_id } = req.query;

    try {
        let queryText = `
            SELECT e.*, p.name as project_name, p.code as project_code, u.name as created_by_name
            FROM expenses e
            LEFT JOIN projects p ON e.project_id = p.id
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.deleted_at IS NULL
        `;
        let params = [];

        if (project_id) {
            queryText += ` AND e.project_id = $1`;
            params.push(project_id);

            const isAssigned = await isProjectAssigned(project_id, userId, role);
            if (!isAssigned) {
                return res.status(403).json({ error: 'Access Denied: You are not assigned to this project' });
            }
        } else if (role !== 'super_admin' && role !== 'deputy_md' && role !== 'finance_manager') {
            // PMs and Engineers see only assigned projects
            queryText += ` AND (
                p.pm_id = $1 OR p.procurement_engineer_id = $1 OR 
                EXISTS (SELECT 1 FROM project_members WHERE project_id = e.project_id AND user_id = $1)
            )`;
            params.push(userId);
        }

        queryText += ` ORDER BY e.payment_date DESC, e.id DESC`;

        const result = await db.query(queryText, params);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching expenses:', err);
        return res.status(500).json({ error: 'Failed to retrieve expenses' });
    }
}

// Create expense
async function createExpense(req, res) {
    const { project_id, category, amount, currency, invoice_number, payment_date, description } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (!project_id || !category || !amount) {
        return res.status(400).json({ error: 'Project, category, and amount are required' });
    }

    try {
        const isAssigned = await isProjectAssigned(project_id, userId, role);
        if (!isAssigned || (role !== 'super_admin' && role !== 'finance_manager' && role !== 'project_manager')) {
            return res.status(403).json({ error: 'Access Denied: Unauthorized to write expenses for this project' });
        }

        const insertQuery = `
            INSERT INTO expenses (project_id, category, amount, currency, invoice_number, payment_date, payment_status, description, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7, $8)
            RETURNING id
        `;
        const result = await db.query(insertQuery, [
            project_id, category, amount, currency || 'USD', invoice_number, 
            payment_date || new Date().toISOString().split('T')[0], description, userId
        ]);

        const expenseId = result.rows[0].id;

        // Recalculate project actual cost
        await recalculateProjectFinancials(project_id);

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'EXPENSE_CREATED', 'finance', `Created expense entry (ID: ${expenseId}) of ${amount} ${currency} for project ${project_id}`]
        );

        return res.status(201).json({ id: expenseId, message: 'Expense recorded successfully' });
    } catch (err) {
        console.error('Error recording expense:', err);
        return res.status(500).json({ error: 'Failed to record expense' });
    }
}

// Soft Delete expense
async function deleteExpense(req, res) {
    const { id } = req.params;
    const { id: userId, role, name: userName } = req.user;

    try {
        const expRes = await db.query(`SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (expRes.rowCount === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        const record = expRes.rows[0];

        const isAssigned = await isProjectAssigned(record.project_id, userId, role);
        if (!isAssigned || (role !== 'super_admin' && role !== 'finance_manager' && role !== 'project_manager')) {
            return res.status(403).json({ error: 'Access Denied' });
        }

        await db.query(`UPDATE expenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

        // Recalculate project actual cost
        await recalculateProjectFinancials(record.project_id);

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'EXPENSE_DELETED', 'finance', `Soft-deleted expense (ID: ${id}) for project ${record.project_id}`]
        );

        return res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        console.error('Error deleting expense:', err);
        return res.status(500).json({ error: 'Failed to delete expense' });
    }
}

// --- PAYMENT CLAIMS (CASH REQUESTS) ---

// Get payment claims (RBAC filtered)
async function getPaymentClaims(req, res) {
    const { id: userId, role } = req.user;
    const { project_id } = req.query;

    try {
        let queryText = `
            SELECT pr.*, p.name as project_name, p.code as project_code,
                   req.name as requested_by_name, app.name as approved_by_name, dis.name as disbursed_by_name
            FROM payment_claims pr
            LEFT JOIN projects p ON pr.project_id = p.id
            LEFT JOIN users req ON pr.requested_by = req.id
            LEFT JOIN users app ON pr.approved_by = app.id
            LEFT JOIN users dis ON pr.disbursed_by = dis.id
            WHERE pr.deleted_at IS NULL
        `;
        let params = [];

        if (project_id) {
            queryText += ` AND pr.project_id = $1`;
            params.push(project_id);

            const isAssigned = await isProjectAssigned(project_id, userId, role);
            if (!isAssigned) {
                return res.status(403).json({ error: 'Access Denied' });
            }
        } else if (role !== 'super_admin' && role !== 'deputy_md' && role !== 'finance_manager') {
            // PMs and Engineers see only assigned projects
            queryText += ` AND (
                p.pm_id = $1 OR p.procurement_engineer_id = $1 OR 
                EXISTS (SELECT 1 FROM project_members WHERE project_id = pr.project_id AND user_id = $1)
            )`;
            params.push(userId);
        }

        queryText += ` ORDER BY pr.id DESC`;

        const result = await db.query(queryText, params);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching payment claims:', err);
        return res.status(500).json({ error: 'Failed to retrieve payment claims' });
    }
}

// Create payment claim
async function createPaymentClaim(req, res) {
    const { project_id, type, amount, currency, reason } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (!project_id || !type || !amount) {
        return res.status(400).json({ error: 'Project, type, and amount are required' });
    }

    try {
        const isAssigned = await isProjectAssigned(project_id, userId, role);
        if (!isAssigned || role === 'viewer') {
            return res.status(403).json({ error: 'Access Denied: You are not authorized to request payments for this project' });
        }

        const insertQuery = `
            INSERT INTO payment_claims (project_id, type, amount, currency, reason, requested_by, status) 
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            RETURNING id
        `;
        const result = await db.query(insertQuery, [project_id, type, amount, currency || 'USD', reason, userId]);

        const claimId = result.rows[0].id;

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PAYMENT_CLAIM_CREATED', 'finance', `Submitted payment claim (ID: ${claimId}) of ${amount} ${currency}`]
        );

        return res.status(201).json({ id: claimId, message: 'Payment claim submitted successfully' });
    } catch (err) {
        console.error('Error creating payment claim:', err);
        return res.status(500).json({ error: 'Failed to submit payment claim' });
    }
}

// Update payment claim
async function updatePaymentClaim(req, res) {
    const { id } = req.params;
    const { type, amount, currency, reason } = req.body;
    const { id: userId, name: userName } = req.user;

    try {
        const claimRes = await db.query(`SELECT * FROM payment_claims WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (claimRes.rowCount === 0) {
            return res.status(404).json({ error: 'Payment claim not found' });
        }
        const claim = claimRes.rows[0];

        if (claim.requested_by !== userId) {
            return res.status(403).json({ error: 'Access Denied: You are not the owner of this claim' });
        }

        if (claim.status !== 'pending') {
            return res.status(400).json({ error: 'Access Denied: Cannot modify a claim that is already reviewed or disbursed' });
        }

        const updateQuery = `
            UPDATE payment_claims 
            SET type = $1, amount = $2, currency = $3, reason = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `;
        await db.query(updateQuery, [type || claim.type, amount || claim.amount, currency || claim.currency, reason || claim.reason, id]);

        return res.json({ message: 'Payment claim updated successfully' });
    } catch (err) {
        console.error('Error updating payment claim:', err);
        return res.status(500).json({ error: 'Failed to update payment claim' });
    }
}

// Delete payment claim (creator restriction guard)
async function deletePaymentClaim(req, res) {
    const { id } = req.params;
    const { id: userId, role, name: userName } = req.user;

    try {
        const claimRes = await db.query(`SELECT * FROM payment_claims WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (claimRes.rowCount === 0) {
            return res.status(404).json({ error: 'Payment claim not found' });
        }
        const claim = claimRes.rows[0];

        const isOwner = claim.requested_by === userId;
        const canDelete = role === 'super_admin' || (isOwner && claim.status === 'pending');

        if (!canDelete) {
            return res.status(403).json({ error: 'Access Denied: You cannot delete a request that is already approved, rejected, or paid' });
        }

        // Apply soft delete
        await db.query(`UPDATE payment_claims SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PAYMENT_CLAIM_DELETED', 'finance', `Soft-deleted payment claim (ID: ${id})`]
        );

        return res.json({ message: 'Payment claim deleted successfully' });
    } catch (err) {
        console.error('Error deleting payment claim:', err);
        return res.status(500).json({ error: 'Failed to delete payment claim' });
    }
}

// --- APPROVAL & DISBURSEMENT CONTROL ---

// Approve or Reject Payment Claim (DMD or Super Admin only)
async function approvePaymentClaim(req, res) {
    const { id } = req.params;
    const { status, comment } = req.body; // status must be 'approved' or 'rejected'
    const { id: userId, role, name: userName } = req.user;

    if (role !== 'super_admin' && role !== 'deputy_md') {
        return res.status(403).json({ error: 'Access Denied: Only Super Admin or DMD can approve payment claims' });
    }

    if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
    }

    try {
        const claimRes = await db.query(`SELECT * FROM payment_claims WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (claimRes.rowCount === 0) {
            return res.status(404).json({ error: 'Payment claim not found' });
        }
        const claim = claimRes.rows[0];

        if (claim.status !== 'pending') {
            return res.status(400).json({ error: 'Payment claim is already reviewed' });
        }

        await db.query(
            `UPDATE payment_claims 
             SET status = $1, approval_comment = $2, approved_by = $3, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [status, comment, userId, id]
        );

        // Record approval history
        await db.query(
            `INSERT INTO approvals (payment_claim_id, action_type, action_by, comment, prev_status, new_status) 
             VALUES ($1, $2, $3, $4, 'pending', $5)`,
            [id, status === 'approved' ? 'approve' : 'reject', userId, comment, status]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, status === 'approved' ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED', 'finance', `Reviewed payment claim ${id}: ${status.toUpperCase()}`]
        );

        return res.json({ message: `Payment claim successfully ${status}` });
    } catch (err) {
        console.error('Error approving payment claim:', err);
        return res.status(500).json({ error: 'Failed to approve payment claim' });
    }
}

// Disburse Payment Claim (status to 'paid')
// Restricted to Finance Manager and Super Admin. REQUIRES file evidence uploaded.
async function disbursePaymentClaim(req, res) {
    const { id } = req.params;
    const { payment_method, remark } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (role !== 'super_admin' && role !== 'finance_manager') {
        return res.status(403).json({ error: 'Access Denied: Only Finance Manager or Super Admin can disburse payments' });
    }

    try {
        const claimRes = await db.query(`SELECT * FROM payment_claims WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (claimRes.rowCount === 0) {
            return res.status(404).json({ error: 'Payment claim not found' });
        }
        const claim = claimRes.rows[0];

        if (claim.status !== 'approved') {
            return res.status(400).json({ error: 'Cannot disburse: Payment claim must be approved first' });
        }

        // Validate attachment is provided
        // Check if an attachment for this claim exists in pg database
        const attachmentCheck = await db.query(`SELECT id FROM attachments WHERE payment_claim_id = $1`, [id]);
        if (attachmentCheck.rowCount === 0 && !req.file) {
            return res.status(400).json({ error: 'Attachment required: You must upload at least one receipt/invoice slip to disburse payment.' });
        }

        // Apply disbursement
        await db.query(
            `UPDATE payment_claims 
             SET status = 'paid', disbursed_by = $1, disbursement_at = CURRENT_TIMESTAMP, 
                 payment_method = $2, disbursement_remark = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [userId, payment_method || 'Bank Transfer', remark, id]
        );

        // Save disbursement to expenses (actual cost ledger)
        const expenseQuery = `
            INSERT INTO expenses (project_id, category, amount, currency, description, created_by, payment_date, payment_status)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'paid')
            RETURNING id
        `;
        const expResult = await db.query(expenseQuery, [
            claim.project_id, claim.type, claim.amount, claim.currency, 
            `Disbursement for Claim #${claim.id}: ${claim.reason}`, userId
        ]);

        const newExpenseId = expResult.rows[0].id;

        // If file uploaded in this request, map it to the expense also
        if (req.file) {
            const fileInfo = req.file;
            await db.query(
                `INSERT INTO attachments (payment_claim_id, expense_id, filename, file_path, file_size, mime_type, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [id, newExpenseId, fileInfo.originalname, '/uploads/' + fileInfo.filename, fileInfo.size, fileInfo.mimetype, userId]
            );
        } else if (attachmentCheck.rowCount > 0) {
            // Map existing attachment to new expense
            await db.query(
                `UPDATE attachments SET expense_id = $1 WHERE payment_claim_id = $2`,
                [newExpenseId, id]
            );
        }

        // Recalculate project actual cost
        await recalculateProjectFinancials(claim.project_id);

        // Record history
        await db.query(
            `INSERT INTO approvals (payment_claim_id, action_type, action_by, comment, prev_status, new_status) 
             VALUES ($1, 'disburse', $2, $3, 'approved', 'paid')`,
            [id, userId, remark]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PAYMENT_DISBURSED', 'finance', `Disbursed payment claim ${id} (ledger expense: ${newExpenseId})`]
        );

        return res.json({ message: 'Payment successfully disbursed and logged as expense.' });
    } catch (err) {
        console.error('Error disbursing payment claim:', err);
        return res.status(500).json({ error: 'Failed to disburse payment claim' });
    }
}

// --- PROJECT FINANCIAL RECALCULATION ENGINE ---
async function recalculateProjectFinancials(projectId) {
    try {
        // Compute total paid expenses in local currencies
        const expensesRes = await db.query(
            `SELECT amount, currency FROM expenses WHERE project_id = $1 AND payment_status = 'paid' AND deleted_at IS NULL`,
            [projectId]
        );

        const projectRes = await db.query(
            `SELECT currency, contract_value FROM projects WHERE id = $1`,
            [projectId]
        );
        if (projectRes.rowCount === 0) return;
        const p = projectRes.rows[0];

        // Exchange rates definitions matching frontend i18n
        const EXCHANGE_RATES = { USD: 1.0, LAK: 22000.0, THB: 36.6, CNY: 7.3 };

        function convertToUSD(amt, curr) {
            const rate = EXCHANGE_RATES[curr] || 1.0;
            return amt / rate;
        }

        function convertFromUSD(amtUSD, targetCurr) {
            const rate = EXCHANGE_RATES[targetCurr] || 1.0;
            return amtUSD * rate;
        }

        let actualCostUSD = 0;
        expensesRes.rows.forEach(e => {
            actualCostUSD += convertToUSD(parseFloat(e.amount), e.currency);
        });

        // Convert back to project primary currency
        const actualCostProjectCurrency = convertFromUSD(actualCostUSD, p.currency);

        // Fetch paid income to calculate payment_received
        const incomeRes = await db.query(
            `SELECT amount, currency FROM expenses WHERE project_id = $1 AND type = 'income' AND payment_status = 'paid' AND deleted_at IS NULL`,
            [projectId]
        );

        let incomeUSD = 0;
        incomeRes.rows.forEach(i => {
            incomeUSD += convertToUSD(parseFloat(i.amount), i.currency);
        });
        const paymentReceivedProjCurrency = convertFromUSD(incomeUSD, p.currency);
        const paymentPendingProjCurrency = Math.max(0, parseFloat(p.contract_value) - paymentReceivedProjCurrency);

        // Update project table
        await db.query(
            `UPDATE projects 
             SET actual_cost = $1, payment_received = $2, payment_pending = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [actualCostProjectCurrency, paymentReceivedProjCurrency, paymentPendingProjCurrency, projectId]
        );

        console.log(`Recalculated financials for project ${projectId}. Cost: ${actualCostProjectCurrency} ${p.currency}`);
    } catch (err) {
        console.error('Error recalculating project financials:', err);
    }
}

module.exports = {
    getExpenses,
    createExpense,
    deleteExpense,
    getPaymentClaims,
    createPaymentClaim,
    updatePaymentClaim,
    deletePaymentClaim,
    approvePaymentClaim,
    disbursePaymentClaim
};
