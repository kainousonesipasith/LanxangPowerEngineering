/**
 * EPC Laos Project Control & Finance Monitoring App - Authentication & Roles Service (Upgraded)
 */

const AUTH_PREFIX = "epc_laos_auth_";
const APPROVAL_LIMIT_USD = 50000.0; // Configurable threshold limit for Deputy MD

class AuthService {
    constructor() {
        this.init();
    }

    init() {
        // Safe check for login token to determine state
        const token = localStorage.getItem("epc_laos_auth_token");
        if (token) {
            localStorage.setItem("epc_logged_in", "true");
        } else {
            localStorage.setItem("epc_logged_in", "false");
        }
    }

    getCurrentUser() {
        try {
            const profileStr = localStorage.getItem("epc_laos_user_profile");
            if (!profileStr) return null;
            return JSON.parse(profileStr);
        } catch (err) {
            console.error("Defensive getCurrentUser fallback:", err);
            return null;
        }
    }

    loginAs(token, userProfile) {
        try {
            localStorage.setItem("epc_laos_auth_token", token);
            localStorage.setItem("epc_laos_user_profile", JSON.stringify(userProfile));
            localStorage.setItem("epc_logged_in", "true");
            
            // Dispatch event for UI updates safely
            window.dispatchEvent(new CustomEvent("epc-role-changed", { detail: userProfile }));
        } catch (err) {
            console.error("Error in loginAs:", err);
        }
    }

    logout() {
        localStorage.removeItem("epc_laos_auth_token");
        localStorage.removeItem("epc_laos_user_profile");
        localStorage.setItem("epc_logged_in", "false");
    }

    // Lockout Protection: Checks if a user is the LAST active Super Admin in the system
    isLastActiveSuperAdmin(userId) {
        const users = window.db.get("users");
        const activeSuperAdmins = users.filter(u => u.role === "super_admin" && u.status === "active");
        
        if (activeSuperAdmins.length === 1 && activeSuperAdmins[0].id === userId) {
            return true;
        }
        return false;
    }

    // Deputy MD Threshold limit verification
    isWithinApprovalLimit(amount, currency) {
        const user = this.getCurrentUser();
        if (user.role === "super_admin") return true; // Directors have unlimited authority
        if (user.role !== "deputy_md") return false; // Other roles cannot approve anyway

        // Convert to USD and verify against $50,000 threshold
        const amountUSD = window.db.convertToUSD(amount, currency);
        return amountUSD <= APPROVAL_LIMIT_USD;
    }

    // Upgraded Role-based Access Control (RBAC) permission checks
    hasPermission(action, context = null) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const role = user.role;

        // Super Admin has access to everything
        if (role === "super_admin") return true;

