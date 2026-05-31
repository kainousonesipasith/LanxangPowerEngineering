/**
 * EPC Laos Project Control & Finance Monitoring App - Connected Database Service
 * Connects frontend views to backend REST APIs instead of localStorage, using a fast local cache.
 */

class DBService {
    constructor() {
        this.cache = {
            users: [],
            projects: [],
            weekly_reports: [],
            tasks: [],
            milestones: [],
            finance_records: [],
            payment_requests: [],
            allowance_bonus: [],
            announcements: [],
            documents: [],
            comments: [],
            audit_logs: [],
            procurement_records: [],
            user_weekly_reports: [],
            user_weekly_plans: []
        };
        this.isSyncing = false;
        this.init();
    }

    init() {
        // If logged in, trigger initial sync of all tables
        if (localStorage.getItem("epc_logged_in") === "true") {
            this.sync();
        }
    }

    // Parallel sync for all backend entities into client-side cache
    async sync() {
        if (localStorage.getItem("epc_logged_in") !== "true") return;
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        try {
            console.log("Synchronizing client cache with database...");
            const syncTasks = [
                this.syncCollection('users', '/users'),
                this.syncCollection('projects', '/projects'),
                this.syncCollection('tasks', '/tasks'),
                this.syncCollection('milestones', '/tasks/milestones'),
                this.syncCollection('procurement_records', '/procurements'),
                this.syncCollection('finance_records', '/finance/expenses'),
                this.syncCollection('announcements', '/announcements'),
                this.syncCollection('user_weekly_reports', '/reports/user-weekly'),
                this.syncCollection('user_weekly_plans', '/reports/user-weekly-plans'),
                this.syncCollection('audit_logs', '/audit')
            ];
            
            // Run all sync requests concurrently
            await Promise.all(syncTasks);
            
            // Sync payment claims and divide into payment_requests and allowance_bonus
            const claims = await window.utils.apiCall('/finance/claims');
            this.cache.payment_requests = claims.filter(c => ['material_purchase', 'subcontractor', 'supplier', 'site_expense'].includes(c.type));
            this.cache.allowance_bonus = claims.filter(c => ['travel', 'overtime', 'site_allowance'].includes(c.type));

            console.log("Client cache synchronized successfully.");
        } catch (err) {
            console.warn("Database sync encountered warnings/errors (some tables might be empty):", err);
        } finally {
            this.isSyncing = false;
        }
    }

    async syncCollection(cacheKey, endpoint) {
        try {
            const data = await window.utils.apiCall(endpoint);
            this.cache[cacheKey] = Array.isArray(data) ? data : [];
        } catch (err) {
            console.warn(`Sync warning: Failed to sync ${cacheKey} from endpoint ${endpoint}`);
            this.cache[cacheKey] = [];
        }
    }

    // Synchronous data access matching current ui.js patterns
    get(collection) {
        return this.cache[collection] || [];
    }

    // POST to backend API
    async add(collection, item) {
        let endpoint = '';
        if (collection === 'projects') endpoint = '/projects';
        else if (collection === 'tasks') endpoint = '/tasks';
        else if (collection === 'milestones') endpoint = '/tasks/milestones';
        else if (collection === 'procurement_records') endpoint = '/procurements';
        else if (collection === 'finance_records') endpoint = '/finance/expenses';
        else if (collection === 'payment_requests') endpoint = '/finance/claims';
        else if (collection === 'allowance_bonus') endpoint = '/finance/claims';
        else if (collection === 'users') endpoint = '/users';
        else if (collection === 'audit_logs') endpoint = '/audit';
        else if (collection === 'user_weekly_reports') endpoint = '/reports/user-weekly';
        else if (collection === 'user_weekly_plans') endpoint = '/reports/user-weekly-plans';
        else if (collection === 'comments') endpoint = '/comments';
        else if (collection === 'announcements') endpoint = '/announcements';

        if (!endpoint) {
            console.error(`Unsupported API collection for add: ${collection}`);
            return null;
        }

        try {
            const res = await window.utils.apiCall(endpoint, {
                method: 'POST',
                body: JSON.stringify(item)
            });
            await this.sync(); // Re-sync local cache
            if (window.ui && typeof window.ui.renderActiveView === 'function') {
                window.ui.renderActiveView();
            }
            return res;
        } catch (err) {
            console.error(`API create failed:`, err);
            throw err;
        }
    }

