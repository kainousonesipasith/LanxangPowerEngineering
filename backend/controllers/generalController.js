const db = require('../db/index');

// --- ANNOUNCEMENTS ---
async function getAnnouncements(req, res) {
    try {
        const result = await db.query(`SELECT * FROM announcements WHERE deleted_at IS NULL ORDER BY publish_date DESC`);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching announcements:', err);
        return res.status(500).json({ error: 'Failed to retrieve announcements' });
    }
}

async function createAnnouncement(req, res) {
    const { title, message, target_audience, target_project_id, priority, publish_date, attachment } = req.body;
    const { id: userId, role } = req.user;

    if (role !== 'super_admin' && role !== 'deputy_md') {
        return res.status(403).json({ error: 'Access Denied: Only DMD or Super Admin can publish announcements' });
    }

    try {
        const result = await db.query(
            `INSERT INTO announcements (title, message, target_audience, target_project_id, priority, publish_date, attachment, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [title, message, target_audience || 'all', target_project_id || null, priority || 'normal', publish_date || new Date().toISOString().split('T')[0], attachment, userId]
        );
        return res.status(201).json({ id: result.rows[0].id, message: 'Announcement published successfully' });
    } catch (err) {
        console.error('Error creating announcement:', err);
        return res.status(500).json({ error: 'Failed to publish announcement' });
    }
}

// --- COMMENTS ---
async function getComments(req, res) {
    const { task_id } = req.query;
    try {
        let query = `SELECT c.*, u.name as user_name FROM comments c LEFT JOIN users u ON c.user_id = u.id`;
        let params = [];
        if (task_id) {
            query += ` WHERE c.task_id = $1`;
            params.push(task_id);
        }
        query += ` ORDER BY c.created_at ASC`;
        const result = await db.query(query, params);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching comments:', err);
        return res.status(500).json({ error: 'Failed to retrieve comments' });
    }
}

async function createComment(req, res) {
    const { task_id, message } = req.body;
    const { id: userId } = req.user;

    if (!task_id || !message) {
        return res.status(400).json({ error: 'Task ID and message are required' });
    }

    try {
        const result = await db.query(
            `INSERT INTO comments (task_id, user_id, message) VALUES ($1, $2, $3) RETURNING id, created_at`,
            [task_id, userId, message]
        );
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating comment:', err);
        return res.status(500).json({ error: 'Failed to post comment' });
    }
}

// --- WEEKLY REPORTS & PLANS ---
async function getUserWeeklyReports(req, res) {
    try {
        const result = await db.query(`
            SELECT r.*, p.name as project_name, u.name as reviewer_name
            FROM user_weekly_reports r
            LEFT JOIN projects p ON r.project_id = p.id
            LEFT JOIN users u ON r.reviewed_by = u.id
            WHERE r.deleted_at IS NULL
            ORDER BY r.submitted_date DESC
        `);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching user weekly reports:', err);
        return res.status(500).json({ error: 'Failed to retrieve weekly reports' });
    }
}

async function createUserWeeklyReport(req, res) {
    const { project_id, week_number, date_range, work_completed, problems, support_required, work_plan_next_week, target_next_week, progress_percent } = req.body;
    const { id: userId, name: userName, role } = req.user;

    try {
        const dept = req.user.department || '';
        const roleDept = `${role.toUpperCase().replace('_', ' ')} / ${dept}`;

        const result = await db.query(
            `INSERT INTO user_weekly_reports (user_id, employee_name, role_dept, project_id, week_number, date_range, work_completed, problems, support_required, work_plan_next_week, target_next_week, progress_percent, submitted_date, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE, 'submitted', $1) RETURNING id`,
            [userId, userName, roleDept, project_id, week_number, date_range, work_completed, problems, support_required, work_plan_next_week, target_next_week || null, progress_percent || 0]
        );
        return res.status(201).json({ id: result.rows[0].id, message: 'Report submitted successfully' });
    } catch (err) {
        console.error('Error creating weekly report:', err);
        return res.status(500).json({ error: 'Failed to submit weekly report' });
    }
}

async function reviewUserWeeklyReport(req, res) {
    const { id } = req.params;
    const { status, comments } = req.body;
    const { id: userId, name: userName, role } = req.user;

    if (role !== 'super_admin' && role !== 'deputy_md') {
        return res.status(403).json({ error: 'Access Denied: Only DMD and Super Admin can review weekly reports' });
    }

    try {
        await db.query(
            `UPDATE user_weekly_reports 
             SET status = $1, comments = $2, reviewed_by = $3, reviewed_by_name = $4, reviewed_by_role = $5, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6`,
            [status, comments, userId, userName, role, id]
        );
        return res.json({ message: 'Weekly report review recorded successfully' });
    } catch (err) {
        console.error('Error reviewing weekly report:', err);
        return res.status(500).json({ error: 'Failed to review weekly report' });
    }
}

async function getUserWeeklyPlans(req, res) {
    try {
        const result = await db.query(`
            SELECT p.*, u.name as reviewer_name
            FROM user_weekly_plans p
            LEFT JOIN users u ON p.reviewed_by = u.id
            WHERE p.deleted_at IS NULL
            ORDER BY p.week_number DESC
        `);
        return res.json(result.rows);
    } catch (err) {
        console.error('Error fetching weekly plans:', err);
        return res.status(500).json({ error: 'Failed to retrieve weekly plans' });
    }
}

async function createUserWeeklyPlan(req, res) {
    const { week_number, tasks_this_week, completed_work, problems, plan_next_week, target_date, required_support } = req.body;
    const { id: userId } = req.user;

    try {
        const result = await db.query(
            `INSERT INTO user_weekly_plans (user_id, week_number, tasks_this_week, completed_work, problems, plan_next_week, target_date, required_support, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted', $1) RETURNING id`,
            [userId, week_number, tasks_this_week, completed_work, problems, plan_next_week, target_date || null, required_support]
        );
        return res.status(201).json({ id: result.rows[0].id, message: 'Weekly plan submitted successfully' });
    } catch (err) {
        console.error('Error creating weekly plan:', err);
        return res.status(500).json({ error: 'Failed to submit weekly plan' });
    }
}

async function reviewUserWeeklyPlan(req, res) {
    const { id } = req.params;
    const { status, comments } = req.body;
    const { id: userId, name: userName, role } = req.user;

    if (role !== 'super_admin' && role !== 'deputy_md') {
        return res.status(403).json({ error: 'Access Denied: Only DMD and Super Admin can review weekly plans' });
    }

    try {
        await db.query(
            `UPDATE user_weekly_plans 
             SET status = $1, comments = $2, reviewed_by = $3, reviewed_by_name = $4, reviewed_by_role = $5, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6`,
            [status, comments, userId, userName, role, id]
        );
        return res.json({ message: 'Weekly plan review recorded successfully' });
    } catch (err) {
        console.error('Error reviewing weekly plan:', err);
        return res.status(500).json({ error: 'Failed to review weekly plan' });
    }
}

module.exports = {
    getAnnouncements,
    createAnnouncement,
    getComments,
    createComment,
    getUserWeeklyReports,
    createUserWeeklyReport,
    reviewUserWeeklyReport,
    getUserWeeklyPlans,
    createUserWeeklyPlan,
    reviewUserWeeklyPlan
};
