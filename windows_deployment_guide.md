# Temporary Windows Server VPS Deployment Guide
This guide provides step-by-step instructions for deploying the **Laos EPC Project Control & Finance App** backend to a Windows Server 2012 R2 VPS with 1 GB RAM for temporary testing.

---

## 📋 System Analysis (1 GB RAM Constraint)
Because Windows Server 2012 R2 consumes roughly 700 MB of RAM on boot, only 300 MB remains. 
* Running PostgreSQL in a standard production configuration is too heavy.
* However, we can configure PostgreSQL to run in **Ultra-Lightweight Mode** (consuming only ~35MB RAM). This avoids the need to rewrite Express database queries to SQLite syntax, keeping testing 100% identical to production.

---

## 🛠️ Step 1: Install Node.js
Windows Server 2012 R2 is compatible with **Node.js v20 LTS**.
1. Download the Node.js v20 LTS MSI installer from:
   https://nodejs.org/dist/latest-v20.x/
2. Choose the x64 installer (e.g., `node-v20.x.x-x64.msi`).
3. Run the installer and proceed with the default setup options.
4. Verify the installation by opening Command Prompt (`cmd.exe`) and running:
   ```cmd
   node -v
   npm -v
   ```

---

## 🗄️ Step 2: Install and Tune PostgreSQL (Ultra-Lightweight Mode)
1. Download **PostgreSQL v13 or v14** (fully compatible with Windows Server 2012 R2):
   https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Run the installer. Set the superuser password to `postgres` (or your preferred password).
3. Open the PostgreSQL configuration file located at:
   `C:\Program Files\PostgreSQL\<version>\data\postgresql.conf`
4. Locate and edit the following settings to minimize memory consumption:
   ```ini
   max_connections = 10          # Default is 100, reduction saves significant RAM
   shared_buffers = 16MB         # Default is 128MB, reduce to minimize memory footprint
   work_mem = 1MB                # Minimal RAM allocated per query sort operation
   maintenance_work_mem = 8MB    # Minimal RAM allocated for table maintenance
   effective_cache_size = 64MB   # Safe estimation of cache size
   ```
5. Save the file and restart the PostgreSQL Windows Service:
   * Open `services.msc`.
   * Find `postgresql-x64-<version>`.
   * Right-click and choose **Restart**.
6. Verify memory usage in Task Manager. The service should now consume less than **35 MB of RAM**.

---

## 📂 Step 3: Deploy Backend App Files
1. Create the application directory:
   `C:\lxp-app`
2. Copy the entire `backend` directory from your development machine to `C:\lxp-app` on the VPS. 
   *(Alternatively, copy the zip file and extract it there)*.
3. Open Command Prompt inside `C:\lxp-app` and install dependencies:
   ```cmd
   cd C:\lxp-app
   npm install --production
   ```

---

## ⚙️ Step 4: Configure Production Environment (`.env`)
1. Create a file named `.env` in `C:\lxp-app` (if not already present).
2. Configure it with the following parameters:
   ```ini
   PORT=3000
   JWT_SECRET=vps_testing_secret_key_991823!
   
   # PostgreSQL Connection string (pointing to your tuned local server)
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=epc_laos
   ```

---

## 🚀 Step 5: Initialize Database and Start Server
1. Initialize the database schema and seed default users. Run the following command inside `C:\lxp-app`:
   ```cmd
   node db/init.js
   ```
   *This script will create the `epc_laos` database, build all 17 tables, and seed default roles and accounts (e.g. `superadmin` / `admin123`).*
2. Start the Express server:
   ```cmd
   npm start
   ```
   *You should see output indicating that the server is successfully listening on `http://0.0.0.0:3000`.*

---

## 🛡️ Step 6: Configure Windows Firewall
To allow external connections to the backend API on port 3000, you must add an Inbound Rule to Windows Firewall.
1. Open PowerShell as Administrator on the VPS.
2. Run the following command to allow traffic:
   ```powershell
   New-NetFirewallRule -DisplayName "Laos EPC Backend API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
3. Alternatively, via Command Prompt:
   ```cmd
   netsh advfirewall firewall add rule name="Laos EPC Backend API" dir=in action=allow protocol=TCP localport=3000
   ```

---

## 🧪 Step 7: Verification Tests
Once the server is running on the VPS, test access from a local machine or browser:

### 1. API Health Check
* Open a browser and navigate to:
  `http://45.32.109.235:3000/api/health`
* Expect Response:
  ```json
  {
    "status": "OK",
    "message": "Laos EPC Backend Server is running.",
    "timestamp": "2026-05-30T..."
  }
  ```

### 2. Login Endpoint Test (via PowerShell)
* Run the following on your local PC:
  ```powershell
  Invoke-RestMethod -Uri "http://45.32.109.235:3000/api/auth/login" -Method Post -Body (@{username="superadmin"; password="admin123"} | ConvertTo-Json) -ContentType "application/json"
  ```
* Expect output to return a secure JWT `token` and the user profile JSON.
