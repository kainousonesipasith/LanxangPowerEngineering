const db = require('../db/index');

// Helper to verify project assignment
async function isProjectAssigned(projectId, userId, role) {
    if (role === 'super_admin' || role === 'deputy_md' || role === 'admin' || role === 'finance_manager' || role === 'procurement') return true;
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

// Get all procurement records (RBAC filtered)
async function getProcurements(req, res) {
    const { id: userId, role } = req.user;
    const { project_id } = req.query;

    try {
        let queryText = `
            SELECT pr.*, p.name as project_name, p.code as project_code,
                   req.name as requested_by_name, pic.name as procurement_pic_name, buy.name as buyer_name
            FROM procurement_requests pr
            LEFT JOIN projects p ON pr.project_id = p.id
            LEFT JOIN users req ON pr.requested_by = req.id
            LEFT JOIN users pic ON pr.procurement_pic = pic.id
            LEFT JOIN users buy ON pr.buyer = buy.id
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
        } else if (role !== 'super_admin' && role !== 'deputy_md' && role !== 'admin' && role !== 'finance_manager' && role !== 'procurement') {
            // Project Managers and Engineers see only assigned projects
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
        console.error('Error fetching procurement records:', err);
        return res.status(500).json({ error: 'Failed to fetch procurement records' });
    }
}

// Create new procurement requirement
async function createProcurement(req, res) {
    const { project_id, material_name, specification, quantity, unit, required_date, delivery_location, estimated_budget, reason, drawing_boq, priority, category } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (!project_id || !material_name || !quantity) {
        return res.status(400).json({ error: 'Project, material name, and quantity are required' });
    }

    try {
        const isAssigned = await isProjectAssigned(project_id, userId, role);
        if (!isAssigned || (role !== 'super_admin' && role !== 'project_manager' && role !== 'engineer' && role !== 'procurement')) {
            return res.status(403).json({ error: 'Access Denied: Unauthorized to create procurement requirements for this project' });
        }

        const prNumber = 'PR-' + Date.now();

        const insertQuery = `
            INSERT INTO procurement_requests (pr_number, project_id, material_name, specification, quantity, unit, required_date, delivery_location, estimated_budget, reason, drawing_boq, priority, category, requested_by, created_by, approval_status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, 'Draft')
            RETURNING id, pr_number
        `;
        const result = await db.query(insertQuery, [
            prNumber, project_id, material_name, specification, quantity, unit, 
            required_date || null, delivery_location, estimated_budget || 0, 
            reason, drawing_boq, priority || 'normal', category, userId
        ]);

        const prId = result.rows[0].id;

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PROCUREMENT_CREATED', 'procurement', `Created PR requirement: ${prNumber}`]
        );

        return res.status(201).json({ id: prId, pr_number: prNumber, message: 'Procurement requirement created successfully' });
    } catch (err) {
        console.error('Error creating procurement requirement:', err);
        return res.status(500).json({ error: 'Failed to create procurement requirement' });
    }
}

// Update procurement details
async function updateProcurement(req, res) {
    const { id } = req.params;
    const { material_name, specification, quantity, unit, required_date, delivery_location, estimated_budget, reason, drawing_boq, priority, category, procurement_pic, buyer, plan_date, supplier_name, quotation_amount, currency, po_number, po_status, delivery_status, remarks } = req.body;
    const { id: userId, role, name: userName } = req.user;

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) {
            return res.status(404).json({ error: 'Procurement request not found' });
        }
        const record = prRes.rows[0];

        // Enforce RBAC permission checks on updates
        const isAssigned = await isProjectAssigned(record.project_id, userId, role);
        if (!isAssigned) {
            return res.status(403).json({ error: 'Access Denied: You are not assigned to this project' });
        }

        const isCreator = record.created_by === userId;
        const status = record.approval_status;

        let allowedToEdit = false;
        if (role === 'super_admin') allowedToEdit = true;
        if (isCreator && (status === 'Draft' || status === 'Need Technical Clarification')) allowedToEdit = true;
        if (role === 'procurement' && ['Submitted to Procurement Team', 'Under Procurement Review', 'Need Technical Clarification', 'Quotation in Progress', 'Waiting Finance Budget Check', 'Approved', 'PO Issued', 'Ordered'].includes(status)) allowedToEdit = true;
        if (role === 'finance_manager' && status === 'Waiting Finance Budget Check') allowedToEdit = true;
        if (role === 'deputy_md' && status === 'Waiting DMD Approval') allowedToEdit = true;

        if (!allowedToEdit) {
            return res.status(403).json({ error: 'Access Denied: Current status prevents updates under your user role' });
        }

        const updateQuery = `
            UPDATE procurement_requests 
            SET material_name = $1, specification = $2, quantity = $3, unit = $4, required_date = $5, 
                delivery_location = $6, estimated_budget = $7, reason = $8, drawing_boq = $9, priority = $10, 
                category = $11, procurement_pic = $12, buyer = $13, plan_date = $14, supplier_name = $15, 
                quotation_amount = $16, currency = $17, po_number = $18, po_status = $19, delivery_status = $20, 
                remarks = $21, updated_at = CURRENT_TIMESTAMP
            WHERE id = $22
        `;
        await db.query(updateQuery, [
            material_name || record.material_name, specification || record.specification, 
            quantity || record.quantity, unit || record.unit, required_date || record.required_date, 
            delivery_location || record.delivery_location, estimated_budget || record.estimated_budget, 
            reason || record.reason, drawing_boq || record.drawing_boq, priority || record.priority, 
            category || record.category, procurement_pic || record.procurement_pic, buyer || record.buyer, 
            plan_date || record.plan_date, supplier_name || record.supplier_name, quotation_amount || record.quotation_amount, 
            currency || record.currency, po_number || record.po_number, po_status || record.po_status, 
            delivery_status || record.delivery_status, remarks || record.remarks, id
        ]);

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PROCUREMENT_UPDATED', 'procurement', `Updated details for PR: ${record.pr_number}`]
        );

        return res.json({ message: 'Procurement details updated successfully' });
    } catch (err) {
        console.error('Error updating procurement:', err);
        return res.status(500).json({ error: 'Failed to update procurement details' });
    }
}

// Delete procurement requirement (creator restriction guard)
async function deleteProcurement(req, res) {
    const { id } = req.params;
    const { id: userId, role, name: userName } = req.user;

    try {
        const prRes = await db.query(`SELECT * FROM procurement_requests WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (prRes.rowCount === 0) {
            return res.status(404).json({ error: 'Procurement request not found' });
        }
        const record = prRes.rows[0];

        // Creator delete rule check:
        // "Before approval, creator can delete own request. After approved/rejected/paid, creator cannot delete it."
        const isCreator = record.created_by === userId;
        const status = record.approval_status;

        // Allowed to delete if Draft or Submitted to Procurement Team and user is the creator
        const canDelete = role === 'super_admin' || 
                          (isCreator && (status === 'Draft' || status === 'Submitted to Procurement Team'));

        if (!canDelete) {
            return res.status(403).json({ error: 'Access Denied: You cannot delete a request that is already approved or review-locked' });
        }

        // Apply soft delete
        await db.query(`UPDATE procurement_requests SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

        // Keep history record in audit logs
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'PROCUREMENT_DELETED', 'procurement', `Soft-deleted PR: ${record.pr_number}`]
        );

        return res.json({ message: 'Procurement request deleted successfully' });
    } catch (err) {
        console.error('Error deleting procurement request:', err);
        return res.status(500).json({ error: 'Failed to delete procurement request' });
    }
}

module.exports = {
    getProcurements,
    createProcurement,
    updateProcurement,
    deleteProcurement
};
