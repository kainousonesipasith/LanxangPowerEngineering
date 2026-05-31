const db = require('../db/index');

// Helper to check user roles
function hasRole(user, allowedRoles) {
    return user.role === 'super_admin' || allowedRoles.includes(user.role);
}

// 1. Submit PR (PM or Engineer only)
async function submitProcurement(req, res) {
    const { id } = req.params;
    const { comment } = req.body;
    const { id: userId, role, name: userName } = req.user;

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) return res.status(404).json({ error: 'Requisition not found' });
        const record = prRes.rows[0];

        // Access check: PM or PE
        if (role !== 'project_manager' && role !== 'engineer' && role !== 'super_admin') {
            return res.status(403).json({ error: 'Access Denied: Only PM, Engineer, or Super Admin can submit' });
        }

        const allowedStatuses = ['Draft', 'Need Technical Clarification'];
        if (!allowedStatuses.includes(record.approval_status)) {
            return res.status(400).json({ error: 'Requisition is not in a submittable state' });
        }

        await db.query(
            `UPDATE procurement_requests 
             SET approval_status = 'Submitted to Procurement Team', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id]
        );

        // Record history
        await db.query(
            `INSERT INTO approvals (procurement_request_id, action_type, action_by, comment, prev_status, new_status)
             VALUES ($1, 'submit', $2, $3, $4, 'Submitted to Procurement Team')`,
            [id, userId, comment || 'Submitted requirement plan', record.approval_status]
        );

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PR_SUBMITTED', 'procurement', `Submitted PR: ${record.pr_number}`]
        );

        return res.json({ message: 'Requisition successfully submitted to Procurement Team' });
    } catch (err) {
        console.error('Error submitting procurement:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 2. Review PR (Procurement Team only)
async function reviewProcurement(req, res) {
    const { id } = req.params;
    const { comment, supplier_name, quotation_amount, currency } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (!hasRole(req.user, ['procurement'])) {
        return res.status(403).json({ error: 'Access Denied: Only Procurement Team can review requisitions' });
    }

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) return res.status(404).json({ error: 'Requisition not found' });
        const record = prRes.rows[0];

        const nextStatus = 'Waiting Finance Budget Check';

        await db.query(
            `UPDATE procurement_requests 
             SET approval_status = $1, supplier_name = $2, quotation_amount = $3, currency = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [nextStatus, supplier_name, quotation_amount || 0, currency || 'USD', id]
        );

        await db.query(
            `INSERT INTO approvals (procurement_request_id, action_type, action_by, comment, prev_status, new_status)
             VALUES ($1, 'review', $2, $3, $4, $5)`,
            [id, userId, comment || `Prepared quotation plan from ${supplier_name}`, record.approval_status, nextStatus]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PR_REVIEWED', 'procurement', `Procurement reviewed and quoted PR: ${record.pr_number}`]
        );

        return res.json({ message: 'Requisition reviewed and forwarded to Finance' });
    } catch (err) {
        console.error('Error reviewing procurement:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 3. Finance Budget Check (Finance Manager only)
async function budgetCheckProcurement(req, res) {
    const { id } = req.params;
    const { comment } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (!hasRole(req.user, ['finance_manager'])) {
        return res.status(403).json({ error: 'Access Denied: Only Finance Manager can perform budget checks' });
    }

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) return res.status(404).json({ error: 'Requisition not found' });
        const record = prRes.rows[0];

        if (record.approval_status !== 'Waiting Finance Budget Check') {
            return res.status(400).json({ error: 'Requisition is not waiting for budget check' });
        }

        // Exchange rates definitions matching database and frontend
        const EXCHANGE_RATES = { USD: 1.0, LAK: 22000.0, THB: 36.6, CNY: 7.3 };
        const amountUSD = (parseFloat(record.quotation_amount || 0)) / (EXCHANGE_RATES[record.currency || 'USD'] || 1.0);

        // Determine next review stage: DMD limit is 50,000 USD, else Super Admin
        const nextStatus = amountUSD <= 50000.0 ? 'Waiting DMD Approval' : 'Waiting Super Admin Approval';

        await db.query(
            `UPDATE procurement_requests 
             SET approval_status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextStatus, id]
        );

        await db.query(
            `INSERT INTO approvals (procurement_request_id, action_type, action_by, comment, prev_status, new_status)
             VALUES ($1, 'budget_check', $2, $3, $4, $5)`,
            [id, userId, comment || 'Budget verification passed', record.approval_status, nextStatus]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PR_BUDGET_CHECKED', 'procurement', `Finance checked budget and forwarded to Admin/DMD for PR: ${record.pr_number}`]
        );

        return res.json({ message: `Budget checked successfully. Forwarded to ${nextStatus.replace('Waiting ', '')}` });
    } catch (err) {
        console.error('Error budget checking procurement:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 4. Approve Requisition (DMD or Super Admin only)
async function approveProcurement(req, res) {
    const { id } = req.params;
    const { comment } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (role !== 'super_admin' && role !== 'deputy_md') {
        return res.status(403).json({ error: 'Access Denied: Only Super Admin or DMD can approve requisitions' });
    }

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) return res.status(404).json({ error: 'Requisition not found' });
        const record = prRes.rows[0];

        // Limit verification: DMD cannot approve > $50,000 USD
        const EXCHANGE_RATES = { USD: 1.0, LAK: 22000.0, THB: 36.6, CNY: 7.3 };
        const amountUSD = (parseFloat(record.quotation_amount || 0)) / (EXCHANGE_RATES[record.currency || 'USD'] || 1.0);

        if (role === 'deputy_md' && amountUSD > 50000.0) {
            return res.status(403).json({ error: 'Access Denied: Requisition amount exceeds Deputy MD approval limit of 50,000 USD' });
        }

        await db.query(
            `UPDATE procurement_requests 
             SET approval_status = 'Approved', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id]
        );

        await db.query(
            `INSERT INTO approvals (procurement_request_id, action_type, action_by, comment, prev_status, new_status)
             VALUES ($1, 'approve', $2, $3, $4, 'Approved')`,
            [id, userId, comment || 'Approved', record.approval_status]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PR_APPROVED', 'procurement', `Approved PR: ${record.pr_number} by ${userName}`]
        );

        return res.json({ message: 'Requisition successfully approved' });
    } catch (err) {
        console.error('Error approving procurement:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 5. Reject Requisition
async function rejectProcurement(req, res) {
    const { id } = req.params;
    const { comment } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (role !== 'super_admin' && role !== 'deputy_md' && role !== 'admin') {
        return res.status(403).json({ error: 'Access Denied: Only Super Admin, DMD, or Admin can reject requisitions' });
    }

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) return res.status(404).json({ error: 'Requisition not found' });
        const record = prRes.rows[0];

        await db.query(
            `UPDATE procurement_requests 
             SET approval_status = 'Rejected', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id]
        );

        await db.query(
            `INSERT INTO approvals (procurement_request_id, action_type, action_by, comment, prev_status, new_status)
             VALUES ($1, 'reject', $2, $3, $4, 'Rejected')`,
            [id, userId, comment || 'Rejected', record.approval_status]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PR_REJECTED', 'procurement', `Rejected PR: ${record.pr_number}`]
        );

        return res.json({ message: 'Requisition successfully rejected' });
    } catch (err) {
        console.error('Error rejecting procurement:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 6. Request revision / tech clarification
async function requestRevisionProcurement(req, res) {
    const { id } = req.params;
    const { comment } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (role !== 'super_admin' && role !== 'deputy_md' && role !== 'admin' && role !== 'procurement' && role !== 'finance_manager') {
        return res.status(403).json({ error: 'Access Denied' });
    }

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) return res.status(404).json({ error: 'Requisition not found' });
        const record = prRes.rows[0];

        const nextStatus = 'Need Technical Clarification';

        await db.query(
            `UPDATE procurement_requests 
             SET approval_status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextStatus, id]
        );

        await db.query(
            `INSERT INTO approvals (procurement_request_id, action_type, action_by, comment, prev_status, new_status)
             VALUES ($1, 'request_revision', $2, $3, $4, $5)`,
            [id, userId, comment || 'Clarification required', record.approval_status, nextStatus]
        );

        return res.json({ message: 'Requisition status updated to Need Technical Clarification' });
    } catch (err) {
        console.error('Error requesting revision:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 7. Issue PO (Procurement Team only)
async function issuePOProcurement(req, res) {
    const { id } = req.params;
    const { comment, po_number } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (!hasRole(req.user, ['procurement'])) {
        return res.status(403).json({ error: 'Access Denied: Only Procurement Team can issue Purchase Orders' });
    }

    if (!po_number) {
        return res.status(400).json({ error: 'PO number is required to issue PO' });
    }

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) return res.status(404).json({ error: 'Requisition not found' });
        const record = prRes.rows[0];

        if (record.approval_status !== 'Approved') {
            return res.status(400).json({ error: 'Cannot issue PO: Requisition must be approved first' });
        }

        await db.query(
            `UPDATE procurement_requests 
             SET approval_status = 'PO Issued', po_number = $1, po_status = 'ordered', updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [po_number, id]
        );

        await db.query(
            `INSERT INTO approvals (procurement_request_id, action_type, action_by, comment, prev_status, new_status)
             VALUES ($1, 'issue_po', $2, $3, $4, 'PO Issued')`,
            [id, userId, comment || `Issued PO: ${po_number}`, record.approval_status]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PR_PO_ISSUED', 'procurement', `Issued PO ${po_number} for PR: ${record.pr_number}`]
        );

        return res.json({ message: `PO issued successfully: ${po_number}` });
    } catch (err) {
        console.error('Error issuing PO:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// 8. Log Delivery receipt (Procurement Team or Site Team)
async function updateDeliveryProcurement(req, res) {
    const { id } = req.params;
    const { comment, delivery_status } = req.body; // status must be 'delivered', 'in_transit', etc.
    const { id: userId, role, name: userName } = req.user;

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) return res.status(404).json({ error: 'Requisition not found' });
        const record = prRes.rows[0];

        const nextStatus = delivery_status === 'delivered' ? 'Delivered' : record.approval_status;

        await db.query(
            `UPDATE procurement_requests 
             SET approval_status = $1, delivery_status = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [nextStatus, delivery_status, id]
        );

        await db.query(
            `INSERT INTO approvals (procurement_request_id, action_type, action_by, comment, prev_status, new_status)
             VALUES ($1, 'update_delivery', $2, $3, $4, $5)`,
            [id, userId, comment || `Delivery updated to: ${delivery_status}`, record.approval_status, nextStatus]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PR_DELIVERY_UPDATED', 'procurement', `Updated delivery status of PR ${record.pr_number} to ${delivery_status}`]
        );

        return res.json({ message: 'Delivery status updated successfully' });
    } catch (err) {
        console.error('Error updating delivery:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Fetch approval history trail for a record
async function getApprovalHistory(req, res) {
    const { procurement_request_id, payment_claim_id } = req.query;

    try {
        let queryText = `
            SELECT a.*, u.name as action_by_name, r.name as action_by_role
            FROM approvals a
            LEFT JOIN users u ON a.action_by = u.id
            LEFT JOIN roles r ON u.role_id = r.id
        `;
        let params = [];

        if (procurement_request_id) {
            queryText += ` WHERE a.procurement_request_id = $1`;
            params.push(procurement_request_id);
        } else if (payment_claim_id) {
            queryText += ` WHERE a.payment_claim_id = $1`;
            params.push(payment_claim_id);
        } else {
            return res.status(400).json({ error: 'Request ID or Claim ID is required' });
        }

        queryText += ` ORDER BY a.created_at ASC`;

        const result = await db.query(queryText, params);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching approval history:', err);
        return res.status(500).json({ error: 'Failed to retrieve approval history' });
    }
}

module.exports = {
    submitProcurement,
    reviewProcurement,
    budgetCheckProcurement,
    approveProcurement,
    rejectProcurement,
    requestRevisionProcurement,
    issuePOProcurement,
    updateDeliveryProcurement,
    getApprovalHistory
};