        switch (action) {
            case "view_company_finance_summary":
                return role === "finance_manager" || role === "deputy_md" || role === "super_admin";

            case "view_project_finance_summary":
                return role === "finance_manager" || role === "deputy_md" || role === "super_admin" || role === "procurement" || role === "project_manager";

            case "view_profit":
                return role === "finance_manager" || role === "deputy_md" || role === "super_admin";

            case "review_weekly_reports":
                return role === "project_manager" || role === "deputy_md" || role === "super_admin" || role === "finance_manager";

            case "manage_backup":
                return role === "super_admin";

            case "view_finance_summary":
            case "view_project_budgets":
                return role === "finance_manager" || role === "deputy_md" || role === "super_admin" || role === "project_manager";
            
            case "manage_projects": // Add/Edit/Delete
                if (role === "super_admin") return true;
                if (role === "project_manager" && context) {
                    const project = typeof context === "string" ? window.db.get("projects").find(p => p.id === context) : context;
                    return project && project.pm_id === user.id;
                }
                return false;
            
            case "submit_weekly_report":
                return role === "project_manager" || role === "engineer";
            
            case "assign_tasks":
                if (role === "super_admin") return true;
                if (context) {
                    const project = typeof context === "string" ? window.db.get("projects").find(p => p.id === context) : context;
                    if (project) {
                        const isPM = project.pm_id === user.id;
                        const isPE = project.procurement_engineer_id === user.id || project.team.includes(user.id);
                        if (role === "project_manager" && isPM) return true;
                        if (role === "engineer" && isPE) return true;
                    }
                    return false;
                }
                return role === "project_manager" || role === "engineer";
                
            case "update_task_progress":
                return role !== "viewer";

            case "add_project_expense":
                if (role === "finance_manager") return true;
                if (role === "project_manager") {
                    if (context) {
                        const project = typeof context === "string" ? window.db.get("projects").find(p => p.id === context) : context;
                        return project && project.pm_id === user.id;
                    }
                    return true;
                }
                return false;

            case "create_payment_request":
                return role === "project_manager" || role === "engineer" || role === "finance_manager" || role === "deputy_md";

            case "approve_payment_request":
                if (role === "super_admin" || role === "deputy_md") return true;
                if (role === "project_manager") {
                    if (context) {
                        const request = typeof context === "string" ? window.db.get("payment_requests").find(r => r.id === context) : context;
                        if (request) {
                            const project = window.db.get("projects").find(p => p.id === request.project_id);
                            if (project && project.pm_id === user.id) {
                                const requestAmountUSD = window.db.convertToUSD(request.amount, request.currency);
                                const actualCostUSD = window.db.convertToUSD(project.actual_cost || 0, project.currency);
                                const budgetUSD = window.db.convertToUSD(project.budget || 0, project.currency);
                                if (actualCostUSD + requestAmountUSD <= budgetUSD) {
                                    return true;
                                }
                            }
                        }
                    }
                }
                return false;

            case "submit_allowance_claim":
                return true; // Everyone can claim

            case "approve_allowance_bonus":
                return role === "super_admin" || role === "finance_manager" || role === "deputy_md";

            case "post_announcement":
                return role === "super_admin" || role === "deputy_md";

            case "view_audit_logs":
                return role === "super_admin";

            case "manage_users":
                return role === "super_admin"; // Only Directors manage system users

            // Procurement permissions
            case "view_procurement":
                if (context) {
                    const isPM = context.pm_id === user.id;
                    const isPE = context.procurement_engineer_id === user.id;
                    if (role === "viewer" || role === "engineer") {
                        return isPE || isPM;
                    }
                    return true;
                }
                if (role === "viewer" || role === "engineer") {
                    // Check if they are procurement engineer for any project
                    const projects = window.db ? window.db.get("projects") : [];
                    return projects.some(p => p.procurement_engineer_id === user.id || p.pm_id === user.id);
                }
                return true;
            
            case "create_procurement":
                if (context) return this.canCreateProcurement(context);
                return role === "project_manager" || role === "procurement" || role === "super_admin" || role === "engineer";

            case "edit_procurement":
                if (context) return this.canEditProcurement(context);
                return role === "procurement" || role === "super_admin" || role === "finance_manager" || role === "deputy_md" || role === "project_manager" || role === "engineer";

            case "approve_procurement":
                if (context) return this.canActionProcurement(context, "approve");
                return role === "super_admin" || role === "deputy_md";

            default:
                return false;
        }
    }

    canCreateProcurement(project) {
        const user = this.getCurrentUser();
        if (!user || !project) return false;
        
        if (user.role === "super_admin") return true;
        if (user.role === "project_manager" && project.pm_id === user.id) return true;
        if (project.procurement_engineer_id === user.id) return true;
        
        return false;
    }

    canEditProcurement(record) {
        const user = this.getCurrentUser();
        if (!user || !record) return false;
        
        if (user.role === "super_admin") return true; // Super Admin can edit/correct anything
        
        const project = window.db.get("projects").find(p => p.id === record.project_id);
        const isPM = project && project.pm_id === user.id;
        const isPE = project && project.procurement_engineer_id === user.id;
        
        const status = record.approval_status;
        
        // PM and PE can edit in Draft or Need Technical Clarification status
        if ((isPM || isPE) && (status === "Draft" || status === "Need Technical Clarification")) {
            return true;
        }
        
        // Procurement team can edit during planning/review and po/delivery tracking
        if (user.role === "procurement") {
            const allowedStatuses = [
                "Submitted to Procurement Team",
                "Under Procurement Review",
                "Need Technical Clarification",
                "Quotation in Progress",
                "Waiting Finance Budget Check",
                "Approved",
                "PO Issued",
                "Ordered",
                "Delivered"
            ];
            if (allowedStatuses.includes(status)) {
                return true;
            }
        }
        
        // Finance manager can check budget
        if (user.role === "finance_manager" && status === "Waiting Finance Budget Check") {
            return true;
        }
        
        // Deputy MD can review/approve/reject
        if (user.role === "deputy_md" && status === "Waiting DMD Approval") {
            return true;
        }
        
        return false;
    }

    canActionProcurement(record, action) {
        const user = this.getCurrentUser();
        if (!user || !record) return false;
        
        if (user.role === "super_admin") return true;
        
        const project = window.db.get("projects").find(p => p.id === record.project_id);
        const isPM = project && project.pm_id === user.id;
        const isPE = project && project.procurement_engineer_id === user.id;
        const status = record.approval_status;
        
        if (action === "submit") {
            // Only PM or PE can submit from Draft or Need Technical Clarification
            return (isPM || isPE) && (status === "Draft" || status === "Need Technical Clarification");
        }
        
        if (action === "review") {
            // Only Procurement Team can review
            return user.role === "procurement" && (status === "Submitted to Procurement Team" || status === "Under Procurement Review" || status === "Need Technical Clarification");
        }
        
        if (action === "budget_check") {
            return user.role === "finance_manager" && status === "Waiting Finance Budget Check";
        }
        
        if (action === "approve" || action === "reject" || action === "request_revision") {
            if (user.role === "deputy_md" && status === "Waiting DMD Approval") {
                return true;
            }
            if (user.role === "super_admin" && (status === "Waiting Super Admin Approval" || status === "Waiting DMD Approval")) {
                return true;
            }
        }
        
        if (action === "issue_po") {
            return user.role === "procurement" && status === "Approved";
        }
        
        if (action === "update_delivery") {
            return user.role === "procurement" && (status === "PO Issued" || status === "Ordered");
        }
        
        if (action === "disburse_payment") {
            return user.role === "finance_manager" && status === "Delivered";
        }
        
        return false;
    }
}

// Global Auth Singleton
window.auth = new AuthService();
console.log("EPC Laos Auth module upgraded successfully!");
