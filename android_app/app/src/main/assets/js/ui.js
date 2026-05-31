/**
 * EPC Laos Project Control & Finance Monitoring App - UI Rendering Module (Upgraded)
 */

class UIManager {
    constructor() {
        this.activeTab = "dashboard";
        this.selectedProjectId = null; // Used for project details drill-down
        this.activeProcurementSubTab = "procurement_dashboard"; // Subtab for procurement module
        this.procurementFilters = {
            search: "",
            project: "all",
            status: "all",
            responsible: "all"
        };
    }

    getUserNameById(uid) {
        if (!uid) return "-";
        const users = window.db.get("users");
        const u = users.find(x => x.id === uid);
        return u ? u.name : uid;
    }

    generateAuditTrackingHTML(record) {
        if (!record) return "";
        const inputBy = this.getUserNameById(record.created_by || record.user_id || record.requested_by);
        const respPerson = this.getUserNameById(record.responsible_person || record.procurement_pic || record.pm_id);
        const assignedTo = this.getUserNameById(record.assigned_to || record.buyer || record.employee_id);
        const reviewedBy = this.getUserNameById(record.reviewed_by);
        const approvedBy = this.getUserNameById(record.approved_by || record.approval_history?.[record.approval_history.length - 1]?.actor_name);
        const updatedBy = this.getUserNameById(record.updated_by || record.reviewed_by);
        const createdDate = window.utils && typeof window.utils.formatDate === 'function' ? window.utils.formatDate(record.created_at || record.submitted_date) : (record.created_at || record.submitted_date || "-");
        const updatedDate = window.utils && typeof window.utils.formatDate === 'function' ? window.utils.formatDate(record.updated_at || record.reviewed_at) : (record.updated_at || record.reviewed_at || "-");

        return `
            <div class="audit-tracking-section mt-3 p-3 bg-slate-50 border rounded text-xxs" style="background-color: #f8fafc; border: 1px solid rgba(0,0,0,0.06); color: #475569; font-size: 11px;">
            <h5 class="font-bold mb-2 text-slate-700" style="margin-top:0; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">${window.t('responsibility_tracking') || 'Responsibility & Audit Tracking'}</h5>
                <div class="grid-2 gap-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div><span class="text-muted">Input/Created By:</span> <strong>${inputBy}</strong></div>
                    <div><span class="text-muted">Responsible:</span> <strong>${respPerson}</strong></div>
                    <div><span class="text-muted">Assigned To:</span> <strong>${assignedTo}</strong></div>
                    <div><span class="text-muted">Reviewed By:</span> <strong>${reviewedBy}</strong></div>
                    <div><span class="text-muted">Approved By:</span> <strong>${approvedBy}</strong></div>
                    <div><span class="text-muted">Last Updated By:</span> <strong>${updatedBy}</strong></div>
                    <div><span class="text-muted">Created Date:</span> <strong class="font-mono">${createdDate}</strong></div>
                    <div><span class="text-muted">Updated Date:</span> <strong class="font-mono">${updatedDate}</strong></div>
                </div>
            </div>
        `;
    }

    toggleProcurementSubTab(event, tabName) {
        this.activeProcurementSubTab = tabName;
        // Update tab buttons active state within .details-tab-bar
        const tabContainer = event.currentTarget.closest(".details-tab-bar");
        if (tabContainer) {
            tabContainer.querySelectorAll(".tab-link").forEach(x => x.classList.remove("active"));
        } else {
            document.querySelectorAll(".details-tab-bar .tab-link").forEach(x => x.classList.remove("active"));
        }
        event.currentTarget.classList.add("active");

        const subViewport = document.getElementById("procurement-sub-viewport");
        if (!subViewport) return;

        switch (tabName) {
            case "procurement_dashboard":
                subViewport.innerHTML = this.generateProcurementDashboardHTML();
                break;
            case "purchase_requests":
                this.renderPurchaseRequestsSubTab(subViewport);
                break;
            case "supplier_quotations":
                this.renderSupplierQuotationsSubTab(subViewport);
                break;
            case "po_tracking":
                this.renderPOTrackingSubTab(subViewport);
                break;
            case "delivery_status":
                this.renderDeliveryStatusSubTab(subViewport);
                break;
        }
    }