    // PUT to backend API
    async update(collection, id, updatedFields) {
        let endpoint = '';
        if (collection === 'projects') endpoint = `/projects/${id}`;
        else if (collection === 'tasks') endpoint = `/tasks/${id}`;
        else if (collection === 'milestones') endpoint = `/tasks/milestones/${id}`;
        else if (collection === 'procurement_records') endpoint = `/procurements/${id}`;
        else if (collection === 'finance_records') endpoint = `/finance/expenses/${id}`;
        else if (collection === 'payment_requests') endpoint = `/finance/claims/${id}`;
        else if (collection === 'allowance_bonus') endpoint = `/finance/claims/${id}`;
        else if (collection === 'users') endpoint = `/users/${id}`;
        else if (collection === 'user_weekly_reports') endpoint = `/reports/user-weekly/${id}`;
        else if (collection === 'user_weekly_plans') endpoint = `/reports/user-weekly-plans/${id}`;

        if (!endpoint) {
            console.error(`Unsupported API collection for update: ${collection}`);
            return null;
        }

        // Strip prefixes if the id contains string representation
        const numericId = typeof id === 'string' ? id.replace(/^[a-z]+-/, '') : id;

        try {
            const res = await window.utils.apiCall(`${endpoint}`, {
                method: 'PUT',
                body: JSON.stringify(updatedFields)
            });
            await this.sync(); // Re-sync local cache
            if (window.ui && typeof window.ui.renderActiveView === 'function') {
                window.ui.renderActiveView();
            }
            return res;
        } catch (err) {
            console.error(`API update failed:`, err);
            throw err;
        }
    }

    // DELETE on backend API (enforcing soft delete in controllers)
    async delete(collection, id) {
        let endpoint = '';
        if (collection === 'projects') endpoint = `/projects/${id}`;
        else if (collection === 'tasks') endpoint = `/tasks/${id}`;
        else if (collection === 'milestones') endpoint = `/tasks/milestones/${id}`;
        else if (collection === 'procurement_records') endpoint = `/procurements/${id}`;
        else if (collection === 'finance_records') endpoint = `/finance/expenses/${id}`;
        else if (collection === 'payment_requests') endpoint = `/finance/claims/${id}`;
        else if (collection === 'allowance_bonus') endpoint = `/finance/claims/${id}`;
        else if (collection === 'users') endpoint = `/users/${id}`;

        if (!endpoint) {
            console.error(`Unsupported API collection for delete: ${collection}`);
            return false;
        }

        try {
            await window.utils.apiCall(endpoint, {
                method: 'DELETE'
            });
            await this.sync(); // Re-sync local cache
            if (window.ui && typeof window.ui.renderActiveView === 'function') {
                window.ui.renderActiveView();
            }
            return true;
        } catch (err) {
            console.error(`API delete failed:`, err);
            return false;
        }
    }

    // Reset database (Super Admin clean wipe endpoint)
    async reset() {
        // Safe backend-level DB Wiping will be routed to Backup controller if called.
        // Handled by direct server trigger now.
    }

    // Convert currency values locally (exchange rates matching backend)
    convertToUSD(amount, currency) {
        const EXCHANGE_RATES = { USD: 1.0, LAK: 22000.0, THB: 36.6, CNY: 7.3 };
        const rate = EXCHANGE_RATES[currency] || 1.0;
        return amount / rate;
    }

