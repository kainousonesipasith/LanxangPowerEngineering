-- PostgreSQL Schema for Laos EPC System

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    department VARCHAR(100),
    avatar VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    client VARCHAR(150),
    location VARCHAR(150),
    type VARCHAR(50), -- substation, transmission_line, solar, factory, maintenance
    contract_value DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    start_date DATE,
    planned_finish DATE,
    actual_finish DATE,
    status VARCHAR(50) DEFAULT 'planning', -- planning, design, procurement, construction, testing, commissioning, completed, delayed
    progress_percent INTEGER DEFAULT 0,
    pm_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    deputy_md_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    finance_pic_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    procurement_pic_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    procurement_engineer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    budget DECIMAL(15, 2) DEFAULT 0,
    actual_cost DECIMAL(15, 2) DEFAULT 0,
    payment_received DECIMAL(15, 2) DEFAULT 0,
    payment_pending DECIMAL(15, 2) DEFAULT 0,
    risks TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 4. Project Members Table
CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

-- 5. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE,
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
    progress_percent INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 6. Milestones Table
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 7. Payment Claims Table
CREATE TABLE IF NOT EXISTS payment_claims (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- material_purchase, subcontractor, site_expense, supplier, travel, overtime
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    reason TEXT,
    requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, paid
    approval_comment TEXT,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP NULL,
    disbursed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    disbursement_at TIMESTAMP NULL,
    payment_method VARCHAR(50),
    disbursement_remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 8. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'expense', -- income, expense
    category VARCHAR(50), -- subcontractor, material, labor, transport, etc.
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    invoice_number VARCHAR(50),
    payment_date DATE,
    payment_status VARCHAR(20) DEFAULT 'paid', -- paid, pending
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 9. Procurement Requests Table
CREATE TABLE IF NOT EXISTS procurement_requests (
    id SERIAL PRIMARY KEY,
    pr_number VARCHAR(50) UNIQUE NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    material_name VARCHAR(150) NOT NULL,
    specification TEXT,
    quantity DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(20),
    required_date DATE,
    delivery_location VARCHAR(200),
    estimated_budget DECIMAL(15, 2),
    reason TEXT,
    drawing_boq VARCHAR(100),
    requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    procurement_pic INTEGER REFERENCES users(id) ON DELETE SET NULL,
    buyer INTEGER REFERENCES users(id) ON DELETE SET NULL,
    plan_date DATE,
    priority VARCHAR(20) DEFAULT 'normal', -- normal, high, urgent
    category VARCHAR(50),
    supplier_name VARCHAR(150),
    quotation_amount DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    po_number VARCHAR(50),
    po_status VARCHAR(50) DEFAULT 'requested',
    delivery_status VARCHAR(50) DEFAULT 'not_shipped',
    approval_status VARCHAR(50) DEFAULT 'Draft',
    remarks TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 10. Approvals (History Tracker) Table
CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    procurement_request_id INTEGER REFERENCES procurement_requests(id) ON DELETE CASCADE,
    payment_claim_id INTEGER REFERENCES payment_claims(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- submit, review, budget_check, approve, reject, PO issued, delivered, disburse
    action_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT,
    prev_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    payment_claim_id INTEGER REFERENCES payment_claims(id) ON DELETE SET NULL,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
    procurement_request_id INTEGER REFERENCES procurement_requests(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Weekly Reports Table
CREATE TABLE IF NOT EXISTS weekly_reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    date_range VARCHAR(50) NOT NULL,
    work_completed TEXT,
    work_planned TEXT,
    progress_percent INTEGER DEFAULT 0,
    manpower INTEGER DEFAULT 0,
    materials_status TEXT,
    issues TEXT,
    support_required TEXT,
    delay_reason TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 14. User Weekly Reports (Supervisor Reviews) Table
CREATE TABLE IF NOT EXISTS user_weekly_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    employee_name VARCHAR(100) NOT NULL,
    role_dept VARCHAR(100) NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    date_range VARCHAR(50) NOT NULL,
    work_completed TEXT,
    problems TEXT,
    support_required TEXT,
    work_plan_next_week TEXT,
    target_next_week DATE,
    progress_percent INTEGER DEFAULT 0,
    attachment_placeholder VARCHAR(255),
    submitted_date DATE,
    status VARCHAR(20) DEFAULT 'submitted', -- draft, submitted, approved, rejected
    comments TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_name VARCHAR(100),
    reviewed_by_role VARCHAR(50),
    reviewed_at TIMESTAMP NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 15. User Weekly Plans (Supervisor Reviews) Table
CREATE TABLE IF NOT EXISTS user_weekly_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    tasks_this_week TEXT,
    completed_work TEXT,
    problems TEXT,
    plan_next_week TEXT,
    target_date DATE,
    required_support TEXT,
    status VARCHAR(20) DEFAULT 'submitted', -- draft, submitted, approved, rejected
    comments TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_name VARCHAR(100),
    reviewed_by_role VARCHAR(50),
    reviewed_at TIMESTAMP NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 16. Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    target_audience VARCHAR(50) DEFAULT 'all', -- all, project_team
    target_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- normal, important, urgent
    publish_date DATE,
    attachment VARCHAR(255),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);
