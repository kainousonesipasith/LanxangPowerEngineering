/**
 * EPC Laos Project Control & Finance Monitoring App - Main Application Orchestrator (Upgraded)
 */

class AppController {
    constructor() {
        this.isLoggedIn = true;
    }

    start() {
        try {
            // Translate sidebar menus dynamically on start
            this.translateSidebarMenus();
            
            // Only mount floating role switcher in demo/developer mode
            if (localStorage.getItem("epc_demo_mode") === "true") {
                this.mountRoleSwitcher();
            }
            
            this.bindEvents();
            
            // Load initial state
            const currentUser = window.auth.getCurrentUser();
            if (currentUser) {
                console.log(`Application started. Active user: ${currentUser.name} (${currentUser.role})`);
            } else {
                console.log(`Application started in guest mode.`);
            }
            
            // Dynamic notifications and backup reminder checks
            this.checkBackupReminder();
            
            // Check connectivity to backend API
            this.verifyAPIConnection();
            
            // Initial render with fallback safety
            if (window.ui && typeof window.ui.navigateTo === 'function') {
                window.ui.navigateTo("dashboard");
            } else {
                console.error("UIManager.navigateTo is not available.");
            }
        } catch (err) {
            console.error("Error during app boot start sequence:", err);
            if (window.showRescueUI) {
                window.showRescueUI(err);
            }
        }
    }

    checkBackupReminder() {
        try {
            const user = window.auth.getCurrentUser();
            if (user && user.role === "super_admin") {
                const lastBackupDate = localStorage.getItem("epc_laos_db_last_backup_date");
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (!lastBackupDate || (Date.now() - new Date(lastBackupDate).getTime()) > sevenDays) {
                    // Brief timeout to let the view render first
                    setTimeout(() => {
                        if (window.ui && typeof window.ui.openBackupReminderModal === 'function') {
                            window.ui.openBackupReminderModal();
                        }
                    }, 1500);
                }
            }
        } catch (err) {
            console.error("Error checking backup reminder:", err);
        }
    }

    translateSidebarMenus() {
        try {
            document.querySelectorAll(".sidebar-nav-link").forEach(link => {
                const tab = link.dataset.tab;
                const textSpan = link.querySelector("span:not(.sidebar-nav-icon)");
                if (textSpan && tab) {
                    textSpan.textContent = window.t(tab);
                }
            });
            
            // Dynamic title in sidebar header
            const companySub = document.querySelector(".sidebar-company-subtitle");
            if (companySub) {
                companySub.textContent = "LANXANG POWER ENGINEERING SOLE CO., LTD";
            }

            // Translate modal footer buttons dynamically
            const cancelBtn = document.getElementById("modal-cancel-btn");
            if (cancelBtn) cancelBtn.textContent = window.t('cancel');
            const saveBtn = document.getElementById("modal-submit-action-btn");
            if (saveBtn) saveBtn.textContent = window.t('save');
        } catch (err) {
            console.error("Error translating sidebar menus:", err);
        }
    }