    convertFromUSD(amountUSD, targetCurrency) {
        const EXCHANGE_RATES = { USD: 1.0, LAK: 22000.0, THB: 36.6, CNY: 7.3 };
        const rate = EXCHANGE_RATES[targetCurrency] || 1.0;
        return amountUSD * rate;
    }

    formatCurrency(amount, currency = "USD") {
        if (currency === "USD") {
            return "$" + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else if (currency === "LAK") {
            return Number(amount).toLocaleString(undefined) + " LAK";
        } else if (currency === "THB") {
            return Number(amount).toLocaleString(undefined) + " ฿";
        } else if (currency === "CNY") {
            return "¥" + Number(amount).toLocaleString(undefined);
        }
        return amount + " " + currency;
    }

    // Compute global metrics and KPI card counts locally using the cached datasets
    getGlobalFinanceSummary(user) {
        let projects = this.get("projects");
        const isPM = user && user.role === "project_manager";
        
        if (isPM) {
            projects = projects.filter(p => p.pm_id === user.id || p.pm_name === user.name);
        }

        let totalContractValUSD = 0;
        let totalReceivedUSD = 0;
        let totalPendingUSD = 0;
        let totalExpenseUSD = 0;
        let totalBudgetUSD = 0;

        projects.forEach(p => {
            totalContractValUSD += this.convertToUSD(parseFloat(p.contract_value || 0), p.currency);
            totalReceivedUSD += this.convertToUSD(parseFloat(p.payment_received || 0), p.currency);
            totalPendingUSD += this.convertToUSD(parseFloat(p.payment_pending || 0), p.currency);
            totalExpenseUSD += this.convertToUSD(parseFloat(p.actual_cost || 0), p.currency);
            totalBudgetUSD += this.convertToUSD(parseFloat(p.budget || 0), p.currency);
        });

        const paymentRequests = this.get("payment_requests");
        const allowanceBonus = this.get("allowance_bonus");

        let filteredPRs = paymentRequests;
        let filteredAllowances = allowanceBonus;
        if (isPM) {
            filteredPRs = paymentRequests.filter(r => r.project_id && projects.some(fp => fp.id === r.project_id));
            filteredAllowances = allowanceBonus.filter(r => r.project_id && projects.some(fp => fp.id === r.project_id));
        }

        const pendingApprovalsCount = filteredPRs.filter(x => x.status === "pending" || x.status === "submitted").length;
        const pendingAllowancesCount = filteredAllowances.filter(x => x.status === "pending" || x.status === "submitted").length;

        let procurement = this.get("procurement_records");
        if (isPM) {
            procurement = procurement.filter(r => r.project_id && projects.some(fp => fp.id === r.project_id));
        }
        
        let procCostUSD = 0;
        procurement.forEach(prc => {
            if (prc.po_status === "approved" || prc.po_status === "ordered" || prc.po_status === "shipped" || prc.po_status === "delivered" || prc.approval_status === "Approved") {
                procCostUSD += this.convertToUSD(parseFloat(prc.quotation_amount || 0), prc.currency);
            }
        });

        const reports = this.get("user_weekly_reports") || [];
        const plans = this.get("user_weekly_plans") || [];
        
        let currentWeek = 22;
        const d = new Date();
        const dayNum = d.getDay() || 7;
        d.setDate(d.getDate() + 4 - dayNum);
        const yearStart = new Date(d.getFullYear(), 0, 1);
        currentWeek = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

        const submittedReportsThisWeek = reports.filter(r => r.week_number === currentWeek && r.status !== 'draft');
        const submittedUserIds = new Set(submittedReportsThisWeek.map(r => r.user_id));
        const reportsSubmittedThisWeek = submittedUserIds.size;
        
        const activeUsers = this.get("users").filter(u => u.status === "active");
        const reportsNotSubmitted = Math.max(0, activeUsers.length - reportsSubmittedThisWeek);
        
        const pendingReportsReview = reports.filter(r => r.status === "submitted").length;
        const nextWeekPlannedTasks = plans.filter(p => p.week_number === (currentWeek + 1) || p.status === 'submitted').length;
        
        const procPendingApproval = procurement.filter(r => r.approval_status === "Waiting Deputy MD Approval" || r.approval_status === "Waiting Super Admin Approval" || r.approval_status === "Waiting Finance Budget Check").length;
        const procApproved = procurement.filter(r => r.approval_status === "Approved").length;
        const urgentProcurements = procurement.filter(r => r.priority === "urgent" && r.approval_status !== "Closed" && r.approval_status !== "Delivered").length;
        
        const overdueDelivery = procurement.filter(r => {
            if (r.approval_status === "Closed" || r.approval_status === "Delivered") return false;
            if (r.delivery_status === "overdue" || r.delivery_status === "delayed") return true;
            if (r.required_date) {
                return new Date(r.required_date) < new Date();
            }
            return false;
        }).length;

        const procRequirementsSubmitted = procurement.filter(r => r.approval_status !== 'Draft' && r.approval_status !== 'Rejected').length;
        const procWaitingReview = procurement.filter(r => r.approval_status === 'Submitted to Procurement Team' || r.approval_status === 'Under Procurement Review').length;
        const procNeedingClarification = procurement.filter(r => r.approval_status === 'Need Technical Clarification').length;
        const procWaitingBudgetCheck = procurement.filter(r => r.approval_status === 'Waiting Finance Budget Check').length;
        const procWaitingDMD = procurement.filter(r => r.approval_status === 'Waiting DMD Approval').length;
        const procWaitingSuperAdmin = procurement.filter(r => r.approval_status === 'Waiting Super Admin Approval').length;
        const procPOIssued = procurement.filter(r => r.approval_status === 'PO Issued' || r.approval_status === 'Ordered').length;
        const procDelivered = procurement.filter(r => r.approval_status === 'Delivered').length;
        const procOverdueDelivery = overdueDelivery;

        return {
            totalProjects: projects.length,
            activeProjects: projects.filter(x => x.status !== "completed" && x.status !== "suspended").length,
            delayedProjects: projects.filter(x => x.status === "delayed").length,
            completedProjects: projects.filter(x => x.status === "completed").length,
            
            totalContractValUSD,
            totalReceivedUSD,
            totalPendingUSD,
            totalExpenseUSD,
            totalBudgetUSD,
            estimatedProfitUSD: totalContractValUSD - totalExpenseUSD,
            pendingApprovals: pendingApprovalsCount + pendingAllowancesCount,

            totalPR: procurement.length,
            pendingQuotations: procurement.filter(x => x.po_status === "requested").length,
            poApproved: procurement.filter(x => x.po_status === "approved" || x.approval_status === "Approved").length,
            poOrdered: procurement.filter(x => x.po_status === "ordered" || x.po_status === "shipped" || x.approval_status === "Ordered").length,
            matDelivered: procurement.filter(x => x.po_status === "delivered" || x.approval_status === "Delivered" || x.approval_status === "Closed").length,
            overdueDelivery: overdueDelivery,
            procurementCostUSD: procCostUSD,
            pendingProcurementApproval: procPendingApproval,
            
            reportsSubmittedThisWeek,
            reportsNotSubmitted,
            pendingReportsReview,
            nextWeekPlannedTasks,
            procPendingApproval,
            procApproved,
            urgentProcurements,

            procRequirementsSubmitted,
            procWaitingReview,
            procNeedingClarification,
            procWaitingBudgetCheck,
            procWaitingDMD,
            procWaitingSuperAdmin,
            procPOIssued,
            procDelivered,
            procOverdueDelivery
        };
    }
}

// Global DB Singleton
window.db = new DBService();
console.log("EPC Laos DB module loaded successfully via API connectors!");
