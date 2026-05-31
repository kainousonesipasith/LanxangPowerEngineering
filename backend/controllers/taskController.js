const db = require('../db/index');

// Helper to check project assignment permission
async function isProjectAssigned(projectId, userId, role) {
    if (role === 'super_admin' || role === 'deputy_md') return true;
    
    // Only PM and Engineer are allowed to write/modify tasks/milestones
    if (role !== 'project_manager' && role !== 'engineer') return false;

    const queryText = `
        SELECT 1 FROM projects 
        WHERE id = $1 AND (
            pm_id = $2 OR 
            procurement_engineer_id = $2 OR 
            finance_pic_id = $2 OR
            procurement_pic_id = $2 OR
            EXISTS (SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2)
        ) AND deleted_at IS NULL
    `;
    const res = await db.query(queryText, [projectId, userId]);
    return res.rowCount > 0;
}

// Get all tasks (filtered by project accessibility if PM/Engineer)
async function getTasks(req, res) {
    const { id: userId, role } = req.user;
    const { project_id } = req.query;

    try {
        let queryText = `
            SELECT t.*, u.name as assigned_to_name, p.name as project_name, creator.name as created_by_name, updater.name as last_updated_by_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN users updater ON t.last_updated_by = updater.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.deleted_at IS NULL
        `;
        let params = [];

        if (project_id) {
            queryText += ` AND t.project_id = $1`;
            params.push(project_id);
            
            // Check project visibility
            const isAssigned = await isProjectAssigned(project_id, userId, role);
            if (!isAssigned && role !== 'finance_manager' && role !== 'procurement' && role !== 'viewer') {
                return res.status(403).json({ error: 'Access Denied: You are not assigned to this project' });
            }
        } else if (role !== 'super_admin' && role !== 'deputy_md' && role !== 'finance_manager' && role !== 'procurement' && role !== 'viewer') {
            // Filter list to only assigned projects
            queryText += ` AND (
                p.pm_id = $1 OR p.procurement_engineer_id = $1 OR 
                EXISTS (SELECT 1 FROM project_members WHERE project_id = t.project_id AND user_id = $1)
            )`;
            params.push(userId);
        }

        queryText += ` ORDER BY t.due_date ASC`;

        const result = await db.query(queryText, params);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        return res.status(500).json({ error: 'Failed to retrieve tasks' });
    }
}

// Create new task
async function createTask(req, res) {
    const { project_id, title, description, assigned_to, start_date, due_date, priority, status, progress_percent } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (!project_id || !title) {
        return res.status(400).json({ error: 'Project ID and title are required' });
    }

    try {
        // Enforce project assignment check
        const isAssigned = await isProjectAssigned(project_id, userId, role);
        if (!isAssigned) {
            return res.status(403).json({ error: 'Access Denied: You are not authorized to create tasks for this project' });
        }

        const insertQuery = `
            INSERT INTO tasks (project_id, title, description, assigned_to, start_date, due_date, priority, status, progress_percent, created_by, last_updated_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
            RETURNING id
        `;
        const result = await db.query(insertQuery, [
            project_id, title, description, assigned_to || null, 
            start_date || null, due_date || null, priority || 'normal', 
            status || 'not_started', progress_percent || 0, userId
        ]);

        const taskId = result.rows[0].id;

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'TASK_CREATED', 'tasks', `Created task (ID: ${taskId}) for Project: ${project_id}`]
        );

        return res.status(201).json({ id: taskId, message: 'Task created successfully' });
    } catch (err) {
        console.error('Error creating task:', err);
        return res.status(500).json({ error: 'Failed to create task' });
    }
}