    bindEvents() {
        // Intercept sidebar clicks
        document.querySelectorAll(".sidebar-nav-link").forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                
                // Route restriction checking
                if (tab === "users" && !window.auth.hasPermission("manage_users")) {
                    window.utils.showToast(window.t('permission_denied'), "error");
                    return;
                }
                if (tab === "finance" && !window.auth.hasPermission("view_finance_summary")) {
                    window.utils.showToast(window.t('permission_denied'), "error");
                    return;
                }
                if (tab === "payment_requests" && (window.auth.getCurrentUser().role === "viewer" || window.auth.getCurrentUser().role === "engineer")) {
                    window.utils.showToast(window.t('permission_denied'), "error");
                    return;
                }
                if (tab === "procurement" && !window.auth.hasPermission("view_procurement")) {
                    window.utils.showToast(window.t('permission_denied'), "error");
                    return;
                }

                if (window.ui && typeof window.ui.navigateTo === 'function') {
                    window.ui.navigateTo(tab);
                } else {
                    console.error("UIManager navigation not available for tab:", tab);
                }
            });
        });

        // Listen for role changes
        window.addEventListener("epc-role-changed", (e) => {
            try {
                const user = e.detail;
                window.utils.showToast(`${window.t('welcome')}: ${user.name} (${window.t(user.role).toUpperCase()})`, "info");
                
                // Sync sidebar links visibility based on roles permissions
                this.adjustSidebarLinksVisibility(user.role);

                // Re-render current page to apply new permissions immediately
                if (window.ui) {
                    if (typeof window.ui.renderActiveView === 'function') {
                        window.ui.renderActiveView();
                    }
                    if (typeof window.ui.updateHeader === 'function') {
                        window.ui.updateHeader();
                    }
                }

                // Run backup reminder check on role switch
                this.checkBackupReminder();
            } catch (err) {
                console.error("Error processing role switch event:", err);
            }
        });

        // Global modal close triggers
        const closeModalBtn = document.getElementById("modal-close-btn");
        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", () => {
                if (window.ui && typeof window.ui.closeModal === 'function') {
                    window.ui.closeModal();
                }
            });
        }
        
        const modalBackdrop = document.getElementById("modal-backdrop-overlay");
        if (modalBackdrop) {
            modalBackdrop.addEventListener("click", (e) => {
                if (e.target === modalBackdrop) {
                    if (window.ui && typeof window.ui.closeModal === 'function') {
                        window.ui.closeModal();
                    }
                }
            });
        }
    }

    adjustSidebarLinksVisibility(role) {
        document.querySelectorAll(".sidebar-nav-link").forEach(link => {
            const tab = link.dataset.tab;
            
            if (tab === "users") {
                if (role !== "super_admin") {
                    link.style.display = "none";
                } else {
                    link.style.display = "flex";
                }
            } else if (tab === "finance") {
                if (role !== "super_admin" && role !== "finance_manager" && role !== "deputy_md" && role !== "project_manager") {
                    link.style.display = "none";
                } else {
                    link.style.display = "flex";
                }
            } else if (tab === "payment_requests") {
                if (role === "viewer") {
                    link.style.display = "none";
                } else {
                    link.style.display = "flex";
                }
            } else if (tab === "procurement") {
                if (!window.auth.hasPermission("view_procurement")) {
                    link.style.display = "none";
                } else {
                    link.style.display = "flex";
                }
            } else if (tab === "allowance_bonus") {
                if (role === "viewer") {
                    link.style.display = "none";
                } else {
                    link.style.display = "flex";
                }
            } else {
                link.style.display = "flex";
            }
        });
    }

    // Dynamic floating role switcher at bottom right
    mountRoleSwitcher() {
        try {
            let switcher = document.getElementById("floating-role-switcher-container");
            if (switcher) switcher.remove();

            switcher = document.createElement("div");
            switcher.id = "floating-role-switcher-container";
            switcher.className = "role-switcher-widget";

            const users = (window.db && typeof window.db.get === "function") ? window.db.get("users") : [];
            const activeUser = (window.auth && typeof window.auth.getCurrentUser === "function") ? window.auth.getCurrentUser() : null;

            if (!activeUser || !users || users.length === 0) {
                console.warn("Defensive check failed: users or active user undefined. Skipping switcher mounting.");
                return;
            }

            switcher.innerHTML = `
                <div class="role-switcher-header no-print">
                    <span>🔄 ${window.t('switch_demo') || 'Switch Profile'}</span>
                    <span class="role-switcher-toggle-icon">▲</span>
                </div>
                <div class="role-switcher-dropdown">
                    <p class="role-switcher-desc-text">${window.t('select_demo_desc') || 'Select profile for simulation:'}</p>
                    <div class="role-switcher-list">
                        ${users.map(u => {
                            const name = u.name || 'Unknown';
                            const avatar = u.avatar || '👤';
                            const roleName = u.role ? (window.t(u.role) || u.role).toUpperCase() : 'UNKNOWN';
                            const isActive = activeUser && u.id === activeUser.id;
                            return `
                                <button class="role-switcher-btn ${isActive ? 'active-profile' : ''}" data-user-id="${u.id || ''}">
                                    <span class="role-switcher-avatar">${avatar}</span>
                                    <div class="role-switcher-text text-left">
                                        <span class="role-switcher-name font-bold block">${name}</span>
                                        <span class="role-switcher-role font-xs text-muted block">${roleName}</span>
                                    </div>
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            document.body.appendChild(switcher);

            const header = switcher.querySelector(".role-switcher-header");
            const dropdown = switcher.querySelector(".role-switcher-dropdown");
            const toggleIcon = switcher.querySelector(".role-switcher-toggle-icon");

            if (header && dropdown && toggleIcon) {
                header.addEventListener("click", () => {
                    dropdown.classList.toggle("open");
                    toggleIcon.textContent = dropdown.classList.contains("open") ? "▼" : "▲";
                });
            }

            switcher.querySelectorAll(".role-switcher-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const userId = btn.dataset.userId;
                    if (userId && window.auth && typeof window.auth.loginAs === "function") {
                        window.auth.loginAs(userId);
                        
                        switcher.querySelectorAll(".role-switcher-btn").forEach(b => b.classList.remove("active-profile"));
                        btn.classList.add("active-profile");
                        
                        if (dropdown) dropdown.classList.remove("open");
                        if (toggleIcon) toggleIcon.textContent = "▲";
                    }
                });
            });

            if (activeUser && activeUser.role) {
                this.adjustSidebarLinksVisibility(activeUser.role);
            }
        } catch (err) {
            console.error("Defensive catch: Error mounting role switcher:", err);
        }
    }

    async verifyAPIConnection() {
        let baseUrl = localStorage.getItem("epc_api_base_url");
        if (!baseUrl) {
            const isAndroid = navigator.userAgent.toLowerCase().includes("android");
            baseUrl = isAndroid ? "http://192.168.100.131:3000/api" : "http://localhost:3000/api";
        }
        
        console.log(`[EPC BOOT] Verifying connection to backend at: ${baseUrl}/health`);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout
            
            const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log(`[EPC BOOT] Backend is online!`);
                const errorBanner = document.getElementById("api-connection-error-banner");
                if (errorBanner) errorBanner.style.display = "none";
            } else {
                throw new Error("HTTP Status " + response.status);
            }
        } catch (err) {
            console.error(`[EPC BOOT] Connection to backend failed:`, err);
            
            // Periodically check for the login page container and insert the banner
            let attempts = 0;
            const insertInterval = setInterval(() => {
                attempts++;
                const loginContainer = document.querySelector(".login-page-container");
                if (loginContainer) {
                    clearInterval(insertInterval);
                    let errorBanner = document.getElementById("api-connection-error-banner");
                    if (!errorBanner) {
                        errorBanner = document.createElement("div");
                        errorBanner.id = "api-connection-error-banner";
                        errorBanner.style.cssText = "background: #fee2e2; border: 1px solid #ef4444; color: #b91c1c; padding: 12px; margin-bottom: 20px; border-radius: 8px; font-size: 12px; text-align: left; line-height: 1.4; box-shadow: 0 4px 6px rgba(0,0,0,0.05); width: 100%;";
                        loginContainer.insertBefore(errorBanner, loginContainer.firstChild);
                    }
                    errorBanner.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 4px;">⚠️ Connection Error (Cannot Connect to API Server)</div>
                        <div>Unable to connect to the backend API at <strong style="word-break: break-all;">${baseUrl}</strong>. Please check:</div>
                        <ul style="margin: 4px 0 0 16px; padding: 0; list-style-type: disc;">
                            <li>Is the Node.js backend server running?</li>
                            <li>Is your phone on the same Wi-Fi LAN network?</li>
                            <li>Is your firewall allowing port 3000?</li>
                            <li>Update the API URL field below and retry.</li>
                        </ul>
                    `;
                } else if (attempts > 30) { // Stop attempting after 3 seconds
                    clearInterval(insertInterval);
                }
            }, 100);
        }
    }
}

// Global Rescue UI function
window.showRescueUI = function(error) {
    let rescueDiv = document.getElementById("rescue-system-overlay");
    if (!rescueDiv) {
        rescueDiv = document.createElement("div");
        rescueDiv.id = "rescue-system-overlay";
        rescueDiv.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,23,42,0.95); color: #fff; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;";
        rescueDiv.innerHTML = `
            <div style="max-width: 500px; background: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #3b82f6; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <span style="font-size: 64px; display: block; margin-bottom: 20px;">⚠️</span>
                <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #f87171;">System Recovery Console</h2>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">The system failed to initialize due to a critical application error or corrupted database structure. Please click below to reset the demo data.</p>
                <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; color: #f87171; text-align: left; margin-bottom: 24px; overflow-x: auto; max-height: 150px; border: 1px solid rgba(255,255,255,0.05); white-space: pre-wrap; word-break: break-all;">
                    ${error ? error.stack || error.message || error : 'Unknown startup initialization failure.'}
                </div>
                <button onclick="window.handleRescueReset()" style="background: #3b82f6; color: #fff; border: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.2s;">
                    🔄 Reset Demo Data
                </button>
            </div>
        `;
        document.body.appendChild(rescueDiv);
    }
};

window.handleRescueReset = function() {
    try {
        localStorage.clear();
        localStorage.setItem("epc_laos_db_initialized", "true");
        if (window.db && typeof window.db.reset === "function") {
            window.db.reset();
        }
        localStorage.setItem("epc_logged_in", "false");
        window.location.reload();
    } catch (e) {
        alert("Reset failed: " + e.message);
        localStorage.clear();
        window.location.reload();
    }
};

// Global error listener to catch syntax/runtime errors on load
window.addEventListener("error", (event) => {
    console.error("Caught global execution error:", event.error);
    // Only show rescue overlay if the app hasn't successfully initialized
    if (!window.app || !window.app.isInitialized) {
        window.showRescueUI(event.error);
    }
});

// Instantiate and start on load
window.addEventListener("DOMContentLoaded", () => {
    try {
        // Remove fallback loading/error screen immediately upon successful boot parsing
        const loadingFallback = document.getElementById("app-loading-fallback");
        if (loadingFallback) {
            loadingFallback.remove();
        }

        window.app = new AppController();
        window.app.start();
        window.app.isInitialized = true;
    } catch (error) {
        console.error("Critical error starting application:", error);
        window.showRescueUI(error);
    }
});
console.log("EPC Laos App controller upgraded successfully with System Recovery checks!");
