const db = require('../db/index');

// Get all projects with RBAC and project scope isolation
async function getProjects(req, res) {
    const { id: userId, role } = req.user;
    try {
        let queryText = '';
        let params = [];

        // Admin roles can see all projects
        if (role === 'super_admin' || role === 'deputy_md' || role === 'admin' || role === 'finance_manager' || role === 'procurement') {
            queryText = `
                SELECT p.*, 
                       pm.name as pm_name, 
                       pe.name as pe_name,
                       COALESCE((SELECT ARRAY_AGG(user_id)::text[] FROM project_members WHERE project_id = p.id), '{}') as team
                FROM projects p
                LEFT JOIN users pm ON p.pm_id = pm.id
                LEFT JOIN users pe ON p.procurement_engineer_id = pe.id
                WHERE p.deleted_at IS NULL
                ORDER BY p.id ASC
            `;
        } else {
            // PMs and Engineers see only their assigned projects
            queryText = `
                SELECT p.*, 
                       pm.name as pm_name, 
                       pe.name as pe_name,
                       COALESCE((SELECT ARRAY_AGG(user_id)::text[] FROM project_members WHERE project_id = p.id), '{}') as team
                FROM projects p
                LEFT JOIN users pm ON p.pm_id = pm.id
                LEFT JOIN users pe ON p.procurement_engineer_id = pe.id
                WHERE p.deleted_at IS NULL AND (
                    p.pm_id = $1 OR 
                    p.procurement_engineer_id = $1 OR 
                    p.finance_pic_id = $1 OR
                    p.procurement_pic_id = $1 OR
                    EXISTS (SELECT 1 FROM project_members WHERE project_id = p.id AND user_id = $1)
                )
                ORDER BY p.id ASC
            `;
            params = [userId];
        }

        const result = await db.query(queryText, params);

        // Sanitize sensitive financial properties for unauthorized roles
        const sanitized = result.rows.map(p => {
            // Only Super Admin, DMD, Finance, and the specific assigned PM can view project financials
            const hasFinancialsAccess = role === 'super_admin' || 
                                        role === 'deputy_md' || 
                                        role === 'finance_manager' || 
                                        (role === 'project_manager' && parseInt(p.pm_id) === parseInt(userId));

            const cleanProj = { ...p };
            
            // Format team user IDs to standard strings/numbers
            if (cleanProj.team) {
                cleanProj.team = cleanProj.team.map(id => isNaN(id) ? id : parseInt(id));
            }

            if (!hasFinancialsAccess) {
                delete cleanProj.contract_value;
                delete cleanProj.budget;
                delete cleanProj.actual_cost;
                delete cleanProj.payment_received;
                delete cleanProj.payment_pending;
            } else {
                // Ensure they are numbers
                cleanProj.contract_value = parseFloat(cleanProj.contract_value || 0);
                cleanProj.budget = parseFloat(cleanProj.budget || 0);
                cleanProj.actual_cost = parseFloat(cleanProj.actual_cost || 0);
                cleanProj.payment_received = parseFloat(cleanProj.payment_received || 0);
                cleanProj.payment_pending = parseFloat(cleanProj.payment_pending || 0);
            }
            return cleanProj;
        });

        return res.json(sanitized);
    } catch (err) {
        console.error('Error fetching projects:', err);
        return res.status(500).json({ error: 'Failed to retrieve projects' });
    }
}

// Create new project (Super Admin only)
async function createProject(req, res) {
    const { code, name, client, location, type, contract_value, currency, start_date, planned_finish, status, pm_id, procurement_engineer_id, budget, description, risks, team } = req.body;

    if (!code || !name || !contract_value) {
        return res.status(400).json({ error: 'Project code, name, and contract value are required' });
    }

    try {
        const checkProj = await db.query(`SELECT id FROM projects WHERE code = $1 AND deleted_at IS NULL`, [code]);
        if (checkProj.rowCount > 0) {
            return res.status(400).json({ error: 'Project code already exists' });
        }

        const insertQuery = `
            INSERT INTO projects (code, name, client, location, type, contract_value, currency, start_date, planned_finish, status, pm_id, procurement_engineer_id, budget, description, risks) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id
        `;
        const result = await db.query(insertQuery, [
            code, name, client, location, type, contract_value, currency || 'USD', 
            start_date || null, planned_finish || null, status || 'planning', 
            pm_id || null, procurement_engineer_id || null, budget || 0, description, risks
        ]);

        const projectId = result.rows[0].id;

        // Add team members
        if (team && Array.isArray(team)) {
            for (const memberId of team) {
                await db.query(
                    `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [projectId, memberId]
                );
            }
        }

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, req.user.name, 'PROJECT_CREATED', 'projects', `Created project: ${code} - ${name}`]
        );

        return res.status(201).json({ id: projectId, message: 'Project created successfully' });
    } catch (err) {
        console.error('Error creating project:', err);
        return res.status(500).json({ error: 'Failed to create project' });
    }
}

// Update project (Super Admin only)
async function updateProject(req, res) {
    const { id } = req.params;
    const { code, name, client, location, type, contract_value, currency, start_date, planned_finish, actual_finish, status, progress_percent, pm_id, procurement_engineer_id, budget, description, risks, team } = req.body;

    try {
        const checkProj = await db.query(`SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (checkProj.rowCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const updateQuery = `
            UPDATE projects 
            SET code = $1, name = $2, client = $3, location = $4, type = $5, contract_value = $6, currency = $7, 
                start_date = $8, planned_finish = $9, actual_finish = $10, status = $11, progress_percent = $12, 
                pm_id = $13, procurement_engineer_id = $14, budget = $15, description = $16, risks = $17, updated_at = CURRENT_TIMESTAMP
            WHERE id = $18
        `;
        await db.query(updateQuery, [
            code, name, client, location, type, contract_value, currency, 
            start_date || null, planned_finish || null, actual_finish || null, status, progress_percent || 0,
            pm_id || null, procurement_engineer_id || null, budget || 0, description, risks, id
        ]);

        // Re-sync team members: clear and insert
        await db.query(`DELETE FROM project_members WHERE project_id = $1`, [id]);
        if (team && Array.isArray(team)) {
            for (const memberId of team) {
                await db.query(
                    `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [id, memberId]
                );
            }
        }

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, req.user.name, 'PROJECT_UPDATED', 'projects', `Updated project: ${code}`]
        );

        return res.json({ message: 'Project updated successfully' });
    } catch (err) {
        console.error('Error updating project:', err);
        return res.status(500).json({ error: 'Failed to update project' });
    }
}

// Soft Delete project (Super Admin only)
async function deleteProject(req, res) {
    const { id } = req.params;

    try {
        const checkProj = await db.query(`SELECT code FROM projects WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (checkProj.rowCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Apply soft delete
        await db.query(`UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

        // Keep a deletion history log in audit_logs
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, req.user.name, 'PROJECT_DELETED', 'projects', `Soft-deleted project: ${checkProj.rows[0].code} (ID: ${id})`]
        );

        return res.json({ message: 'Project soft-deleted successfully' });
    } catch (err) {
        console.error('Error deleting project:', err);
        return res.status(500).json({ error: 'Failed to delete project' });
    }
}

module.exports = {
    getProjects,
    createProject,
    updateProject,
    deleteProject
};