// Update task
async function updateTask(req, res) {
    const { id } = req.params;
    const { title, description, assigned_to, start_date, due_date, priority, status, progress_percent } = req.body;
    const { id: userId, role, name: userName } = req.user;

    try {
        const taskRes = await db.query(`SELECT project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (taskRes.rowCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const projectId = taskRes.rows[0].project_id;

        // Enforce project assignment check
        const isAssigned = await isProjectAssigned(projectId, userId, role);
        if (!isAssigned) {
            return res.status(403).json({ error: 'Access Denied: You are not authorized to update tasks for this project' });
        }

        const updateQuery = `
            UPDATE tasks 
            SET title = $1, description = $2, assigned_to = $3, start_date = $4, due_date = $5, 
                priority = $6, status = $7, progress_percent = $8, last_updated_by = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
        `;
        await db.query(updateQuery, [
            title, description, assigned_to || null, start_date || null, due_date || null, 
            priority, status, progress_percent || 0, userId, id
        ]);

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'TASK_UPDATED', 'tasks', `Updated task (ID: ${id})`]
        );

        return res.json({ message: 'Task updated successfully' });
    } catch (err) {
        console.error('Error updating task:', err);
        return res.status(500).json({ error: 'Failed to update task' });
    }
}

// Soft Delete task
async function deleteTask(req, res) {
    const { id } = req.params;
    const { id: userId, role, name: userName } = req.user;

    try {
        const taskRes = await db.query(`SELECT title, project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (taskRes.rowCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const task = taskRes.rows[0];

        // Enforce project assignment check
        const isAssigned = await isProjectAssigned(task.project_id, userId, role);
        if (!isAssigned) {
            return res.status(403).json({ error: 'Access Denied: You are not authorized to delete tasks for this project' });
        }

        // Apply soft delete
        await db.query(`UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

        // Log audit
        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'TASK_DELETED', 'tasks', `Soft-deleted task: ${task.title} (ID: ${id})`]
        );

        return res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Error deleting task:', err);
        return res.status(500).json({ error: 'Failed to delete task' });
    }
}

// --- MILESTONES ---

// Get Milestones
async function getMilestones(req, res) {
    const { id: userId, role } = req.user;
    const { project_id } = req.query;

    try {
        let queryText = `
            SELECT m.*, p.name as project_name, creator.name as created_by_name
            FROM milestones m
            LEFT JOIN users creator ON m.created_by = creator.id
            LEFT JOIN projects p ON m.project_id = p.id
            WHERE m.deleted_at IS NULL
        `;
        let params = [];

        if (project_id) {
            queryText += ` AND m.project_id = $1`;
            params.push(project_id);
            
            const isAssigned = await isProjectAssigned(project_id, userId, role);
            if (!isAssigned && role !== 'finance_manager' && role !== 'procurement' && role !== 'viewer') {
                return res.status(403).json({ error: 'Access Denied' });
            }
        } else if (role !== 'super_admin' && role !== 'deputy_md' && role !== 'finance_manager' && role !== 'procurement' && role !== 'viewer') {
            queryText += ` AND (
                p.pm_id = $1 OR p.procurement_engineer_id = $1 OR 
                EXISTS (SELECT 1 FROM project_members WHERE project_id = m.project_id AND user_id = $1)
            )`;
            params.push(userId);
        }

        queryText += ` ORDER BY m.due_date ASC`;

        const result = await db.query(queryText, params);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching milestones:', err);
        return res.status(500).json({ error: 'Failed to retrieve milestones' });
    }
}

// Create Milestone
async function createMilestone(req, res) {
    const { project_id, title, description, due_date, status } = req.body;
    const { id: userId, role, name: userName } = req.user;

    if (!project_id || !title) {
        return res.status(400).json({ error: 'Project ID and title are required' });
    }

    try {
        const isAssigned = await isProjectAssigned(project_id, userId, role);
        if (!isAssigned) {
            return res.status(403).json({ error: 'Access Denied' });
        }

        const insertQuery = `
            INSERT INTO milestones (project_id, title, description, due_date, status, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        const result = await db.query(insertQuery, [
            project_id, title, description, due_date || null, status || 'pending', userId
        ]);

        const milestoneId = result.rows[0].id;

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'MILESTONE_CREATED', 'tasks', `Created milestone (ID: ${milestoneId})`]
        );

        return res.status(201).json({ id: milestoneId, message: 'Milestone created successfully' });
    } catch (err) {
        console.error('Error creating milestone:', err);
        return res.status(500).json({ error: 'Failed to create milestone' });
    }
}

// Update Milestone
async function updateMilestone(req, res) {
    const { id } = req.params;
    const { title, description, due_date, status } = req.body;
    const { id: userId, role, name: userName } = req.user;

    try {
        const milestoneRes = await db.query(`SELECT project_id FROM milestones WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (milestoneRes.rowCount === 0) {
            return res.status(404).json({ error: 'Milestone not found' });
        }
        const projectId = milestoneRes.rows[0].project_id;

        const isAssigned = await isProjectAssigned(projectId, userId, role);
        if (!isAssigned) {
            return res.status(403).json({ error: 'Access Denied' });
        }

        await db.query(
            `UPDATE milestones 
             SET title = $1, description = $2, due_date = $3, status = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [title, description, due_date || null, status, id]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'MILESTONE_UPDATED', 'tasks', `Updated milestone (ID: ${id})`]
        );

        return res.json({ message: 'Milestone updated successfully' });
    } catch (err) {
        console.error('Error updating milestone:', err);
        return res.status(500).json({ error: 'Failed to update milestone' });
    }
}

// Soft Delete Milestone
async function deleteMilestone(req, res) {
    const { id } = req.params;
    const { id: userId, role, name: userName } = req.user;

    try {
        const milestoneRes = await db.query(`SELECT title, project_id FROM milestones WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (milestoneRes.rowCount === 0) {
            return res.status(404).json({ error: 'Milestone not found' });
        }
        const milestone = milestoneRes.rows[0];

        const isAssigned = await isProjectAssigned(milestone.project_id, userId, role);
        if (!isAssigned) {
            return res.status(403).json({ error: 'Access Denied' });
        }

        await db.query(`UPDATE milestones SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

        await db.query(
            `INSERT INTO audit_logs (user_id, user_name, action, module, details) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, userName, 'MILESTONE_DELETED', 'tasks', `Soft-deleted milestone: ${milestone.title} (ID: ${id})`]
        );

        return res.json({ message: 'Milestone soft-deleted successfully' });
    } catch (err) {
        console.error('Error deleting milestone:', err);
        return res.status(500).json({ error: 'Failed to delete milestone' });
    }
}

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    getMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone
};