    generateProcurementFiltersHTML() {
        const projects = window.db.get("projects");
        const users = window.db.get("users").filter(u => u.status === 'active');
        const statuses = [
            "Draft", "Submitted to Procurement Team", "Under Procurement Review", 
            "Need Technical Clarification", "Quotation in Progress", "Waiting Finance Budget Check", 
            "Waiting DMD Approval", "Waiting Super Admin Approval", "Approved", 
            "Rejected", "PO Issued", "Ordered", "Delivered", "Closed"
        ];
        const f = this.procurementFilters;

        return `
            <div class="flex flex-wrap gap-2 mb-3 bg-slate-50 p-2 rounded no-print" style="background-color: #f1f5f9; display: flex; gap: 8px; flex-wrap: wrap; padding: 10px; border-radius: 6px; align-items: center; border: 1px solid rgba(0,0,0,0.05);">
                <input type="text" id="proc-search" class="form-input text-xs" style="width: 180px; padding: 6px; height: 32px;" placeholder="${window.t('search_placeholder')}" value="${f.search}" oninput="window.ui.handleProcurementFilterChange()">
                
                <select id="proc-filter-project" class="form-select text-xs" style="padding: 4px 8px; height: 32px;" onchange="window.ui.handleProcurementFilterChange()">
                    <option value="all">${window.t('filter_all_projects') || 'All Projects'}</option>
                    ${projects.map(p => `<option value="${p.id}" ${f.project === p.id ? 'selected' : ''}>${p.code} - ${window.t(p.name)}</option>`).join('')}
                </select>

                <select id="proc-filter-status" class="form-select text-xs" style="padding: 4px 8px; height: 32px;" onchange="window.ui.handleProcurementFilterChange()">
                    <option value="all">${window.t('filter_all_statuses') || 'All Statuses'}</option>
                    ${statuses.map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${window.t(s.toLowerCase().replace(/ /g, '_')).toUpperCase()}</option>`).join('')}
                </select>

                <select id="proc-filter-responsible" class="form-select text-xs" style="padding: 4px 8px; height: 32px;" onchange="window.ui.handleProcurementFilterChange()">
                    <option value="all">${window.t('filter_all_responsible') || 'All Responsible'}</option>
                    ${users.map(u => `<option value="${u.id}" ${f.responsible === u.id ? 'selected' : ''}>${u.name} (${window.t(u.role).toUpperCase()})</option>`).join('')}
                </select>

                <button class="btn btn-secondary btn-xs" style="height: 32px; padding: 0 12px;" onclick="window.ui.resetProcurementFilters()">Reset</button>
            </div>
        `;
    }

    handleProcurementFilterChange() {
        const searchEl = document.getElementById("proc-search");
        const projEl = document.getElementById("proc-filter-project");
        const statusEl = document.getElementById("proc-filter-status");
        const respEl = document.getElementById("proc-filter-responsible");

        if (searchEl) this.procurementFilters.search = searchEl.value;
        if (projEl) this.procurementFilters.project = projEl.value;
        if (statusEl) this.procurementFilters.status = statusEl.value;
        if (respEl) this.procurementFilters.responsible = respEl.value;

        const subViewport = document.getElementById("procurement-sub-viewport");
        if (subViewport) {
            switch (this.activeProcurementSubTab) {
                case "purchase_requests":
                    this.renderPurchaseRequestsSubTab(subViewport);
                    break;
                case "supplier_quotations":
                    this.renderSupplierQuotationsSubTab(subViewport);
                    break;
                case "po_tracking":
                    this.renderPOTrackingSubTab(subViewport);
                    break;
                case "delivery_status":
                    this.renderDeliveryStatusSubTab(subViewport);
                    break;
            }
        }
    }

    resetProcurementFilters() {
        this.procurementFilters = {
            search: "",
            project: "all",
            status: "all",
            responsible: "all"
        };
        const subViewport = document.getElementById("procurement-sub-viewport");
        if (subViewport) {
            switch (this.activeProcurementSubTab) {
                case "purchase_requests":
                    this.renderPurchaseRequestsSubTab(subViewport);
                    break;
                case "supplier_quotations":
                    this.renderSupplierQuotationsSubTab(subViewport);
                    break;
                case "po_tracking":
                    this.renderPOTrackingSubTab(subViewport);
                    break;
                case "delivery_status":
                    this.renderDeliveryStatusSubTab(subViewport);
                    break;
            }
        }
    }

    getFilteredProcurementRecords() {
        const user = window.auth.getCurrentUser();
        let records = window.db.get("procurement_records").filter(r => !r.deleted);

        // Role restriction
        if (user.role === 'project_manager') {
            const myProjects = window.db.get("projects").filter(p => p.pm_id === user.id).map(p => p.id);
            records = records.filter(r => myProjects.includes(r.project_id));
        } else if (user.role === 'engineer' || user.role === 'viewer') {
            const myProjects = window.db.get("projects").filter(p => p.procurement_engineer_id === user.id || p.pm_id === user.id).map(p => p.id);
            records = records.filter(r => myProjects.includes(r.project_id));
        }

        // Apply filters
        const f = this.procurementFilters;
        if (f.search) {
            const q = f.search.toLowerCase();
            records = records.filter(r => 
                (r.material_name && r.material_name.toLowerCase().includes(q)) || 
                (r.specification && r.specification.toLowerCase().includes(q)) ||
                (r.pr_number && r.pr_number.toLowerCase().includes(q)) ||
                (r.po_number && r.po_number.toLowerCase().includes(q))
            );
        }
        if (f.project !== "all") {
            records = records.filter(r => r.project_id === f.project);
        }
        if (f.status !== "all") {
            records = records.filter(r => r.approval_status === f.status);
        }
        if (f.responsible !== "all") {
            records = records.filter(r => 
                r.procurement_pic === f.responsible || 
                r.requested_by === f.responsible ||
                r.created_by === f.responsible ||
                r.buyer === f.responsible
            );
        }

        return records;
    }

    generatePendingApprovalsQueueHTML(payments) {
        if (!payments || payments.length === 0) {
            return `<p class="text-xs text-muted text-center py-4">No pending approvals in queue.</p>`;
        }
        return payments.map(p => {
            const proj = window.db.get("projects").find(x => x.id === p.project_id);
            const req = window.db.get("users").find(x => x.id === p.requested_by);
            return `
                <div class="pending-approval-item flex justify-between items-center py-2 border-b text-xs">
                    <div>
                        <strong class="block">${window.t(p.type).toUpperCase()}</strong>
                        <span class="text-xxs text-muted">${proj ? window.t(proj.name) : 'N/A'} - ${req ? req.name : 'N/A'}</span>
                    </div>
                    <div class="text-right">
                        <strong class="block text-primary">${window.db.formatCurrency(p.amount, p.currency)}</strong>
                        <span class="text-xxs font-mono text-muted">${window.utils.formatDate(p.created_at)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Dynamic Login Page Renderer
    renderLoginScreen(container) {
        // Hide sidebar panel to show clean fullscreen login
        const sidebar = document.getElementById("app-sidebar-panel");
        if (sidebar) sidebar.style.display = "none";
        
        const mainFrame = document.getElementById("app-root-frame");
        if (mainFrame) mainFrame.style.background = "linear-gradient(135deg, var(--color-bg-base), rgba(59, 130, 246, 0.05))";

        const currentLang = window.i18n.getLang();

        // Dynamically resolve the default base URL matching utils.js
        let currentApiUrl = localStorage.getItem("epc_api_base_url");
        if (!currentApiUrl) {
            const isAndroid = navigator.userAgent.toLowerCase().includes("android");
            currentApiUrl = isAndroid ? "http://10.0.2.2:3000/api" : "http://localhost:3000/api";
        }

        const showDemo = localStorage.getItem("epc_demo_mode") === "true";

        container.innerHTML = `
            <div class="login-page-container fade-in" style="max-width: 460px; margin: 40px auto; padding: 30px;">
                <div class="card p-4 flex-col items-center justify-center text-center shadow-lg" style="backdrop-filter: blur(8px); background-color: rgba(255, 255, 255, 0.88); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.5);">
                    
                    <!-- Language Selection in Login -->
                    <div class="flex justify-end btn-full mb-3 no-print">
                        <select id="login-lang-switcher" class="form-select text-xs" style="padding: 4px 8px;" onchange="window.i18n.setLang(this.value)">
                            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                            <option value="zh" ${currentLang === 'zh' ? 'selected' : ''}>中文</option>
                            <option value="th" ${currentLang === 'th' ? 'selected' : ''}>ไทย</option>
                        </select>
                    </div>

                    <!-- Company Branding Logo & Text -->
                    <div class="mb-4 text-center">
                        <img src="./logo.png" alt="LANXANG POWER logo" style="max-height: 80px; width: auto; object-fit: contain; margin-bottom: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" onerror="this.style.display='none'">
                        <h2 class="text-bold text-primary" style="font-size: 20px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.2;">${window.t('company_name')}</h2>
                    </div>

                    <h3 class="text-bold text-dark mb-1" style="font-size: 18px;">${window.t('login_title')}</h3>
                    <p class="text-xs text-muted mb-4">${window.t('login_subtitle')}</p>

                    <div class="form-group mb-3 btn-full text-left">
                        <label class="form-label text-xs mb-1 block">${window.t('email_label') || 'Username / Email'}</label>
                        <input type="text" id="login-email" class="form-input btn-full text-xs" placeholder="e.g. superadmin" value="superadmin">
                    </div>
                    <div class="form-group mb-3 btn-full text-left">
                        <label class="form-label text-xs mb-1 block">${window.t('password_label') || 'Password'}</label>
                        <input type="password" id="login-password" class="form-input btn-full text-xs" placeholder="••••••••" value="admin123">
                    </div>
                    <div class="form-group mb-4 btn-full text-left">
                        <label class="form-label text-xs mb-1 block">API Server URL</label>
                        <input type="text" id="login-api-url" class="form-input btn-full text-xs" placeholder="http://localhost:3000/api" value="${currentApiUrl}">
                    </div>

                    <button class="btn btn-primary btn-full mb-4" onclick="window.ui.handleDemoSignIn()">${window.t('sign_in_btn')}</button>

                    ${showDemo ? `
                    <!-- Clickable Quick Login Profiles -->
                    <div class="border-t pt-3 btn-full text-left">
                        <strong class="text-xxs text-muted block mb-2">${window.t('demo_login_hint')}</strong>
                        <div class="demo-users-autofill flex-col gap-1" style="max-height: 150px; overflow-y: auto;">
                            ${window.db.get("users").map(u => `
                                <button class="btn-text text-xxs text-left py-1 block" onclick="window.ui.autofillLogin('${u.email}')">
                                    ${u.avatar} ${u.name} (${window.t(u.role).toUpperCase()})
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    autofillLogin(email) {
        const emailInput = document.getElementById("login-email");
        if (emailInput) {
            emailInput.value = email;
            window.utils.showToast(`Autofilled demo account: ${email}`, "info");
        }
    }

    async handleDemoSignIn() {
        const username = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        const apiUrl = document.getElementById("login-api-url").value.trim();

        if (!username || !password) {
            window.utils.showToast("Username and password are required", "error");
            return;
        }

        // Save customized API base URL config if specified
        if (apiUrl) {
            localStorage.setItem("epc_api_base_url", apiUrl);
        } else {
            localStorage.removeItem("epc_api_base_url");
        }

        try {
            window.utils.showToast("Logging in...", "info");
            const res = await window.utils.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (res && res.token && res.user) {
                // Save JWT and user details locally
                window.auth.loginAs(res.token, res.user);
                
                // Show sidebar again
                const sidebar = document.getElementById("app-sidebar-panel");
                if (sidebar) sidebar.style.display = "flex";
                
                window.utils.showToast(`${window.t('welcome')}: ${res.user.name}`, "success");
                
                // Fetch data from real backend database
                await window.db.sync();

                // Proceed to default tab
                this.navigateTo("dashboard");
            } else {
                window.utils.showToast("Invalid credentials returned from server", "error");
            }
        } catch (err) {
            console.error("Login attempt failed:", err);
            // The apiCall function already notifies the user with a toast.
        }
    }

    // Update Layout Header and Lang drop selectors
    updateHeader() {
        const user = window.auth.getCurrentUser();
        const headerTitle = document.getElementById("header-title");
        const userProfileInfo = document.getElementById("user-profile-info");
        
        if (headerTitle) {
            headerTitle.textContent = this.getPageTitle();
        }
        
        if (userProfileInfo) {
            const currentLang = window.i18n.getLang();
            const unreadCount = this.getUnreadNotifications().length;

            userProfileInfo.innerHTML = `
                <!-- Notification Bell -->
                <div class="notification-bell-container mr-3 no-print" style="position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 50%; background: var(--color-bg-base); transition: all 0.2s;" onclick="window.ui.openNotificationsModal()" title="${window.t('notifications')}">
                    <span style="font-size: 16px;">🔔</span>
                    ${unreadCount > 0 ? `<span class="notification-badge" style="position: absolute; top: -4px; right: -4px; background: var(--color-error); color: white; border-radius: 50%; padding: 1px 5px; font-size: 9px; font-weight: bold; border: 1.5px solid var(--color-bg-panel); line-height: 1;">${unreadCount}</span>` : ''}
                </div>

                <div class="language-selector-block mr-3 no-print">
                    <select id="header-lang-switcher" class="form-select text-xs" style="padding: 4px 8px;" onchange="window.i18n.setLang(this.value)">
                        <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                        <option value="zh" ${currentLang === 'zh' ? 'selected' : ''}>中文</option>
                        <option value="th" ${currentLang === 'th' ? 'selected' : ''}>ไทย</option>
                    </select>
                </div>
                <div class="user-avatar-circle">${user.avatar}</div>
                <div class="user-details-text">
                    <span class="user-name-span">${user.name}</span>
                    <span class="user-role-badge badge-role-${user.role}">${window.t(user.role).toUpperCase()}</span>
                </div>
                <button class="btn btn-secondary btn-xs ml-3 no-print" onclick="window.ui.handleSignOut()">${window.t('logout')}</button>
            `;
        }
    }

    // Dynamic Notifications Engine (Upgraded)
    getNotificationsForUser() {
        const user = window.auth.getCurrentUser();
        if (!user) return [];
        
        const notifications = [];
        
        // Calculate week number dynamically
        let currentWeek = 22;
        if (window.utils && typeof window.utils.getWeekNumber === 'function') {
            currentWeek = window.utils.getWeekNumber();
        }

        const reports = window.db.get("user_weekly_reports") || [];
        const plans = window.db.get("user_weekly_plans") || [];
        const userReportThisWeek = reports.find(r => r.user_id === user.id && r.week_number === currentWeek);
        
        // 1. Weekly report deadline (For non-admin, non-viewer)
        if (user.role !== 'viewer' && user.role !== 'super_admin' && user.role !== 'deputy_md') {
            if (!userReportThisWeek || userReportThisWeek.status === 'draft') {
                notifications.push({
                    id: `notif-report-deadline-${currentWeek}`,
                    messageKey: "notif_report_deadline",
                    type: "warning"
                });
            }
            
            // 3. Weekly report needs revision
            const reportsNeedRevision = reports.filter(r => r.user_id === user.id && r.status === 'Need Revision');
            reportsNeedRevision.forEach(r => {
                notifications.push({
                    id: `notif-report-revision-${r.id}`,
                    messageText: `${window.t('notif_revision_needed')} (Week ${r.week_number}): "${r.comments || ''}"`,
                    type: "error"
                });
            });
        }
        
        // 2. Weekly report not submitted (For PMs, Deputy MD, Super Admin)
        if (user.role === 'project_manager' || user.role === 'deputy_md' || user.role === 'super_admin') {
            const activeEmployees = window.db.get("users").filter(u => u.status === 'active' && u.role !== 'viewer' && u.role !== 'super_admin' && u.role !== 'deputy_md');
            const unsubmittedNames = [];
            activeEmployees.forEach(emp => {
                const hasReport = reports.some(r => r.user_id === emp.id && r.week_number === currentWeek && r.status !== 'draft');
                if (!hasReport) {
                    unsubmittedNames.push(emp.name);
                }
            });
            if (unsubmittedNames.length > 0) {
                notifications.push({
                    id: `notif-team-unsubmitted-${currentWeek}`,
                    messageText: `${window.t('reports_not_submitted')}: ${unsubmittedNames.join(', ')}`,
                    type: "info"
                });
            }
        }
        
        // 4. Procurement plan pending approval
        const procurement = window.db.get("procurement_records").filter(r => !r.deleted) || [];
        if (user.role === 'deputy_md') {
            const pendingDepMD = procurement.filter(r => r.approval_status === 'Waiting Deputy MD Approval');
            pendingDepMD.forEach(r => {
                notifications.push({
                    id: `notif-proc-depmd-${r.id}`,
                    messageText: `${window.t('notif_proc_pending')} - ${r.pr_number} (${r.material_name})`,
                    type: "warning"
                });
            });
        } else if (user.role === 'super_admin') {
            const pendingDir = procurement.filter(r => r.approval_status === 'Waiting Director Approval' || r.approval_status === 'Waiting Deputy MD Approval');
            pendingDir.forEach(r => {
                notifications.push({
                    id: `notif-proc-dir-${r.id}`,
                    messageText: `${window.t('notif_proc_pending')} - ${r.pr_number} (${r.material_name})`,
                    type: "warning"
                });
            });
        }
        
        // 5. Procurement plan approved/rejected (For Procurement PIC and requesting PM)
        if (user.role === 'procurement' || user.role === 'project_manager') {
            let recentApprovals = procurement.filter(r => r.approval_status === 'Approved' || r.approval_status === 'Rejected');
            if (user.role === 'project_manager') {
                const myProjectIds = window.db.get("projects").filter(p => p.pm_id === user.id).map(p => p.id);
                recentApprovals = recentApprovals.filter(r => myProjectIds.includes(r.project_id));
            }
            recentApprovals.forEach(r => {
                notifications.push({
                    id: `notif-proc-status-${r.id}-${r.approval_status}`,
                    messageText: `${r.approval_status === 'Approved' ? window.t('notif_proc_approved') : window.t('notif_proc_rejected')} - ${r.pr_number} (${r.material_name})`,
                    type: r.approval_status === 'Approved' ? "success" : "error"
                });
            });
        }
        
        // 6. Material delivery overdue (For Procurement, PM, and Super Admin)
        if (user.role === 'procurement' || user.role === 'project_manager' || user.role === 'super_admin') {
            let overdue = procurement.filter(r => {
                if (r.approval_status === 'Closed' || r.delivery_status === 'delivered' || r.po_status === 'delivered') return false;
                if (r.delivery_status === 'overdue' || r.delivery_status === 'delayed') return true;
                if (r.required_date) {
                    return new Date(r.required_date) < new Date();
                }
                return false;
            });
            if (user.role === 'project_manager') {
                const myProjectIds = window.db.get("projects").filter(p => p.pm_id === user.id).map(p => p.id);
                overdue = overdue.filter(r => myProjectIds.includes(r.project_id));
            }
            overdue.forEach(r => {
                notifications.push({
                    id: `notif-proc-overdue-${r.id}`,
                    messageText: `${window.t('notif_delivery_overdue')} - ${r.pr_number} (${r.material_name})`,
                    type: "error"
                });
            });
        }
        
        return notifications;
    }

    getUnreadNotifications() {
        const all = this.getNotificationsForUser();
        const readIds = JSON.parse(localStorage.getItem("epc_laos_read_notifications") || "[]");
        return all.filter(n => !readIds.includes(n.id));
    }
    
    markAllNotificationsAsRead() {
        const all = this.getNotificationsForUser();
        const readIds = JSON.parse(localStorage.getItem("epc_laos_read_notifications") || "[]");
        all.forEach(n => {
            if (!readIds.includes(n.id)) {
                readIds.push(n.id);
            }
        });
        localStorage.setItem("epc_laos_read_notifications", JSON.stringify(readIds));
        this.updateHeader();
    }

    dismissNotification(id) {
        const readIds = JSON.parse(localStorage.getItem("epc_laos_read_notifications") || "[]");
        if (!readIds.includes(id)) {
            readIds.push(id);
        }
        localStorage.setItem("epc_laos_read_notifications", JSON.stringify(readIds));
        this.updateHeader();
        this.openNotificationsModal(); // Refresh modal content
    }

    openNotificationsModal() {
        const notifications = this.getUnreadNotifications();
        let bodyHTML = "";
        
        if (notifications.length === 0) {
            bodyHTML = `
                <div class="text-center p-5">
                    <span style="font-size: 48px;">?</span>
                    <p class="text-muted mt-2">${window.t('no_notifications')}</p>
                </div>
            `;
        } else {
            bodyHTML = `
                <div class="flex justify-end mb-3 no-print">
                    <button class="btn btn-secondary btn-xs" onclick="window.ui.markAllNotificationsAsRead(); window.ui.closeModal();">${window.t('mark_all_read')}</button>
                </div>
                <div class="notifications-list flex-col gap-2" style="max-height: 350px; overflow-y: auto;">
                    ${notifications.map(n => {
                        const msg = n.messageKey ? window.t(n.messageKey) : n.messageText;
                        let colorClass = "border-l-primary";
                        if (n.type === 'error') colorClass = "border-l-error";
                        else if (n.type === 'warning') colorClass = "border-l-warning";
                        else if (n.type === 'info') colorClass = "border-l-info";
                        return `
                            <div class="card p-3 flex items-center justify-between hover-lift ${colorClass}" style="border-left: 4px solid var(--color-primary); padding: 12px; margin-bottom: 8px;">
                                <div style="font-size: 12px; font-weight: 500; text-align: left; padding-right: 12px;">${msg}</div>
                                <button class="btn btn-xs btn-text text-muted" onclick="window.ui.dismissNotification('${n.id}')">&times;</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        this.openModal(window.t('notifications'), bodyHTML, () => {
            return true;
        });
        
        // Hide standard submit button on notifications alert panel
        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.style.display = "none";
    }

    handleSignOut() {
        localStorage.setItem("epc_logged_in", "false");
        window.utils.logAudit("USER_LOGOUT", "auth", window.t('logged_out_success'));
        window.utils.showToast(window.t('logged_out_success'), "info");
        this.navigateTo("dashboard");
    }

    getPageTitle() {
        if (this.selectedProjectId) {
            const p = window.db.get("projects").find(x => x.id === this.selectedProjectId);
            return p ? `${window.t('projects')} / ${window.t(p.name)}` : window.t('project_details');
        }
        const titles = {
            dashboard: window.t('dashboard'),
            projects: window.t('projects'),
            weekly_reports: window.t('weekly_reports'),
            tasks: window.t('tasks'),
            finance: window.t('finance'),
            payment_requests: window.t('payment_requests'),
            allowance_bonus: window.t('allowance_bonus'),
            announcements: window.t('announcements'),
            documents: window.t('documents'),
            reports: window.t('reports'),
            users: window.t('users'),
            settings: window.t('settings'),
            procurement: window.t('procurement')
        };
        return titles[this.activeTab] || "EPC Laos System";
    }

    navigateTo(tab, projectId = null) {
        this.activeTab = tab;
        this.selectedProjectId = projectId;
        
        // Render Login page if not authenticated
        if (localStorage.getItem("epc_logged_in") !== "true") {
            const viewport = document.getElementById("main-content-viewport");
            this.renderLoginScreen(viewport);
            return;
        }

        // Show sidebar panel
        const sidebar = document.getElementById("app-sidebar-panel");
        if (sidebar) sidebar.style.display = "flex";

        document.querySelectorAll(".sidebar-nav-link").forEach(link => {
            if (link.dataset.tab === tab && !projectId) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        this.updateHeader();
        this.renderActiveView();
        
        const mainPanel = document.getElementById("main-content-viewport");
        if (mainPanel) mainPanel.scrollTop = 0;
    }

    renderActiveView() {
        const viewport = document.getElementById("main-content-viewport");
        if (!viewport) return;

        viewport.innerHTML = "";
        const user = window.auth.getCurrentUser();

        // Route permission safeguards
        if (this.activeTab === "users" && !window.auth.hasPermission("manage_users")) {
            viewport.innerHTML = this.renderPermissionDenied();
            return;
        }
        if (this.activeTab === "finance" && !window.auth.hasPermission("view_finance_summary")) {
            viewport.innerHTML = this.renderPermissionDenied();
            return;
        }
        if (this.activeTab === "payment_requests" && user.role === 'viewer') {
            viewport.innerHTML = this.renderPermissionDenied();
            return;
        }
        if (this.activeTab === "procurement" && !window.auth.hasPermission("view_procurement")) {
            viewport.innerHTML = this.renderPermissionDenied();
            return;
        }

        if (this.selectedProjectId) {
            this.renderProjectDetailsPage(viewport, this.selectedProjectId);
            return;
        }

        switch (this.activeTab) {
            case "dashboard":
                this.renderDashboardPage(viewport);
                break;
            case "projects":
                this.renderProjectsPage(viewport);
                break;
            case "weekly_reports":
                this.renderWeeklyReportsPage(viewport);
                break;
            case "tasks":
                this.renderTasksPage(viewport);
                break;
            case "finance":
                this.renderFinancePage(viewport);
                break;
            case "payment_requests":
                this.renderPaymentRequestsPage(viewport);
                break;
            case "allowance_bonus":
                this.renderAllowanceBonusPage(viewport);
                break;
            case "announcements":
                this.renderAnnouncementsPage(viewport);
                break;
            case "documents":
                this.renderDocumentsPage(viewport);
                break;
            case "reports":
                this.renderReportsPage(viewport);
                break;
            case "users":
                this.renderUsersPage(viewport);
                break;
            case "settings":
                this.renderSettingsPage(viewport);
                break;
            case "procurement":
                this.renderProcurementPage(viewport);
                break;
            default:
                viewport.innerHTML = `<div class="card p-4">View not found</div>`;
        }
    }

    renderPermissionDenied() {
        return `
            <div class="card p-5 text-center flex-col items-center justify-center">
                <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
                <h2 style="color: var(--color-error); margin-bottom: 10px;">${window.t('permission_denied')}</h2>
                <p style="color: var(--color-text-muted); max-width: 450px; margin: 0 auto 20px auto;">
                    ${window.t('permission_denied')}
                </p>
            </div>
        `;
    }

    /* ==========================================================
       DASHBOARD PAGE RENDERER (FULLY TRANSLATED)
       ========================================================== */
    renderDashboardPage(container) {
        const user = window.auth.getCurrentUser();
        // Dynamic stats calculation by role
        const stats = window.db.getGlobalFinanceSummary(user);
        const announcements = window.db.get("announcements").slice(0, 2);
        const payments = window.db.get("payment_requests").filter(x => {
            const isPending = x.status === "pending" || x.status === "submitted";
            if (user.role === 'project_manager') {
                const myProjects = window.db.get("projects").filter(p => p.pm_id === user.id).map(p => p.id);
                return isPending && myProjects.includes(x.project_id);
            }
            if (user.role === 'engineer') {
                const myProjects = window.db.get("projects").filter(p => p.procurement_engineer_id === user.id || p.team.includes(user.id)).map(p => p.id);
                return isPending && myProjects.includes(x.project_id);
            }
            return isPending;
        });
        const alerts = [];

        const hasCompanyFinance = window.auth.hasPermission("view_company_finance_summary");
        const hasProjFinance = window.auth.hasPermission("view_project_finance_summary");

        // Filter alerts
        let alertProjects = window.db.get("projects");
        if (user.role === 'project_manager') {
            alertProjects = alertProjects.filter(p => p.pm_id === user.id);
        }
        alertProjects.forEach(p => {
            if (p.status === "delayed") {
                alerts.push({ id: p.id, type: "error", title: window.t('project_delay_alert'), text: `${window.t(p.name)} ${window.t('project_is_delayed')}` });
            }
            if (hasProjFinance && p.actual_cost > p.budget) {
                alerts.push({ id: p.id, type: "warning", title: window.t('budget_overrun_alert'), text: `${window.t(p.name)} ${window.t('project_budget_exceeded')}` });
            }
        });

        let alertsHTML = "";
        if (alerts.length > 0) {
            alertsHTML = `
                <div class="dashboard-alerts-section mb-4">
                    ${alerts.map(a => `
                        <div class="alert-bar alert-${a.type}">
                            <div class="alert-bar-inner">
                                <span class="alert-icon">${a.type === 'error' ? '✖' : '⚠'}</span>
                                <div class="alert-message">
                                    <strong>${a.title}</strong>: ${a.text}
                                </div>
                            </div>
                            <button class="alert-view-btn" onclick="window.ui.navigateTo('projects', '${a.id}')">${window.t('review')}</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 1. STATS COUNTERS GRID (Dynamic by Role)
        let statsGridHTML = "";
        if (hasCompanyFinance || (user.role === 'project_manager' && hasProjFinance)) {
            statsGridHTML = `
                <!-- STATS COUNTERS GRID -->
                <div class="grid-4 mb-4">
                    <div class="card stat-card">
                        <div class="stat-icon bg-soft-primary">▤</div>
                        <div class="stat-data">
                            <span class="stat-label">${window.t('active_projects')} / ${window.t('total_projects')}</span>
                            <h3 class="stat-value">${stats.activeProjects} / ${stats.totalProjects}</h3>
                        </div>
                    </div>
                    <div class="card stat-card">
                        <div class="stat-icon bg-soft-success">%</div>
                        <div class="stat-data">
                            <span class="stat-label">${window.t('contract_value')}</span>
                            <h3 class="stat-value text-primary">${window.db.formatCurrency(stats.totalContractValUSD, 'USD')}</h3>
                        </div>
                    </div>
                    <div class="card stat-card">
                        <div class="stat-icon bg-soft-info">$</div>
                        <div class="stat-data">
                            <span class="stat-label">${window.t('received_payment')}</span>
                            <h3 class="stat-value">${window.db.formatCurrency(stats.totalReceivedUSD, 'USD')}</h3>
                            <span class="stat-subtext text-warning">${window.db.formatCurrency(stats.totalPendingUSD, 'USD')} ${window.t('pending_payment')}</span>
                        </div>
                    </div>
                    <div class="card stat-card">
                        <div class="stat-icon bg-soft-danger">$</div>
                        <div class="stat-data">
                            <span class="stat-label">${window.t('total_expenses')}</span>
                            <h3 class="stat-value text-error">${window.db.formatCurrency(stats.totalExpenseUSD, 'USD')}</h3>
                            ${window.auth.hasPermission('view_profit') ? `
                                <span class="stat-subtext text-success">${window.db.formatCurrency(stats.estimatedProfitUSD, 'USD')} ${window.t('est_profit')}</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else if (user.role === 'procurement') {
            statsGridHTML = `
                <!-- STATS COUNTERS GRID (Procurement Role) -->
                <div class="grid-4 mb-4">
                    <div class="card stat-card">
                        <div class="stat-icon bg-soft-primary">▤</div>
                        <div class="stat-data">
                            <span class="stat-label">${window.t('active_projects')} / ${window.t('total_projects')}</span>
                            <h3 class="stat-value">${stats.activeProjects} / ${stats.totalProjects}</h3>
                        </div>
                    </div>
                    <div class="card stat-card border-l-success">
                        <div class="stat-icon bg-soft-success">PR</div>
                        <div class="stat-data">
                            <span class="stat-label">${window.t('total_pr')}</span>
                            <h3 class="stat-value text-primary">${stats.totalPR}</h3>
                        </div>
                    </div>
                    <div class="card stat-card border-l-info">
                        <div class="stat-icon bg-soft-info">$</div>
                        <div class="stat-data">
                            <span class="stat-label">${window.t('procurement_cost') || 'Procurement Cost'}</span>
                            <h3 class="stat-value text-success">${window.db.formatCurrency(stats.procurementCostUSD, 'USD')}</h3>
                        </div>
                    </div>
                    <div class="card stat-card border-l-danger">
                        <div class="stat-icon bg-soft-danger">⚠</div>
                        <div class="stat-data">
                            <span class="stat-label">${window.t('overdue_material_delivery')}</span>
                            <h3 class="stat-value text-error">${stats.overdueDelivery}</h3>
                        </div>
                    </div>
                </div>
            `;
        }

        // 2. PROCUREMENT METRICS PANEL (Hidden for Engineer/Viewer)
        let procurementMetricsHTML = "";
        if (user.role !== 'engineer' && user.role !== 'viewer') {
            procurementMetricsHTML = `
                <!-- PROCUREMENT METRICS PANEL -->
                <div class="card p-4 mb-4" style="background: linear-gradient(135deg, var(--color-bg-panel), rgba(6, 182, 212, 0.03)); border-color: rgba(6, 182, 212, 0.2);">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="card-title text-info">${window.t('procurement')}</h3>
                        <button class="btn btn-secondary btn-sm" onclick="window.ui.navigateTo('procurement')">${window.t('view_all')}</button>
                    </div>
                    <div class="grid-4">
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('total_pr')}</span>
                            <strong class="text-lg block text-dark">${stats.totalPR}</strong>
                        </div>
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('pending_quotes')} / ${window.t('pending_proc_approval')}</span>
                            <strong class="text-lg block text-warning">${stats.pendingQuotations} / ${stats.pendingProcurementApproval}</strong>
                        </div>
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('po_approved')} / ${window.t('po_ordered')}</span>
                            <strong class="text-lg block text-success">${stats.poApproved} / ${stats.poOrdered}</strong>
                        </div>
                        <div class="text-center p-2">
                            <span class="block text-xxs text-muted font-bold">${window.t('mat_delivered')} / ${window.t('overdue_delivery')}</span>
                            <strong class="text-lg block text-info">${stats.matDelivered} <span class="text-xs text-error font-mono">(${stats.overdueDelivery}!)</span></strong>
                        </div>
                    </div>
                </div>
            `;
        }

        // 3. OPERATIONS & REPORTING CONTROL PANEL (Dynamic)
        let opsControlHTML = "";
        const isRestrictedRole = user.role === 'engineer' || user.role === 'viewer';
        if (isRestrictedRole) {
            opsControlHTML = `
                <!-- OPERATIONS & REPORTING CONTROL PANEL (Restricted) -->
                <div class="card p-4 mb-4" style="background: linear-gradient(135deg, var(--color-bg-panel), rgba(59, 130, 246, 0.02)); border-color: rgba(59, 130, 246, 0.1);">
                    <h3 class="card-title mb-3" style="color: var(--color-primary); display: flex; align-items: center; gap: 8px;">${window.t('ops_reporting_control')}</h3>
                    <div class="grid-4 mb-3">
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('reports_submitted_this_week')}</span>
                            <strong class="text-md block text-success" style="font-size: 20px; margin-top: 4px;">${stats.reportsSubmittedThisWeek}</strong>
                        </div>
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('reports_not_submitted')}</span>
                            <strong class="text-md block text-error" style="font-size: 20px; margin-top: 4px;">${stats.reportsNotSubmitted}</strong>
                        </div>
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('pending_reports_review')}</span>
                            <strong class="text-md block text-warning" style="font-size: 20px; margin-top: 4px;">${stats.pendingReportsReview}</strong>
                        </div>
                        <div class="text-center p-2">
                            <span class="block text-xxs text-muted font-bold">${window.t('next_week_planned_tasks')}</span>
                            <strong class="text-md block text-primary" style="font-size: 20px; margin-top: 4px;">${stats.nextWeekPlannedTasks}</strong>
                        </div>
                    </div>
                </div>
            `;
        } else {
            opsControlHTML = `
                <!-- OPERATIONS & REPORTING CONTROL PANEL -->
                <div class="card p-4 mb-4" style="background: linear-gradient(135deg, var(--color-bg-panel), rgba(59, 130, 246, 0.02)); border-color: rgba(59, 130, 246, 0.1);">
                    <h3 class="card-title mb-3" style="color: var(--color-primary); display: flex; align-items: center; gap: 8px;">${window.t('ops_reporting_control')}</h3>
                    <div class="grid-4 mb-3">
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('reports_submitted_this_week')}</span>
                            <strong class="text-md block text-success" style="font-size: 20px; margin-top: 4px;">${stats.reportsSubmittedThisWeek}</strong>
                        </div>
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('reports_not_submitted')}</span>
                            <strong class="text-md block text-error" style="font-size: 20px; margin-top: 4px;">${stats.reportsNotSubmitted}</strong>
                        </div>
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('pending_reports_review')}</span>
                            <strong class="text-md block text-warning" style="font-size: 20px; margin-top: 4px;">${stats.pendingReportsReview}</strong>
                        </div>
                        <div class="text-center p-2">
                            <span class="block text-xxs text-muted font-bold">${window.t('next_week_planned_tasks')}</span>
                            <strong class="text-md block text-primary" style="font-size: 20px; margin-top: 4px;">${stats.nextWeekPlannedTasks}</strong>
                        </div>
                    </div>
                    <div class="grid-4 border-t pt-3">
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('proc_pending_approval')}</span>
                            <strong class="text-md block text-warning" style="font-size: 20px; margin-top: 4px;">${stats.procPendingApproval}</strong>
                        </div>
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('proc_approved')}</span>
                            <strong class="text-md block text-success" style="font-size: 20px; margin-top: 4px;">${stats.procApproved}</strong>
                        </div>
                        <div class="text-center p-2 border-r">
                            <span class="block text-xxs text-muted font-bold">${window.t('urgent_proc_items')}</span>
                            <strong class="text-md block text-error font-bold" style="font-size: 20px; margin-top: 4px;">${stats.urgentProcurements}</strong>
                        </div>
                        <div class="text-center p-2">
                            <span class="block text-xxs text-muted font-bold">${window.t('overdue_material_delivery')}</span>
                            <strong class="text-md block text-error font-bold" style="font-size: 20px; margin-top: 4px;">${stats.overdueDelivery}</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        // 4. CHARTS AND APPROVALS SPLIT GRID (Dynamic)
        let chartApprovalsHTML = "";
        const showFinanceGrid = hasCompanyFinance || (user.role === 'project_manager' && hasProjFinance);
        if (showFinanceGrid) {
            chartApprovalsHTML = `
                <!-- CHARTS AND APPROVALS SPLIT GRID -->
                <div class="grid-2-1 mb-4">
                    <div class="card p-4">
                        <h3 class="card-title mb-3">${window.t('portfolio_finance')}</h3>
                        <div class="chart-container">
                            ${this.generatePortfolioSVGChart(stats)}
                        </div>
                        <div class="chart-legend mt-4 flex justify-between">
                            <div class="legend-item flex items-center">
                                <span class="legend-dot" style="background: var(--color-primary);"></span>
                                <span class="legend-text">${window.t('contract_value')}</span>
                            </div>
                            <div class="legend-item flex items-center">
                                <span class="legend-dot" style="background: var(--color-success);"></span>
                                <span class="legend-text">${window.t('received_payment')}</span>
                            </div>
                            <div class="legend-item flex items-center">
                                <span class="legend-dot" style="background: var(--color-error);"></span>
                                <span class="legend-text">${window.t('total_expenses')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card p-4 flex-col justify-between">
                        <div>
                            <h3 class="card-title mb-3">${window.t('pending_approvals_title')}</h3>
                            <div class="pending-approvals-list">
                                ${this.generatePendingApprovalsQueueHTML(payments)}
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-full mt-3" onclick="window.ui.navigateTo('payment_requests')">${window.t('view_all')}</button>
                    </div>
                </div>
            `;
        }

        // 5. Active project status list: filter to own projects for PM
        let dashboardProjects = window.db.get("projects");
        if (user.role === 'project_manager') {
            dashboardProjects = dashboardProjects.filter(p => p.pm_id === user.id);
        }
        
        container.innerHTML = `
            ${alertsHTML}
            ${statsGridHTML}
            ${procurementMetricsHTML}
            ${opsControlHTML}
            ${chartApprovalsHTML}
            
            <!-- ANNOUNCEMENTS & RECENT PROJECTS -->
            <div class="grid-2 mb-4">
                <div class="card p-4">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="card-title">${window.t('corporate_announcements')}</h3>
                        <button class="btn-text" onclick="window.ui.navigateTo('announcements')">${window.t('view_all')}</button>
                    </div>
                    <div class="announcements-mini-list">
                        ${announcements.map(a => `
                            <div class="mini-announcement-card priority-${a.priority} mb-3 p-3">
                                <div class="flex justify-between mb-1">
                                    <h4 class="mini-announcement-title">${window.t(a.title)}</h4>
                                    <span class="badge badge-${a.priority === 'urgent' ? 'delayed' : 'planning'}">${window.t(a.priority).toUpperCase()}</span>
                                </div>
                                <p class="mini-announcement-body">${window.t(a.message).substring(0, 150)}...</p>
                                <span class="mini-announcement-date">${window.utils.formatDate(a.publish_date)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card p-4">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="card-title">${window.t('active_epc_status')}</h3>
                        <button class="btn-text" onclick="window.ui.navigateTo('projects')">${window.t('view_portfolio')}</button>
                    </div>
                    <div class="projects-mini-list">
                        ${dashboardProjects.slice(0, 3).map(p => `
                            <div class="mini-project-row flex justify-between items-center py-2 border-b">
                                <div>
                                    <div class="mini-project-name text-bold">${window.t(p.name)}</div>
                                    <span class="mini-project-code text-muted">${p.code} | Progress: ${p.progress_percent}%</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    ${window.utils.getStatusBadge(p.status)}
                                    <button class="btn btn-icon" onclick="window.ui.navigateTo('projects', '${p.id}')">${window.t('view')}</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- RECENT ACTIVITIES & NEXT WEEK PLANS -->
            <div class="grid-2 mt-4">
                <div class="card p-4">
                    <h3 class="card-title mb-3">Recent Activities / Audit Log</h3>
                    <div class="audit-log-mini-list text-xs" style="max-height: 250px; overflow-y: auto;">
                        ${window.db.get("audit_logs").filter(log => {
                            if (user.role === 'project_manager') {
                                return log.user_id === user.id || dashboardProjects.some(dp => log.details.includes(dp.code));
                            }
                            if (user.role === 'engineer' || user.role === 'viewer') {
                                return log.module === 'reports' || log.module === 'tasks' || log.user_id === user.id;
                            }
                            return true;
                        }).slice(-5).reverse().map(log => `
                            <div class="log-item mb-2 pb-2" style="border-bottom: 1px solid rgba(0,0,0,0.05); text-align: left;">
                                <div class="flex justify-between text-xxs text-muted mb-1 font-mono">
                                    <span>${log.module.toUpperCase()} | ${log.action}</span>
                                    <span>${window.utils.formatDate(log.created_at)}</span>
                                </div>
                                <p style="margin:0; font-weight: 500;">${log.details}</p>
                            </div>
                        `).join('') || '<p class="text-muted text-center py-4">No recent activity found.</p>'}
                    </div>
                </div>

                <div class="card p-4">
                    <h3 class="card-title mb-3">Next Week Work Plan Summary</h3>
                    <div class="plans-mini-list text-xs" style="max-height: 250px; overflow-y: auto;">
                        ${window.db.get("user_weekly_plans").filter(p => {
                            const isSubmitted = p.status === 'submitted' || p.status === 'approved';
                            if (!isSubmitted) return false;
                            if (user.role === 'project_manager') {
                                return p.user_id === user.id || window.db.get("users").filter(u => u.role === 'engineer').some(u => u.id === p.user_id);
                            }
                            if (user.role === 'engineer') {
                                return p.user_id === user.id;
                            }
                            return true;
                        }).slice(-5).map(plan => {
                            const emp = window.db.get("users").find(x => x.id === plan.user_id);
                            return `
                                <div class="plan-item mb-2 pb-2" style="border-bottom: 1px solid rgba(0,0,0,0.05); text-align: left;">
                                    <div class="flex justify-between text-xxs text-muted mb-1">
                                        <strong>${emp ? emp.name : 'Unknown'} (Week ${plan.week_number})</strong>
                                        <span class="badge badge-${plan.status}">${window.t(plan.status).toUpperCase()}</span>
                                    </div>
                                    <p style="margin:0; line-height: 1.4;">${plan.plan_next_week}</p>
                                    <small class="text-xxs text-muted">Target: ${window.utils.formatDate(plan.target_date)}</small>
                                </div>
                            `;
                        }).join('') || '<p class="text-muted text-center py-4">No upcoming plans logged.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    /* ==========================================================
       PROJECTS PORTFOLIO PAGE (FULLY LOCALIZED)
       ========================================================== */
    renderProjectsPage(container) {
        let addProjectBtnHTML = "";
        if (window.auth.hasPermission("manage_projects")) {
            addProjectBtnHTML = `
                <button class="btn btn-primary" onclick="window.ui.openAddProjectModal()">+ ${window.t('add_new')}</button>
            `;
        }

        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div class="form-controls flex gap-2">
                    <input type="text" id="project-search" class="form-input" placeholder="${window.t('search_placeholder')}" style="width: 250px;" oninput="window.ui.filterProjects()">
                    <select id="project-filter-type" class="form-select" onchange="window.ui.filterProjects()">
                        <option value="all">${window.t('filter_all_types')}</option>
                        <option value="substation">${window.t('substation')}</option>
                        <option value="transmission_line">${window.t('transmission_line')}</option>
                        <option value="solar">${window.t('solar')}</option>
                        <option value="factory">${window.t('factory')}</option>
                        <option value="maintenance">${window.t('maintenance')}</option>
                    </select>
                </div>
                ${addProjectBtnHTML}
            </div>

            <div id="projects-grid-container" class="grid-3">
                ${this.generateProjectsCardsHTML(window.db.get("projects"))}
            </div>
        `;
    }

    generateProjectsCardsHTML(projects) {
        const user = window.auth.getCurrentUser();
        if (projects.length === 0) {
            return `
                <div class="card p-5 text-center col-span-3">
                    <span style="font-size: 48px;">▤</span>
                    <h3>${window.t('search_placeholder')}</h3>
                </div>
            `;
        }

        return projects.map(p => {
            const pmUser = window.db.get("users").find(x => x.id === p.pm_id);
            const progressColor = window.utils.getProgressColorClass(p.progress_percent);
            const convertedVal = window.db.formatCurrency(p.contract_value, p.currency);
            
            const isPM = user.role === 'project_manager';
            const isAssigned = !isPM || p.pm_id === user.id;
            const showProjectFinance = window.auth.hasPermission('view_project_finance_summary') && isAssigned;

            return `
                <div class="card p-4 hover-lift flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <span class="project-code-label font-mono">${p.code}</span>
                            ${window.utils.getStatusBadge(p.status)}
                        </div>
                        <h3 class="project-title-heading mb-2 cursor-pointer text-primary" onclick="window.ui.navigateTo('projects', '${p.id}')">${window.t(p.name)}</h3>
                        <p class="project-card-description text-muted text-xs mb-3">${p.description ? window.t(p.description).substring(0, 100) + '...' : ''}</p>
                        
                        <div class="project-metrics border-t border-b py-2 mb-3">
                            ${showProjectFinance ? `
                            <div class="flex justify-between text-xs py-1">
                                <span class="text-muted">${window.t('contract_value')}:</span>
                                <strong class="text-dark">${convertedVal}</strong>
                            </div>
                            ` : ''}
                            <div class="flex justify-between text-xs py-1">
                                <span class="text-muted">${window.t('location')}:</span>
                                <span class="text-dark">${window.t(p.location)}</span>
                            </div>
                            <div class="flex justify-between text-xs py-1">
                                <span class="text-muted">${window.t('project_manager')}:</span>
                                <span class="text-dark">${pmUser ? pmUser.name : "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="progress-bar-container mb-3">
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-muted">${window.t('progress')}</span>
                                <strong class="text-dark">${p.progress_percent}%</strong>
                            </div>
                            <div class="progress-bar-track">
                                <div class="progress-bar-fill ${progressColor}" style="width: ${p.progress_percent}%;"></div>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2">
                                    <button class="btn btn-secondary btn-sm" onclick="window.ui.navigateTo('projects', '${p.id}')">${window.t('review')}</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterProjects() {
        const query = document.getElementById("project-search").value.toLowerCase();
        const type = document.getElementById("project-filter-type").value;
        let projects = window.db.get("projects");

        if (type !== "all") {
            projects = projects.filter(p => p.type === type);
        }

        if (query.trim() !== "") {
            projects = projects.filter(p => p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query) || p.client.toLowerCase().includes(query));
        }

        const grid = document.getElementById("projects-grid-container");
        if (grid) {
            grid.innerHTML = this.generateProjectsCardsHTML(projects);
        }
    }

    renderProjectDetailsPage(viewport, projectId) {
        const user = window.auth.getCurrentUser();
        const p = window.db.get("projects").find(x => x.id === projectId);
        if (!p) {
            viewport.innerHTML = `<div class="card p-4">${window.t('project_not_found')}</div>`;
            return;
        }

        const pmUser = window.db.get("users").find(x => x.id === p.pm_id);
        const teamUsers = window.db.get("users").filter(u => p.team.includes(u.id));

        const isPM = user.role === 'project_manager';
        const isAssigned = !isPM || p.pm_id === user.id;
        const showProjectFinance = window.auth.hasPermission('view_project_finance_summary') && isAssigned;
        
        const hasAccessToProjProcurement = user.role === 'super_admin' || 
                                           user.role === 'deputy_md' || 
                                           user.role === 'finance_manager' || 
                                           user.role === 'procurement' || 
                                           p.pm_id === user.id || 
                                           p.procurement_engineer_id === user.id;

        viewport.innerHTML = `
            <div class="flex items-center gap-2 mb-4">
                <button class="btn btn-secondary btn-sm" onclick="window.ui.navigateTo('projects')">? ${window.t('projects')}</button>
                <h2>${window.t(p.name)}</h2>
            </div>

            <!-- PROJECT MAIN OVERVIEW STATS -->
            ${showProjectFinance ? `
            <div class="grid-4 mb-4">
                <div class="card stat-card border-l-primary">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('contract_value')}</span>
                        <h3 class="stat-value text-primary">${window.db.formatCurrency(p.contract_value, p.currency)}</h3>
                        <span class="stat-subtext text-muted">${window.t('approved_budget')}: ${window.db.formatCurrency(p.budget, p.currency)}</span>
                    </div>
                </div>
                <div class="card stat-card border-l-danger">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('total_expenses')}</span>
                        <h3 class="stat-value text-error">${window.db.formatCurrency(p.actual_cost, p.currency)}</h3>
                        <span class="stat-subtext ${p.actual_cost > p.budget ? 'text-error text-bold' : 'text-success'}">
                            ${window.t('margin')}: ${window.db.formatCurrency(p.budget - p.actual_cost, p.currency)}
                        </span>
                    </div>
                </div>
                <div class="card stat-card border-l-success">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('received_payment')}</span>
                        <h3 class="stat-value text-success">${window.db.formatCurrency(p.payment_received, p.currency)}</h3>
                        <span class="stat-subtext text-muted">${((p.payment_received / p.contract_value) * 100).toFixed(0)}%</span>
                    </div>
                </div>
                <div class="card stat-card border-l-warning">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('pending_payment')}</span>
                        <h3 class="stat-value text-warning">${window.db.formatCurrency(p.payment_pending, p.currency)}</h3>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- TABS FOR SUB-MODULES -->
            <div class="details-tab-bar card mb-4 p-1 flex gap-2">
                <button class="tab-link active" onclick="window.ui.toggleProjectSubTab(event, 'overview')">${window.t('search_placeholder')} / PM</button>
                <button class="tab-link" onclick="window.ui.toggleProjectSubTab(event, 'reports')">${window.t('weekly_reports')}</button>
                <button class="tab-link" onclick="window.ui.toggleProjectSubTab(event, 'tasks')">${window.t('tasks')}</button>
                ${showProjectFinance ? `
                <button class="tab-link" onclick="window.ui.toggleProjectSubTab(event, 'finance')">${window.t('finance')}</button>
                ` : ''}
                ${hasAccessToProjProcurement ? `
                <button class="tab-link" onclick="window.ui.toggleProjectSubTab(event, 'procurement')">${window.t('procurement') || 'Procurement'}</button>
                ` : ''}
                <button class="tab-link" onclick="window.ui.toggleProjectSubTab(event, 'docs')">${window.t('documents')}</button>
            </div>

            <!-- SUB-TAB CONTENT PANELS -->
            <div id="project-details-sub-viewport">
                ${this.generateProjectOverviewHTML(p, pmUser, teamUsers)}
            </div>
        `;
    }

    toggleProjectSubTab(event, tabName) {
        document.querySelectorAll(".tab-link").forEach(x => x.classList.remove("active"));
        event.currentTarget.classList.add("active");

        const subViewport = document.getElementById("project-details-sub-viewport");
        if (!subViewport) return;

        const user = window.auth.getCurrentUser();
        const p = window.db.get("projects").find(x => x.id === this.selectedProjectId);
        const pmUser = window.db.get("users").find(x => x.id === p.pm_id);
        const teamUsers = window.db.get("users").filter(u => p.team.includes(u.id));

        const isPM = user.role === 'project_manager';
        const isAssigned = !isPM || p.pm_id === user.id;
        const showProjectFinance = window.auth.hasPermission('view_project_finance_summary') && isAssigned;
        
        const hasAccessToProjProcurement = user.role === 'super_admin' || 
                                           user.role === 'deputy_md' || 
                                           user.role === 'finance_manager' || 
                                           user.role === 'procurement' || 
                                           p.pm_id === user.id || 
                                           p.procurement_engineer_id === user.id;

        switch (tabName) {
            case "overview":
                subViewport.innerHTML = this.generateProjectOverviewHTML(p, pmUser, teamUsers);
                break;
            case "reports":
                this.renderProjectReportsSubTab(subViewport, p.id);
                break;
            case "tasks":
                this.renderProjectTasksSubTab(subViewport, p.id);
                break;
            case "finance":
                if (!showProjectFinance) {
                    subViewport.innerHTML = `<div class="card p-4 text-center text-error font-bold">${window.t('permission_denied')}</div>`;
                } else {
                    this.renderProjectFinanceSubTab(subViewport, p.id);
                }
                break;
            case "procurement":
                if (!hasAccessToProjProcurement) {
                    subViewport.innerHTML = `<div class="card p-4 text-center text-error font-bold">${window.t('permission_denied')}</div>`;
                } else {
                    this.renderProjectProcurementSubTab(subViewport, p.id);
                }
                break;
            case "docs":
                this.renderProjectDocsSubTab(subViewport, p.id);
                break;
        }
    }

    generateProjectOverviewHTML(p, pmUser, teamUsers) {
        let adminControlsHTML = "";
        if (window.auth.hasPermission("manage_projects", p)) {
            const user = window.auth.getCurrentUser();
            adminControlsHTML = `
                <div class="card p-3 mb-4 bg-soft-info flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <strong>${window.t('admin_configs')}</strong>
                        <p class="text-xs text-muted">${window.t('admin_desc')}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary btn-sm" onclick="window.ui.openEditProjectModal('${p.id}')">${window.t('edit_proj_btn')}</button>
                        ${user.role === "super_admin" ? `<button class="btn btn-danger btn-sm" onclick="window.ui.archiveProject('${p.id}')">${window.t('archive_proj_btn')}</button>` : ""}
                    </div>
                </div>
            `;
        }

        const progressColor = window.utils.getProgressColorClass(p.progress_percent);

        return `
            ${adminControlsHTML}
            
            <div class="grid-2-1">
                <div class="flex-col gap-4">
                    <div class="card p-4">
                        <h3 class="card-title mb-3">${window.t('search_placeholder')}</h3>
                        <table class="table border-none font-sm">
                            <tr><td class="text-bold text-muted" width="150">${window.t('client_owner')}</td><td>${window.t(p.client)}</td></tr>
                            <tr><td class="text-bold text-muted">${window.t('location')}</td><td>${window.t(p.location)}</td></tr>
                            <tr><td class="text-bold text-muted">${window.t('type')}</td><td>${window.t(p.type)}</td></tr>
                            <tr><td class="text-bold text-muted">${window.t('duration')}</td><td>${window.utils.formatDate(p.start_date)} to ${window.utils.formatDate(p.planned_finish)}</td></tr>
                            <tr><td class="text-bold text-muted">${window.t('status')}</td><td>${window.utils.getStatusBadge(p.status)}</td></tr>
                            <tr><td class="text-bold text-muted">${window.t('progress')}</td><td>
                                <div class="progress-bar-container" style="max-width: 300px;">
                                    <div class="progress-bar-track">
                                        <div class="progress-bar-fill ${progressColor}" style="width: ${p.progress_percent}%;"></div>
                                    </div>
                                </div>
                            </td></tr>
                        </table>
                    </div>

                    <div class="card p-4">
                        <h3 class="card-title mb-3">${window.t('scope_description')}</h3>
                        <p class="text-sm" style="line-height: 1.6;">${window.t(p.description)}</p>
                        
                        <h4 class="card-subtitle mt-4 mb-2" style="color: var(--color-error)">⚠ ${window.t('risks_title')}</h4>
                        <div class="p-3 bg-soft-danger border-l-danger text-sm rounded">
                            ${window.t(p.risks) || window.t('no_risks')}
                        </div>
                    </div>
                </div>

                <div class="card p-4">
                    <h3 class="card-title mb-3">${window.t('team_members')}</h3>
                    <div class="team-pm-block mb-4">
                        <span class="text-xs text-muted block mb-2">${window.t('project_manager')}</span>
                        <div class="flex items-center gap-3 p-3 bg-soft-primary rounded">
                                    <span style="font-size: 28px;">👤</span>
                            <div>
                                <strong class="text-sm block">${pmUser ? pmUser.name : "Unassigned"}</strong>
                                <span class="text-xs text-muted">${pmUser ? pmUser.email : "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    <div class="team-engineers-block">
                        <span class="text-xs text-muted block mb-2">${window.t('engineers')}</span>
                        <div class="engineers-list flex-col gap-2">
                            ${teamUsers.map(u => `
                                <div class="flex items-center gap-3 p-2 border-b">
                                <span style="font-size: 20px;">👤</span>
                                    <div>
                                        <span class="text-sm text-bold block">${u.name}</span>
                                        <span class="text-xs text-muted">${u.phone || u.email}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /* ==========================================================
       SUB TAB: WEEKLY PROGRESS REPORTS (FULLY TRANSLATED)
       ========================================================== */
    renderProjectReportsSubTab(subViewport, projectId) {
        const reports = window.db.get("weekly_reports").filter(r => r.project_id === projectId);
        
        let reportActionBtnHTML = "";
        if (window.auth.hasPermission("submit_weekly_report")) {
            reportActionBtnHTML = `
                        <button class="btn btn-primary btn-sm" onclick="window.ui.openAddWeeklyReportModal('${projectId}')">${window.t('submit_weekly_log')}</button>
            `;
        }

        subViewport.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('weekly_history')}</h3>
                ${reportActionBtnHTML}
            </div>

            <div class="reports-timeline">
                ${reports.length === 0 ? `
                    <div class="empty-state card p-5 text-center">
                    <span style="font-size: 36px;">▤</span>
                        <p class="text-muted mt-2">${window.t('no_weekly_reports')}</p>
                    </div>
                ` : reports.map(r => {
                    const reporter = window.db.get("users").find(x => x.id === r.created_by);
                    return `
                        <div class="card p-4 mb-3 border-l-success">
                            <div class="flex justify-between items-start mb-3 flex-wrap gap-2">
                                <div>
                                    <h4 class="text-bold" style="font-size: 16px;">${window.t('week_num')} ${r.week_number} ${window.t('progress_report')}</h4>
                                    <span class="text-xs text-muted">${window.t('log_date_range')}: ${r.date_range}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="badge badge-completed">${r.progress_percent}% ${window.t('completed')}</span>
                                    ${window.auth.getCurrentUser().role !== 'viewer' ? `
                                        <button class="btn btn-xs btn-secondary" onclick="window.ui.openEditWeeklyReportModal('${r.id}')">${window.t('edit')}</button>
                                    ` : ''}
                                </div>
                            </div>

                            <div class="grid-2 gap-4 text-sm mb-3">
                                <div>
                                        <strong class="block mb-1 text-primary">${window.t('works_done')}</strong>
                                    <p class="text-muted p-2 bg-slate-50 rounded">${window.t(r.work_completed)}</p>
                                </div>
                                <div>
                                    <strong class="block mb-1 text-primary">${window.t('works_planned')}</strong>
                                    <p class="text-muted p-2 bg-slate-50 rounded">${window.t(r.work_planned)}</p>
                                </div>
                            </div>

                            <div class="grid-3 text-xs py-2 bg-slate-50 rounded p-2 mb-3">
                                <div><strong>${window.t('site_manpower')}:</strong> ${r.manpower} ${window.t('workers') || 'workers'}</div>
                                <div><strong>${window.t('materials_status')}:</strong> ${window.t(r.materials_status) || window.t('adequate') || 'Adequate'}</div>
                                <div><strong>${window.t('reported_by')}:</strong> ${reporter ? reporter.name : window.t('unknown')}</div>
                            </div>

                            ${r.issues || r.delay_reason ? `
                                <div class="p-3 bg-soft-danger border-l-danger text-xs rounded mb-2">
                                    <strong>${window.t('reported_blockers')}:</strong> ${window.t(r.issues) || 'N/A'} <br>
                                    <strong>${window.t('delay_reason')}:</strong> ${window.t(r.delay_reason) || 'N/A'}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /* ==========================================================
       SUB TAB: TASKS PROGRESS BOARD
       ========================================================== */
    renderProjectTasksSubTab(subViewport, projectId) {
        const tasks = window.db.get("tasks").filter(t => t.project_id === projectId && !t.deleted);
        const canDeleteTask = window.auth.hasPermission("assign_tasks", projectId);
        
        let addTaskBtnHTML = "";
        if (window.auth.hasPermission("assign_tasks", projectId)) {
            addTaskBtnHTML = `
                <button class="btn btn-primary btn-sm" onclick="window.ui.openAddTaskModal('${projectId}')">+ ${window.t('create_task')}</button>
            `;
        }

        subViewport.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('deliverables_checklist')}</h3>
                ${addTaskBtnHTML}
            </div>

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('task_title')}</th>
                            <th>${window.t('priority')}</th>
                            <th>${window.t('status')}</th>
                            <th>${window.t('progress')}</th>
                            <th>${window.t('assigned_emp')}</th>
                            <th>${window.t('due_date')}</th>
                            <th class="text-right">${window.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tasks.length === 0 ? `
                            <tr><td colspan="7" class="text-center p-4 text-muted">${window.t('no_milestones')}</td></tr>
                        ` : tasks.map(t => {
                            const assignee = window.db.get("users").find(x => x.id === t.assigned_to);
                            return `
                                <tr>
                                    <td>
                                        <strong class="block">${window.t(t.title)}</strong>
                                        <span class="text-xs text-muted">${window.t(t.description).substring(0, 50)}...</span>
                                    </td>
                                    <td><span class="badge badge-${t.priority === 'urgent' || t.priority === 'high' ? 'delayed' : 'planning'}">${window.t(t.priority).toUpperCase()}</span></td>
                                    <td><span class="badge badge-${t.status}">${window.t(t.status).toUpperCase().replace('_', ' ')}</span></td>
                                    <td>
                                        <div class="flex items-center gap-2">
                                            <div class="progress-bar-track" style="width: 60px;">
                                                <div class="progress-bar-fill ${window.utils.getProgressColorClass(t.progress_percent)}" style="width: ${t.progress_percent}%;"></div>
                                            </div>
                                            <span class="text-xs font-mono">${t.progress_percent}%</span>
                                        </div>
                                    </td>
                                    <td>${assignee ? assignee.name : "Unassigned"}</td>
                                    <td class="font-mono">${window.utils.formatDate(t.due_date)}</td>
                                    <td class="text-right">
                                        <button class="btn btn-xs btn-secondary" onclick="window.ui.openTaskDetailsModal('${t.id}')">${window.t('view_comment')}</button>
                                        ${canDeleteTask ? `<button class="btn btn-xs btn-danger ml-1" onclick="event.stopPropagation(); window.ui.deleteTask('${t.id}')">${window.t('delete')}</button>` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /* ==========================================================
       SUB TAB: DETAILED FINANCE LEDGER
       ========================================================== */
    renderProjectFinanceSubTab(subViewport, projectId) {
        const records = window.db.get("finance_records").filter(r => r.project_id === projectId);
        const p = window.db.get("projects").find(x => x.id === projectId);

        let expenseActionHTML = "";
        if (window.auth.hasPermission("add_project_expense")) {
            expenseActionHTML = `
                <button class="btn btn-primary btn-sm" onclick="window.ui.openAddFinanceRecordModal('${projectId}')">+ ${window.t('add_ledger_entry')}</button>
            `;
        }

        subViewport.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('txn_id')}</h3>
                ${expenseActionHTML}
            </div>

            <div class="grid-3 mb-4">
                <div class="card p-3 text-center">
                    <span class="text-muted text-xs block">${window.t('labor_cost')}</span>
                    <strong style="font-size: 18px; color: var(--color-error);">
                        ${window.db.formatCurrency(records.filter(r => r.category === 'labor').reduce((acc, curr) => acc + curr.amount, 0), p.currency)}
                    </strong>
                </div>
                <div class="card p-3 text-center">
                    <span class="text-muted text-xs block">${window.t('material_cost')}</span>
                    <strong style="font-size: 18px; color: var(--color-error);">
                        ${window.db.formatCurrency(records.filter(r => r.category === 'material').reduce((acc, curr) => acc + curr.amount, 0), p.currency)}
                    </strong>
                </div>
                <div class="card p-3 text-center">
                    <span class="text-muted text-xs block">${window.t('subcontractor_cost')}</span>
                    <strong style="font-size: 18px; color: var(--color-error);">
                        ${window.db.formatCurrency(records.filter(r => r.category === 'subcontractor').reduce((acc, curr) => acc + curr.amount, 0), p.currency)}
                    </strong>
                </div>
            </div>

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('txn_id')}</th>
                            <th>${window.t('type')}</th>
                            <th>${window.t('category')}</th>
                            <th>${window.t('description')}</th>
                            <th>${window.t('invoice_no')}</th>
                            <th>${window.t('status')}</th>
                            <th>${window.t('published_date')}</th>
                            <th class="text-right">${window.t('amount')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr><td colspan="8" class="text-center p-4 text-muted">${window.t('no_finance')}</td></tr>
                        ` : records.map(r => `
                            <tr>
                                <td class="font-mono text-xs">${r.id}</td>
                                <td><span class="badge badge-${r.type === 'income' ? 'completed' : 'delayed'}">${window.t(r.type).toUpperCase()}</span></td>
                                <td>${window.t(r.category).toUpperCase()}</td>
                                <td class="text-xs">${window.t(r.description)}</td>
                                <td class="font-mono text-xs">${r.invoice_number || 'N/A'}</td>
                                <td><span class="badge badge-${r.payment_status}">${window.t(r.payment_status).toUpperCase()}</span></td>
                                <td class="font-mono text-xs">${window.utils.formatDate(r.payment_date)}</td>
                                <td class="text-right text-bold ${r.type === 'income' ? 'text-success' : 'text-error'}">
                                    ${r.type === 'income' ? '+' : '-'}${window.db.formatCurrency(r.amount, r.currency)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderProjectProcurementSubTab(viewport, projectId) {
        const user = window.auth.getCurrentUser();
        const p = window.db.get("projects").find(x => x.id === projectId);
        if (!p) return;
        
        let records = window.db.get("procurement_records").filter(r => r.project_id === projectId && !r.deleted);
        
        let prBtn = "";
        const canCreate = window.auth.canCreateProcurement(p);
        if (canCreate) {
            prBtn = `
                <button class="btn btn-primary btn-sm" onclick="window.ui.openCreatePRModal()">+ ${window.t('create_requirement')}</button>
            `;
        }

        viewport.innerHTML = `
            <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h3 class="card-title">${window.t('required_procurement_list')}</h3>
                ${prBtn}
            </div>

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('pr_number')}</th>
                            <th>${window.t('equipment_material_name')}</th>
                            <th>${window.t('specification')}</th>
                            <th>${window.t('qty')}</th>
                            <th>${window.t('required_date')}</th>
                            <th>${window.t('current_status')}</th>
                            <th>${window.t('po_number_label') || 'PO Number'}</th>
                            <th>${window.t('delivery_status')}</th>
                            <th class="text-right no-print">${window.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `<tr><td colspan="9" class="text-center text-muted p-4">No procurement records found for this project.</td></tr>` : 
                        records.map(r => {
                            let actionBtn = "";
                            const canSubmit = window.auth.canActionProcurement(r, "submit");
                            const canEdit = window.auth.hasPermission("edit_procurement", r);
                            
                            if (canSubmit) {
                                actionBtn += `<button class="btn btn-xs btn-primary mr-1" onclick="window.ui.submitPRRequirement('${r.id}')">${window.t('submit_to_proc')}</button>`;
                            }
                            if (canEdit && (r.approval_status === 'Draft' || r.approval_status === 'Need Technical Clarification')) {
                                actionBtn += `<button class="btn btn-xs btn-secondary mr-1" onclick="window.ui.openCreatePRModal('${r.id}')">${window.t('edit')}</button>`;
                            }
                            actionBtn += `<button class="btn btn-xs btn-info" onclick="window.ui.openProcurementDetailsModal('${r.id}')">${window.t('view')}</button>`;

                            const isPrcCreator = r.created_by === user.id;
                            const isPrcBeforeApproval = r.approval_status !== "Approved" && r.approval_status !== "Rejected" && r.approval_status !== "Closed" && r.approval_status !== "PO Issued" && r.approval_status !== "Ordered" && r.approval_status !== "Delivered";
                            if (isPrcCreator && isPrcBeforeApproval) {
                                actionBtn += `<button class="btn btn-xs btn-danger ml-1" onclick="event.stopPropagation(); window.ui.deleteProcurementRecord('${r.id}')">${window.t('delete')}</button>`;
                            }

                            return `
                                <tr>
                                    <td class="font-mono text-xs text-bold">${r.pr_number}</td>
                                    <td class="text-xs text-bold">${r.material_name}</td>
                                    <td class="text-xs">${r.specification || '-'}</td>
                                    <td class="font-mono text-xs">${r.quantity} ${r.unit}</td>
                                    <td class="font-mono text-xs">${window.utils.formatDate(r.required_date)}</td>
                                    <td><span class="badge badge-${r.approval_status.toLowerCase().replace(/ /g, '_')}">${window.t(r.approval_status.toLowerCase().replace(/ /g, '_')).toUpperCase()}</span></td>
                                    <td class="font-mono text-xs">${r.po_number || '-'}</td>
                                    <td><span class="badge badge-${r.delivery_status}">${window.t(r.delivery_status).toUpperCase()}</span></td>
                                    <td class="text-right no-print" style="white-space: nowrap;">${actionBtn}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /* ==========================================================
       SUB TAB: DOCUMENTS STORAGE FILTER
       ========================================================== */
    renderProjectDocsSubTab(subViewport, projectId) {
        const docs = window.db.get("documents").filter(d => d.project_id === projectId);
        
        subViewport.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('vault_desc')}</h3>
                <button class="btn btn-primary btn-sm" onclick="window.ui.openUploadDocumentModal('${projectId}')">${window.t('upload_file')}</button>
            </div>

            <div class="grid-4">
                ${docs.length === 0 ? `
                    <div class="empty-state card p-5 text-center col-span-4">
                        <span style="font-size: 32px;">?</span>
                        <p class="text-muted mt-2">${window.t('no_docs')}</p>
                    </div>
                ` : docs.map(d => `
                    <div class="card p-3 flex-col justify-between hover-lift">
                        <div class="flex items-start gap-2 mb-2">
                            <span style="font-size: 28px;">?</span>
                            <div>
                                <strong class="text-xs block text-dark" style="word-break: break-all;">${window.t(d.name)}</strong>
                                <span class="text-xxs text-muted font-mono">${window.t(d.type).toUpperCase()} | ${d.file_size}</span>
                            </div>
                        </div>
                        <div class="flex justify-between items-center mt-3 pt-2 border-t text-xxs">
                            <span class="text-muted">${window.t('uploaded_by') || 'Uploaded By'}: ${d.uploaded_by}</span>
                            <button class="btn btn-icon btn-xs" onclick="window.utils.showToast(window.t('downloaded_toast') + '${d.name}', 'success')">${window.t('download')}</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /* ==========================================================
       WEEKLY REPORTS COMPONENT (FULLY TRANSLATED)
       ========================================================== */
    renderWeeklyReportsPage(container) {
        if (!this.activeWeeklySubTab) {
            this.activeWeeklySubTab = "project_site_logs";
        }
        
        container.innerHTML = `
            <div class="print-header no-screen" style="display:none;">
                <h2>${window.t('company_name')}</h2>
                <h3>${window.t('weekly_reports')}</h3>
            </div>
            
            <div class="details-tab-bar card mb-4 p-1 flex gap-2 no-print">
                <button class="tab-link ${this.activeWeeklySubTab === 'project_site_logs' ? 'active' : ''}" onclick="window.ui.toggleWeeklySubTab(event, 'project_site_logs')">${window.t('project_site_logs')}</button>
                <button class="tab-link ${this.activeWeeklySubTab === 'my_weekly_reports' ? 'active' : ''}" onclick="window.ui.toggleWeeklySubTab(event, 'my_weekly_reports')">${window.t('my_weekly_reports')}</button>
                <button class="tab-link ${this.activeWeeklySubTab === 'my_weekly_plans' ? 'active' : ''}" onclick="window.ui.toggleWeeklySubTab(event, 'my_weekly_plans')">${window.t('my_weekly_plans')}</button>
                ${window.auth.hasPermission('review_weekly_reports') ? `
                    <button class="tab-link ${this.activeWeeklySubTab === 'supervisor_reviews' ? 'active' : ''}" onclick="window.ui.toggleWeeklySubTab(event, 'supervisor_reviews')">${window.t('supervisor_reviews')}</button>
                ` : ''}
            </div>

            <div id="weekly-reports-sub-viewport">
                ${this.renderWeeklySubTabContent()}
            </div>
        `;
    }

    toggleWeeklySubTab(e, subTab) {
        this.activeWeeklySubTab = subTab;
        const bar = e.target.parentNode;
        bar.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        
        const subViewport = document.getElementById("weekly-reports-sub-viewport");
        if (subViewport) {
            subViewport.innerHTML = this.renderWeeklySubTabContent();
        }
    }

    renderWeeklySubTabContent() {
        const subTab = this.activeWeeklySubTab;
        
        if (subTab === 'project_site_logs') {
            const reports = window.db.get("weekly_reports");
            const projects = window.db.get("projects");
            return `
                <div class="card p-4 mb-4 no-print">
                    <h3 class="card-title mb-3">${window.t('project_site_logs')}</h3>
                    <p class="text-sm text-muted">${window.t('weekly_reports_desc')}</p>
                </div>

                <div class="flex justify-between items-center mb-4 flex-wrap gap-2 no-print">
                    <select id="weekly-filter-project" class="form-select" style="width: 250px;" onchange="window.ui.filterWeeklyReports()">
                        <option value="all">${window.t('all_projects') || 'All Projects'}</option>
                        ${projects.map(p => `<option value="${p.id}">${window.t(p.name)}</option>`).join('')}
                    </select>
                </div>

                <div id="weekly-timeline-viewport">
                    ${this.generateTimelineHTML(reports)}
                </div>
            `;
        } else if (subTab === 'my_weekly_reports') {
            return this.generateMyWeeklyReportsHTML();
        } else if (subTab === 'my_weekly_plans') {
            return this.generateMyWeeklyPlansHTML();
        } else if (subTab === 'supervisor_reviews') {
            return this.generateSupervisorReviewsHTML();
        }
        return "";
    }

    generateMyWeeklyReportsHTML() {
        const user = window.auth.getCurrentUser();
        const reports = window.db.get("user_weekly_reports").filter(r => r.user_id === user.id);
        
        return `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('my_weekly_reports')}</h3>
                <button class="btn btn-primary btn-sm" onclick="window.ui.openSubmitWeeklyReportModal()">+ ${window.t('submit_weekly_report')}</button>
            </div>

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('week_number')}</th>
                            <th>${window.t('date_range')}</th>
                            <th>${window.t('project_name')}</th>
                            <th>${window.t('progress_percent')}</th>
                            <th>${window.t('submitted_date')}</th>
                            <th>${window.t('report_status')}</th>
                            <th>${window.t('supervisor_comments')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.length === 0 ? `<tr><td colspan="7" class="text-center text-muted p-4">No data found. Please add new record or reset demo data.</td></tr>` : 
                        reports.map(r => {
                            const p = window.db.get("projects").find(x => x.id === r.project_id);
                            return `
                                <tr style="cursor: pointer;" onclick="window.ui.openWeeklyReportDetailsModal('${r.id}')" title="Click to view details and responsibility tracking">
                                    <td class="font-mono text-xs text-bold text-primary">Week ${r.week_number}</td>
                                    <td class="text-xs">${r.date_range}</td>
                                    <td class="text-xs">${p ? window.t(p.name) : window.t('unassigned')}</td>
                                    <td class="font-mono text-xs">${r.progress_percent}%</td>
                                    <td class="text-xs font-mono">${window.utils.formatDate(r.submitted_date)}</td>
                                    <td><span class="badge badge-${r.status}">${window.t(r.status).toUpperCase()}</span></td>
                                    <td class="text-xs text-muted" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.comments || ''}">${r.comments || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    openSubmitWeeklyReportModal() {
        const user = window.auth.getCurrentUser();
        const projects = window.db.get("projects");
        const currentWeek = window.utils ? window.utils.getWeekNumber() : 22;
        
        const today = new Date();
        const first = today.getDate() - today.getDay() + 1;
        const last = first + 6;
        const monday = new Date(today.setDate(first)).toISOString().slice(0, 10);
        const sunday = new Date(today.setDate(last)).toISOString().slice(0, 10);
        const defaultRange = `${monday} to ${sunday}`;

        const formHTML = `
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('employee_name')}</label>
                    <input type="text" id="m-rep-emp" class="form-input btn-full" value="${user.name}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('role_department')}</label>
                    <input type="text" id="m-rep-role" class="form-input btn-full" value="${user.role.toUpperCase()} / ${user.department}" readonly>
                </div>
            </div>
            <div class="grid-3 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('project_name')}</label>
                    <select id="m-rep-proj" class="form-select btn-full">
                        ${projects.map(p => `<option value="${p.id}">${window.t(p.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('week_number')}</label>
                    <input type="number" id="m-rep-week" class="form-input btn-full" value="${currentWeek}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('progress_percent')} (%)</label>
                    <input type="number" id="m-rep-progress" class="form-input btn-full" value="0" min="0" max="100">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('date_range')}</label>
                <input type="text" id="m-rep-range" class="form-input btn-full" value="${defaultRange}">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('work_completed')}</label>
                <textarea id="m-rep-comp" class="form-input btn-full" style="height: 60px;" placeholder="What did you complete?"></textarea>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('problems_issues')}</label>
                <textarea id="m-rep-probs" class="form-input btn-full" style="height: 50px;" placeholder="Any blocker issues?"></textarea>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('support_required')}</label>
                <textarea id="m-rep-support" class="form-input btn-full" style="height: 50px;" placeholder="What help do you need?"></textarea>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('work_plan_next_week')}</label>
                <textarea id="m-rep-plan" class="form-input btn-full" style="height: 50px;" placeholder="What is your plan for next week?"></textarea>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('target_next_week')}</label>
                    <input type="date" id="m-rep-target" class="form-input btn-full">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('attachment_placeholder')}</label>
                    <input type="text" id="m-rep-attach" class="form-input btn-full" placeholder="photo_ref.jpg">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label block text-xs mb-1">${window.t('report_status')}</label>
                <select id="m-rep-status" class="form-select btn-full">
                    <option value="submitted">${window.t('submitted')}</option>
                    <option value="draft">${window.t('draft')}</option>
                </select>
            </div>
        `;

        this.openModal(window.t('submit_weekly_report'), formHTML, () => {
            const projId = document.getElementById("m-rep-proj").value;
            const week = Number(document.getElementById("m-rep-week").value);
            const progress = Number(document.getElementById("m-rep-progress").value);
            const range = document.getElementById("m-rep-range").value;
            const completed = document.getElementById("m-rep-comp").value;
            const problems = document.getElementById("m-rep-probs").value;
            const support = document.getElementById("m-rep-support").value;
            const plan = document.getElementById("m-rep-plan").value;
            const target = document.getElementById("m-rep-target").value;
            const attach = document.getElementById("m-rep-attach").value;
            const status = document.getElementById("m-rep-status").value;

            if (!completed || !plan) {
                window.utils.showToast(window.t('all_fields_required'), "error");
                return false;
            }

            window.db.add("user_weekly_reports", {
                user_id: user.id,
                employee_name: user.name,
                role_dept: `${user.role.toUpperCase()} / ${user.department}`,
                project_id: projId,
                week_number: week,
                date_range: range,
                work_completed: completed,
                problems,
                support_required: support,
                work_plan_next_week: plan,
                target_next_week: target,
                progress_percent: progress,
                attachment_placeholder: attach,
                submitted_date: new Date().toISOString().slice(0, 10),
                status,
                comments: ""
            });

            window.utils.logAudit("WEEKLY_REPORT_SUBMITTED", "reports", `User ${user.name} submitted weekly report for Week ${week}`);
            window.utils.showToast("Weekly report recorded successfully!", "success");
            
            const subViewport = document.getElementById("weekly-reports-sub-viewport");
            if (subViewport) {
                subViewport.innerHTML = this.renderWeeklySubTabContent();
            }
            return true;
        });
    }

    generateMyWeeklyPlansHTML() {
        const user = window.auth.getCurrentUser();
        const plans = window.db.get("user_weekly_plans").filter(p => p.user_id === user.id);
        
        return `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('my_weekly_plans')}</h3>
                <button class="btn btn-primary btn-sm" onclick="window.ui.openSubmitWeeklyPlanModal()">+ ${window.t('submit_to_supervisor')}</button>
            </div>

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('week_number')}</th>
                            <th>${window.t('tasks_this_week')}</th>
                            <th>${window.t('completed_work')}</th>
                            <th>${window.t('plan_next_week')}</th>
                            <th>${window.t('target_date')}</th>
                            <th>${window.t('report_status')}</th>
                            <th>${window.t('supervisor_comments')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${plans.length === 0 ? `<tr><td colspan="7" class="text-center text-muted p-4">${window.t('no_weekly_reports')}</td></tr>` : 
                        plans.map(p => {
                            return `
                                <tr>
                                    <td class="font-mono text-xs text-bold">Week ${p.week_number}</td>
                                    <td class="text-xs text-muted" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.tasks_this_week}</td>
                                    <td class="text-xs text-muted" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.completed_work}</td>
                                    <td class="text-xs text-bold" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.plan_next_week}</td>
                                    <td class="text-xs font-mono">${window.utils.formatDate(p.target_date)}</td>
                                    <td><span class="badge badge-${p.status}">${window.t(p.status).toUpperCase()}</span></td>
                                    <td class="text-xs text-muted" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.comments || ''}">${p.comments || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    openSubmitWeeklyPlanModal() {
        const user = window.auth.getCurrentUser();
        const currentWeek = window.utils ? window.utils.getWeekNumber() : 22;
        
        const formHTML = `
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('employee_name')}</label>
                    <input type="text" class="form-input btn-full" value="${user.name}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('week_number')} (For Next Week)</label>
                    <input type="number" id="m-plan-week" class="form-input btn-full" value="${currentWeek + 1}">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('tasks_this_week')}</label>
                <textarea id="m-plan-this" class="form-input btn-full" style="height: 50px;" placeholder="What tasks did you have scheduled this week?"></textarea>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('completed_work')}</label>
                <textarea id="m-plan-comp" class="form-input btn-full" style="height: 50px;" placeholder="What did you complete this week?"></textarea>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('problems')}</label>
                <textarea id="m-plan-probs" class="form-input btn-full" style="height: 50px;" placeholder="What problems did you face?"></textarea>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('plan_next_week')}</label>
                <textarea id="m-plan-next" class="form-input btn-full" style="height: 50px;" placeholder="What is your plan for next week?"></textarea>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('target_date')}</label>
                    <input type="date" id="m-plan-target" class="form-input btn-full">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('required_support')}</label>
                    <input type="text" id="m-plan-support" class="form-input btn-full" placeholder="What support is required?">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label block text-xs mb-1">${window.t('report_status')}</label>
                <select id="m-plan-status" class="form-select btn-full">
                    <option value="submitted">${window.t('submitted')}</option>
                    <option value="draft">${window.t('draft')}</option>
                </select>
            </div>
        `;

        this.openModal(window.t('weekly_plan_title'), formHTML, () => {
            const week = Number(document.getElementById("m-plan-week").value);
            const tasksThis = document.getElementById("m-plan-this").value;
            const completed = document.getElementById("m-plan-comp").value;
            const problems = document.getElementById("m-plan-probs").value;
            const next = document.getElementById("m-plan-next").value;
            const target = document.getElementById("m-plan-target").value;
            const support = document.getElementById("m-plan-support").value;
            const status = document.getElementById("m-plan-status").value;

            if (!next || !target) {
                window.utils.showToast(window.t('all_fields_required'), "error");
                return false;
            }

            window.db.add("user_weekly_plans", {
                user_id: user.id,
                week_number: week,
                tasks_this_week: tasksThis,
                completed_work: completed,
                problems,
                plan_next_week: next,
                target_date: target,
                required_support: support,
                status,
                comments: ""
            });

            window.utils.logAudit("WEEKLY_PLAN_SUBMITTED", "reports", `User ${user.name} submitted weekly plan for Week ${week}`);
            window.utils.showToast("Weekly plan submitted to supervisor!", "success");
            
            const subViewport = document.getElementById("weekly-reports-sub-viewport");
            if (subViewport) {
                subViewport.innerHTML = this.renderWeeklySubTabContent();
            }
            return true;
        });
    }

    generateSupervisorReviewsHTML() {
        const user = window.auth.getCurrentUser();
        let reports = window.db.get("user_weekly_reports");
        let plans = window.db.get("user_weekly_plans");
        
        if (user.role === 'finance_manager') {
            const filterFn = (text) => {
                if (!text) return false;
                const lower = text.toLowerCase();
                return lower.includes("cost") || lower.includes("payment") || lower.includes("procurement") || lower.includes("budget") || lower.includes("expense") || lower.includes("เงิน") || lower.includes("ชำระ") || lower.includes("จัดซื้อ") || lower.includes("费用") || lower.includes("付款") || lower.includes("采购");
            };
            reports = reports.filter(r => filterFn(r.work_completed) || filterFn(r.problems) || filterFn(r.support_required) || filterFn(r.work_plan_next_week));
            plans = plans.filter(p => filterFn(p.tasks_this_week) || filterFn(p.completed_work) || filterFn(p.problems) || filterFn(p.plan_next_week) || filterFn(p.required_support));
        } else if (user.role === 'project_manager') {
            const myProjectIds = window.db.get("projects").filter(p => p.pm_id === user.id).map(p => p.id);
            reports = reports.filter(r => myProjectIds.includes(r.project_id) || r.user_id === user.id);
            plans = plans.filter(p => p.user_id !== 'u-1' && p.user_id !== 'u-6' && p.user_id !== 'u-7');
        }

        return `
            <div class="mb-4">
                <h3 class="card-title mb-3">${window.t('employee_reports')} ${window.t('supervisor_reviews')}</h3>
                <div class="table-container card">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>${window.t('employee_name')}</th>
                                <th>${window.t('role_department')}</th>
                                <th>${window.t('week_number')}</th>
                                <th>${window.t('work_completed')}</th>
                                <th>${window.t('report_status')}</th>
                                <th class="text-right no-print">${window.t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reports.filter(r => r.status !== 'draft').length === 0 ? `<tr><td colspan="6" class="text-center text-muted p-4">No data found. Please add new record or reset demo data.</td></tr>` : 
                            reports.filter(r => r.status !== 'draft').map(r => {
                                let actionBtns = "-";
                                if (r.status === 'submitted' && (user.role === 'super_admin' || user.role === 'deputy_md')) {
                                    actionBtns = `
                                        <div class="flex gap-1 justify-end" onclick="event.stopPropagation();">
                                            <button class="btn btn-xs btn-success" onclick="event.stopPropagation(); window.ui.reviewUserWeeklyReport('${r.id}', 'approved')">${window.t('approve')}</button>
                                            <button class="btn btn-xs btn-warning" onclick="event.stopPropagation(); window.ui.reviewUserWeeklyReport('${r.id}', 'Need Revision')">${window.t('request_revision')}</button>
                                            <button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); window.ui.reviewUserWeeklyReport('${r.id}', 'rejected')">${window.t('reject')}</button>
                                        </div>
                                    `;
                                }
                                return `
                                    <tr style="cursor: pointer;" onclick="window.ui.openWeeklyReportDetailsModal('${r.id}')" title="Click to view details and responsibility tracking">
                                    <td class="text-xs text-bold text-primary">${r.employee_name}</td>
                                        <td class="text-xs text-muted">${r.role_dept}</td>
                                        <td class="font-mono text-xs">Week ${r.week_number}</td>
                                        <td class="text-xs" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.work_completed}">${r.work_completed}</td>
                                        <td><span class="badge badge-${r.status}">${window.t(r.status).toUpperCase()}</span></td>
                                        <td class="text-right no-print">${actionBtns}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="mb-4">
                <h3 class="card-title mb-3">${window.t('my_weekly_plans')} ${window.t('supervisor_reviews')}</h3>
                <div class="table-container card">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>${window.t('employee_name')}</th>
                                <th>${window.t('week_number')}</th>
                                <th>${window.t('plan_next_week')}</th>
                                <th>${window.t('target_date')}</th>
                                <th>${window.t('report_status')}</th>
                                <th class="text-right no-print">${window.t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${plans.filter(p => p.status !== 'draft').length === 0 ? `<tr><td colspan="6" class="text-center text-muted p-4">No data found. Please add new record or reset demo data.</td></tr>` : 
                            plans.filter(p => p.status !== 'draft').map(p => {
                                const emp = window.db.get("users").find(x => x.id === p.user_id);
                                let actionBtns = "-";
                                if (p.status === 'submitted' && (user.role === 'super_admin' || user.role === 'deputy_md')) {
                                    actionBtns = `
                                        <div class="flex gap-1 justify-end" onclick="event.stopPropagation();">
                                            <button class="btn btn-xs btn-success" onclick="event.stopPropagation(); window.ui.reviewUserWeeklyPlan('${p.id}', 'approved')">${window.t('approve')}</button>
                                            <button class="btn btn-xs btn-warning" onclick="event.stopPropagation(); window.ui.reviewUserWeeklyPlan('${p.id}', 'Need Revision')">${window.t('request_revision')}</button>
                                            <button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); window.ui.reviewUserWeeklyPlan('${p.id}', 'rejected')">${window.t('reject')}</button>
                                        </div>
                                    `;
                                }
                                return `
                                    <tr style="cursor: pointer;" onclick="window.ui.openWeeklyPlanDetailsModal('${p.id}')" title="Click to view details and responsibility tracking">
                                    <td class="text-xs text-bold text-primary">${emp ? emp.name : 'Unknown'}</td>
                                        <td class="font-mono text-xs">Week ${p.week_number}</td>
                                        <td class="text-xs" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.plan_next_week}">${p.plan_next_week}</td>
                                        <td class="font-mono text-xs">${window.utils.formatDate(p.target_date)}</td>
                                        <td><span class="badge badge-${p.status}">${window.t(p.status).toUpperCase()}</span></td>
                                        <td class="text-right no-print">${actionBtns}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    reviewUserWeeklyReport(id, decision) {
        const user = window.auth.getCurrentUser();
        if (user.role !== 'super_admin' && user.role !== 'deputy_md') {
            window.utils.showToast("Permission Denied: Supervisor review actions are restricted to Management (Super Admin/DMD).", "error");
            return;
        }

        const r = window.db.get("user_weekly_reports").find(x => x.id === id);
        if (!r) return;
        
        const formHTML = `
            <div class="form-group mb-3">
                <p class="text-xs text-muted mb-2">Reviewing Weekly Report for <strong>${r.employee_name}</strong> (Week ${r.week_number})</p>
                <label class="form-label block text-xs mb-1">${window.t('supervisor_comments')}</label>
                <textarea id="m-rev-comm" class="form-input btn-full" style="height: 60px;" placeholder="Add comments/feedback..."></textarea>
            </div>
        `;
        
        const title = decision === 'approved' ? window.t('approve_report') : 
                      decision === 'Need Revision' ? window.t('request_revision') : window.t('reject_report');
                      
        this.openModal(title, formHTML, () => {
            const comments = document.getElementById("m-rev-comm").value;
            
            window.db.update("user_weekly_reports", id, {
                status: decision,
                comments: comments,
                reviewed_by: user.name,
                reviewed_by_name: user.name,
                reviewed_by_id: user.id,
                reviewed_by_role: user.role,
                reviewed_at: new Date().toISOString(),
                report_ref: r.id,
                report_plan_ref: r.id,
                employee_name: r.employee_name,
                week_number: r.week_number
            });
            
            window.utils.logAudit("WEEKLY_REPORT_REVIEWED", "reports", `Report ${id} decision: ${decision} by ${user.name} (${user.role})`);
            window.utils.showToast("Review decision saved successfully!", "success");
            
            const subViewport = document.getElementById("weekly-reports-sub-viewport");
            if (subViewport) {
                subViewport.innerHTML = this.renderWeeklySubTabContent();
            }
            return true;
        });
    }

    reviewUserWeeklyPlan(id, decision) {
        const user = window.auth.getCurrentUser();
        if (user.role !== 'super_admin' && user.role !== 'deputy_md') {
            window.utils.showToast("Permission Denied: Supervisor review actions are restricted to Management (Super Admin/DMD).", "error");
            return;
        }

        const p = window.db.get("user_weekly_plans").find(x => x.id === id);
        if (!p) return;
        const emp = window.db.get("users").find(x => x.id === p.user_id);
        const employeeName = emp ? emp.name : 'Unknown';
        
        const formHTML = `
            <div class="form-group mb-3">
                <p class="text-xs text-muted mb-2">Reviewing Weekly Plan for <strong>${employeeName}</strong> (Week ${p.week_number})</p>
                <label class="form-label block text-xs mb-1">${window.t('supervisor_comments')}</label>
                <textarea id="m-rev-plan-comm" class="form-input btn-full" style="height: 60px;" placeholder="Add comments/feedback..."></textarea>
            </div>
        `;
        
        const title = decision === 'approved' ? window.t('approve_report') : 
                      decision === 'Need Revision' ? window.t('request_revision') : window.t('reject_report');
                      
        this.openModal(title, formHTML, () => {
            const comments = document.getElementById("m-rev-plan-comm").value;
            
            window.db.update("user_weekly_plans", id, {
                status: decision,
                comments: comments,
                reviewed_by: user.name,
                reviewed_by_name: user.name,
                reviewed_by_id: user.id,
                reviewed_by_role: user.role,
                reviewed_at: new Date().toISOString(),
                plan_ref: p.id,
                report_plan_ref: p.id,
                employee_name: employeeName,
                week_number: p.week_number
            });
            
            window.utils.logAudit("WEEKLY_PLAN_REVIEWED", "reports", `Plan ${id} decision: ${decision} by ${user.name} (${user.role})`);
            window.utils.showToast("Review decision saved successfully!", "success");
            
            const subViewport = document.getElementById("weekly-reports-sub-viewport");
            if (subViewport) {
                subViewport.innerHTML = this.renderWeeklySubTabContent();
            }
            return true;
        });
    }

    generateTimelineHTML(reports) {
        if (reports.length === 0) {
            return `
                <div class="card p-5 text-center">
                    <span style="font-size: 32px;">▤</span>
                    <p class="text-muted mt-2">No data found. Please add new record or reset demo data.</p>
                </div>
            `;
        }

        return reports.map(r => {
            const p = window.db.get("projects").find(x => x.id === r.project_id);
            const user = window.db.get("users").find(x => x.id === r.created_by);
            return `
                <div class="card p-4 mb-3 border-l-primary hover-lift">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <strong class="block text-primary">${p ? window.t(p.name) : window.t('unknown_project')}</strong>
                                    <h4 class="text-bold mt-1 cursor-pointer text-primary" onclick="window.ui.openWeeklyReportDetailsModal('${r.id}')" title="Click to view details and responsibility tracking">${window.t('week_num')} ${r.week_number} ${window.t('weekly_report')} (${r.date_range})</h4>
                        </div>
                        <span class="badge badge-completed">${r.progress_percent}% ${window.t('progress')}</span>
                    </div>
                    <div class="grid-2 gap-4 text-xs mt-3 py-2 border-t">
                        <div>
                            <strong>${window.t('works_done')}:</strong>
                            <p class="text-muted mt-1">${window.t(r.work_completed)}</p>
                        </div>
                        <div>
                            <strong>${window.t('works_planned')}:</strong>
                            <p class="text-muted mt-1">${window.t(r.work_planned)}</p>
                        </div>
                    </div>
                    <div class="text-xxs text-muted mt-3 flex justify-between items-center">
                        <span>${window.t('personnel') || 'Personnel'}: ${r.manpower} | ${window.t('status')}: ${window.t('ok_status') || 'OK'}</span>
                        <span>${window.t('logged_by') || 'Logged by'}: ${user ? user.name : window.t('unknown')}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterWeeklyReports() {
        const pId = document.getElementById("weekly-filter-project").value;
        let reports = window.db.get("weekly_reports");
        if (pId !== "all") {
            reports = reports.filter(r => r.project_id === pId);
        }
        document.getElementById("weekly-timeline-viewport").innerHTML = this.generateTimelineHTML(reports);
    }

    /* ==========================================================
       TASKS PAGE RENDERER (PORTFOLIO WIDE)
       ========================================================== */
    renderTasksPage(container) {
        const tasks = window.db.get("tasks").filter(t => !t.deleted);
        const projects = window.db.get("projects");
        const currentUser = window.auth.getCurrentUser();

        let addBtnHTML = "";
        if (currentUser.role === "project_manager" || currentUser.role === "engineer" || currentUser.role === "super_admin") {
            addBtnHTML = `
                <button class="btn btn-primary" onclick="window.ui.openAddTaskModal()">
                    + ${window.t('create_task') || 'Add New Task / Milestone'}
                </button>
            `;
        }

        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div class="form-controls flex gap-2">
                    <select id="task-filter-project" class="form-select" onchange="window.ui.filterTasksGlobal()">
                        <option value="all">${window.t('all_projects') || 'All Projects'}</option>
                        ${projects.map(p => `<option value="${p.id}">${window.t(p.name)}</option>`).join('')}
                    </select>
                    <select id="task-filter-status" class="form-select" onchange="window.ui.filterTasksGlobal()">
                        <option value="all">${window.t('filter_all_status')}</option>
                        <option value="not_started">${window.t('not_started')}</option>
                        <option value="in_progress">${window.t('in_progress')}</option>
                        <option value="waiting">${window.t('waiting')}</option>
                        <option value="completed">${window.t('completed')}</option>
                    </select>
                </div>
                ${addBtnHTML}
            </div>

            <div id="tasks-list-viewport" class="grid-3">
                ${this.generateTasksGridHTML(tasks)}
            </div>
        `;
    }

    generateTasksGridHTML(tasks) {
        if (tasks.length === 0) {
            return `
                <div class="card p-5 text-center col-span-3">
                    <span style="font-size: 36px;">▤</span>
                    <p class="text-muted mt-2">No data found. Please add new record or reset demo data.</p>
                </div>
            `;
        }

        return tasks.map(t => {
            const p = window.db.get("projects").find(x => x.id === t.project_id);
            const user = window.db.get("users").find(x => x.id === t.assigned_to);
            return `
                <div class="card p-4 hover-lift flex-col justify-between">
                    <div>
                        <div class="flex justify-between mb-2">
                            <span class="badge badge-${t.priority === 'urgent' || t.priority === 'high' ? 'delayed' : 'planning'}">${window.t(t.priority).toUpperCase()}</span>
                            <span class="badge badge-${t.status}">${window.t(t.status).toUpperCase().replace('_', ' ')}</span>
                        </div>
                        <h4 class="text-bold block text-dark cursor-pointer text-primary" onclick="window.ui.openTaskDetailsModal('${t.id}')">${window.t(t.title)}</h4>
                        <span class="text-xxs text-muted block mb-3">${window.t('projects')}: ${p ? window.t(p.name) : 'N/A'}</span>
                        <p class="text-xs text-muted mb-4">${window.t(t.description).substring(0, 80)}...</p>
                    </div>

                    <div>
                        <div class="flex justify-between items-center text-xs py-1 border-t mb-2">
                            <span class="text-muted">${window.t('assigned_emp')}:</span>
                            <strong>${user ? user.name : (window.t('unassigned') || 'Unassigned')}</strong>
                        </div>
                        <div class="flex justify-between items-center text-xs py-1 mb-3">
                            <span class="text-muted">${window.t('due_date')}:</span>
                            <strong class="font-mono">${window.utils.formatDate(t.due_date)}</strong>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-track">
                                <div class="progress-bar-fill ${window.utils.getProgressColorClass(t.progress_percent)}" style="width: ${t.progress_percent}%;"></div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-xs btn-full mt-3" onclick="window.ui.openTaskDetailsModal('${t.id}')">${window.t('view_comment')}</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterTasksGlobal() {
        const pId = document.getElementById("task-filter-project").value;
        const status = document.getElementById("task-filter-status").value;
        let tasks = window.db.get("tasks").filter(t => !t.deleted);

        if (pId !== "all") {
            tasks = tasks.filter(t => t.project_id === pId);
        }
        if (status !== "all") {
            tasks = tasks.filter(t => t.status === status);
        }

        document.getElementById("tasks-list-viewport").innerHTML = this.generateTasksGridHTML(tasks);
    }

    /* ==========================================================
       FINANCE MONITORING COMPONENT (GLOBAL FINANCIALS)
       ========================================================== */
    renderFinancePage(container) {
        const user = window.auth.getCurrentUser();
        const stats = window.db.getGlobalFinanceSummary(user);
        const records = window.db.get("finance_records");
        
        container.innerHTML = `
            <div class="grid-3 mb-4">
                <div class="card stat-card">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('contract_value')}</span>
                        <h3 class="stat-value text-primary">${window.db.formatCurrency(stats.totalContractValUSD, 'USD')}</h3>
                    </div>
                </div>
                <div class="card stat-card">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('total_expenses')}</span>
                        <h3 class="stat-value text-error">${window.db.formatCurrency(stats.totalExpenseUSD, 'USD')}</h3>
                    </div>
                </div>
                ${window.auth.hasPermission('view_profit') ? `
                <div class="card stat-card">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('est_profit')}</span>
                        <h3 class="stat-value text-success">${window.db.formatCurrency(stats.estimatedProfitUSD, 'USD')}</h3>
                    </div>
                </div>
                ` : ''}
            </div>

            <div class="card p-4 mb-4">
                <h3 class="card-title mb-4">${window.t('expense_breakdown')}</h3>
                <div class="expense-breakdown-details flex-col gap-3" style="max-width: 600px; margin: 0 auto;">
                    ${this.generateExpenseBreakdownBarsHTML(records)}
                </div>
            </div>

            <div class="card p-4">
                <h3 class="card-title mb-3">${window.t('unified_ledger') || 'Portfolio Unified Transaction Ledger'}</h3>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>${window.t('txn_id')}</th>
                                <th>${window.t('project_name')}</th>
                                <th>${window.t('type')}</th>
                                <th>${window.t('category')}</th>
                                <th>${window.t('description')}</th>
                                <th>${window.t('invoice_no')}</th>
                                <th>${window.t('status')}</th>
                                <th class="text-right">${window.t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.length === 0 ? `<tr><td colspan="8" class="text-center text-muted p-4">No data found. Please add new record or reset demo data.</td></tr>` :
                            records.map(r => {
                                const project = window.db.get("projects").find(x => x.id === r.project_id);
                                return `
                                    <tr style="cursor: pointer;" onclick="window.ui.openFinanceDetailsModal('${r.id}')" title="Click to view responsibility details">
                                    <td class="font-mono text-xs text-primary">${r.id}</td>
                                        <td class="text-bold text-xs">${project ? window.t(project.name) : window.t('unknown')}</td>
                                        <td><span class="badge badge-${r.type === 'income' ? 'completed' : 'delayed'}">${window.t(r.type).toUpperCase()}</span></td>
                                        <td>${window.t(r.category).toUpperCase()}</td>
                                        <td class="text-xs">${window.t(r.description)}</td>
                                        <td class="font-mono text-xs">${r.invoice_number || 'N/A'}</td>
                                        <td><span class="badge badge-${r.payment_status}">${window.t(r.payment_status).toUpperCase()}</span></td>
                                        <td class="text-right text-bold ${r.type === 'income' ? 'text-success' : 'text-error'}">
                                            ${r.type === 'income' ? '+' : '-'}${window.db.formatCurrency(r.amount, r.currency)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /* ==========================================================
       PAYMENT REQUESTS & APPROVALS QUEUE
       ========================================================== */
    renderPaymentRequestsPage(container) {
        const user = window.auth.getCurrentUser();
        let requests = window.db.get("payment_requests").filter(r => !r.deleted);
        if (user.role === 'project_manager') {
            const myProjectIds = window.db.get("projects").filter(p => p.pm_id === user.id).map(p => p.id);
            requests = requests.filter(r => myProjectIds.includes(r.project_id));
        } else if (user.role === 'engineer') {
            const myProjectIds = window.db.get("projects").filter(p => p.procurement_engineer_id === user.id || p.team.includes(user.id)).map(p => p.id);
            requests = requests.filter(r => myProjectIds.includes(r.project_id));
        }

        let requestBtnHTML = "";
        if (window.auth.hasPermission("create_payment_request")) {
            requestBtnHTML = `
                <button class="btn btn-primary" onclick="window.ui.openCreatePaymentRequestModal()">+ ${window.t('create_payment')}</button>
            `;
        }

        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 class="card-title">${window.t('requests_history')}</h3>
                ${requestBtnHTML}
            </div>

            <!-- DEPUTY MD THRESHOLD ALERT BANNER -->
            ${user.role === 'deputy_md' ? `
                <div class="alert-bar alert-warning mb-4 no-print">
                    <div class="alert-bar-inner">
                                <span>ℹ</span>
                        <div>
                            <strong>${window.t('deputy_md')} Limits</strong>: You have authorization to approve requests <strong>below $50,000 USD</strong>.
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Project</th>
                            <th>Request Type</th>
                            <th>Requested By</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Approved By</th>
                            <th>Comments</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${requests.length === 0 ? `
                            <tr><td colspan="9" class="text-center p-4 text-muted">No data found. Please add new record or reset demo data.</td></tr>
                        ` : requests.map(r => {
                            const project = window.db.get("projects").find(x => x.id === r.project_id);
                            const requester = window.db.get("users").find(x => x.id === r.requested_by);
                            const approver = window.db.get("users").find(x => x.id === r.approved_by);

                            const isCreator = r.requested_by === user.id || r.created_by === user.id;
                            const isBeforeApproval = r.status === "pending" || r.status === "submitted" || r.status === "draft";
                            let deleteBtnHTML = "";
                            if (isCreator && isBeforeApproval) {
                                deleteBtnHTML = `<button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); window.ui.deletePaymentRequest('${r.id}')">${window.t('delete')}</button>`;
                            }

                            let actionsHTML = "-";
                            const canApprove = window.auth.hasPermission("approve_payment_request", r);
                            if (canApprove && (r.status === "pending" || r.status === "submitted")) {
                                actionsHTML = `
                                    <div class="flex gap-1 justify-end">
                                        <button class="btn btn-xs btn-success" onclick="event.stopPropagation(); window.ui.processApproval('${r.id}', 'approved')">${window.t('approve')}</button>
                                        <button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); window.ui.processApproval('${r.id}', 'rejected')">${window.t('reject')}</button>
                                        ${deleteBtnHTML}
                                    </div>
                                `;
                            } else if (user.role === "finance_manager" && r.status === "approved") {
                                actionsHTML = `
                                    <div class="flex gap-1 justify-end">
                                        <button class="btn btn-xs btn-primary" onclick="event.stopPropagation(); window.ui.processPayment('${r.id}')">${window.t('pay')}</button>
                                        ${deleteBtnHTML}
                                    </div>
                                `;
                            } else if (deleteBtnHTML) {
                                actionsHTML = deleteBtnHTML;
                            }

                            return `
                                <tr style="cursor: pointer;" onclick="window.ui.openPaymentRequestDetailsModal('${r.id}')" title="Click to view responsibility details">
                                    <td class="font-mono text-xs text-primary">${r.id}</td>
                                    <td class="text-xs text-bold">${project ? window.t(project.name) : window.t('unknown')}</td>
                                    <td class="text-xs text-bold">${window.t(r.type).toUpperCase()}</td>
                                    <td class="text-xs">${requester ? requester.name : 'N/A'}</td>
                                    <td class="text-bold text-primary text-xs">${window.db.formatCurrency(r.amount, r.currency)}</td>
                                    <td><span class="badge badge-${r.status}">${window.t(r.status).toUpperCase()}</span></td>
                                    <td class="text-xs">${approver ? approver.name : 'N/A'}</td>
                                    <td class="text-xs text-muted" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        ${window.t(r.approval_comment) || '-'}
                                    </td>
                                    <td class="text-right" onclick="event.stopPropagation();">${actionsHTML}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /* ==========================================================
       EMPLOYEE ALLOWANCE AND BONUS COMPONENT
       ========================================================== */
    renderAllowanceBonusPage(container) {
        const user = window.auth.getCurrentUser();
        let records = window.db.get("allowance_bonus").filter(r => !r.deleted);
        if (user.role === 'engineer') {
            records = records.filter(r => r.employee_id === user.id);
        } else if (user.role === 'viewer') {
            records = [];
        }

        let addClaimBtnHTML = `
            <button class="btn btn-primary" onclick="window.ui.openAllowanceModal()">+ ${window.t('submit_claim')}</button>
        `;

        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 class="card-title">${window.t('allowance_logs')}</h3>
                ${addClaimBtnHTML}
            </div>

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Claim ID</th>
                            <th>Employee Name</th>
                            <th>Project Reference</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Approved By</th>
                            <th>Status</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr><td colspan="10" class="text-center p-4 text-muted">No data found. Please add new record or reset demo data.</td></tr>
                        ` : records.map(r => {
                            const emp = window.db.get("users").find(x => x.id === r.employee_id);
                            const p = window.db.get("projects").find(x => x.id === r.project_id);
                            const approver = window.db.get("users").find(x => x.id === r.approved_by);

                            const isAllCreator = r.employee_id === user.id || r.created_by === user.id;
                            const isAllBeforeApproval = r.status === "pending";
                            let deleteAllBtnHTML = "";
                            if (isAllCreator && isAllBeforeApproval) {
                                deleteAllBtnHTML = `<button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); window.ui.deleteAllowanceClaim('${r.id}')">${window.t('delete')}</button>`;
                            }

                            let actionBtnHTML = "-";
                            if (window.auth.hasPermission("approve_allowance_bonus") && r.status === "pending") {
                                actionBtnHTML = `
                                    <div class="flex gap-1 justify-end">
                                        <button class="btn btn-xs btn-success" onclick="event.stopPropagation(); window.ui.processAllowanceApproval('${r.id}', 'approved')">${window.t('approve')}</button>
                                        <button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); window.ui.processAllowanceApproval('${r.id}', 'rejected')">${window.t('reject')}</button>
                                        ${deleteAllBtnHTML}
                                    </div>
                                `;
                            } else if (r.status === "approved" && user.role === "finance_manager") {
                                actionBtnHTML = `
                                    <div class="flex gap-1 justify-end">
                                        <button class="btn btn-xs btn-primary" onclick="event.stopPropagation(); window.ui.processAllowanceDisburse('${r.id}')">${window.t('pay')}</button>
                                        ${deleteAllBtnHTML}
                                    </div>
                                `;
                            } else if (deleteAllBtnHTML) {
                                actionBtnHTML = deleteAllBtnHTML;
                            }

                            return `
                                <tr style="cursor: pointer;" onclick="window.ui.openAllowanceDetailsModal('${r.id}')" title="Click to view responsibility details">
                                    <td class="font-mono text-xs text-primary">${r.id}</td>
                                    <td class="text-xs text-bold">${emp ? emp.name : window.t('unknown')}</td>
                                    <td class="text-xs">${p ? window.t(p.name) : window.t('general_office')}</td>
                                    <td class="text-xs text-bold">${window.t(r.type).toUpperCase()}</td>
                                    <td class="text-xs">${window.t(r.reason)}</td>
                                    <td class="font-mono text-xs">${window.utils.formatDate(r.date)}</td>
                                    <td class="text-bold text-xs">${window.db.formatCurrency(r.amount, r.currency)}</td>
                                    <td class="text-xs">${approver ? approver.name : '-'}</td>
                                    <td><span class="badge badge-${r.status}">${window.t(r.status).toUpperCase()}</span></td>
                                    <td class="text-right" onclick="event.stopPropagation();">${actionBtnHTML}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /* ==========================================================
       PROCUREMENT LEDGER MODULE VIEWS (100% TRANSLATED!)
       ========================================================== */
    renderProcurementPage(container) {
        // Embed Lanxang Power Engineering print header placeholder
        container.innerHTML = `
            <div class="print-header no-screen" style="display:none;">
                <h2>${window.t('company_name')}</h2>
            </div>
            
            <div class="details-tab-bar card mb-4 p-1 flex gap-2 no-print">
                <button class="tab-link active" onclick="window.ui.toggleProcurementSubTab(event, 'procurement_dashboard')">${window.t('procurement_dashboard')}</button>
                <button class="tab-link" onclick="window.ui.toggleProcurementSubTab(event, 'purchase_requests')">${window.t('purchase_requests')}</button>
                <button class="tab-link" onclick="window.ui.toggleProcurementSubTab(event, 'supplier_quotations')">${window.t('supplier_quotations')}</button>
                <button class="tab-link" onclick="window.ui.toggleProcurementSubTab(event, 'po_tracking')">${window.t('po_tracking')}</button>
                <button class="tab-link" onclick="window.ui.toggleProcurementSubTab(event, 'delivery_status')">${window.t('delivery_status')}</button>
            </div>

            <div id="procurement-sub-viewport">
                ${this.generateProcurementDashboardHTML()}
            </div>
        `;
    }

    /* 1. Procurement Dashboard view */
    generateProcurementDashboardHTML() {
        const user = window.auth.getCurrentUser();
        const stats = window.db.getGlobalFinanceSummary(user);
        let records = window.db.get("procurement_records");
        let projects = window.db.get("projects");

        if (user.role === 'project_manager') {
            projects = projects.filter(p => p.pm_id === user.id);
            records = records.filter(r => projects.some(p => p.id === r.project_id));
        }

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('procurement_requirements_submitted')}</span>
                        <h3 class="stat-value text-dark">${stats.procRequirementsSubmitted}</h3>
                    </div>
                </div>
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('requirements_waiting_procurement_review')}</span>
                        <h3 class="stat-value text-warning">${stats.procWaitingReview}</h3>
                    </div>
                </div>
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('requirements_needing_technical_clarification')}</span>
                        <h3 class="stat-value text-danger">${stats.procNeedingClarification}</h3>
                    </div>
                </div>
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('procurement_plans_waiting_budget_check')}</span>
                        <h3 class="stat-value text-primary">${stats.procWaitingBudgetCheck}</h3>
                    </div>
                </div>
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('procurement_plans_waiting_dmd_approval')}</span>
                        <h3 class="stat-value text-warning">${stats.procWaitingDMD}</h3>
                    </div>
                </div>
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('procurement_plans_waiting_super_admin_approval')}</span>
                        <h3 class="stat-value text-warning">${stats.procWaitingSuperAdmin}</h3>
                    </div>
                </div>
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('po_issued_count')}</span>
                        <h3 class="stat-value text-success">${stats.procPOIssued}</h3>
                    </div>
                </div>
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('delivered_items_count')}</span>
                        <h3 class="stat-value text-info">${stats.procDelivered}</h3>
                    </div>
                </div>
                <div class="card stat-card" style="margin-bottom:0;">
                    <div class="stat-data">
                        <span class="stat-label">${window.t('overdue_delivery_items_count')}</span>
                        <h3 class="stat-value text-danger">${stats.procOverdueDelivery}</h3>
                    </div>
                </div>
            </div>

            <div class="card p-4 mb-4">
                <h3 class="card-title mb-4">${window.t('proc_cost')} (${window.t('ground_usd')})</h3>
                <div class="expense-breakdown-details flex-col gap-3">
                    ${projects.map(p => {
                        const projectProcurements = records.filter(r => r.project_id === p.id && (r.po_status === 'approved' || r.po_status === 'ordered' || r.po_status === 'shipped' || r.po_status === 'delivered'));
                        const sum = projectProcurements.reduce((acc, curr) => acc + window.db.convertToUSD(curr.quotation_amount || 0, curr.currency), 0);
                        const percent = stats.procurementCostUSD > 0 ? ((sum / stats.procurementCostUSD) * 100).toFixed(0) : 0;
                        return `
                            <div>
                                <div class="flex justify-between text-xs mb-1">
                                    <strong>${window.t(p.name)}</strong>
                                    <span class="text-muted">${window.db.formatCurrency(sum, 'USD')} (${percent}%)</span>
                                </div>
                                <div class="progress-bar-track">
                                    <div class="progress-bar-fill progress-mid" style="width: ${percent}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderPurchaseRequestsSubTab(viewport) {
        const user = window.auth.getCurrentUser();
        const records = this.getFilteredProcurementRecords();
        
        let prBtn = "";
        // Check if user is PM of any project or has PE role
        const projects = window.db.get("projects");
        const isPM = user.role === 'project_manager';
        const isPE = projects.some(p => p.procurement_engineer_id === user.id);
        const canCreate = user.role === 'super_admin' || isPM || isPE;
        
        if (canCreate) {
            prBtn = `
                <button class="btn btn-primary btn-sm" onclick="window.ui.openCreatePRModal()">+ ${window.t('create_requirement')}</button>
            `;
        }

        viewport.innerHTML = `
            <div class="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h3 class="card-title">${window.t('purchase_requests')}</h3>
                ${prBtn}
            </div>

            ${this.generateProcurementFiltersHTML()}

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('pr_number')}</th>
                            <th>${window.t('project_name')}</th>
                            <th>${window.t('equipment_material_name')}</th>
                            <th>${window.t('specification')}</th>
                            <th>${window.t('qty')}</th>
                            <th>${window.t('required_date')}</th>
                            <th>${window.t('pm_label')}</th>
                            <th>${window.t('procurement_engineer')}</th>
                            <th>${window.t('procurement_responsible')}</th>
                            <th>${window.t('current_status')}</th>
                            <th class="text-right no-print">${window.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `<tr><td colspan="11" class="text-center text-muted p-4">No data found. Please add new record or reset demo data.</td></tr>` : 
                        records.map(r => {
                            const p = window.db.get("projects").find(x => x.id === r.project_id);
                            const picUser = window.db.get("users").find(x => x.id === r.procurement_pic);
                            const pmUser = p ? window.db.get("users").find(x => x.id === p.pm_id) : null;
                            const peUser = p ? window.db.get("users").find(x => x.id === p.procurement_engineer_id) : null;
                            
                            let actionBtn = "";
                            const canSubmit = window.auth.canActionProcurement(r, "submit");
                            const canEdit = window.auth.hasPermission("edit_procurement", r);
                            
                            if (canSubmit) {
                                actionBtn += `<button class="btn btn-xs btn-primary mr-1" onclick="window.ui.submitPRRequirement('${r.id}')">${window.t('submit_to_proc')}</button>`;
                            }
                            if (canEdit && (r.approval_status === 'Draft' || r.approval_status === 'Need Technical Clarification')) {
                                    actionBtn += `<button class="btn btn-xs btn-secondary mr-1" onclick="window.ui.openCreatePRModal('${r.id}')">${window.t('edit')}</button>`;
                            }
                            
                            // Prep plan button
                            if (r.approval_status === 'Submitted to Procurement Team' && (user.role === 'procurement' || user.role === 'super_admin')) {
                                actionBtn += `<button class="btn btn-xs btn-warning mr-1" onclick="window.ui.openPreparePlanModal('${r.id}')">${window.t('prepare_plan')}</button>`;
                            }
                            
                            actionBtn += `<button class="btn btn-xs btn-info" onclick="window.ui.openProcurementDetailsModal('${r.id}')">${window.t('view')}</button>`;

                            return `
                                <tr>
                                    <td class="font-mono text-xs text-bold">${r.pr_number}</td>
                                    <td class="text-xs">${p ? window.t(p.name) : 'N/A'}</td>
                                    <td class="text-xs text-bold">${r.material_name}</td>
                                    <td class="text-xs">${r.specification || '-'}</td>
                                    <td class="font-mono text-xs">${r.quantity} ${r.unit}</td>
                                    <td class="font-mono text-xs">${window.utils.formatDate(r.required_date)}</td>
                                    <td class="text-xs">${pmUser ? pmUser.name : '-'}</td>
                                    <td class="text-xs">${peUser ? peUser.name : '-'}</td>
                                    <td class="text-xs font-bold">${picUser ? picUser.name : '-'}</td>
                                    <td><span class="badge badge-${r.approval_status.toLowerCase().replace(/ /g, '_')}">${window.t(r.approval_status.toLowerCase().replace(/ /g, '_')).toUpperCase()}</span></td>
                                    <td class="text-right no-print" style="white-space: nowrap;">${actionBtn}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    submitPRRequirement(id) {
        const record = window.db.get("procurement_records").find(x => x.id === id);
        if (!record) return;
        
        const currentUser = window.auth.getCurrentUser();
        const prevStatus = record.approval_status;
        const newStatus = "Submitted to Procurement Team";
        
        const history = record.approval_history || [];
        history.push({
            action_type: "submit",
            action_by: currentUser.name,
            role: currentUser.role,
            date: new Date().toISOString(),
            comment: "Submitted to procurement planning team",
            prev_status: prevStatus,
            new_status: newStatus
        });

        window.db.update("procurement_records", id, {
            approval_status: newStatus,
            approval_history: history
        });

        window.utils.logAudit("PR_SUBMITTED", "procurement", `Requirement ${record.pr_number} submitted to procurement team.`);
        window.utils.showToast("Requirement submitted to Procurement team!", "success");
        
        const viewport = document.getElementById("procurement-sub-viewport");
        if (viewport) {
            this.renderPurchaseRequestsSubTab(viewport);
        }
    }

    openPreparePlanModal(id) {
        const record = window.db.get("procurement_records").find(x => x.id === id);
        if (!record) return;

        const users = window.db.get("users").filter(u => u.status === 'active');
        const defaultPIC = window.auth.getCurrentUser().id;

        const formHTML = `
            <div class="form-group mb-3">
                <p class="text-xs text-muted mb-2">Preparing Plan for: <strong>${record.material_name}</strong> (Qty: ${record.quantity} ${record.unit})</p>
                <label class="form-label block text-xs mb-1">${window.t('procurement_responsible')}</label>
                <select id="m-plan-pic" class="form-select btn-full">
                    ${users.filter(u => u.role === 'procurement' || u.role === 'super_admin').map(u => `<option value="${u.id}" ${u.id === (record.procurement_pic || defaultPIC) ? 'selected' : ''}>${u.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('buyer_officer') || 'Buyer / Purchasing Officer'}</label>
                <select id="m-plan-buyer" class="form-select btn-full">
                    ${users.filter(u => u.role === 'procurement' || u.role === 'super_admin').map(u => `<option value="${u.id}" ${u.id === (record.buyer || defaultPIC) ? 'selected' : ''}>${u.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid-3 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('plan_date')}</label>
                    <input type="date" id="m-plan-date" class="form-input btn-full" value="${record.plan_date || new Date().toISOString().slice(0,10)}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('supplier')}</label>
                    <input type="text" id="m-plan-supp" class="form-input btn-full" placeholder="e.g. ABB Laos" value="${record.supplier_name || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('quotation_status')}</label>
                    <select id="m-plan-qstat" class="form-select btn-full">
                        <option value="Quotation in Progress" ${record.approval_status === 'Quotation in Progress' ? 'selected' : ''}>Quotation in Progress</option>
                        <option value="Waiting Finance Budget Check">Ready for Budget Check</option>
                        <option value="Need Technical Clarification">Need Technical Clarification</option>
                    </select>
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('quote_amount')}</label>
                    <input type="number" id="m-plan-amt" class="form-input btn-full" value="${record.quotation_amount || record.estimated_budget}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('currency')}</label>
                    <select id="m-plan-curr" class="form-select btn-full">
                        <option value="USD" ${record.currency === 'USD' ? 'selected' : ''}>USD</option>
                        <option value="LAK" ${record.currency === 'LAK' ? 'selected' : ''}>LAK</option>
                        <option value="THB" ${record.currency === 'THB' ? 'selected' : ''}>THB</option>
                        <option value="CNY" ${record.currency === 'CNY' ? 'selected' : ''}>CNY</option>
                    </select>
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('documents')} (Quote Reference)</label>
                <input type="text" id="m-plan-doc" class="form-input btn-full" placeholder="Quotation_ABB_Signed.pdf" value="${record.attachment || ''}">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('remarks')}</label>
                <input type="text" id="m-plan-rem" class="form-input btn-full" value="${record.remarks || ''}">
            </div>
        `;

        this.openModal(window.t('prepare_plan'), formHTML, () => {
            const pic = document.getElementById("m-plan-pic").value;
            const buyer = document.getElementById("m-plan-buyer").value;
            const planDate = document.getElementById("m-plan-date").value;
            const supplier = document.getElementById("m-plan-supp").value;
            const qstat = document.getElementById("m-plan-qstat").value;
            const amt = Number(document.getElementById("m-plan-amt").value);
            const curr = document.getElementById("m-plan-curr").value;
            const doc = document.getElementById("m-plan-doc").value;
            const remarks = document.getElementById("m-plan-rem").value;

            if (!planDate) {
                window.utils.showToast(window.t('all_fields_required'), "error");
                return false;
            }

            const currentUser = window.auth.getCurrentUser();
            const prevStatus = record.approval_status;
            let targetStatus = qstat;
            let actionType = "review";

            if (qstat === "Waiting Finance Budget Check") {
                actionType = "submit";
            } else if (qstat === "Need Technical Clarification") {
                actionType = "request_revision";
            }

            const history = record.approval_history || [];
            history.push({
                action_type: actionType,
                action_by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString(),
                comment: `Procurement plan updated. Supplier: ${supplier || 'None'}. Amount: ${window.db.formatCurrency(amt, curr)}. Status set to: ${targetStatus}`,
                prev_status: prevStatus,
                new_status: targetStatus
            });

            window.db.update("procurement_records", record.id, {
                procurement_pic: pic,
                buyer: buyer,
                plan_date: planDate,
                supplier_name: supplier,
                quotation_amount: amt,
                currency: curr,
                attachment: doc,
                remarks: remarks,
                po_status: qstat === "Waiting Finance Budget Check" ? "quotation_received" : "requested",
                approval_status: targetStatus,
                approval_history: history
            });

            window.utils.logAudit("PLAN_PREPARED", "procurement", `Procurement plan prepared for PR ${record.pr_number}. Status: ${targetStatus}`);
            window.utils.showToast("Procurement plan updated successfully!", "success");
            
            const viewport = document.getElementById("procurement-sub-viewport");
            if (viewport) {
                this.renderPurchaseRequestsSubTab(viewport);
            }
            return true;
        });
    }

    /* 3. Supplier Quotations */
    renderSupplierQuotationsSubTab(viewport) {
        const user = window.auth.getCurrentUser();
        let records = this.getFilteredProcurementRecords();
        // Only show items that have transitioned past Draft and Submitted
        const filtered = records.filter(r => r.approval_status !== 'Draft' && r.approval_status !== 'Submitted to Procurement Team');

        viewport.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('supplier_quotations')}</h3>
            </div>

            ${this.generateProcurementFiltersHTML()}

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('quotation_number') || 'Quote No'}</th>
                            <th>${window.t('pr_number')}</th>
                            <th>${window.t('project_name')}</th>
                            <th>${window.t('supplier')}</th>
                            <th>${window.t('amount')}</th>
                            <th>${window.t('currency')}</th>
                            <th>${window.t('quotation_date') || 'Quote Date'}</th>
                            <th>${window.t('compared_by') || 'PIC / Buyer'}</th>
                            <th>${window.t('attachment')}</th>
                            <th>${window.t('current_status')}</th>
                            <th class="text-right no-print">${window.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.length === 0 ? `<tr><td colspan="11" class="text-center text-muted p-4">No data found. Please add new record or reset demo data.</td></tr>` : 
                        filtered.map(r => {
                            const p = window.db.get("projects").find(x => x.id === r.project_id);
                            const comparedBy = window.db.get("users").find(x => x.id === r.buyer || x.id === r.procurement_pic);
                            const quoteNo = `QT-${r.pr_number.substring(3)}-${r.id.substring(4, 8)}`;
                            const quoteDate = r.plan_date || r.updated_at.slice(0, 10);
                            
                            let actionBtn = "";
                            if ((user.role === 'procurement' || user.role === 'super_admin') && (r.approval_status === 'Under Procurement Review' || r.approval_status === 'Quotation in Progress' || r.approval_status === 'Need Technical Clarification')) {
                                actionBtn += `<button class="btn btn-xs btn-primary mr-1" onclick="window.ui.openPreparePlanModal('${r.id}')">${window.t('collect_quotation')}</button>`;
                            }
                            actionBtn += `<button class="btn btn-xs btn-info" onclick="window.ui.openProcurementDetailsModal('${r.id}')">${window.t('view')}</button>`;

                            return `
                                <tr>
                                    <td class="font-mono text-xs text-bold">${quoteNo}</td>
                                    <td class="font-mono text-xs">${r.pr_number}</td>
                                    <td class="text-xs">${p ? window.t(p.name) : 'N/A'}</td>
                                    <td class="text-xs">${r.supplier_name || 'N/A'}</td>
                                    <td class="font-mono text-xs text-bold text-primary">
                                        ${Number(r.quotation_amount).toLocaleString()}
                                    </td>
                                    <td class="text-xs font-mono font-bold">${r.currency}</td>
                                    <td class="font-mono text-xs">${window.utils.formatDate(quoteDate)}</td>
                                    <td class="text-xs font-bold">${comparedBy ? comparedBy.name : '-'}</td>
                                    <td class="text-xs font-mono">${r.attachment ? `? ${r.attachment}` : '-'}</td>
                                    <td><span class="badge badge-${r.approval_status.toLowerCase().replace(/ /g, '_')}">${window.t(r.approval_status.toLowerCase().replace(/ /g, '_')).toUpperCase()}</span></td>
                                    <td class="text-right no-print" style="white-space: nowrap;">${actionBtn}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /* 4. PO Tracking Subtab */
    renderPOTrackingSubTab(viewport) {
        const user = window.auth.getCurrentUser();
        const records = this.getFilteredProcurementRecords();
        // Show plans waiting budget check, waiting DMD, waiting Super Admin, Approved, PO Issued, Ordered, Delivered, Closed
        const allowedStatuses = [
            "Waiting Finance Budget Check",
            "Waiting DMD Approval",
            "Waiting Super Admin Approval",
            "Approved",
            "PO Issued",
            "Ordered",
            "Delivered",
            "Closed",
            "Rejected"
        ];
        const filtered = records.filter(r => allowedStatuses.includes(r.approval_status));

        viewport.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('po_tracking')}</h3>
            </div>

            <!-- DEPUTY MD THRESHOLD ALERT BANNER -->
            ${user.role === 'deputy_md' ? `
                <div class="alert-bar alert-warning mb-3 no-print">
                    <div class="alert-bar-inner">
                        <span>ℹ</span>
                        <div>
                            <strong>${window.t('deputy_md')} Limits</strong>: You have authorization to approve procurement POs <strong>below $50,000 USD</strong>.
                        </div>
                    </div>
                </div>
            ` : ''}

            ${this.generateProcurementFiltersHTML()}

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('po_number_label')}</th>
                            <th>${window.t('pr_number')}</th>
                            <th>${window.t('project_name')}</th>
                            <th>${window.t('supplier')}</th>
                            <th>${window.t('amount')}</th>
                            <th>${window.t('currency')}</th>
                            <th>${window.t('approved_by')}</th>
                            <th>${window.t('current_status')}</th>
                            <th class="text-right no-print">${window.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.length === 0 ? `<tr><td colspan="9" class="text-center text-muted p-4">No data found. Please add new record or reset demo data.</td></tr>` : 
                        filtered.map(r => {
                            const p = window.db.get("projects").find(x => x.id === r.project_id);
                            
                            let approverName = "-";
                            if (r.approved_by) {
                                const ap = window.db.get("users").find(x => x.id === r.approved_by);
                                approverName = ap ? ap.name : r.approved_by;
                            } else {
                                const approvedLog = (r.approval_history || []).find(h => h.action_type === 'approve');
                                if (approvedLog) approverName = approvedLog.action_by;
                            }
                            
                            let actionBtn = "";
                            const canBudgetCheck = window.auth.canActionProcurement(r, "budget_check");
                            const canDMDDecide = r.approval_status === 'Waiting DMD Approval' && (user.role === 'deputy_md' || user.role === 'super_admin');
                            const canSADecide = r.approval_status === 'Waiting Super Admin Approval' && user.role === 'super_admin';
                            const canIssuePO = window.auth.canActionProcurement(r, "issue_po");
                            
                            if (canBudgetCheck) {
                                actionBtn += `<button class="btn btn-xs btn-primary mr-1" onclick="window.ui.openFinanceBudgetCheckModal('${r.id}')">${window.t('budget_check')}</button>`;
                            }
                            if (canDMDDecide) {
                                actionBtn += `
                                    <button class="btn btn-xs btn-success mr-1" onclick="window.ui.openApprovalDecisionModal('${r.id}', 'Approved')">${window.t('approve')}</button>
                                    <button class="btn btn-xs btn-danger mr-1" onclick="window.ui.openApprovalDecisionModal('${r.id}', 'Rejected')">${window.t('reject')}</button>
                                    <button class="btn btn-xs btn-warning mr-1" onclick="window.ui.openApprovalDecisionModal('${r.id}', 'Need Technical Clarification')">Clarify</button>
                                `;
                            }
                            if (canSADecide) {
                                actionBtn += `
                                    <button class="btn btn-xs btn-success mr-1" onclick="window.ui.openApprovalDecisionModal('${r.id}', 'Approved')">${window.t('approve')}</button>
                                    <button class="btn btn-xs btn-danger mr-1" onclick="window.ui.openApprovalDecisionModal('${r.id}', 'Rejected')">${window.t('reject')}</button>
                                    <button class="btn btn-xs btn-warning mr-1" onclick="window.ui.openApprovalDecisionModal('${r.id}', 'Need Technical Clarification')">Clarify</button>
                                `;
                            }
                            if (canIssuePO) {
                                actionBtn += `<button class="btn btn-xs btn-primary mr-1" onclick="window.ui.openPOIssueModal('${r.id}')">${window.t('issue_po')}</button>`;
                            }
                            actionBtn += `<button class="btn btn-xs btn-info" onclick="window.ui.openProcurementDetailsModal('${r.id}')">${window.t('view')}</button>`;

                            return `
                                <tr>
                                    <td class="font-mono text-xs text-bold">${r.po_number || `<span class="text-muted">Awaiting PO</span>`}</td>
                                    <td class="font-mono text-xs">${r.pr_number}</td>
                                    <td class="text-xs">${p ? window.t(p.name) : 'N/A'}</td>
                                    <td class="text-xs">${r.supplier_name || 'N/A'}</td>
                                    <td class="font-mono text-xs text-bold text-primary">${Number(r.quotation_amount).toLocaleString()}</td>
                                    <td class="font-mono text-xs font-bold">${r.currency}</td>
                                    <td class="text-xs font-bold">${approverName}</td>
                                    <td><span class="badge badge-${r.approval_status.toLowerCase().replace(/ /g, '_')}">${window.t(r.approval_status.toLowerCase().replace(/ /g, '_')).toUpperCase()}</span></td>
                                    <td class="text-right no-print" style="white-space: nowrap;">${actionBtn}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    openFinanceBudgetCheckModal(id) {
        const record = window.db.get("procurement_records").find(x => x.id === id);
        if (!record) return;

        const formHTML = `
            <div class="form-group mb-3">
                <p class="text-xs text-muted mb-2">Verifying budget availability for PR: <strong>${record.pr_number}</strong></p>
                <p class="text-xs mb-2">Quote Amount: <strong>${window.db.formatCurrency(record.quotation_amount, record.currency)}</strong></p>
                <label class="form-label block text-xs mb-1">${window.t('approval_comment')}</label>
                <textarea id="m-fin-comment" class="form-input btn-full" style="height: 60px;" placeholder="Verify budget and add commentary..."></textarea>
            </div>
        `;

        this.openModal(window.t('budget_check'), formHTML, () => {
            const comment = document.getElementById("m-fin-comment").value;
            const currentUser = window.auth.getCurrentUser();
            
            const prevStatus = record.approval_status;
            const nextStatus = "Waiting DMD Approval"; // DMD always reviews first
            
            const history = record.approval_history || [];
            history.push({
                action_type: "budget_check",
                action_by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString(),
                comment: `Finance budget check completed. Comments: ${comment}`,
                prev_status: prevStatus,
                new_status: nextStatus
            });

            window.db.update("procurement_records", id, {
                approval_status: nextStatus,
                approval_history: history
            });

            window.utils.logAudit("PO_BUDGET_VERIFIED", "finance", `Finance budget verified for PR ${record.pr_number}. Moved to: ${nextStatus}`);
            window.utils.showToast("Budget checked and submitted for DMD approval!", "success");
            
            const viewport = document.getElementById("procurement-sub-viewport");
            if (viewport) {
                this.renderPOTrackingSubTab(viewport);
            }
            return true;
        });
    }

    openApprovalDecisionModal(id, decision) {
        const record = window.db.get("procurement_records").find(x => x.id === id);
        if (!record) return;

        const formHTML = `
            <div class="form-group mb-3">
                <p class="text-xs text-muted mb-2">Make approval decision for: <strong>${record.pr_number}</strong></p>
                <p class="text-xs mb-2">Quotation: <strong>${record.supplier_name}</strong> - <strong>${window.db.formatCurrency(record.quotation_amount, record.currency)}</strong></p>
                <label class="form-label block text-xs mb-1">${window.t('approval_comment')}</label>
                <textarea id="m-app-comment" class="form-input btn-full" style="height: 60px;" placeholder="Add comments..."></textarea>
            </div>
        `;

        const titleText = decision === 'Approved' ? window.t('approve') : (decision === 'Rejected' ? window.t('reject') : 'Request Revision');

        this.openModal(titleText, formHTML, () => {
            const comment = document.getElementById("m-app-comment").value;
            const currentUser = window.auth.getCurrentUser();
            const prevStatus = record.approval_status;

            let targetStatus = decision;
            let actionType = decision === 'Approved' ? 'approve' : (decision === 'Rejected' ? 'reject' : 'request_revision');

            // Gate: Deputy MD cannot approve if amount > 50,000 USD
            if (decision === "Approved" && currentUser.role === 'deputy_md') {
                const limitCheck = window.auth.isWithinApprovalLimit(record.quotation_amount, record.currency);
                if (!limitCheck) {
                    // Forwards to Super Admin Approval
                    targetStatus = "Waiting Super Admin Approval";
                    actionType = "approve"; // Recommends and forwards
                    window.utils.showToast("Amount exceeds limit. Forwarding to Super Admin approval.", "info");
                }
            }

            const history = record.approval_history || [];
            history.push({
                action_type: actionType,
                action_by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString(),
                comment: `Decision: ${targetStatus}. Comments: ${comment}`,
                prev_status: prevStatus,
                new_status: targetStatus
            });

            window.db.update("procurement_records", id, {
                approval_status: targetStatus,
                approval_history: history,
                approved_by: (targetStatus === "Approved") ? currentUser.id : record.approved_by
            });

            window.utils.logAudit("PROCUREMENT_DECISION", "procurement", `PR ${record.pr_number} decision: ${targetStatus}`);
            window.utils.showToast(`Procurement plan status changed to: ${targetStatus}!`, "success");
            
            const viewport = document.getElementById("procurement-sub-viewport");
            if (viewport) {
                this.renderPOTrackingSubTab(viewport);
            }
            return true;
        });
    }

    openPOIssueModal(id) {
        const record = window.db.get("procurement_records").find(x => x.id === id);
        if (!record) return;

        const defaultPO = "PO-LXP-2026-" + Date.now().toString().substring(9);
        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('po_number_label')}</label>
                <input type="text" id="m-po-num" class="form-input btn-full" value="${defaultPO}">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('supplier_name_label') || 'Supplier'}</label>
                <input type="text" id="m-po-supp" class="form-input btn-full" value="${record.supplier_name}" readonly style="background-color:#f1f5f9;">
            </div>
        `;

        this.openModal(window.t('issue_po'), formHTML, () => {
            const poNum = document.getElementById("m-po-num").value;
            if (!poNum) {
                window.utils.showToast(window.t('all_fields_required'), "error");
                return false;
            }

            const currentUser = window.auth.getCurrentUser();
            const prevStatus = record.approval_status;
            const nextStatus = "PO Issued";

            const history = record.approval_history || [];
            history.push({
                action_type: "po_issued",
                action_by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString(),
                comment: `PO generated: ${poNum}. Plan moved to PO Issued.`,
                prev_status: prevStatus,
                new_status: nextStatus
            });

            window.db.update("procurement_records", id, {
                po_number: poNum,
                po_status: "ordered",
                delivery_status: "in_transit",
                approval_status: nextStatus,
                approval_history: history
            });

            window.utils.logAudit("PO_ISSUED", "procurement", `Issued PO ${poNum} for PR ${record.pr_number}`);
            window.utils.showToast("Purchase Order successfully generated!", "success");
            
            const viewport = document.getElementById("procurement-sub-viewport");
            if (viewport) {
                this.renderPOTrackingSubTab(viewport);
            }
            return true;
        });
    }

    /* 5. Delivery Status */
    renderDeliveryStatusSubTab(viewport) {
        const user = window.auth.getCurrentUser();
        const records = this.getFilteredProcurementRecords();
        const allowedStatuses = ["PO Issued", "Ordered", "Delivered", "Closed"];
        const filtered = records.filter(r => allowedStatuses.includes(r.approval_status));

        viewport.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="card-title">${window.t('delivery_status')}</h3>
            </div>

            ${this.generateProcurementFiltersHTML()}

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('material_item')}</th>
                            <th>${window.t('project_name')}</th>
                            <th>${window.t('supplier')}</th>
                            <th>${window.t('expected_delivery_date') || 'Expected Date'}</th>
                            <th>${window.t('actual_delivery_date') || 'Actual Date'}</th>
                            <th>${window.t('delivery_status')}</th>
                            <th>${window.t('received_by') || 'Received By'}</th>
                            <th>${window.t('current_status')}</th>
                            <th class="text-right no-print">${window.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.length === 0 ? `<tr><td colspan="9" class="text-center text-muted p-4">No data found. Please add new record or reset demo data.</td></tr>` : 
                        filtered.map(r => {
                            const p = window.db.get("projects").find(x => x.id === r.project_id);
                            
                            let actualDate = "-";
                            let receiverName = "-";
                            const deliveryLog = (r.approval_history || []).find(h => h.new_status === 'Delivered');
                            if (deliveryLog) {
                                actualDate = window.utils.formatDate(deliveryLog.date);
                                receiverName = deliveryLog.action_by;
                            }

                            let actionBtn = "";
                            const canUpdateDelivery = window.auth.canActionProcurement(r, "update_delivery");
                            const canDisburse = window.auth.canActionProcurement(r, "disburse_payment");
                            
                            if (canUpdateDelivery) {
                                actionBtn += `<button class="btn btn-xs btn-primary mr-1" onclick="window.ui.openDeliveryUpdateModal('${r.id}')">${window.t('update_delivery')}</button>`;
                            } else if (canDisburse) {
                                actionBtn += `<button class="btn btn-xs btn-success mr-1" onclick="window.ui.disburseProcurementPayment('${r.id}')">${window.t('disburse_payment')}</button>`;
                            }
                            actionBtn += `<button class="btn btn-xs btn-info" onclick="window.ui.openProcurementDetailsModal('${r.id}')">${window.t('view')}</button>`;

                            return `
                                <tr>
                                    <td class="text-xs text-bold">${r.material_name}</td>
                                    <td class="text-xs">${p ? window.t(p.name) : 'N/A'}</td>
                                    <td class="text-xs">${r.supplier_name || 'N/A'}</td>
                                    <td class="font-mono text-xs">${window.utils.formatDate(r.required_date)}</td>
                                    <td class="font-mono text-xs">${actualDate}</td>
                                    <td><span class="badge badge-${r.delivery_status}">${window.t(r.delivery_status).toUpperCase()}</span></td>
                                    <td class="text-xs font-bold">${receiverName}</td>
                                    <td><span class="badge badge-${r.approval_status.toLowerCase().replace(/ /g, '_')}">${window.t(r.approval_status.toLowerCase().replace(/ /g, '_')).toUpperCase()}</span></td>
                                    <td class="text-right no-print" style="white-space: nowrap;">${actionBtn}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    openDeliveryUpdateModal(id) {
        const record = window.db.get("procurement_records").find(x => x.id === id);
        if (!record) return;

        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('delivery_status')}</label>
                <select id="m-del-status" class="form-select btn-full">
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="delayed">Delayed</option>
                    <option value="overdue">Overdue</option>
                </select>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('remarks')}</label>
                <input type="text" id="m-del-remarks" class="form-input btn-full" placeholder="e.g. Cleared customs port">
            </div>
        `;

        this.openModal(window.t('update_delivery'), formHTML, () => {
            const delStat = document.getElementById("m-del-status").value;
            const remarks = document.getElementById("m-del-remarks").value;
            const currentUser = window.auth.getCurrentUser();

            const isDelivered = delStat === "delivered";
            const prevStatus = record.approval_status;
            // Transition status to Delivered if fully received
            const targetApprovalStatus = isDelivered ? "Delivered" : "Ordered";

            const history = record.approval_history || [];
            history.push({
                action_type: "review",
                action_by: currentUser.name,
                role: currentUser.role,
                date: new Date().toISOString(),
                comment: `Logistics delivery updated to: ${delStat.toUpperCase()}. Remarks: ${remarks}`,
                prev_status: prevStatus,
                new_status: targetApprovalStatus
            });

            window.db.update("procurement_records", id, {
                delivery_status: delStat,
                approval_status: targetApprovalStatus,
                remarks: remarks,
                approval_history: history,
                po_status: isDelivered ? "delivered" : "ordered"
            });

            window.utils.logAudit("DELIVERY_UPDATED", "procurement", `Logistics delivery status for PR ${record.pr_number} updated to: ${delStat}`);
            window.utils.showToast("Delivery status updated successfully!", "success");
            
            const viewport = document.getElementById("procurement-sub-viewport");
            if (viewport) {
                this.renderDeliveryStatusSubTab(viewport);
            }
            return true;
        });
    }

    disburseProcurementPayment(id) {
        const record = window.db.get("procurement_records").find(x => x.id === id);
        if (!record) return;

        const confirmPayment = confirm(window.t('confirm_payment') || "Are you sure you want to disburse payment for this equipment and Close the plan?");
        if (!confirmPayment) return;

        const currentUser = window.auth.getCurrentUser();
        const prevStatus = record.approval_status;
        const nextStatus = "Closed";
        const history = record.approval_history || [];
        
        history.push({
            action_type: "delivered",
            action_by: currentUser.name,
            role: currentUser.role,
            date: new Date().toISOString(),
            comment: "Final payment processed by Finance. Plan closed.",
            prev_status: prevStatus,
            new_status: nextStatus
        });

        // 1. Update procurement record
        window.db.update("procurement_records", id, {
            approval_status: nextStatus,
            po_status: "closed",
            approval_history: history
        });

        // 2. Add ledger entry to finance records
        window.db.add("finance_records", {
            project_id: record.project_id,
            type: "expense",
            category: "material",
            amount: record.quotation_amount,
            currency: record.currency,
            invoice_number: record.po_number || `PO-${record.id}`,
            payment_date: new Date().toISOString().substring(0, 10),
            payment_status: "paid",
            attachment: record.attachment || "",
            description: `${window.t('mat_delivered')}: ${record.material_name} (${record.supplier_name})`
        });

        // 3. Recalculate project totals
        window.db.recalculateProjectFinancials(record.project_id);
        
        window.utils.logAudit("PROCUREMENT_CLOSED_PAYMENT", "finance", `Processed disburse payment and closed plan for ${record.pr_number}`);
        window.utils.showToast("Payment disbursed and procurement plan closed!", "success");
        
        const viewport = document.getElementById("procurement-sub-viewport");
        if (viewport) {
            this.renderDeliveryStatusSubTab(viewport);
        }
    }

    openProcurementDetailsModal(id) {
        const record = window.db.get("procurement_records").find(x => x.id === id);
        if (!record) return;

        const p = window.db.get("projects").find(x => x.id === record.project_id);
        const reqUser = window.db.get("users").find(x => x.id === record.requested_by);
        const picUser = window.db.get("users").find(x => x.id === record.procurement_pic);
        const pmUser = p ? window.db.get("users").find(x => x.id === p.pm_id) : null;
        const peUser = p ? window.db.get("users").find(x => x.id === p.procurement_engineer_id) : null;

        const history = record.approval_history || [];

        const bodyHTML = `
            <div class="grid-2 gap-4 mb-4" style="text-align: left; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <h4 class="font-bold border-b pb-1 mb-2 text-primary" style="margin-top:0;">PR Information</h4>
                    <table class="table border-none font-xs" style="width:100%;">
                        <tr><td class="text-bold text-muted" width="120">PR Number:</td><td><strong>${record.pr_number}</strong></td></tr>
                        <tr><td class="text-bold text-muted">Project Name:</td><td>${p ? window.t(p.name) : '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Project Code:</td><td>${p ? p.code : '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Project Manager:</td><td>${pmUser ? pmUser.name : '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Procurement Eng:</td><td>${peUser ? peUser.name : '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Submitted By:</td><td>${reqUser ? reqUser.name : '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Category:</td><td>${window.t(record.category).toUpperCase()}</td></tr>
                        <tr><td class="text-bold text-muted">Priority:</td><td><span class="badge badge-${record.priority}">${window.t(record.priority).toUpperCase()}</span></td></tr>
                    </table>
                </div>
                <div>
                    <h4 class="font-bold border-b pb-1 mb-2 text-primary" style="margin-top:0;">Procurement Plan & Quotation</h4>
                    <table class="table border-none font-xs" style="width:100%;">
                        <tr><td class="text-bold text-muted" width="120">Responsible PIC:</td><td>${picUser ? picUser.name : '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Equipment Name:</td><td><strong>${record.material_name}</strong></td></tr>
                        <tr><td class="text-bold text-muted">Specification:</td><td>${record.specification || '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Quantity:</td><td>${record.quantity} ${record.unit}</td></tr>
                        <tr><td class="text-bold text-muted">Est. Budget:</td><td>${window.db.formatCurrency(record.estimated_budget, record.currency)}</td></tr>
                        <tr><td class="text-bold text-muted">Quoted Amount:</td><td>${record.quotation_amount ? window.db.formatCurrency(record.quotation_amount, record.currency) : '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Supplier:</td><td>${record.supplier_name || '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Required Date:</td><td>${window.utils.formatDate(record.required_date)}</td></tr>
                        <tr><td class="text-bold text-muted">Location:</td><td>${record.delivery_location || '-'}</td></tr>
                        <tr><td class="text-bold text-muted">Reason/BoQ:</td><td>${record.reason || ''} / ${record.drawing_boq || ''}</td></tr>
                    </table>
                </div>
            </div>

            <div class="mb-4" style="text-align: left;">
                <h4 class="font-bold border-b pb-1 mb-2 text-primary">PO & Delivery Tracker</h4>
                <div class="grid-2 gap-4" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <table class="table border-none font-xs" style="width:100%;">
                        <tr><td class="text-bold text-muted" width="120">PO Number:</td><td><strong>${record.po_number || '-'}</strong></td></tr>
                        <tr><td class="text-bold text-muted">PO Status:</td><td><span class="badge badge-${record.po_status}">${record.po_status.toUpperCase()}</span></td></tr>
                    </table>
                    <table class="table border-none font-xs" style="width:100%;">
                        <tr><td class="text-bold text-muted" width="120">Delivery Status:</td><td><span class="badge badge-${record.delivery_status}">${record.delivery_status.toUpperCase()}</span></td></tr>
                        <tr><td class="text-bold text-muted">Remarks:</td><td>${record.remarks || '-'}</td></tr>
                    </table>
                </div>
            </div>

            <div class="mb-4" style="text-align: left;">
                <h4 class="font-bold border-b pb-1 mb-2 text-primary">Approval & Workflow History</h4>
                <div class="timeline-logs" style="max-height: 180px; overflow-y: auto; padding: 10px; border: 1px solid rgba(0,0,0,0.08); border-radius:6px; background:#f8fafc;">
                    ${history.length === 0 ? `<p class="text-muted text-center py-2">${window.t('no_history_logged')}</p>` : 
                    history.map(h => `
                        <div class="timeline-item mb-2 pb-2" style="border-bottom: 1px solid rgba(0,0,0,0.05); font-size:11px;">
                            <div class="flex justify-between items-center mb-1">
                                <span class="badge badge-${(h.action_type || 'submit').toLowerCase()}" style="font-size: 8px; padding: 2px 6px;">${(h.action_type || 'ACTION').toUpperCase()}</span>
                                <span class="text-xxs text-light">${window.utils.formatDate(h.date)}</span>
                            </div>
                            <div class="text-slate-700"><strong>${h.action_by}</strong> (${window.t(h.role).toUpperCase()}) changed status from <strong class="text-muted">${window.t(h.prev_status ? h.prev_status.toLowerCase().replace(/ /g, '_') : 'draft').toUpperCase()}</strong> to <strong class="text-primary">${window.t(h.new_status ? h.new_status.toLowerCase().replace(/ /g, '_') : 'draft').toUpperCase()}</strong></div>
                            ${h.comment ? `<p class="text-muted mt-1" style="font-style: italic; margin-left: 10px;">Comment: "${h.comment}"</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${this.generateAuditTrackingHTML(record)}
        `;

        this.openModal(`PR Details - ${record.pr_number}`, bodyHTML, () => {
            return true;
        });

        // Hide standard submit button since this is details view
        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.style.display = "none";
    }
    updateProjectMetaInfo() {
        const projSelect = document.getElementById("m-prc-proj");
        if (!projSelect) return;
        const projId = projSelect.value;
        const project = window.db.get("projects").find(p => p.id === projId);
        if (project) {
            const pm = window.db.get("users").find(u => u.id === project.pm_id);
            const pe = window.db.get("users").find(u => u.id === project.procurement_engineer_id);
            const pic = window.db.get("users").find(u => u.id === project.procurement_pic_id);
            
            const codeEl = document.getElementById("m-prc-code");
            const pmEl = document.getElementById("m-prc-pm");
            const peEl = document.getElementById("m-prc-pe");
            const picEl = document.getElementById("m-prc-pic");
            const locEl = document.getElementById("m-prc-loc");
            
            if (codeEl) codeEl.value = project.code || '';
            if (pmEl) pmEl.value = pm ? pm.name : 'N/A';
            if (peEl) peEl.value = pe ? pe.name : 'N/A';
            if (picEl) picEl.value = pic ? pic.name : 'N/A';
            if (locEl && !locEl.value) {
                locEl.value = project.location || '';
            }
        }
    }

    openCreatePRModal(recordId = null) {
        const user = window.auth.getCurrentUser();
        const projects = window.db.get("projects").filter(p => {
            return user.role === 'super_admin' || p.pm_id === user.id || p.procurement_engineer_id === user.id;
        });

        if (projects.length === 0) {
            window.utils.showToast("You are not assigned to any projects as PM or PE.", "error");
            return;
        }

        let record = null;
        if (recordId) {
            record = window.db.get("procurement_records").find(r => r.id === recordId);
        }

        const categories = ["transformer", "switchgear", "relay", "cable", "conductor", "steel_structure", "solar_equipment", "civil_material", "tools", "other"];

        const formHTML = `
            <div class="grid-2 gap-3 mb-3" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('project_ref')}</label>
                    <select id="m-prc-proj" class="form-select btn-full" onchange="window.ui.updateProjectMetaInfo()">
                        ${projects.map(p => `<option value="${p.id}" ${record && record.project_id === p.id ? 'selected' : ''}>${window.t(p.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('project_code') || 'Project Code'}</label>
                    <input type="text" id="m-prc-code" class="form-input btn-full bg-slate-100" readonly style="background-color: #f1f5f9;">
                </div>
            </div>

            <div class="grid-3 gap-3 mb-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('pm_label') || 'Project Manager'}</label>
                    <input type="text" id="m-prc-pm" class="form-input btn-full bg-slate-100" readonly style="background-color: #f1f5f9;">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('procurement_engineer') || 'Proc Engineer'}</label>
                    <input type="text" id="m-prc-pe" class="form-input btn-full bg-slate-100" readonly style="background-color: #f1f5f9;">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('procurement_responsible') || 'Proc PIC'}</label>
                    <input type="text" id="m-prc-pic" class="form-input btn-full bg-slate-100" readonly style="background-color: #f1f5f9;">
                </div>
            </div>

            <div class="grid-2 gap-3 mb-3" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('material_name')}</label>
                    <input type="text" id="m-prc-name" class="form-input btn-full" value="${record ? record.material_name : ''}" placeholder="${window.t('ph_pr_item')}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('category')}</label>
                    <select id="m-prc-cat" class="form-select btn-full">
                        ${categories.map(c => `<option value="${c}" ${record && record.category === c ? 'selected' : ''}>${window.t(c).toUpperCase()}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('specification')}</label>
                <input type="text" id="m-prc-spec" class="form-input btn-full" value="${record ? record.specification || '' : ''}" placeholder="${window.t('ph_pr_spec')}">
            </div>

            <div class="grid-3 gap-3 mb-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('quantity')}</label>
                    <input type="number" id="m-prc-qty" class="form-input btn-full" value="${record ? record.quantity : 1}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('unit')}</label>
                    <input type="text" id="m-prc-unit" class="form-input btn-full" value="${record ? record.unit : 'pcs'}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('required_delivery_date')}</label>
                    <input type="date" id="m-prc-date" class="form-input btn-full" value="${record ? record.required_date : ''}">
                </div>
            </div>

            <div class="grid-3 gap-3 mb-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('delivery_location') || 'Delivery Location'}</label>
                    <input type="text" id="m-prc-loc" class="form-input btn-full" value="${record ? record.delivery_location || '' : ''}" placeholder="e.g. Nabong Substation Site">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('estimated_budget')}</label>
                    <input type="number" id="m-prc-budget" class="form-input btn-full" value="${record ? record.estimated_budget : 0}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('currency')}</label>
                    <select id="m-prc-curr" class="form-select btn-full">
                        <option value="USD" ${record && record.currency === 'USD' ? 'selected' : ''}>USD</option>
                        <option value="LAK" ${record && record.currency === 'LAK' ? 'selected' : ''}>LAK</option>
                        <option value="THB" ${record && record.currency === 'THB' ? 'selected' : ''}>THB</option>
                        <option value="CNY" ${record && record.currency === 'CNY' ? 'selected' : ''}>CNY</option>
                    </select>
                </div>
            </div>

            <div class="grid-2 gap-3 mb-3" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('priority')}</label>
                    <select id="m-prc-priority" class="form-select btn-full">
                        <option value="normal" ${record && record.priority === 'normal' ? 'selected' : ''}>${window.t('normal') || 'Normal'}</option>
                        <option value="low" ${record && record.priority === 'low' ? 'selected' : ''}>${window.t('low') || 'Low'}</option>
                        <option value="high" ${record && record.priority === 'high' ? 'selected' : ''}>${window.t('high') || 'High'}</option>
                        <option value="urgent" ${record && record.priority === 'urgent' ? 'selected' : ''}>${window.t('urgent') || 'Urgent'}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('drawing_boq') || 'Drawing / BOQ Ref'}</label>
                    <input type="text" id="m-prc-drawing" class="form-input btn-full" value="${record ? record.drawing_boq || '' : ''}" placeholder="e.g. DWG-NAB-001">
                </div>
            </div>

            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('reason') || 'Reason for Purchasing'}</label>
                <textarea id="m-prc-reason" class="form-input btn-full" style="height:50px;" placeholder="Describe usage / need...">${record ? record.reason || '' : ''}</textarea>
            </div>

            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('remarks')}</label>
                <input type="text" id="m-prc-rem" class="form-input btn-full" value="${record ? record.remarks || '' : ''}" placeholder="${window.t('ph_pr_remarks')}">
            </div>
        `;

        const modalTitle = recordId ? `${window.t('edit_requirement') || 'Edit Requirement'}` : `${window.t('create_requirement') || 'Create Requirement'}`;

        this.openModal(modalTitle, formHTML, () => {
            const projId = document.getElementById("m-prc-proj").value;
            const cat = document.getElementById("m-prc-cat").value;
            const priority = document.getElementById("m-prc-priority").value;
            const name = document.getElementById("m-prc-name").value;
            const spec = document.getElementById("m-prc-spec").value;
            const qty = Number(document.getElementById("m-prc-qty").value);
            const unit = document.getElementById("m-prc-unit").value;
            const date = document.getElementById("m-prc-date").value;
            const budget = Number(document.getElementById("m-prc-budget").value);
            const curr = document.getElementById("m-prc-curr").value;
            const location = document.getElementById("m-prc-loc").value;
            const drawing = document.getElementById("m-prc-drawing").value;
            const reason = document.getElementById("m-prc-reason").value;
            const remarks = document.getElementById("m-prc-rem").value;

            if (!name || !date) {
                window.utils.showToast(window.t('all_fields_required'), "error");
                return false;
            }

            const currentUser = window.auth.getCurrentUser();
            const project = window.db.get("projects").find(p => p.id === projId);

            if (recordId && record) {
                const prevStatus = record.approval_status;
                const newStatus = "Draft"; // resets status to Draft on edit, or retains Need Technical Clarification
                const history = record.approval_history || [];
                history.push({
                    action_type: "review",
                    action_by: currentUser.name,
                    role: currentUser.role,
                    date: new Date().toISOString(),
                    comment: "Requirement details updated by author",
                    prev_status: prevStatus,
                    new_status: newStatus
                });

                window.db.update("procurement_records", recordId, {
                    project_id: projId,
                    category: cat,
                    priority: priority,
                    material_name: name,
                    specification: spec,
                    quantity: qty,
                    unit: unit,
                    required_date: date,
                    estimated_budget: budget,
                    currency: curr,
                    delivery_location: location,
                    drawing_boq: drawing,
                    reason: reason,
                    remarks: remarks,
                    approval_status: newStatus,
                    approval_history: history,
                    updated_at: new Date().toISOString(),
                    updated_by: currentUser.id
                });

                window.utils.logAudit("PR_UPDATED", "procurement", `Updated purchase requirement ${record.pr_number}`);
                window.utils.showToast("Requirement updated successfully!", "success");
            } else {
                const pNum = "PR-LXP-" + Date.now().toString().substring(8);
                window.db.add("procurement_records", {
                    pr_number: pNum,
                    project_id: projId,
                    category: cat,
                    priority: priority,
                    material_name: name,
                    specification: spec,
                    quantity: qty,
                    unit: unit,
                    required_date: date,
                    estimated_budget: budget,
                    currency: curr,
                    delivery_location: location,
                    drawing_boq: drawing,
                    reason: reason,
                    remarks: remarks,
                    requested_by: currentUser.id,
                    created_by: currentUser.id,
                    responsible_person: currentUser.id,
                    procurement_pic: project ? project.procurement_pic_id : '',
                    buyer: project ? project.procurement_pic_id : '',
                    supplier_name: "",
                    quotation_amount: 0,
                    po_number: "",
                    po_status: "requested",
                    delivery_status: "not_shipped",
                    approval_status: "Draft",
                    plan_date: "",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    approval_history: [
                        { action_type: "submit", action_by: currentUser.name, role: currentUser.role, date: new Date().toISOString(), comment: "Requirement initiated as Draft", prev_status: "None", new_status: "Draft" }
                    ]
                });

                window.utils.logAudit("PR_CREATED", "procurement", `Initiated purchase requirement ${pNum}`);
                window.utils.showToast("Procurement requirement logged as Draft!", "success");
            }

            const viewport = document.getElementById("procurement-sub-viewport");
            if (viewport) {
                window.ui.renderPurchaseRequestsSubTab(viewport);
            }
            return true;
        });

        // Initialize values
        this.updateProjectMetaInfo();
    }

    /* ==========================================================
       POPUP MODALS FORM DETAILS & VALIDATIONS HANDLERS
       ========================================================== */
    openModal(title, formHTML, onSubmitCallback) {
        const backdrop = document.getElementById("modal-backdrop-overlay");
        const titleEl = document.getElementById("modal-title-header");
        const bodyEl = document.getElementById("modal-body-form-container");
        const submitBtn = document.getElementById("modal-submit-action-btn");
        
        if (!backdrop || !titleEl || !bodyEl || !submitBtn) return;

        titleEl.textContent = title;
        bodyEl.innerHTML = formHTML;
        
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

        newSubmitBtn.addEventListener("click", () => {
            if (onSubmitCallback()) {
                this.closeModal();
            }
        });

        backdrop.classList.add("modal-active");
    }

    closeModal() {
        const backdrop = document.getElementById("modal-backdrop-overlay");
        if (backdrop) {
            backdrop.classList.remove("modal-active");
        }
        const cancelBtn = document.getElementById("modal-cancel-btn");
        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (cancelBtn) cancelBtn.textContent = window.t('cancel');
        if (submitBtn) {
            submitBtn.textContent = window.t('save');
            submitBtn.style.display = "block"; // Make sure it's shown!
        }
    }

    // Edit user with safe admin locks
    openEditUserModal(id) {
        const u = window.db.get("users").find(x => x.id === id);
        if (!u) return;

        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('employee_name')}</label>
                <input type="text" id="m-u-name" class="form-input btn-full" value="${u.name}">
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('department')}</label>
                    <input type="text" id="m-u-dept" class="form-input btn-full" value="${u.department}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('role_permission')}</label>
                    <select id="m-u-role" class="form-select btn-full">
                        <option value="engineer" ${u.role === 'engineer' ? 'selected' : ''}>${window.t('engineer')}</option>
                        <option value="project_manager" ${u.role === 'project_manager' ? 'selected' : ''}>${window.t('project_manager')}</option>
                        <option value="finance_manager" ${u.role === 'finance_manager' ? 'selected' : ''}>${window.t('finance_manager')}</option>
                        <option value="procurement" ${u.role === 'procurement' ? 'selected' : ''}>${window.t('procurement')}</option>
                        <option value="deputy_md" ${u.role === 'deputy_md' ? 'selected' : ''}>${window.t('deputy_md')}</option>
                        <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>${window.t('super_admin')}</option>
                        <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>${window.t('viewer')}</option>
                    </select>
                </div>
            </div>
        `;

        this.openModal(window.t('modify_user_profile'), formHTML, () => {
            const name = document.getElementById("m-u-name").value;
            const dept = document.getElementById("m-u-dept").value;
            const role = document.getElementById("m-u-role").value;

            if (!name) {
                window.utils.showToast(window.t('name_required'), "error");
                return false;
            }

            if (u.role === "super_admin" && role !== "super_admin" && window.auth.isLastActiveSuperAdmin(id)) {
                alert(window.t('last_admin_warning'));
                window.utils.showToast(window.t('last_admin_warning'), "error");
                return false;
            }

            if (u.role === "super_admin" && role !== "super_admin") {
                if (!confirm(window.t('remove_admin_role_warning'))) {
                    return false;
                }
            }

            window.db.update("users", id, { name, department: dept, role });
            window.utils.logAudit("USER_PROFILE_UPDATED", "admin", `Updated profile ${id}`);
            window.utils.showToast(window.t('user_updated'), "success");
            this.renderActiveView();
            return true;
        });
    }

    openAddProjectModal() {
        const pmUsers = window.db.get("users").filter(u => u.role === "project_manager");
        const peUsers = window.db.get("users").filter(u => u.role === "engineer");

        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('project_code')}</label>
                <input type="text" id="m-p-code" class="form-input btn-full" placeholder="${window.t('ph_p_code')}">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('project_name')}</label>
                <input type="text" id="m-p-name" class="form-input btn-full" placeholder="${window.t('ph_p_name')}">
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('client_owner')}</label>
                    <input type="text" id="m-p-client" class="form-input btn-full" placeholder="${window.t('ph_p_client')}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('location')}</label>
                    <input type="text" id="m-p-location" class="form-input btn-full" placeholder="${window.t('ph_p_location')}">
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('contract_type')}</label>
                    <select id="m-p-type" class="form-select btn-full">
                        <option value="substation">${window.t('substation')}</option>
                        <option value="transmission_line">${window.t('transmission_line')}</option>
                        <option value="solar">${window.t('solar')}</option>
                        <option value="factory">${window.t('factory')}</option>
                        <option value="maintenance">${window.t('maintenance')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('project_status')}</label>
                    <select id="m-p-status" class="form-select btn-full">
                        <option value="planning">${window.t('planning')}</option>
                        <option value="design">${window.t('design')}</option>
                        <option value="procurement">${window.t('procurement_status')}</option>
                        <option value="construction">${window.t('construction')}</option>
                        <option value="testing">${window.t('testing')}</option>
                        <option value="commissioning">${window.t('commissioning')}</option>
                    </select>
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">Project Manager</label>
                    <select id="m-p-pm" class="form-select btn-full">
                        ${pmUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">Procurement Engineer</label>
                    <select id="m-p-pe" class="form-select btn-full">
                        ${peUsers.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid-3 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('contract_value')}</label>
                    <input type="number" id="m-p-val" class="form-input btn-full" placeholder="${window.t('ph_p_val')}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('currency')}</label>
                    <select id="m-p-curr" class="form-select btn-full">
                        <option value="USD">USD</option>
                        <option value="LAK">LAK</option>
                        <option value="THB">THB</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('approved_budget')}</label>
                    <input type="number" id="m-p-budget" class="form-input btn-full" placeholder="${window.t('ph_p_budget')}">
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('planned_start')}</label>
                    <input type="date" id="m-p-start" class="form-input btn-full">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('planned_finish')}</label>
                    <input type="date" id="m-p-finish" class="form-input btn-full">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('scope_description')}</label>
                <textarea id="m-p-desc" class="form-input btn-full" rows="3" placeholder="${window.t('ph_p_desc')}"></textarea>
            </div>
        `;

        this.openModal(window.t('create_epc_project'), formHTML, () => {
            const code = document.getElementById("m-p-code").value;
            const name = document.getElementById("m-p-name").value;
            const client = document.getElementById("m-p-client").value;
            const location = document.getElementById("m-p-location").value;
            const type = document.getElementById("m-p-type").value;
            const status = document.getElementById("m-p-status").value;
            const value = Number(document.getElementById("m-p-val").value);
            const budget = Number(document.getElementById("m-p-budget").value);
            const curr = document.getElementById("m-p-curr").value;
            const start = document.getElementById("m-p-start").value;
            const finish = document.getElementById("m-p-finish").value;
            const desc = document.getElementById("m-p-desc").value;
            const pmId = document.getElementById("m-p-pm").value;
            const peId = document.getElementById("m-p-pe").value;

            if (!code || !name) {
                window.utils.showToast(window.t('project_code_name_required'), "error");
                return false;
            }

            window.db.add("projects", {
                code, name, client, location, type, status,
                contract_value: value, budget, currency: curr,
                start_date: start, planned_finish: finish,
                actual_finish: "", progress_percent: 0,
                pm_id: pmId, procurement_engineer_id: peId, team: [pmId, peId],
                actual_cost: 0, payment_received: 0, payment_pending: value,
                risks: "", description: desc
            });

            window.utils.logAudit("PROJECT_CREATED", "projects", `Created new project code: ${code}`);
            window.utils.showToast(window.t('project_initialized'), "success");
            this.renderActiveView();
            return true;
        });
    }    openEditProjectModal(id) {
        const p = window.db.get("projects").find(x => x.id === id);
        if (!p) return;

        const user = window.auth.getCurrentUser();
        const isSuperAdmin = user.role === "super_admin";
        const disabledAttr = isSuperAdmin ? "" : "disabled";

        const pmUsers = window.db.get("users").filter(u => u.role === "project_manager");
        const peUsers = window.db.get("users").filter(u => u.role === "engineer");

        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('project_name')}</label>
                <input type="text" id="m-p-name" class="form-input btn-full" value="${p.name}">
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('project_status')}</label>
                    <select id="m-p-status" class="form-select btn-full">
                        <option value="planning" ${p.status === 'planning' ? 'selected' : ''}>${window.t('planning')}</option>
                        <option value="design" ${p.status === 'design' ? 'selected' : ''}>${window.t('design')}</option>
                        <option value="procurement" ${p.status === 'procurement' ? 'selected' : ''}>${window.t('procurement_status')}</option>
                        <option value="construction" ${p.status === 'construction' ? 'selected' : ''}>${window.t('construction')}</option>
                        <option value="testing" ${p.status === 'testing' ? 'selected' : ''}>${window.t('testing')}</option>
                        <option value="commissioning" ${p.status === 'commissioning' ? 'selected' : ''}>${window.t('commissioning')}</option>
                        <option value="completed" ${p.status === 'completed' ? 'selected' : ''}>${window.t('completed')}</option>
                        <option value="delayed" ${p.status === 'delayed' ? 'selected' : ''}>${window.t('delayed')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('progress_completed_pct')}</label>
                    <input type="number" id="m-p-prog" class="form-input btn-full" value="${p.progress_percent}">
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">Project Manager</label>
                    <select id="m-p-pm" class="form-select btn-full" ${disabledAttr}>
                        ${pmUsers.map(u => `<option value="${u.id}" ${p.pm_id === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">Procurement Engineer</label>
                    <select id="m-p-pe" class="form-select btn-full" ${disabledAttr}>
                        ${peUsers.map(u => `<option value="${u.id}" ${p.procurement_engineer_id === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('approved_budget')}</label>
                    <input type="number" id="m-p-budget" class="form-input btn-full" value="${p.budget}" ${disabledAttr}>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('severe_risks_blockers')}</label>
                    <input type="text" id="m-p-risks" class="form-input btn-full" value="${p.risks || ''}">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('scope_description')}</label>
                <textarea id="m-p-desc" class="form-input btn-full" rows="3">${p.description || ''}</textarea>
            </div>
        `;

        this.openModal(window.t('modify_epc_project'), formHTML, () => {
            const name = document.getElementById("m-p-name").value;
            const status = document.getElementById("m-p-status").value;
            const progress = Number(document.getElementById("m-p-prog").value);
            const risks = document.getElementById("m-p-risks").value;
            const desc = document.getElementById("m-p-desc").value;

            if (!name) {
                window.utils.showToast(window.t('project_name_required'), "error");
                return false;
            }

            const updateFields = {
                name, status, progress_percent: progress, risks, description: desc
            };

            if (isSuperAdmin) {
                const pmId = document.getElementById("m-p-pm").value;
                const peId = document.getElementById("m-p-pe").value;
                const budget = Number(document.getElementById("m-p-budget").value);
                updateFields.pm_id = pmId;
                updateFields.procurement_engineer_id = peId;
                updateFields.budget = budget;
                updateFields.team = [pmId, peId];
            }

            window.db.update("projects", id, updateFields);

            window.utils.logAudit("PROJECT_UPDATED", "projects", `Updated details for project id: ${id}`);
            window.utils.showToast(window.t('project_spec_updated'), "success");
            this.navigateTo("projects", id);
            return true;
        });
    }



    archiveProject(id) {
        if (confirm(window.t('confirm_delete_project'))) {
            window.db.delete("projects", id);
            window.utils.logAudit("PROJECT_DELETED", "projects", `Project id ${id} removed from database`);
            window.utils.showToast(window.t('project_deleted'), "success");
            this.navigateTo("projects");
        }
    }

    openAddWeeklyReportModal(projectId) {
        const formHTML = `
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('calendar_week_number')}</label>
                    <input type="number" id="m-w-num" class="form-input btn-full" value="22">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('site_manpower_count')}</label>
                    <input type="number" id="m-w-men" class="form-input btn-full" placeholder="${window.t('ph_w_men')}">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('log_date_range')}</label>
                <input type="text" id="m-w-dates" class="form-input btn-full" placeholder="${window.t('ph_w_dates')}">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('works_done')}</label>
                <textarea id="m-w-done" class="form-input btn-full" rows="3" placeholder="${window.t('ph_w_done')}"></textarea>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('works_planned')}</label>
                <textarea id="m-w-plan" class="form-input btn-full" rows="3" placeholder="${window.t('ph_w_plan')}"></textarea>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('accumulated_site_progress')}</label>
                    <input type="number" id="m-w-prog" class="form-input btn-full" value="70">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('materials_status')}</label>
                    <input type="text" id="m-w-mat" class="form-input btn-full" placeholder="${window.t('ph_w_mat')}">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('reported_blockers')}</label>
                <input type="text" id="m-w-issues" class="form-input btn-full" placeholder="${window.t('ph_w_issues')}">
            </div>
        `;

        this.openModal(window.t('submit_weekly_progress_log'), formHTML, () => {
            const num = Number(document.getElementById("m-w-num").value);
            const men = Number(document.getElementById("m-w-men").value);
            const dates = document.getElementById("m-w-dates").value;
            const done = document.getElementById("m-w-done").value;
            const plan = document.getElementById("m-w-plan").value;
            const prog = Number(document.getElementById("m-w-prog").value);
            const mat = document.getElementById("m-w-mat").value;
            const issues = document.getElementById("m-w-issues").value;

            if (!dates || !done) {
                window.utils.showToast(window.t('date_range_completed_required'), "error");
                return false;
            }

            window.db.add("weekly_reports", {
                project_id: projectId, week_number: num, date_range: dates,
                work_completed: done, work_planned: plan, progress_percent: prog,
                manpower: men, materials_status: mat, issues, support_required: "",
                delay_reason: "", photos: [], created_by: window.auth.getCurrentUser().id
            });

            window.db.update("projects", projectId, { progress_percent: prog });

            window.utils.logAudit("WEEKLY_REPORT_SUBMITTED", "projects", `Weekly report week ${num} submitted for project ${projectId}`);
            window.utils.showToast(window.t('weekly_log_saved'), "success");
            this.navigateTo("projects", projectId);
            return true;
        });
    }

    openEditWeeklyReportModal(reportId) {
        const r = window.db.get("weekly_reports").find(x => x.id === reportId);
        if (!r) return;

        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('works_done')}</label>
                <textarea id="m-w-done" class="form-input btn-full" rows="3">${r.work_completed}</textarea>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('works_planned')}</label>
                <textarea id="m-w-plan" class="form-input btn-full" rows="3">${r.work_planned}</textarea>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('accumulated_site_progress')}</label>
                    <input type="number" id="m-w-prog" class="form-input btn-full" value="${r.progress_percent}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('site_manpower_count')}</label>
                    <input type="number" id="m-w-men" class="form-input btn-full" value="${r.manpower}">
                </div>
            </div>
        `;

        this.openModal(window.t('edit_weekly_progress_log'), formHTML, () => {
            const done = document.getElementById("m-w-done").value;
            const plan = document.getElementById("m-w-plan").value;
            const prog = Number(document.getElementById("m-w-prog").value);
            const men = Number(document.getElementById("m-w-men").value);

            if (!done) {
                window.utils.showToast(window.t('weekly_log_completed_required'), "error");
                return false;
            }

            window.db.update("weekly_reports", reportId, {
                work_completed: done, work_planned: plan, progress_percent: prog, manpower: men
            });

            window.db.update("projects", r.project_id, { progress_percent: prog });

            window.utils.logAudit("WEEKLY_REPORT_UPDATED", "projects", `Modified weekly report log: ${reportId}`);
            window.utils.showToast(window.t('weekly_log_updated'), "success");
            this.navigateTo("projects", r.project_id);
            return true;
        });
    }

    openAddTaskModal(projectId = null) {
        const currentUser = window.auth.getCurrentUser();
        const allProjects = window.db.get("projects").filter(p => !p.deleted);
        const teamUsers = window.db.get("users");

        // Filter projects by permission
        const allowedProjects = allProjects.filter(p => window.auth.hasPermission("assign_tasks", p.id));

        if (allowedProjects.length === 0) {
            window.utils.showToast("Permission Denied: You are not assigned to any projects and cannot create tasks.", "error");
            return;
        }

        if (projectId && !window.auth.hasPermission("assign_tasks", projectId)) {
            window.utils.showToast("Permission Denied: You do not have permission to add tasks for this project.", "error");
            return;
        }

        const defaultProjId = projectId || allowedProjects[0].id;
        
        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">Project Name <span class="text-danger">*</span></label>
                <select id="m-t-project" class="form-select btn-full" ${projectId ? 'disabled' : ''}>
                    ${allowedProjects.map(p => `<option value="${p.id}" ${p.id === defaultProjId ? 'selected' : ''}>${window.t(p.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('task_title')} <span class="text-danger">*</span></label>
                <input type="text" id="m-t-title" class="form-input btn-full" placeholder="${window.t('ph_t_title') || 'Enter title'}">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('task_description_guidelines')} <span class="text-danger">*</span></label>
                <textarea id="m-t-desc" class="form-input btn-full" rows="3" placeholder="${window.t('ph_t_desc') || 'Enter description'}"></textarea>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('assigned_emp')} <span class="text-danger">*</span></label>
                    <select id="m-t-user" class="form-select btn-full">
                        ${teamUsers.map(u => `<option value="${u.id}">${u.name} (${window.t(u.role).toUpperCase()})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('priority')}</label>
                    <select id="m-t-priority" class="form-select btn-full">
                        <option value="low">${window.t('low')}</option>
                        <option value="medium" selected>${window.t('medium')}</option>
                        <option value="high">${window.t('high')}</option>
                        <option value="urgent">${window.t('urgent')}</option>
                    </select>
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">Status <span class="text-danger">*</span></label>
                    <select id="m-t-status" class="form-select btn-full">
                        <option value="not_started" selected>${window.t('not_started')}</option>
                        <option value="in_progress">${window.t('in_progress')}</option>
                        <option value="waiting">${window.t('waiting')}</option>
                        <option value="completed">${window.t('completed')}</option>
                        <option value="delayed">${window.t('delayed')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">Progress Percentage (%) <span class="text-danger">*</span></label>
                    <input type="number" id="m-t-progress" class="form-input btn-full" min="0" max="100" value="0">
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('due_date')} <span class="text-danger">*</span></label>
                    <input type="date" id="m-t-due" class="form-input btn-full">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">Supporting Attachment</label>
                    <input type="text" id="m-t-attachment" class="form-input btn-full" placeholder="e.g. specification_doc.pdf">
                </div>
            </div>
        `;

        this.openModal(window.t('establish_project_deliverable') || "Create Task / Milestone", formHTML, () => {
            const selectedProjId = document.getElementById("m-t-project").value;
            const projectObj = window.db.get("projects").find(p => p.id === selectedProjId);
            const selectedProjName = projectObj ? projectObj.name : 'Unknown';

            // Double check permission for selected project
            if (!window.auth.hasPermission("assign_tasks", selectedProjId)) {
                window.utils.showToast("Permission Denied: You do not have permission to add tasks for the selected project.", "error");
                return false;
            }

            const title = document.getElementById("m-t-title").value.trim();
            const desc = document.getElementById("m-t-desc").value.trim();
            const user = document.getElementById("m-t-user").value;
            const priority = document.getElementById("m-t-priority").value;
            const due = document.getElementById("m-t-due").value;
            const status = document.getElementById("m-t-status").value;
            const progress = Number(document.getElementById("m-t-progress").value);
            const attach = document.getElementById("m-t-attachment").value.trim();

            if (!title) {
                window.utils.showToast(window.t('task_title_required') || "Task title is required!", "error");
                return false;
            }
            if (!desc) {
                window.utils.showToast("Task description is required!", "error");
                return false;
            }
            if (!due) {
                window.utils.showToast("Due date is required!", "error");
                return false;
            }
            if (isNaN(progress) || progress < 0 || progress > 100) {
                window.utils.showToast("Progress percentage must be between 0 and 100!", "error");
                return false;
            }

            const attachments = attach ? [attach] : [];

            window.db.add("tasks", {
                project_id: selectedProjId,
                project_name: selectedProjName,
                title,
                description: desc,
                assigned_to: user,
                due_date: due,
                priority,
                status,
                progress_percent: progress,
                attachments,
                created_by: currentUser.id,
                created_by_name: currentUser.name,
                created_at: new Date().toISOString(),
                created_date_time: new Date().toISOString(),
                last_updated_by: currentUser.id,
                last_updated_by_name: currentUser.name,
                last_updated_at: new Date().toISOString(),
                last_updated_date_time: new Date().toISOString()
            });

            window.utils.logAudit("TASK_CREATED", "projects", `Created task: ${title} under project ${selectedProjId}`);
            window.utils.showToast(window.t('milestone_task_created') || "Task/Milestone created successfully!", "success");
            
            if (projectId) {
                this.navigateTo("projects", projectId);
            } else {
                this.renderActiveView();
            }
            return true;
        });
    }

    openTaskDetailsModal(taskId) {
        const t = window.db.get("tasks").find(x => x.id === taskId);
        if (!t) return;

        const assignee = window.db.get("users").find(x => x.id === t.assigned_to);
        const comments = window.db.get("comments").filter(c => c.task_id === taskId);

        const currentUser = window.auth.getCurrentUser();
        const canEdit = window.auth.hasPermission("assign_tasks", t.project_id);
        const disabledAttr = canEdit ? "" : "disabled";

        const formHTML = `
            <div class="card p-3 mb-3 bg-slate-50 text-xs">
                <div class="mb-2"><strong>${window.t('task_description_guidelines')}:</strong> ${window.t(t.description)}</div>
                <div class="grid-2">
                    <div><strong>${window.t('assigned_emp')}:</strong> ${assignee ? assignee.name : 'Unassigned'}</div>
                    <div><strong>${window.t('due_date')}:</strong> ${window.utils.formatDate(t.due_date)}</div>
                </div>
            </div>

            <div class="grid-2 gap-3 mb-4 p-3 border rounded">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('status')}</label>
                    <select id="m-t-status" class="form-select btn-full" ${disabledAttr}>
                        <option value="not_started" ${t.status === 'not_started' ? 'selected' : ''}>${window.t('not_started')}</option>
                        <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>${window.t('in_progress')}</option>
                        <option value="waiting" ${t.status === 'waiting' ? 'selected' : ''}>${window.t('waiting')}</option>
                        <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>${window.t('completed')}</option>
                        <option value="delayed" ${t.status === 'delayed' ? 'selected' : ''}>${window.t('delayed')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('progress')} (%)</label>
                    <input type="number" id="m-t-prog" class="form-input btn-full" value="${t.progress_percent}" min="0" max="100" ${disabledAttr}>
                </div>
            </div>

            <h4 class="card-subtitle mb-2">${window.t('discussion_thread')}</h4>
            <div class="comments-board-list flex-col gap-2 mb-3" style="max-height: 150px; overflow-y: auto;">
                ${comments.length === 0 ? `
                    <p class="text-xs text-muted">No comments logged inside this deliverable.</p>
                ` : comments.map(c => {
                    const cUser = window.db.get("users").find(x => x.id === c.user_id);
                    return `
                        <div class="comment-bubble p-2 bg-slate-100 rounded">
                            <div class="flex justify-between text-xxs mb-1">
                                <strong>${cUser ? cUser.name : 'Unknown'}</strong>
                                <span class="text-muted font-mono">${window.utils.formatDate(c.created_at)}</span>
                            </div>
                            <p class="text-xs">${window.t(c.message)}</p>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="form-group mb-2">
                <input type="text" id="m-t-new-comment" class="form-input btn-full text-xs" placeholder="${window.t('add_comment_placeholder')}" ${disabledAttr}>
            </div>
            ${this.generateAuditTrackingHTML(t)}
        `;

        this.openModal(`${window.t('task_review')}: ${window.t(t.title)}`, formHTML, () => {
            if (!canEdit) return true;
            const status = document.getElementById("m-t-status").value;
            const progress = Number(document.getElementById("m-t-prog").value);
            const commentMsg = document.getElementById("m-t-new-comment").value;

            const currentUser = window.auth.getCurrentUser();
            window.db.update("tasks", taskId, {
                status,
                progress_percent: progress,
                last_updated_by: currentUser.id,
                last_updated_by_name: currentUser.name,
                last_updated_at: new Date().toISOString()
            });

            if (commentMsg.trim() !== "") {
                window.db.add("comments", {
                    task_id: taskId,
                    user_id: currentUser.id,
                    message: commentMsg
                });
            }

            window.utils.logAudit("TASK_MODIFIED", "projects", `Updated task state ${taskId} to ${status} (${progress}%)`);
            window.utils.showToast(window.t('task_comments_compiled'), "success");
            this.renderActiveView();
            return true;
        });

        if (!canEdit) {
            const submitBtn = document.getElementById("modal-submit-action-btn");
            if (submitBtn) submitBtn.style.display = "none";
        }
    }

    openWeeklyReportDetailsModal(reportId) {
        const r = window.db.get("user_weekly_reports").find(x => x.id === reportId) || window.db.get("weekly_reports").find(x => x.id === reportId);
        if (!r) return;
        
        const p = window.db.get("projects").find(x => x.id === r.project_id);
        const formHTML = `
            <div class="card p-3 mb-3 bg-slate-50 text-xs">
                <div class="mb-2"><strong>${window.t('employee_name') || 'Employee'}:</strong> ${r.employee_name || this.getUserNameById(r.created_by)}</div>
                <div class="mb-2"><strong>${window.t('project_name') || 'Project'}:</strong> ${p ? window.t(p.name) : 'N/A'}</div>
                <div class="mb-2"><strong>${window.t('week_number') || 'Week'}:</strong> Week ${r.week_number} (${r.date_range})</div>
                <div class="mb-2"><strong>${window.t('work_completed')}:</strong> ${window.t(r.work_completed)}</div>
                <div class="mb-2"><strong>${window.t('problems_issues') || 'Problems'}:</strong> ${window.t(r.problems || r.issues || '-')}</div>
                <div class="mb-2"><strong>${window.t('support_required')}:</strong> ${window.t(r.support_required || '-')}</div>
                <div class="mb-2"><strong>${window.t('work_plan_next_week')}:</strong> ${window.t(r.work_plan_next_week || r.work_planned || '-')}</div>
                <div class="grid-2">
                    <div><strong>${window.t('progress_percent')}:</strong> ${r.progress_percent}%</div>
                    <div><strong>${window.t('target_next_week') || 'Target Date'}:</strong> ${r.target_next_week ? window.utils.formatDate(r.target_next_week) : '-'}</div>
                </div>
                ${r.comments ? `<div class="mt-2"><strong>Supervisor Comments:</strong> ${r.comments}</div>` : ''}
            </div>
            ${this.generateAuditTrackingHTML(r)}
        `;
        
        this.openModal(`${window.t('weekly_report')} - Week ${r.week_number}`, formHTML, () => {
            return true;
        });
        
        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.style.display = "none";
    }

    openWeeklyPlanDetailsModal(planId) {
        const p = window.db.get("user_weekly_plans").find(x => x.id === planId);
        if (!p) return;
        const employee = window.db.get("users").find(x => x.id === p.user_id);
        const formHTML = `
            <div class="card p-3 mb-3 bg-slate-50 text-xs">
                <div class="mb-2"><strong>Employee Name:</strong> ${employee ? employee.name : 'N/A'}</div>
                <div class="mb-2"><strong>Week Number:</strong> Week ${p.week_number}</div>
                <div class="mb-2"><strong>Tasks Completed This Week:</strong> ${window.t(p.completed_work || p.tasks_this_week)}</div>
                <div class="mb-2"><strong>Problems/Issues:</strong> ${window.t(p.problems || '-')}</div>
                <div class="mb-2"><strong>Next Week Plan:</strong> ${window.t(p.plan_next_week)}</div>
                <div class="mb-2"><strong>Required Support:</strong> ${window.t(p.required_support || '-')}</div>
                <div class="mb-2"><strong>Target Date:</strong> ${window.utils.formatDate(p.target_date)}</div>
                ${p.comments ? `<div class="mt-2"><strong>Supervisor Comments:</strong> ${p.comments}</div>` : ''}
            </div>
            ${this.generateAuditTrackingHTML(p)}
        `;
        this.openModal(`Weekly Plan - Week ${p.week_number}`, formHTML, () => {
            return true;
        });
        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.style.display = "none";
    }

    openFinanceDetailsModal(id) {
        const r = window.db.get("finance_records").find(x => x.id === id);
        if (!r) return;
        const project = window.db.get("projects").find(x => x.id === r.project_id);
        const formHTML = `
            <div class="card p-3 mb-3 bg-slate-50 text-xs">
                <div class="mb-2"><strong>${window.t('project_name')}:</strong> ${project ? window.t(project.name) : 'N/A'}</div>
                <div class="grid-2 gap-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div><strong>Transaction Type:</strong> ${window.t(r.type).toUpperCase()}</div>
                    <div><strong>Category:</strong> ${window.t(r.category).toUpperCase()}</div>
                    <div><strong>Invoice No:</strong> ${r.invoice_number || 'N/A'}</div>
                    <div><strong>Payment Status:</strong> ${window.t(r.payment_status).toUpperCase()}</div>
                    <div><strong>Amount:</strong> ${window.db.formatCurrency(r.amount, r.currency)}</div>
                    <div><strong>Payment Date:</strong> ${r.payment_date || 'N/A'}</div>
                </div>
                <div class="mt-2"><strong>Description:</strong> ${window.t(r.description)}</div>
            </div>
            ${this.generateAuditTrackingHTML(r)}
        `;
        this.openModal(`Transaction Details: ${r.id}`, formHTML, () => {
            return true;
        });
        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.style.display = "none";
    }

    openPaymentRequestDetailsModal(id) {
        const r = window.db.get("payment_requests").find(x => x.id === id);
        if (!r) return;
        const project = window.db.get("projects").find(x => x.id === r.project_id);
        const formHTML = `
            <div class="card p-3 mb-3 bg-slate-50 text-xs">
                <div class="mb-2"><strong>${window.t('project_name')}:</strong> ${project ? window.t(project.name) : 'N/A'}</div>
                <div class="grid-2 gap-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div><strong>Request Type:</strong> ${window.t(r.type).toUpperCase()}</div>
                    <div><strong>Amount:</strong> ${window.db.formatCurrency(r.amount, r.currency)}</div>
                    <div><strong>Status:</strong> ${window.t(r.status).toUpperCase()}</div>
                    <div><strong>Approved By:</strong> ${this.getUserNameById(r.approved_by)}</div>
                </div>
                <div class="mt-2"><strong>Reason:</strong> ${window.t(r.reason)}</div>
                ${r.approval_comment ? `<div class="mt-2"><strong>Comments:</strong> ${r.approval_comment}</div>` : ''}
            </div>
            ${this.generateAuditTrackingHTML(r)}
        `;
        this.openModal(`Payment Request: ${r.id}`, formHTML, () => {
            return true;
        });
        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.style.display = "none";
    }

    openAllowanceDetailsModal(id) {
        const r = window.db.get("allowance_bonus").find(x => x.id === id);
        if (!r) return;
        const project = window.db.get("projects").find(x => x.id === r.project_id);
        const employee = window.db.get("users").find(x => x.id === r.employee_id);
        const formHTML = `
            <div class="card p-3 mb-3 bg-slate-50 text-xs">
                <div class="mb-2"><strong>Employee Name:</strong> ${employee ? employee.name : 'N/A'}</div>
                <div class="mb-2"><strong>Project Reference:</strong> ${project ? window.t(project.name) : 'N/A'}</div>
                <div class="grid-2 gap-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div><strong>Category:</strong> ${window.t(r.type).toUpperCase()}</div>
                    <div><strong>Amount:</strong> ${window.db.formatCurrency(r.amount, r.currency)}</div>
                    <div><strong>Date:</strong> ${r.date}</div>
                    <div><strong>Status:</strong> ${window.t(r.status).toUpperCase()}</div>
                </div>
                <div class="mt-2"><strong>Reason:</strong> ${window.t(r.reason)}</div>
            </div>
            ${this.generateAuditTrackingHTML(r)}
        `;
        this.openModal(`Allowance/Claim Details: ${r.id}`, formHTML, () => {
            return true;
        });
        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.style.display = "none";
    }

    openAddFinanceRecordModal(projectId) {
        const p = window.db.get("projects").find(x => x.id === projectId);
        if (!p) return;

        const formHTML = `
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('category')}</label>
                    <select id="m-f-cat" class="form-select btn-full">
                        <option value="material">${window.t('material_cost')}</option>
                        <option value="labor">${window.t('labor_cost')}</option>
                        <option value="transport">${window.t('transport_logistics')}</option>
                        <option value="subcontractor">${window.t('subcontractor_cost')}</option>
                        <option value="allowance">${window.t('employee_allowance')}</option>
                        <option value="contract_payment">${window.t('owner_progress_payment')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('invoice_no')}</label>
                    <input type="text" id="m-f-inv" class="form-input btn-full" placeholder="${window.t('ph_f_inv')}">
                </div>
            </div>
            <div class="grid-3 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('amount')}</label>
                    <input type="number" id="m-f-amount" class="form-input btn-full" placeholder="${window.t('ph_f_amount')}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('currency')}</label>
                    <select id="m-f-curr" class="form-select btn-full">
                        <option value="${p.currency}">${p.currency}</option>
                        <option value="USD">USD</option>
                        <option value="LAK">LAK</option>
                        <option value="THB">THB</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('ledger_entry_date')}</label>
                    <input type="date" id="m-f-date" class="form-input btn-full">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">Supporting Document / Attachment (PDF/Image)</label>
                <input type="text" id="m-f-attach" class="form-input btn-full" placeholder="e.g. invoice_doc.pdf">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('description')}</label>
                <input type="text" id="m-f-desc" class="form-input btn-full" placeholder="${window.t('ph_f_desc')}">
            </div>
        `;

        this.openModal(window.t('log_ledger_entry'), formHTML, () => {
            const cat = document.getElementById("m-f-cat").value;
            const inv = document.getElementById("m-f-inv").value;
            const amount = Number(document.getElementById("m-f-amount").value);
            const curr = document.getElementById("m-f-curr").value;
            const date = document.getElementById("m-f-date").value;
            const attach = document.getElementById("m-f-attach").value;
            const desc = document.getElementById("m-f-desc").value;

            if (!amount || !desc) {
                window.utils.showToast(window.t('amount_desc_required'), "error");
                return false;
            }

            const type = cat === "contract_payment" ? "income" : "expense";

            if (type === "expense" && !attach.trim()) {
                window.utils.showToast("Supporting document/attachment is required for expenses!", "error");
                return false;
            }

            window.db.add("finance_records", {
                project_id: projectId, type, category: cat,
                amount, currency: curr, invoice_number: inv,
                payment_date: date, payment_status: "paid",
                attachment: attach, description: desc, created_by: window.auth.getCurrentUser().id
            });

            window.db.recalculateProjectFinancials(projectId);

            window.utils.logAudit("FINANCE_ENTRY_ADDED", "finance", `Added ${type} ledger entry to project ${projectId}`);
            window.utils.showToast(window.t('ledger_entry_compiled'), "success");
            this.navigateTo("projects", projectId);
            return true;
        });
    }

    deletePaymentRequest(id) {
        const r = window.db.get("payment_requests").find(x => x.id === id);
        if (!r) return;

        const reason = prompt("Please enter the reason for deletion (optional):", "");
        if (reason === null) return; // user cancelled

        const currentUser = window.auth.getCurrentUser();

        window.db.update("payment_requests", id, {
            deleted: true,
            deleted_by: currentUser.id,
            deleted_at: new Date().toISOString()
        });

        const project = window.db.get("projects").find(p => p.id === r.project_id);
        const projectName = project ? project.name : "Unknown";
        
        let delHistory = [];
        try {
            delHistory = JSON.parse(localStorage.getItem("epc_laos_db_deletion_history")) || [];
        } catch(e) {}
        
        delHistory.push({
            id: `del-pr-${Date.now()}`,
            user_name: currentUser.name,
            user_role: currentUser.role,
            deleted_at: new Date().toISOString(),
            project_name: projectName,
            details: `Payment Request ${r.id} (${r.type}, ${r.amount} ${r.currency}, reason: ${r.reason})`,
            reason: reason || "No reason provided",
            original_id: r.id,
            collection: "payment_requests"
        });
        localStorage.setItem("epc_laos_db_deletion_history", JSON.stringify(delHistory));

        window.utils.logAudit("PAYMENT_REQUEST_DELETED", "finance", `Payment request ${r.id} was soft-deleted by ${currentUser.name}`);
        window.utils.showToast("Request deleted successfully!", "success");

        this.navigateTo("payment_requests");
    }

    deleteProcurementRecord(id) {
        const r = window.db.get("procurement_records").find(x => x.id === id);
        if (!r) return;

        const reason = prompt("Please enter the reason for deletion (optional):", "");
        if (reason === null) return;

        const currentUser = window.auth.getCurrentUser();

        window.db.update("procurement_records", id, {
            deleted: true,
            deleted_by: currentUser.id,
            deleted_at: new Date().toISOString()
        });

        const project = window.db.get("projects").find(p => p.id === r.project_id);
        const projectName = project ? project.name : "Unknown";
        
        let delHistory = [];
        try {
            delHistory = JSON.parse(localStorage.getItem("epc_laos_db_deletion_history")) || [];
        } catch(e) {}
        
        delHistory.push({
            id: `del-prc-${Date.now()}`,
            user_name: currentUser.name,
            user_role: currentUser.role,
            deleted_at: new Date().toISOString(),
            project_name: projectName,
            details: `Procurement Record ${r.pr_number} (${r.material_name}, spec: ${r.specification}, qty: ${r.quantity} ${r.unit})`,
            reason: reason || "No reason provided",
            original_id: r.id,
            collection: "procurement_records"
        });
        localStorage.setItem("epc_laos_db_deletion_history", JSON.stringify(delHistory));

        window.utils.logAudit("PROCUREMENT_RECORD_DELETED", "procurement", `Procurement record ${r.pr_number} was soft-deleted by ${currentUser.name}`);
        window.utils.showToast("Procurement record deleted successfully!", "success");

        this.navigateTo("projects", r.project_id);
        setTimeout(() => {
            const tabBtn = document.querySelector(".details-tab-bar .tab-link[onclick*='procurement']");
            if (tabBtn) tabBtn.click();
        }, 100);
    }

    deleteAllowanceClaim(id) {
        const r = window.db.get("allowance_bonus").find(x => x.id === id);
        if (!r) return;

        const reason = prompt("Please enter the reason for deletion (optional):", "");
        if (reason === null) return;

        const currentUser = window.auth.getCurrentUser();

        window.db.update("allowance_bonus", id, {
            deleted: true,
            deleted_by: currentUser.id,
            deleted_at: new Date().toISOString()
        });

        const project = window.db.get("projects").find(p => p.id === r.project_id);
        const projectName = project ? project.name : "General Office";
        
        let delHistory = [];
        try {
            delHistory = JSON.parse(localStorage.getItem("epc_laos_db_deletion_history")) || [];
        } catch(e) {}
        
        delHistory.push({
            id: `del-ab-${Date.now()}`,
            user_name: currentUser.name,
            user_role: currentUser.role,
            deleted_at: new Date().toISOString(),
            project_name: projectName,
            details: `Allowance claim ${r.id} (${r.type}, ${r.amount} ${r.currency}, reason: ${r.reason})`,
            reason: reason || "No reason provided",
            original_id: r.id,
            collection: "allowance_bonus"
        });
        localStorage.setItem("epc_laos_db_deletion_history", JSON.stringify(delHistory));

        window.utils.logAudit("ALLOWANCE_CLAIM_DELETED", "finance", `Allowance claim request ${r.id} was soft-deleted by ${currentUser.name}`);
        window.utils.showToast("Allowance claim deleted successfully!", "success");

        this.navigateTo("allowance_bonus");
    }

    deleteTask(id) {
        const t = window.db.get("tasks").find(x => x.id === id);
        if (!t) return;

        if (!window.auth.hasPermission("assign_tasks", t.project_id)) {
            window.utils.showToast("Permission Denied: You do not have permission to delete tasks for this project.", "error");
            return;
        }

        const confirmDelete = confirm("Are you sure you want to delete this task?");
        if (!confirmDelete) return;

        const currentUser = window.auth.getCurrentUser();

        window.db.update("tasks", id, {
            deleted: true,
            deleted_by: currentUser.id,
            deleted_at: new Date().toISOString()
        });

        const project = window.db.get("projects").find(p => p.id === t.project_id);
        const projectName = project ? project.name : "Unknown";
        
        let delHistory = [];
        try {
            delHistory = JSON.parse(localStorage.getItem("epc_laos_db_deletion_history")) || [];
        } catch(e) {}
        
        delHistory.push({
            id: `del-t-${Date.now()}`,
            user_name: currentUser.name,
            user_role: currentUser.role,
            deleted_at: new Date().toISOString(),
            project_name: projectName,
            details: `Task: ${t.title} (${t.description})`,
            reason: "Task deletion",
            original_id: t.id,
            collection: "tasks"
        });
        localStorage.setItem("epc_laos_db_deletion_history", JSON.stringify(delHistory));

        window.utils.logAudit("TASK_DELETED", "projects", `Task ${t.title} was soft-deleted by ${currentUser.name}`);
        window.utils.showToast("Task deleted successfully!", "success");

        this.renderActiveView();
    }

    processApproval(id, decision) {
        const r = window.db.get("payment_requests").find(x => x.id === id);
        if (!r) return;

        if (decision === "approved" && (!r.attachment || !r.attachment.trim())) {
            window.utils.showToast("Cannot approve: Supporting document/attachment is missing!", "error");
            return;
        }

        const comment = prompt("Enter approval/rejection comment:", r.approval_comment || "");
        if (comment === null) return; // user cancelled

        const currentUser = window.auth.getCurrentUser();

        window.db.update("payment_requests", id, {
            status: decision,
            approved_by: currentUser.id,
            approved_at: new Date().toISOString(),
            approval_comment: comment,
            updated_by: currentUser.id,
            updated_at: new Date().toISOString()
        });

        window.utils.logAudit("PAYMENT_REQUEST_DECISION", "finance", `Payment request ${id} was ${decision} by ${currentUser.name}`);
        window.utils.showToast(`Request ${id} status updated to ${decision}`, "success");

        this.navigateTo("payment_requests");
    }

    processPayment(id) {
        const r = window.db.get("payment_requests").find(x => x.id === id);
        if (!r) return;

        const formHTML = `
            <div class="form-group mb-3">
                <p class="text-xs text-muted mb-2">Disbursing payment for request <strong>${r.id}</strong> of amount <strong>${r.amount} ${r.currency}</strong></p>
                <label class="form-label block text-xs mb-1">Payment Method</label>
                <select id="m-disb-method" class="form-select btn-full">
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                </select>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">Supporting Payment Evidence / Attachment <span class="text-danger">*</span></label>
                <input type="text" id="m-disb-attach" class="form-input btn-full" placeholder="e.g. transfer_slip.png">
                <span class="text-xxs text-muted block mt-1">Please provide evidence/attachment filename or path (e.g. slip, receipt, invoice).</span>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">Remark / Note</label>
                <textarea id="m-disb-remark" class="form-input btn-full" style="height: 60px;" placeholder="Optional remarks..."></textarea>
            </div>
        `;

        this.openModal("Disburse Payment", formHTML, () => {
            const method = document.getElementById("m-disb-method").value;
            const attachment = document.getElementById("m-disb-attach").value.trim();
            const remark = document.getElementById("m-disb-remark").value.trim();

            if (!attachment) {
                window.utils.showToast("Supporting payment evidence / attachment is required!", "error");
                return false;
            }

            const currentUser = window.auth.getCurrentUser();

            window.db.update("payment_requests", id, {
                status: "paid",
                updated_by: currentUser.id,
                updated_at: new Date().toISOString(),
                disbursed_by_id: currentUser.id,
                disbursed_by_name: currentUser.name,
                disbursement_at: new Date().toISOString(),
                payment_method: method,
                disbursement_attachment: attachment,
                disbursement_remark: remark
            });

            let category = "material";
            if (r.type === "subcontractor_payment") category = "subcontractor";
            else if (r.type === "allowance") category = "allowance";
            else if (r.type === "site_expense") category = "transport";

            window.db.add("finance_records", {
                project_id: r.project_id,
                type: "expense",
                category: category,
                amount: r.amount,
                currency: r.currency,
                invoice_number: attachment ? `INV-${r.id}` : `PR-${r.id}`,
                payment_date: new Date().toISOString().substring(0, 10),
                payment_status: "paid",
                attachment: attachment,
                description: `Paid Procurement Request ${r.id}: ${r.reason}${remark ? ` (Remark: ${remark})` : ""}`,
                created_by: currentUser.id
            });

            window.db.recalculateProjectFinancials(r.project_id);

            window.utils.logAudit("PAYMENT_REQUEST_PAID", "finance", `Disbursed payment for ${id} of ${r.amount} ${r.currency} via ${method}`);
            window.utils.showToast("Payment disbursed and request closed!", "success");

            this.navigateTo("payment_requests");
            return true;
        });

        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.textContent = "Disburse";
    }

    processAllowanceApproval(id, decision) {
        const r = window.db.get("allowance_bonus").find(x => x.id === id);
        if (!r) return;

        if (decision === "approved" && (!r.attachment || !r.attachment.trim())) {
            window.utils.showToast("Cannot approve: Supporting document/attachment is missing!", "error");
            return;
        }

        const currentUser = window.auth.getCurrentUser();

        window.db.update("allowance_bonus", id, {
            status: decision,
            approved_by: currentUser.id,
            updated_by: currentUser.id,
            updated_at: new Date().toISOString()
        });

        window.utils.logAudit("ALLOWANCE_DECISION", "finance", `Allowance/claim request ${id} was ${decision} by ${currentUser.name}`);
        window.utils.showToast(`Claim ${id} status updated to ${decision}`, "success");

        this.navigateTo("allowance_bonus");
    }

    processAllowanceDisburse(id) {
        const r = window.db.get("allowance_bonus").find(x => x.id === id);
        if (!r) return;

        const formHTML = `
            <div class="form-group mb-3">
                <p class="text-xs text-muted mb-2">Disbursing payment for allowance claim <strong>${r.id}</strong> of amount <strong>${r.amount} ${r.currency}</strong></p>
                <label class="form-label block text-xs mb-1">Payment Method</label>
                <select id="m-disb-method" class="form-select btn-full">
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                </select>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">Supporting Payment Evidence / Attachment <span class="text-danger">*</span></label>
                <input type="text" id="m-disb-attach" class="form-input btn-full" placeholder="e.g. transfer_slip.png">
                <span class="text-xxs text-muted block mt-1">Please provide evidence/attachment filename or path (e.g. slip, receipt, invoice).</span>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">Remark / Note</label>
                <textarea id="m-disb-remark" class="form-input btn-full" style="height: 60px;" placeholder="Optional remarks..."></textarea>
            </div>
        `;

        this.openModal("Disburse Payment", formHTML, () => {
            const method = document.getElementById("m-disb-method").value;
            const attachment = document.getElementById("m-disb-attach").value.trim();
            const remark = document.getElementById("m-disb-remark").value.trim();

            if (!attachment) {
                window.utils.showToast("Supporting payment evidence / attachment is required!", "error");
                return false;
            }

            const currentUser = window.auth.getCurrentUser();

            window.db.update("allowance_bonus", id, {
                status: "paid",
                updated_by: currentUser.id,
                updated_at: new Date().toISOString(),
                disbursed_by_id: currentUser.id,
                disbursed_by_name: currentUser.name,
                disbursement_at: new Date().toISOString(),
                payment_method: method,
                disbursement_attachment: attachment,
                disbursement_remark: remark
            });

            window.db.add("finance_records", {
                project_id: r.project_id || "general",
                type: "expense",
                category: "allowance",
                amount: r.amount,
                currency: r.currency,
                invoice_number: attachment ? `AB-${r.id}` : `CLM-${r.id}`,
                payment_date: new Date().toISOString().substring(0, 10),
                payment_status: "paid",
                attachment: attachment,
                description: `Paid Allowance/Claim ${r.id} for employee ${this.getUserNameById(r.employee_id)}${remark ? ` (Remark: ${remark})` : ""}`,
                created_by: currentUser.id
            });

            if (r.project_id && r.project_id !== "general") {
                window.db.recalculateProjectFinancials(r.project_id);
            }

            window.utils.logAudit("ALLOWANCE_DISBURSED", "finance", `Disbursed payment for allowance claim ${id} via ${method}`);
            window.utils.showToast("Allowance disbursed successfully!", "success");

            this.navigateTo("allowance_bonus");
            return true;
        });

        const submitBtn = document.getElementById("modal-submit-action-btn");
        if (submitBtn) submitBtn.textContent = "Disburse";
    }

    openCreatePaymentRequestModal() {
        const projects = window.db.get("projects");
        
        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('project_ref')}</label>
                <select id="m-pr-project" class="form-select btn-full">
                    ${projects.map(p => `<option value="${p.id}">${window.t(p.name)}</option>`).join('')}
                </select>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('category')}</label>
                    <select id="m-pr-type" class="form-select btn-full">
                        <option value="supplier_payment">${window.t('supplier_payment')}</option>
                        <option value="subcontractor_payment">${window.t('subcontractor_payment')}</option>
                        <option value="material_purchase">${window.t('material_purchase')}</option>
                        <option value="site_expense">${window.t('site_expense')}</option>
                        <option value="allowance">${window.t('engineers_allowance')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('documents')} (PDF)</label>
                    <input type="text" id="m-pr-attach" class="form-input btn-full" placeholder="${window.t('ph_pr_attach')}">
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('amount')}</label>
                    <input type="number" id="m-pr-amount" class="form-input btn-full" placeholder="${window.t('ph_pr_amount')}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('currency')}</label>
                    <select id="m-pr-curr" class="form-select btn-full">
                        <option value="USD">USD</option>
                        <option value="LAK">LAK</option>
                        <option value="THB">THB</option>
                    </select>
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('remarks')}</label>
                <textarea id="m-pr-reason" class="form-input btn-full" rows="3" placeholder="${window.t('ph_pr_reason')}"></textarea>
            </div>
        `;

        this.openModal(window.t('create_payment'), formHTML, () => {
            const pId = document.getElementById("m-pr-project").value;
            const type = document.getElementById("m-pr-type").value;
            const attach = document.getElementById("m-pr-attach").value;
            const amount = Number(document.getElementById("m-pr-amount").value);
            const curr = document.getElementById("m-pr-curr").value;
            const reason = document.getElementById("m-pr-reason").value;

            if (!amount || !reason) {
                window.utils.showToast(window.t('amount_reason_required'), "error");
                return false;
            }

            if (!attach.trim()) {
                window.utils.showToast("Supporting document/attachment is required for payment requests!", "error");
                return false;
            }

            window.db.add("payment_requests", {
                project_id: pId, type, amount, currency: curr,
                reason, attachment: attach, requested_by: window.auth.getCurrentUser().id,
                status: "pending", approval_comment: "", approved_by: "", approved_at: ""
            });

            window.utils.logAudit("PAYMENT_REQUEST_CREATED", "finance", `Raised ${type} request of ${amount} ${curr}`);
            window.utils.showToast(window.t('approval_req_submitted'), "success");
            this.navigateTo("payment_requests");
            return true;
        });
    }

    openAllowanceModal() {
        const projects = window.db.get("projects");
        const user = window.auth.getCurrentUser();

        const formHTML = `
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('project_ref')}</label>
                    <select id="m-ab-proj" class="form-select btn-full">
                        <option value="">${window.t('general_corporate')}</option>
                        ${projects.map(p => `<option value="${p.id}">${window.t(p.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('category')}</label>
                    <select id="m-ab-type" class="form-select btn-full">
                        <option value="allowance">${window.t('site_supervisor_allowance')}</option>
                        <option value="overtime">${window.t('overtime_payout')}</option>
                        <option value="travel">${window.t('travel_petrol_tolls')}</option>
                        <option value="bonus">${window.t('bonus')}</option>
                    </select>
                </div>
            </div>
            <div class="grid-3 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('amount')}</label>
                    <input type="number" id="m-ab-amount" class="form-input btn-full" placeholder="${window.t('ph_ab_amount')}">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('currency')}</label>
                    <select id="m-ab-curr" class="form-select btn-full">
                        <option value="LAK">LAK</option>
                        <option value="USD">USD</option>
                        <option value="THB">THB</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('claim_date')}</label>
                    <input type="date" id="m-ab-date" class="form-input btn-full">
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('remarks')}</label>
                <input type="text" id="m-ab-reason" class="form-input btn-full" placeholder="${window.t('ph_ab_reason')}">
            </div>
        `;

        this.openModal(window.t('submit_claim'), formHTML, () => {
            const proj = document.getElementById("m-ab-proj").value;
            const type = document.getElementById("m-ab-type").value;
            const amount = Number(document.getElementById("m-ab-amount").value);
            const curr = document.getElementById("m-ab-curr").value;
            const date = document.getElementById("m-ab-date").value;
            const reason = document.getElementById("m-ab-reason").value;

            if (!amount || !reason) {
                window.utils.showToast(window.t('amount_reason_required'), "error");
                return false;
            }

            window.db.add("allowance_bonus", {
                employee_id: user.id, project_id: proj || "", type,
                amount, currency: curr, date, reason,
                approved_by: "", status: "pending", attachment: ""
            });

            window.utils.logAudit("ALLOWANCE_CLAIM_LODGED", "hr", `Lodged claim ${type}`);
            window.utils.showToast(window.t('claim_submitted'), "success");
            this.navigateTo("allowance_bonus");
            return true;
        });
    }

    openPostAnnouncementModal() {
        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('announcement_title')}</label>
                <input type="text" id="m-a-title" class="form-input btn-full" placeholder="${window.t('ph_a_title')}">
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('audience_scope')}</label>
                    <select id="m-a-scope" class="form-select btn-full">
                        <option value="all">${window.t('everyone')}</option>
                        <option value="project_team">${window.t('project_pms_engineers')}</option>
                        <option value="finance_team">${window.t('finance_personnel_only')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('broadcast_priority')}</label>
                    <select id="m-a-priority" class="form-select btn-full">
                        <option value="normal">${window.t('normal_info')}</option>
                        <option value="important">${window.t('important_action_required')}</option>
                        <option value="urgent">${window.t('urgent_severe_bottleneck')}</option>
                    </select>
                </div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('core_announcement_message')}</label>
                <textarea id="m-a-msg" class="form-input btn-full" rows="4" placeholder="${window.t('ph_a_msg')}"></textarea>
            </div>
        `;

        this.openModal(window.t('post_broadcast'), formHTML, () => {
            const title = document.getElementById("m-a-title").value;
            const scope = document.getElementById("m-a-scope").value;
            const priority = document.getElementById("m-a-priority").value;
            const msg = document.getElementById("m-a-msg").value;

            if (!title || !msg) {
                window.utils.showToast(window.t('title_message_required'), "error");
                return false;
            }

            window.db.add("announcements", {
                title, message: msg, target_audience: scope,
                target_project_id: "", priority,
                publish_date: new Date().toISOString().substring(0, 10),
                attachment: "", created_by: window.auth.getCurrentUser().id
            });

            window.utils.logAudit("ANNOUNCEMENT_POSTED", "admin", `Published news broadcast: ${title}`);
            window.utils.showToast(window.t('broadcast_published'), "success");
            this.navigateTo("announcements");
            return true;
        });
    }

    openUploadDocumentModal(projectId) {
        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('document_file_name')}</label>
                <input type="text" id="m-d-name" class="form-input btn-full" placeholder="${window.t('ph_d_name')}">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('document_category')}</label>
                <select id="m-d-type" class="form-select btn-full">
                    <option value="contract">${window.t('primary_contract_agreement')}</option>
                    <option value="boq">${window.t('bill_of_quantities')}</option>
                    <option value="drawing">${window.t('electrical_autocad_drawing')}</option>
                    <option value="testing">${window.t('fat_commissioning_protocol')}</option>
                    <option value="other">${window.t('general_document')}</option>
                </select>
            </div>
        `;

        this.openModal(window.t('upload_file'), formHTML, () => {
            const name = document.getElementById("m-d-name").value;
            const type = document.getElementById("m-d-type").value;

            if (!name) {
                window.utils.showToast(window.t('file_name_required'), "error");
                return false;
            }

            window.db.add("documents", {
                project_id: projectId, name, type,
                file_size: "2.4 MB", file_url: "#",
                uploaded_by: window.auth.getCurrentUser().name,
                uploaded_at: new Date().toISOString().substring(0, 10)
            });

            window.utils.logAudit("DOCUMENT_UPLOADED", "projects", `Uploaded document: ${name}`);
            window.utils.showToast(window.t('doc_indexed'), "success");
            this.navigateTo("projects", projectId);
            return true;
        });
    }

    generatePortfolioSVGChart(stats) {
        const maxVal = Math.max(stats.totalContractValUSD, stats.totalReceivedUSD + stats.totalPendingUSD, stats.totalExpenseUSD + stats.estimatedProfitUSD) || 1;
        const scale = (val) => (val / maxVal) * 100;
        
        const w1 = scale(stats.totalContractValUSD);
        const w2_rec = scale(stats.totalReceivedUSD);
        const w2_pend = scale(stats.totalPendingUSD);
        const w3_exp = scale(stats.totalExpenseUSD);
        const w3_prof = scale(Math.max(0, stats.estimatedProfitUSD));
        
        return `
            <svg viewBox="0 0 400 180" width="100%" height="100%" class="portfolio-svg-chart" style="background: transparent;">
                <!-- Grid lines -->
                <line x1="85" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.1)" stroke-dasharray="3,3" />
                <line x1="85" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.1)" stroke-dasharray="3,3" />
                <line x1="85" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.1)" stroke-dasharray="3,3" />
                
                <!-- Bar 1: Contract Value -->
                <text x="75" y="32" text-anchor="end" class="chart-axis-label" style="font-size: 10px; fill: var(--color-text-muted); font-weight: bold;">${window.t('contract_value').substring(0, 12)}</text>
                <rect x="85" y="20" width="${w1 * 2.8 || 1}" height="18" rx="4" fill="var(--color-primary)" />
                
                <!-- Bar 2: Payments -->
                <text x="75" y="82" text-anchor="end" class="chart-axis-label" style="font-size: 10px; fill: var(--color-text-muted); font-weight: bold;">${window.t('received_payment').substring(0, 12)}</text>
                <rect x="85" y="70" width="${w2_rec * 2.8 || 1}" height="18" rx="4" fill="var(--color-success)" />
                <rect x="${85 + w2_rec * 2.8}" y="70" width="${w2_pend * 2.8 || 1}" height="18" rx="4" fill="var(--color-warning)" opacity="0.6" />
                
                <!-- Bar 3: Expenses -->
                <text x="75" y="132" text-anchor="end" class="chart-axis-label" style="font-size: 10px; fill: var(--color-text-muted); font-weight: bold;">${window.t('total_expenses').substring(0, 12)}</text>
                <rect x="85" y="120" width="${w3_exp * 2.8 || 1}" height="18" rx="4" fill="var(--color-error)" />
                <rect x="${85 + w3_exp * 2.8}" y="120" width="${w3_prof * 2.8 || 1}" height="18" rx="4" fill="#06b6d4" opacity="0.7" />
                
                <!-- Bottom scale labels -->
                <line x1="85" y1="155" x2="380" y2="155" stroke="var(--color-border)" />
                <text x="85" y="170" text-anchor="middle" style="font-size: 9px; fill: var(--color-text-muted);">0</text>
                <text x="232" y="170" text-anchor="middle" style="font-size: 9px; fill: var(--color-text-muted);">${window.db.formatCurrency(maxVal / 2, 'USD')}</text>
                <text x="380" y="170" text-anchor="middle" style="font-size: 9px; fill: var(--color-text-muted);">${window.db.formatCurrency(maxVal, 'USD')}</text>
            </svg>
        `;
    }

    generateExpenseBreakdownBarsHTML(records) {
        const expenses = records.filter(r => r.type === "expense");
        const totalExpense = expenses.reduce((acc, curr) => acc + window.db.convertToUSD(curr.amount, curr.currency), 0) || 1;

        const categories = ["material", "labor", "subcontractor", "transport", "allowance", "other"];
        
        return categories.map(cat => {
            const catRecords = expenses.filter(r => r.category === cat);
            const catSum = catRecords.reduce((acc, curr) => acc + window.db.convertToUSD(curr.amount, curr.currency), 0);
            const percent = ((catSum / totalExpense) * 100).toFixed(0);
            
            return `
                <div>
                    <div class="flex justify-between text-xs mb-1">
                        <strong>${window.t(cat).toUpperCase()}</strong>
                        <span class="text-muted">${window.db.formatCurrency(catSum, 'USD')} (${percent}%)</span>
                    </div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill progress-mid" style="width: ${percent}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    generateProjectsCardsHTML(projects) {
        if (projects.length === 0) {
            return `
                <div class="card p-5 text-center col-span-3">
                    <span style="font-size: 48px;">▤</span>
                    <h3>${window.t('search_placeholder')}</h3>
                </div>
            `;
        }

        return projects.map(p => {
            const pmUser = window.db.get("users").find(x => x.id === p.pm_id);
            const progressColor = window.utils.getProgressColorClass(p.progress_percent);
            const convertedVal = window.db.formatCurrency(p.contract_value, p.currency);

            return `
                <div class="card p-4 hover-lift flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <span class="project-code-label font-mono">${p.code}</span>
                            ${window.utils.getStatusBadge(p.status)}
                        </div>
                        <h3 class="project-title-heading mb-2 cursor-pointer text-primary" onclick="window.ui.navigateTo('projects', '${p.id}')">${window.t(p.name)}</h3>
                        <p class="project-card-description text-muted text-xs mb-3">${p.description ? window.t(p.description).substring(0, 100) + '...' : ''}</p>
                        
                        <div class="project-metrics border-t border-b py-2 mb-3">
                            <div class="flex justify-between text-xs py-1">
                                <span class="text-muted">${window.t('contract_value')}:</span>
                                <strong class="text-dark">${convertedVal}</strong>
                            </div>
                            <div class="flex justify-between text-xs py-1">
                                <span class="text-muted">${window.t('location')}:</span>
                                <span class="text-dark">${window.t(p.location)}</span>
                            </div>
                            <div class="flex justify-between text-xs py-1">
                                <span class="text-muted">${window.t('project_manager')}:</span>
                                <span class="text-dark">${pmUser ? pmUser.name : "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="progress-bar-container mb-3">
                            <div class="flex justify-between text-xs mb-1">
                                <span class="text-muted">${window.t('progress')}</span>
                                <strong class="text-dark">${p.progress_percent}%</strong>
                            </div>
                            <div class="progress-bar-track">
                                <div class="progress-bar-fill ${progressColor}" style="width: ${p.progress_percent}%;"></div>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2">
                            <button class="btn btn-secondary btn-sm" onclick="window.ui.navigateTo('projects', '${p.id}')">${window.t('review')}</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ==========================================================================
    // MISSING PAGES IMPLEMENTATIONS
    // ==========================================================================

    renderAnnouncementsPage(container) {
        const user = window.auth.getCurrentUser();
        const announcements = window.db.get("announcements");
        const canPost = window.auth.hasPermission("post_announcement");

        let searchVal = this.announcementsSearchQuery || "";
        const filtered = announcements.filter(a => {
            if (!searchVal) return true;
            const term = searchVal.toLowerCase();
            return (a.title && a.title.toLowerCase().includes(term)) ||
                   (a.message && a.message.toLowerCase().includes(term));
        });

        filtered.sort((x, y) => new Date(y.publish_date) - new Date(x.publish_date));

        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 no-print">
                <div class="flex gap-2">
                    <input type="text" id="announcement-search" class="form-input text-xs" style="width: 250px;" 
                           placeholder="${window.t('search_placeholder')}" value="${searchVal}" 
                           oninput="window.ui.filterAnnouncements()">
                </div>
                ${canPost ? `
                    <button class="btn btn-primary btn-sm" onclick="window.ui.openPostAnnouncementModal()">
                        + ${window.t('post_broadcast')}
                    </button>
                ` : ''}
            </div>

            <div class="grid-1 gap-4" id="announcements-list-viewport">
                ${filtered.length === 0 ? `
                    <div class="card p-5 text-center text-muted">
                        <span style="font-size: 48px;">▤</span>
                        <h4 class="mt-2">${window.t('search_placeholder')}</h4>
                    </div>
                ` : filtered.map(a => {
                    const author = window.db.get("users").find(u => u.id === a.created_by) || { name: window.t('unknown') };
                    let priorityClass = "priority-normal";
                    let badgeColor = "badge-role-viewer";
                    if (a.priority === "urgent") {
                        priorityClass = "priority-urgent";
                        badgeColor = "badge-role-super_admin";
                    } else if (a.priority === "important") {
                        priorityClass = "priority-important";
                        badgeColor = "badge-role-finance_manager";
                    }
                    
                    return `
                        <div class="card p-4 mini-announcement-card ${priorityClass}">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="mini-announcement-title text-primary">${a.title}</h3>
                                <span class="badge ${badgeColor}">${window.t(a.priority).toUpperCase()}</span>
                            </div>
                            <p class="mini-announcement-body text-dark" style="font-size: 13px; line-height: 1.5;">${a.message}</p>
                            <div class="flex justify-between items-center mt-3 text-xxs text-muted border-t pt-2">
                                <div>
                                    <span>${window.t('published_date')}: ${window.utils.formatDate(a.publish_date)}</span>
                                    <span class="ml-3">${window.t('logged_by')}: <strong>${author.name}</strong></span>
                                </div>
                                ${a.attachment ? `
                                    <a href="#" class="btn btn-secondary btn-xs no-print" 
                                       onclick="window.utils.showToast(window.t('downloaded_toast') + ' ${a.attachment}', 'success')">
                                        ${a.attachment}
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    filterAnnouncements() {
        const searchInput = document.getElementById("announcement-search");
        if (searchInput) {
            this.announcementsSearchQuery = searchInput.value;
            this.renderAnnouncementsPage(document.getElementById("main-content-viewport"));
        }
    }

    renderDocumentsPage(container) {
        const user = window.auth.getCurrentUser();
        const documents = window.db.get("documents");
        const projects = window.db.get("projects");
        const canUpload = window.auth.hasPermission("create_procurement");

        let searchVal = this.docsSearchQuery || "";
        let filterProj = this.docsProjectFilter || "all";
        let filterCat = this.docsCategoryFilter || "all";

        const filtered = documents.filter(d => {
            if (searchVal && !d.name.toLowerCase().includes(searchVal.toLowerCase())) return false;
            if (filterProj !== "all" && d.project_id !== filterProj) return false;
            if (filterCat !== "all" && d.type !== filterCat) return false;
            return true;
        });

        container.innerHTML = `
            <div class="card p-4 mb-4 no-print">
                <div class="flex justify-between items-center gap-4 flex-wrap">
                    <div class="flex gap-3 flex-wrap">
                        <input type="text" id="doc-search" class="form-input text-xs" style="width: 200px;" 
                               placeholder="${window.t('search_placeholder')}" value="${searchVal}" 
                               oninput="window.ui.filterDocumentsList()">
                        
                        <select id="doc-proj-select" class="form-select text-xs" onchange="window.ui.filterDocumentsList()">
                            <option value="all">${window.t('all_projects')}</option>
                            ${projects.map(p => `<option value="${p.id}" ${filterProj === p.id ? 'selected' : ''}>${p.code}</option>`).join('')}
                        </select>

                        <select id="doc-cat-select" class="form-select text-xs" onchange="window.ui.filterDocumentsList()">
                            <option value="all">${window.t('filter_all_types')}</option>
                            <option value="contract" ${filterCat === 'contract' ? 'selected' : ''}>${window.t('primary_contract_agreement')}</option>
                            <option value="boq" ${filterCat === 'boq' ? 'selected' : ''}>${window.t('bill_of_quantities')}</option>
                            <option value="drawing" ${filterCat === 'drawing' ? 'selected' : ''}>${window.t('electrical_autocad_drawing')}</option>
                            <option value="testing" ${filterCat === 'testing' ? 'selected' : ''}>${window.t('fat_commissioning_protocol')}</option>
                            <option value="other" ${filterCat === 'other' ? 'selected' : ''}>${window.t('general_document')}</option>
                        </select>
                    </div>
                    ${canUpload ? `
                        <button class="btn btn-primary btn-sm" onclick="window.ui.openGlobalUploadDocumentModal()">
                            + ${window.t('upload_file')}
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('document_file_name')}</th>
                            <th>${window.t('projects')}</th>
                            <th>${window.t('document_category')}</th>
                            <th>${window.t('qty')} (${window.t('spec')})</th>
                            <th>${window.t('uploaded_by')}</th>
                            <th>${window.t('published_date')}</th>
                            <th class="no-print">${window.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.length === 0 ? `
                            <tr>
                                <td colspan="7" class="text-center text-muted p-4">${window.t('search_placeholder')}</td>
                            </tr>
                        ` : filtered.map(d => {
                            const proj = projects.find(p => p.id === d.project_id) || { code: window.t('general_office') };
                            return `
                                <tr>
                                    <td class="font-bold text-primary">${d.name}</td>
                                    <td><span class="badge badge-design">${proj.code}</span></td>
                                    <td><span class="badge badge-planning">${window.t(d.type === 'contract' ? 'primary_contract_agreement' : d.type === 'boq' ? 'bill_of_quantities' : d.type === 'drawing' ? 'electrical_autocad_drawing' : d.type === 'testing' ? 'fat_commissioning_protocol' : 'general_document')}</span></td>
                                    <td class="text-muted font-mono">${d.file_size || 'N/A'}</td>
                                    <td><strong>${d.uploaded_by}</strong></td>
                                    <td>${window.utils.formatDate(d.uploaded_at)}</td>
                                    <td class="no-print">
                                        <button class="btn btn-secondary btn-xs" 
                                                onclick="window.utils.showToast(window.t('downloaded_toast') + ' ${d.name}', 'success')">
                                            ${window.t('download')}
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    filterDocumentsList() {
        const searchInput = document.getElementById("doc-search");
        const projSelect = document.getElementById("doc-proj-select");
        const catSelect = document.getElementById("doc-cat-select");

        if (searchInput && projSelect && catSelect) {
            this.docsSearchQuery = searchInput.value;
            this.docsProjectFilter = projSelect.value;
            this.docsCategoryFilter = catSelect.value;
            this.renderDocumentsPage(document.getElementById("main-content-viewport"));
        }
    }

    openGlobalUploadDocumentModal() {
        const projects = window.db.get("projects");
        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('projects')}</label>
                <select id="m-gd-proj" class="form-select btn-full">
                    <option value="">${window.t('general_office')}</option>
                    ${projects.map(p => `<option value="${p.id}">${p.code} - ${window.t(p.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('document_file_name')}</label>
                <input type="text" id="m-gd-name" class="form-input btn-full" placeholder="${window.t('ph_d_name')}">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('document_category')}</label>
                <select id="m-gd-type" class="form-select btn-full">
                    <option value="contract">${window.t('primary_contract_agreement')}</option>
                    <option value="boq">${window.t('bill_of_quantities')}</option>
                    <option value="drawing">${window.t('electrical_autocad_drawing')}</option>
                    <option value="testing">${window.t('fat_commissioning_protocol')}</option>
                    <option value="other">${window.t('general_document')}</option>
                </select>
            </div>
        `;

        this.openModal(window.t('upload_file'), formHTML, () => {
            const name = document.getElementById("m-gd-name").value;
            const type = document.getElementById("m-gd-type").value;
            const projId = document.getElementById("m-gd-proj").value;

            if (!name) {
                window.utils.showToast(window.t('file_name_required'), "error");
                return false;
            }

            window.db.add("documents", {
                project_id: projId, name, type,
                file_size: "1.8 MB", file_url: "#",
                uploaded_by: window.auth.getCurrentUser().name,
                uploaded_at: new Date().toISOString().substring(0, 10)
            });

            window.utils.logAudit("DOCUMENT_UPLOADED", "projects", `Uploaded document: ${name}`);
            window.utils.showToast(window.t('doc_indexed'), "success");
            this.renderDocumentsPage(document.getElementById("main-content-viewport"));
            return true;
        });
    }

    renderReportsPage(container) {
        const user = window.auth.getCurrentUser();
        const logs = window.db.get("audit_logs");
        const sortedLogs = [...logs].sort((x, y) => new Date(y.created_at || 0) - new Date(x.created_at || 0)).slice(0, 30);

        const cards = [];
        
        cards.push(`
            <div class="card p-3 flex-col justify-between" style="border-left: 3px solid var(--color-primary);">
                <div>
                    <h4 class="font-bold text-dark text-xs mb-1">${window.t('export_projects')}</h4>
                    <p class="text-xxs text-muted mb-3">${window.t('export_projects_desc')}</p>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="window.ui.exportProjectsCSV()">
                    ${window.t('export_csv')}
                </button>
            </div>
        `);

        if (window.auth.hasPermission('view_company_finance_summary')) {
            cards.push(`
                <div class="card p-3 flex-col justify-between" style="border-left: 3px solid var(--color-success);">
                    <div>
                        <h4 class="font-bold text-dark text-xs mb-1">${window.t('export_finance')}</h4>
                        <p class="text-xxs text-muted mb-3">${window.t('export_finance_desc')}</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="window.ui.exportFinanceCSV()">
                        ${window.t('export_csv')}
                    </button>
                </div>
            `);
        }

        if (user.role !== 'viewer') {
            cards.push(`
                <div class="card p-3 flex-col justify-between" style="border-left: 3px solid var(--color-warning);">
                    <div>
                        <h4 class="font-bold text-dark text-xs mb-1">${window.t('export_allowances')}</h4>
                        <p class="text-xxs text-muted mb-3">${window.t('export_allowances_desc')}</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="window.ui.exportAllowancesCSV()">
                        ${window.t('export_csv')}
                    </button>
                </div>
            `);
        }

        if (window.auth.hasPermission('view_audit_logs')) {
            cards.push(`
                <div class="card p-3 flex-col justify-between" style="border-left: 3px solid var(--color-error);">
                    <div>
                        <h4 class="font-bold text-dark text-xs mb-1">${window.t('export_audits')}</h4>
                        <p class="text-xxs text-muted mb-3">${window.t('export_audits_desc')}</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="window.ui.exportAuditsCSV()">
                        ${window.t('export_csv')}
                    </button>
                </div>
            `);
        }

        container.innerHTML = `
            <div class="card p-4 mb-4 no-print">
                <h3 class="card-title text-primary mb-2">${window.t('reports_title')}</h3>
                <p class="text-xs text-muted mb-4">${window.t('reports_desc')}</p>
                
                <div class="grid-2 gap-4">
                    ${cards.join('')}
                </div>
            </div>

            <div class="card p-4">
                <h3 class="card-title text-primary mb-3">${window.t('audit_trail')}</h3>
                <div class="table-container">
                    <table class="table" style="font-size: 11.5px;">
                        <thead>
                            <tr>
                                <th>${window.t('timestamp')}</th>
                                <th>${window.t('personnel')}</th>
                                <th>${window.t('actions')}</th>
                                <th>${window.t('type')}</th>
                                <th>${window.t('remarks')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedLogs.map(l => {
                                const u = window.db.get("users").find(x => x.id === l.user_id) || { name: l.user_id };
                                return `
                                    <tr>
                                        <td class="font-mono text-muted text-xxs">${new Date(l.created_at || Date.now()).toLocaleString()}</td>
                                        <td><strong>${u.name}</strong></td>
                                        <td><span class="badge badge-submitted">${l.action}</span></td>
                                        <td><span class="badge badge-planning">${l.module}</span></td>
                                        <td class="text-dark">${l.details}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    exportProjectsCSV() {
        const user = window.auth.getCurrentUser();
        let projects = window.db.get("projects");
        if (user.role === 'project_manager') {
            projects = projects.filter(p => p.pm_id === user.id);
        }

        const hasFinance = window.auth.hasPermission("view_project_finance_summary");
        
        let headers = ["Project Code", "Project Name", "Client / Owner", "Location", "Type", "Progress", "Status"];
        if (hasFinance) {
            headers = ["Project Code", "Project Name", "Client / Owner", "Location", "Type", "Contract Value", "Budget", "Actual Cost", "Progress", "Status"];
        }

        const data = projects.map(p => {
            if (hasFinance) {
                return [
                    p.code,
                    window.t(p.name),
                    p.client,
                    window.t(p.location),
                    window.t(p.type),
                    p.contract_value + " " + p.currency,
                    p.budget + " " + p.currency,
                    p.actual_cost + " " + p.currency,
                    p.progress_percent + "%",
                    window.t(p.status)
                ];
            } else {
                return [
                    p.code,
                    window.t(p.name),
                    p.client,
                    window.t(p.location),
                    window.t(p.type),
                    p.progress_percent + "%",
                    window.t(p.status)
                ];
            }
        });
        window.utils.exportToCSV("EPC_Projects_Summary", headers, data);
    }

    exportFinanceCSV() {
        const records = window.db.get("finance_records");
        const headers = ["ID", "Date", "Project Code", "Type", "Category", "Amount", "Currency", "Description"];
        const data = records.map(r => {
            const p = window.db.get("projects").find(x => x.id === r.project_id) || { code: "SYSTEM" };
            return [
                r.id,
                r.date,
                p.code,
                window.t(r.type),
                window.t(r.category),
                r.amount,
                r.currency,
                r.description
            ];
        });
        window.utils.exportToCSV("EPC_Finance_Ledger", headers, data);
    }

    exportAllowancesCSV() {
        const records = window.db.get("allowance_bonus");
        const headers = ["ID", "Employee", "Type", "Amount", "Currency", "Date", "Reason", "Status"];
        const data = records.map(r => {
            const emp = window.db.get("users").find(x => x.id === r.employee_id) || { name: "Unknown" };
            return [
                r.id,
                emp.name,
                window.t(r.type),
                r.amount,
                r.currency,
                r.date,
                r.reason,
                window.t(r.status)
            ];
        });
        window.utils.exportToCSV("EPC_Allowances_Claims", headers, data);
    }

    exportAuditsCSV() {
        const logs = window.db.get("audit_logs");
        const headers = ["ID", "Timestamp", "User", "Module", "Action", "Details"];
        const data = logs.map(l => {
            const u = window.db.get("users").find(x => x.id === l.user_id) || { name: l.user_id };
            return [
                l.id,
                l.created_at || "",
                u.name,
                l.module,
                l.action,
                l.details
            ];
        });
        window.utils.exportToCSV("EPC_System_Audits", headers, data);
    }

    renderUsersPage(container) {
        if (!window.auth.hasPermission("manage_users")) {
            container.innerHTML = this.renderPermissionDenied();
            return;
        }

        const users = window.db.get("users");
        
        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 no-print">
                <h3 class="card-title text-primary">${window.t('personnel_registry')}</h3>
                <button class="btn btn-primary btn-sm" onclick="window.ui.openAddUserModal()">
                    + ${window.t('add_user')}
                </button>
            </div>

            <div class="table-container card">
                <table class="table">
                    <thead>
                        <tr>
                            <th>${window.t('active_user_label')}</th>
                            <th>${window.t('employee_name')}</th>
                            <th>Email</th>
                            <th>${window.t('location')} (${window.t('qty')})</th>
                            <th>${window.t('department')}</th>
                            <th>${window.t('role_permission')}</th>
                            <th>${window.t('status')}</th>
                            <th class="no-print">${window.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => {
                            const isActive = u.status === "active";
                            const statusText = isActive ? window.t('active') : window.t('inactive');
                            const statusBadgeClass = isActive ? "badge-completed" : "badge-draft";
                            
                            return `
                                <tr>
                                    <td><span style="font-size: 20px;">${u.avatar || '👤'}</span></td>
                                    <td class="font-bold text-dark">${u.name}</td>
                                    <td class="font-mono text-muted text-xs">${u.email}</td>
                                    <td class="text-xs text-muted">${u.phone || 'N/A'}</td>
                                    <td><strong>${u.department}</strong></td>
                                    <td><span class="user-role-badge badge-role-${u.role}">${window.t(u.role).toUpperCase()}</span></td>
                                    <td><span class="badge ${statusBadgeClass}">${statusText}</span></td>
                                    <td class="no-print">
                                        <div class="flex gap-2">
                                            <button class="btn btn-secondary btn-xs" onclick="window.ui.openEditUserModal('${u.id}')">
                                                    ${window.t('edit')}
                                            </button>
                                            ${isActive ? `
                                                <button class="btn btn-danger btn-xs" onclick="window.ui.toggleUserStatus('${u.id}', 'inactive')">
                                                    ${window.t('deactivate')}
                                                </button>
                                            ` : `
                                                <button class="btn btn-success btn-xs" onclick="window.ui.toggleUserStatus('${u.id}', 'active')">
                                                    ${window.t('activate')}
                                                </button>
                                            `}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    toggleUserStatus(id, newStatus) {
        const u = window.db.get("users").find(x => x.id === id);
        if (!u) return;

        if (u.role === "super_admin" && newStatus === "inactive" && window.auth.isLastActiveSuperAdmin(id)) {
            alert(window.t('last_admin_warning'));
            window.utils.showToast(window.t('last_admin_warning'), "error");
            return;
        }

        window.db.update("users", id, { status: newStatus });
        window.utils.logAudit("USER_STATUS_TOGGLED", "admin", `Toggled user ${id} status to ${newStatus}`);
        window.utils.showToast(window.t('user_updated'), "success");
        
        window.app.mountRoleSwitcher();
        this.renderUsersPage(document.getElementById("main-content-viewport"));
    }

    openAddUserModal() {
        const formHTML = `
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">${window.t('employee_name')}</label>
                <input type="text" id="m-au-name" class="form-input btn-full" placeholder="e.g. Somsack Sygnaloun">
            </div>
            <div class="form-group mb-3">
                <label class="form-label block text-xs mb-1">Email</label>
                <input type="email" id="m-au-email" class="form-input btn-full" placeholder="e.g. somsack@epc-laos.com">
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('location')} (${window.t('qty')})</label>
                    <input type="text" id="m-au-phone" class="form-input btn-full" placeholder="e.g. +856 20 5558 1111">
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('department')}</label>
                    <input type="text" id="m-au-dept" class="form-input btn-full" placeholder="e.g. Electrical Engineering">
                </div>
            </div>
            <div class="grid-2 gap-3 mb-3">
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">${window.t('role_permission')}</label>
                    <select id="m-au-role" class="form-select btn-full">
                        <option value="engineer">${window.t('engineer')}</option>
                        <option value="project_manager">${window.t('project_manager')}</option>
                        <option value="finance_manager">${window.t('finance_manager')}</option>
                        <option value="procurement">${window.t('procurement')}</option>
                        <option value="deputy_md">${window.t('deputy_md')}</option>
                        <option value="super_admin">${window.t('super_admin')}</option>
                        <option value="viewer">${window.t('viewer')}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label block text-xs mb-1">Avatar / Emoji</label>
                    <select id="m-au-avatar" class="form-select btn-full">
                        <option value="👤">👤 Engineer</option>
                        <option value="👤">👤 PM / Developer</option>
                        <option value="👤">👤 Manager</option>
                        <option value="👤">👤 Executive</option>
                        <option value="👤">👤 Viewer</option>
                    </select>
                </div>
            </div>
        `;

        this.openModal(window.t('add_user'), formHTML, () => {
            const name = document.getElementById("m-au-name").value;
            const email = document.getElementById("m-au-email").value;
            const phone = document.getElementById("m-au-phone").value;
            const dept = document.getElementById("m-au-dept").value;
            const role = document.getElementById("m-au-role").value;
            const avatar = document.getElementById("m-au-avatar").value;

            if (!name || !email) {
                window.utils.showToast(window.t('name_required'), "error");
                return false;
            }

            const id = "u-" + (Date.now() % 100000);
            window.db.add("users", {
                id, name, email, role, department: dept, avatar, status: "active", phone
            });

            window.utils.logAudit("USER_CREATED", "admin", `Created new user ${name} (${role})`);
            window.utils.showToast(window.t('user_updated'), "success");
            
            window.app.mountRoleSwitcher();
            this.renderUsersPage(document.getElementById("main-content-viewport"));
            return true;
        });
    }

    renderSettingsPage(container) {
        const user = window.auth.getCurrentUser();
        const currentLang = window.i18n.getLang();
        const isSuperAdmin = user.role === "super_admin";

        let deletionHistoryHTML = "";
        let resetHistoryHTML = "";

        if (isSuperAdmin) {
            // Get deletion history
            let delHistory = [];
            try {
                delHistory = JSON.parse(localStorage.getItem("epc_laos_db_deletion_history")) || [];
            } catch(e) {}

            delHistory.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

            deletionHistoryHTML = `
                <div class="card p-4 mb-4">
                    <h3 class="card-title text-error mb-2">🗑 Deletion History & Archived Records</h3>
                    <p class="text-xs text-muted mb-3">Audit logs of all soft-deleted records across the system.</p>
                    <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                        <table class="table text-xs">
                            <thead>
                                <tr>
                                    <th>Date/Time</th>
                                    <th>Deleted By</th>
                                    <th>Project</th>
                                    <th>Details</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${delHistory.length === 0 ? `
                                    <tr><td colspan="5" class="text-center p-3 text-muted">No deletion logs found.</td></tr>
                                ` : delHistory.map(h => `
                                    <tr>
                                        <td class="font-mono text-xxs" style="white-space: nowrap;">${window.utils.formatDate(h.deleted_at)}</td>
                                        <td class="text-xs text-bold">${h.user_name} (${window.t(h.user_role)})</td>
                                        <td class="text-xs">${h.project_name || 'N/A'}</td>
                                        <td class="text-xs text-bold">${h.details}</td>
                                        <td class="text-xs italic text-muted">${h.reason}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Get reset history
            let resetHistory = [];
            try {
                resetHistory = JSON.parse(localStorage.getItem("epc_laos_db_reset_history")) || [];
            } catch(e) {}

            resetHistory.sort((a, b) => new Date(b.reset_at) - new Date(a.reset_at));

            resetHistoryHTML = `
                <div class="card p-4 mb-4">
                    <h3 class="card-title text-dark mb-2">🔄 Database Reset History</h3>
                    <p class="text-xs text-muted mb-3">Audit logs of all clean wipes and database resets performed.</p>
                    <div class="table-container" style="max-height: 250px; overflow-y: auto;">
                        <table class="table text-xs">
                            <thead>
                                <tr>
                                    <th>Date/Time</th>
                                    <th>Performed By</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resetHistory.length === 0 ? `
                                    <tr><td colspan="3" class="text-center p-3 text-muted">No reset logs found.</td></tr>
                                ` : resetHistory.map(h => `
                                    <tr>
                                        <td class="font-mono text-xxs" style="white-space: nowrap;">${window.utils.formatDate(h.reset_at)}</td>
                                        <td class="text-xs text-bold">${h.user_name} (${window.t(h.user_role)})</td>
                                        <td class="text-xs">Database wiped and restored to default version. Backup file generated.</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="card p-4 mb-4">
                <h3 class="card-title text-primary mb-2">${window.t('settings')}</h3>
                <p class="text-xs text-muted mb-4">${window.t('settings_desc')}</p>

                <div class="border-t pt-4 mb-4">
                    <h4 class="font-bold text-dark text-xs mb-2">${window.t('language')}</h4>
                    <p class="text-xxs text-muted mb-3">${window.t('i18n_desc')}</p>
                    <div style="max-width: 250px;">
                        <select id="settings-lang-switcher" class="form-select text-xs btn-full" onchange="window.i18n.setLang(this.value)">
                            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                            <option value="zh" ${currentLang === 'zh' ? 'selected' : ''}>中文 (Chinese)</option>
                            <option value="th" ${currentLang === 'th' ? 'selected' : ''}>ไทย (Thai)</option>
                        </select>
                    </div>
                </div>

                <div class="border-t pt-4 mb-4">
                    <h4 class="font-bold text-dark text-xs mb-2">${window.t('theme_config')}</h4>
                    <p class="text-xxs text-muted mb-3">${window.t('theme_desc')}</p>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary btn-sm" onclick="document.body.classList.remove('dark-theme'); localStorage.setItem('epc_dark_theme', 'false'); window.utils.showToast(window.t('light_mode'), 'info');">
                            ${window.t('light_mode')}
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="document.body.classList.add('dark-theme'); localStorage.setItem('epc_dark_theme', 'true'); window.utils.showToast(window.t('dark_mode'), 'info');">
                            ${window.t('dark_mode')}
                        </button>
                    </div>
                </div>

                ${window.auth.hasPermission('manage_backup') ? `
                <div class="border-t pt-4 mb-4">
                    <h4 class="font-bold text-dark text-xs mb-2">${window.t('download')} ${window.t('backup_settings_title')}</h4>
                    <p class="text-xxs text-muted mb-3">${window.t('backup_settings_desc')}</p>
                    <div class="flex gap-2 mb-2">
                        <button class="btn btn-primary btn-sm" onclick="window.ui.triggerBackupDownload()">
                            ${window.t('download_backup')}
                        </button>
                        <label class="btn btn-secondary btn-sm" style="display: inline-block; cursor: pointer; text-align: center;">
                            ${window.t('restore_backup')}
                            <input type="file" id="backup-restore-input" style="display: none;" accept=".json" onchange="window.ui.handleRestoreUpload(this)">
                        </label>
                    </div>
                    <div class="text-xxs text-muted mt-2" id="backup-last-date-display">
                        ${window.t('last_backup_date')}: ${localStorage.getItem('epc_laos_db_last_backup_date') ? window.utils.formatDate(localStorage.getItem('epc_laos_db_last_backup_date')) : 'N/A'}
                    </div>
                </div>
                ` : ''}

                <div class="border-t pt-4 mb-4">
                    <h4 class="font-bold text-dark text-xs mb-2">${window.t('i18n_future')}</h4>
                    <p class="text-xxs text-muted mb-3">Structured for future deployment of Lao (lo) and Thai (th) extensions for local contractor tracking.</p>
                </div>

                ${isSuperAdmin ? `
                <div class="border-t pt-4">
                    <h4 class="font-bold text-error text-xs mb-2">⚠ ${window.t('reset_db')}</h4>
                    <p class="text-xxs text-muted mb-3">${window.t('reset_desc')}</p>
                    <button class="btn btn-danger btn-sm" onclick="window.ui.handleResetDatabase()">
                        ${window.t('reset_btn')}
                    </button>
                </div>
                ` : ''}
            </div>

            ${deletionHistoryHTML}

            ${resetHistoryHTML}

            <div class="card p-4 text-center flex-col items-center justify-center">
                <h3 class="text-bold text-primary" style="font-size: 14px;">${window.t('company_name')}</h3>
                <span class="text-xs text-muted block mt-1">Vientiane Capital, Lao PDR</span>
                <span class="text-xxs text-light block mt-2">© 2026 LANXANG POWER ENGINEERING SOLE CO., LTD. All Rights Reserved.</span>
            </div>
        `;
    }

    handleResetDatabase() {
        const currentUser = window.auth.getCurrentUser();
        if (!currentUser || currentUser.role !== "super_admin") {
            window.utils.showToast("Permission Denied: Only Super Admin can perform database reset.", "error");
            return;
        }

        const password = prompt("Enter Super Admin password to confirm database reset:");
        if (password === null) return;
        if (password !== "admin123" && password !== "password") {
            window.utils.showToast("Incorrect password! Database reset aborted.", "error");
            return;
        }

        if (confirm("WARNING: Are you sure you want to clean wipe all local data? This will restore initial mock values.")) {
            this.triggerBackupDownload();

            let resetHistory = [];
            try {
                resetHistory = JSON.parse(localStorage.getItem("epc_laos_db_reset_history")) || [];
            } catch(e) {}

            let delHistory = [];
            try {
                delHistory = JSON.parse(localStorage.getItem("epc_laos_db_deletion_history")) || [];
            } catch(e) {}

            resetHistory.push({
                id: `reset-${Date.now()}`,
                user_name: currentUser.name,
                user_role: currentUser.role,
                reset_at: new Date().toISOString()
            });

            window.db.reset();

            localStorage.setItem("epc_laos_db_reset_history", JSON.stringify(resetHistory));
            localStorage.setItem("epc_laos_db_deletion_history", JSON.stringify(delHistory));

            window.utils.showToast("Database successfully reset!", "success");
            
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    openBackupReminderModal() {
        const cancelBtn = document.getElementById("modal-cancel-btn");
        const submitBtn = document.getElementById("modal-submit-action-btn");
        
        if (cancelBtn) cancelBtn.textContent = window.t('remind_later');
        if (submitBtn) submitBtn.textContent = window.t('backup_now');
        
        const bodyHTML = `
            <div class="text-center p-4">
                <span style="font-size: 54px; display: block; margin-bottom: 16px;">${window.t('download')}</span>
                <p class="text-sm font-bold text-dark mb-2" style="font-size: 15px;">${window.t('backup_reminder_title')}</p>
                <p class="text-xs text-muted" style="line-height: 1.4;">${window.t('backup_reminder_text')}</p>
            </div>
        `;
        
        this.openModal(window.t('auto_backup_reminder'), bodyHTML, () => {
            this.triggerBackupDownload();
            return true;
        });
    }

    async triggerBackupDownload() {
        try {
            window.utils.showToast("Exporting database backup...", "info");
            const backupData = await window.utils.apiCall('/backup/export');
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const filename = `lxp_project_control_backup_${yyyy}-${mm}-${dd}_${hh}-${min}.json`;
            
            dlAnchorElem.setAttribute("download", filename);
            document.body.appendChild(dlAnchorElem);
            dlAnchorElem.click();
            document.body.removeChild(dlAnchorElem);
            
            localStorage.setItem("epc_laos_db_last_backup_date", now.toISOString());
            const displayEl = document.getElementById("backup-last-date-display");
            if (displayEl) {
                displayEl.innerHTML = `${window.t('last_backup_date') || 'Last Backup Date'}: ${window.utils.formatDate(now.toISOString())}`;
            }

            window.utils.showToast(window.t('backup_success') || "Backup downloaded successfully", "success");
        } catch (err) {
            console.error("Backup export failed:", err);
            window.utils.showToast(err.message || "Failed to download backup", "error");
        }
    }
    
    async handleRestoreUpload(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        
        const warningText = window.t('restore_warning') || "Restoring backup will replace current database. Please make sure you already saved the current data.";
        const confirmRestore = confirm(warningText);
        if (!confirmRestore) {
            input.value = "";
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                
                window.utils.showToast("Restoring database...", "info");
                const res = await window.utils.apiCall('/backup/restore', {
                    method: 'POST',
                    body: JSON.stringify(backupData)
                });
                
                window.utils.showToast(res.message || "Database successfully restored", "success");
                
                // Clear file input
                input.value = "";
                
                // Force sync and reload dashboard
                await window.db.sync();
                this.navigateTo("dashboard");
            } catch (err) {
                console.error("Database restoration error:", err);
                alert("Restoration failed: " + err.message);
                window.utils.showToast("Invalid backup file or restore failed", "error");
                input.value = "";
            }
        };
        reader.readAsText(file);
    }
}

// Global UI Singleton
window.ui = new UIManager();
console.log("EPC Laos UI module upgraded successfully with 100% translation drivers!");
