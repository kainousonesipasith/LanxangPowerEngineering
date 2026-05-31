/**
 * EPC Laos Project Control & Finance Monitoring App - Utilities Module (Upgraded)
 */

class UtilsService {
    // API client caller wrapper with automatic JWT authorization and base URL routing
    async apiCall(endpoint, options = {}) {
        let baseUrl = localStorage.getItem("epc_api_base_url");
        if (!baseUrl) {
            baseUrl = "https://lanxangpowerengineering.onrender.com/api";
        }
        
        const url = `${baseUrl}${endpoint}`;
        const headers = options.headers || {};
        
        const token = localStorage.getItem("epc_laos_auth_token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        
        if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }
        
        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error || `HTTP error: ${response.status}`;
                throw new Error(errMsg);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Call failed [${endpoint}]:`, error);
            this.showToast(error.message, "error");
            throw error;
        }
    }

    // Calculate ISO Week Number dynamically
    getWeekNumber(date = new Date()) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }

    // Show a beautiful notification toast at the top right (translates message if key exists)
    showToast(message, type = "success") {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            document.body.appendChild(container);
        }

        const translatedMessage = window.t(message) || message;

        const toast = document.createElement("div");
        toast.className = `toast toast-${type} fade-in`;
        
        let icon = "🔔";
        if (type === "success") icon = "✅";
        else if (type === "error") icon = "❌";
        else if (type === "warning") icon = "⚠️";
        else if (type === "info") icon = "ℹ️";

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${translatedMessage}</span>
            </div>
            <button class="toast-close-btn">&times;</button>
        `;

        container.appendChild(toast);

        // Bind close button
        toast.querySelector(".toast-close-btn").addEventListener("click", () => {
            toast.classList.remove("fade-in");
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 300);
        });

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove("fade-in");
                toast.classList.add("fade-out");
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // Logger for important actions
    async logAudit(action, module, details) {
        console.log(`[AUDIT LOG] [${module}] [${action}]: ${details}`);
        try {
            await this.apiCall('/audit', {
                method: 'POST',
                body: JSON.stringify({ action, module, details })
            });
        } catch (e) {
            console.error("Failed to post audit log to backend:", e);
        }
    }

    // Standard date formatter
    formatDate(dateStr) {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Helper to calculate progress color class
    getProgressColorClass(percent) {
        if (percent < 30) return "progress-low";
        if (percent < 75) return "progress-mid";
        return "progress-high";
    }

    // Helper to calculate project status badge with full i18n support
    getStatusBadge(status) {
        const text = window.t(status) || status;
        return `<span class="badge badge-${status}">${text}</span>`;
    }

    // Export tabular data to CSV (Excel compatible)
    exportToCSV(filename, headers, dataArray) {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for proper Excel UTF-8 display
        
        // Add headers
        csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\r\n";
        
        // Add rows
        dataArray.forEach(row => {
            const rowStr = row.map(cell => {
                const cellStr = cell === null || cell === undefined ? "" : String(cell);
                return `"${cellStr.replace(/"/g, '""')}"`;
            }).join(",");
            csvContent += rowStr + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast(window.t('export_success') + " " + filename + ".csv", "success");
    }

    // Print elements or views as high-fidelity simulated PDFs
    exportToPDF(elementId, title) {
        const element = document.getElementById(elementId);
        if (!element) {
            this.showToast(window.t('export_target_not_found'), "error");
            return;
        }

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body {
                        font-family: 'Inter', system-ui, sans-serif;
                        color: #1e293b;
                        padding: 40px;
                        background: #fff;
                    }
                    .print-header {
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .print-header h1 {
                        margin: 0;
                        font-size: 24px;
                        color: #0f172a;
                    }
                    .print-header p {
                        margin: 5px 0 0 0;
                        color: #64748b;
                        font-size: 14px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                        font-size: 12px;
                    }
                    th, td {
                        border: 1px solid #e2e8f0;
                        padding: 10px 12px;
                        text-align: left;
                    }
                    th {
                        background: #f8fafc;
                        font-weight: 600;
                        color: #0f172a;
                    }
                    .badge {
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 10px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    .badge-completed { background: #dcfce7; color: #15803d; }
                    .badge-construction { background: #dbeafe; color: #1d4ed8; }
                    .badge-delayed { background: #fee2e2; color: #b91c1c; }
                    .card {
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                    }
                    .grid-2 {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                    }
                    .metric-title {
                        font-size: 11px;
                        color: #64748b;
                        text-transform: uppercase;
                        font-weight: 600;
                    }
                    .metric-val {
                        font-size: 18px;
                        font-weight: 700;
                        color: #0f172a;
                    }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header" style="display: flex; align-items: center; gap: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px;">
                    <div>
                        <h1 style="margin: 0; font-size: 20px; color: #0f172a;">${window.t('company_name')}</h1>
                        <h2 style="margin: 5px 0 0 0; font-size: 16px; font-weight: normal; color: #334155;">${title}</h2>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 11px;">Generated on ${new Date().toLocaleDateString()} | Project Control & Finance Monitoring System</p>
                    </div>
                </div>
                <div>
                    ${element.innerHTML}
                </div>
                <script>
                    window.onload = function() {
                        const inputs = document.querySelectorAll('input, button, select, .action-buttons, .form-controls, .no-print');
                        inputs.forEach(el => el.style.display = 'none');
                        window.print();
                        setTimeout(() => window.close(), 1000);
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        this.showToast(window.t('print_window_launched'), "info");
    }
}

// Global Utils Singleton
window.utils = new UtilsService();
console.log("EPC Laos Utilities module upgraded successfully!");
