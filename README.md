# EPC Laos Project Control & Finance Monitoring App (Upgraded MVP)

An enterprise-ready, high-fidelity **Single-Page Application (SPA)** designed for electrical EPC companies in Laos. The application enables seamless tracking of substations, transmission lines, and solar developments, integrating progress reporting, financial monitoring, payment approvals, employee claims, and a comprehensive **Procurement Module**.

---

## 🔑 Demo Access Profiles & Roles Matrix

This upgraded prototype features **8 distinct user profiles** representing the complete corporate hierarchy. Toggling any user in the **floating Switcher** at the bottom-right instantly swaps access permissions and updates metrics dashboards:

1. **Director 1 (Somphone Phomvihane)** & **Director 2 (Sengaloun Phimmasone)** — `Super Admin`
   * Full, unrestricted system permissions. Can manage users, assign roles, approve/reject all payment requests, post bulletins, and inspect the system audit trail.
2. **Anoulack Keoboualapha** — `Deputy Managing Director`
   * High-level supervisor. Can view all projects, finance logs, and procurement dashboards.
   * **Approval Threshold**: Authorized to approve payment requests and allowance claims **under $50,000 USD** (converted automatically). Requests exceeding this limit will trigger a blocker alert.
3. **Keooudone Syharath** — `Finance Manager`
   * Core finance controller. Can add/edit ledger transactions, prepare financial summaries, run budget compliance checks, and disburse funds.
4. **Vathsana Xayasing** — `Procurement Officer`
   * Procurement manager. Can log supplier quotations, generate PO numbers, and update shipping/delivery logistics.
5. **Anousone Sengdara** — `Project Manager`
   * Manages project operations. Can submit weekly progress reports, assign tasks, raise purchase requests (PRs), and request payment approvals.
6. **Bounmy Xayavong** — `Engineer / Site Crew`
   * Site operator. Updates assigned tasks status, reviews weekly schedules, and submits personal allowance/OT claims.
7. **Khamla Saysana** — `Viewer / Board Observer`
   * Read-only observer. Can check project progress timelines and corporate announcements but cannot add or edit data.

---

## ⚡ Key Upgraded Features

### 1. Multi-Language Switcher (EN / ZH / TH)
* **How to use**: At the top-right header (or System Settings), select between **English**, **中文 (Chinese Simplified)**, and **ไทย (Thai)** in the language dropdown menu.
* The system instantly translates all sidebars, tables, buttons, forms, status/priority badges, metrics, logs, comments, and alerts.
* Selected language choice persists in `localStorage` across page reloads.
* **Future scalability**: The codebase is pre-configured with Lao (`lo`) hooks inside `js/i18n.js`. Adding Lao is as simple as populating its dictionary block.

### 2. Last Super Admin Lockout Protection
* **How to test**: 
  1. Log in as **Director 1 (Super Admin)**. Go to **Personnel Profiles** in the sidebar.
  2. Locate **Director 2 (Sengaloun Phimmasone)** and click **Deactivate** or change her role to Engineer. (This will succeed since Director 1 remains active).
  3. Try to deactivate **Director 1 (yourself)** or change your role to Engineer. The system will **block the action**, trigger an alert warning you that "Cannot deactivate the last active Super Admin to prevent lockout."
  4. Try to remove the Super Admin role from Director 2 (while Director 1 is deactivated). The system will block it.
  5. The system also prompts a **warning confirmation** whenever you remove the Super Admin role from any user.

### 3. Procurement lifecycle Workflow
* **How to test**:
  1. **Step 1 (PM Request)**: Switch to **Project Manager Anousone Sengdara**. Go to **Procurement** -> **Purchase Requests** -> click **Initiate Purchase Request**. Request a "115kV Circuit Breaker" for Vangvieng Transmission Line, quantity 2, and save.
  2. **Step 2 (Quotation Collection)**: Switch to **Procurement Officer Vathsana Xayasing**. Go to **Procurement** -> **Supplier Quotations**. Locate the new PR, click **Collect Quotation**, input *Siemens Laos Co.*, quote amount `$42,000 USD`, attach *quote_115kv.pdf*, and submit.
  3. **Step 3 (Budget Check)**: Switch to **Finance Manager Keooudone Syharath**. Go to **Procurement** -> **PO Tracking**. Locate the record (marked as *quotation_received*), run verification, and click **Budget Check** to flag it *under_review*.
  4. **Step 4 (Executive Approval)**: Switch to **Deputy MD Anoulack Keoboualapha**. Locate the under-review item. Since the amount ($42,000 USD) is under your $50,000 USD limit, click **Approve** (it will succeed). If you try this with the pre-loaded Solar Panels request ($850,000 USD), you will receive a threshold warning blocking the approval.
  5. **Step 5 (Issue PO)**: Switch back to **Procurement Officer**. In **PO Tracking**, click **Create PO**. The system generates a PO number and sets status to *ordered*.
  6. **Step 6 (Deliver & Ledger)**: Go to **Procurement** -> **Delivery Status**. Click **Mark Shipped** (status: *in_transit*), and then **Mark Delivered**. 
  7. **Step 7 (Automated Ledger Sync)**: Navigate to **Finance Ledger** (or the project's details ledger). Note that a new expense record has been automatically logged under *material cost* with the PO number and `$42,000 USD` amount, actual project costs were recalculated, and all visual charts refreshed.

---

## 🚀 How to Run locally

1. Navigate to the project directory `/app`.
2. Double-click `index.html` to open it in your browser.
3. For administrative resets, go to **System Settings** -> click **Wipe & Reset Database** to clear custom changes and restore default projects.

---

## 🛠️ Production Cloud Migration Recommendations

When transitioning this prototype to a production environment:
1. **API Integration**: Swap out all `localStorage` reads/writes in `js/db.js` with client sdk queries to **Supabase** (Postgres) or **Firebase** (Firestore).
2. **Real-time Subscriptions**: Leverage Supabase Realtime or Firestore Listeners for real-time task comments, approvals notifications, and site logs sync.
3. **Blob Storage**: Connect the upload fields in the PR/Weekly modules to Supabase Storage or Firebase Storage buckets, returning public download URIs to the database.
4. **Security Rules**: Replace the client-side RBAC checks in `js/auth.js` with server-side security policies (e.g. Supabase Row Level Security (RLS) or Firebase Security Rules) to ensure finance files remain confidential.
