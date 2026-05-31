const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const db = require('./index');
require('dotenv').config();

async function initializeDatabase(loadDemo = false) {
    try {
        console.log('Checking database connection & presence...');
        
        // 1. Connect to default 'postgres' database to verify/create 'epc_laos' database
        const clientConfig = {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            password: process.env.DB_PASSWORD || 'postgres',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: 'postgres' // Connect to default postgres DB
        };
        
        const tempClient = new Client(clientConfig);
        await tempClient.connect();
        
        const dbCheckRes = await tempClient.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [process.env.DB_DATABASE || 'epc_laos']
        );
        
        if (dbCheckRes.rowCount === 0) {
            console.log(`Database "${process.env.DB_DATABASE || 'epc_laos'}" does not exist. Creating it...`);
            await tempClient.query(`CREATE DATABASE ${process.env.DB_DATABASE || 'epc_laos'}`);
            console.log(`Database "${process.env.DB_DATABASE || 'epc_laos'}" created successfully.`);
        } else {
            console.log(`Database "${process.env.DB_DATABASE || 'epc_laos'}" already exists.`);
        }
        
        await tempClient.end();

        console.log('Starting database schema migration...');
        
        // 2. Read schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Run full schema script
        await db.query(schemaSql);
        console.log('Database schema successfully migrated.');

        // 3. Seed Roles
        const roles = [
            'super_admin',
            'deputy_md',
            'admin',
            'finance_manager',
            'procurement',
            'project_manager',
            'engineer',
            'viewer'
        ];

        for (const roleName of roles) {
            await db.query(
                `INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
                [roleName]
            );
        }
        console.log('Roles table seeded.');

        // Fetch seeded role mappings
        const rolesRes = await db.query(`SELECT id, name FROM roles`);
        const roleMap = {};
        rolesRes.rows.forEach(row => {
            roleMap[row.name] = row.id;
        });

        // 4. Seed Default User Accounts
        const defaultUsers = [
            {
                username: 'superadmin',
                password: 'admin123',
                name: 'Somphone Phomvihane',
                email: 'director1@epc-laos.com',
                role: 'super_admin',
                department: 'Board of Directors',
                avatar: '👨‍💼',
                phone: '+856 20 5551 1234'
            },
            {
                username: 'deputymd',
                password: 'dmd123',
                name: 'Anoulack Keoboualapha',
                email: 'deputymd@epc-laos.com',
                role: 'deputy_md',
                department: 'Executive Management',
                avatar: '👨‍💼',
                phone: '+856 20 5551 9999'
            },
            {
                username: 'admin',
                password: 'admin123',
                name: 'System Admin',
                email: 'admin@epc-laos.com',
                role: 'admin',
                department: 'Administration',
                avatar: '👩‍💼',
                phone: '+856 20 5551 5678'
            },
            {
                username: 'finance',
                password: 'finance123',
                name: 'Keooudone Syharath',
                email: 'finance@epc-laos.com',
                role: 'finance_manager',
                department: 'Finance',
                avatar: '👩‍💼',
                phone: '+856 20 5552 2345'
            },
            {
                username: 'procurement',
                password: 'procurement123',
                name: 'Vathsana Xayasing',
                email: 'procurement@epc-laos.com',
                role: 'procurement',
                department: 'Procurement Logistics',
                avatar: '👨‍💻',
                phone: '+856 20 5556 7890'
            },
            {
                username: 'pm',
                password: 'pm123',
                name: 'Anousone Sengdara',
                email: 'pm@epc-laos.com',
                role: 'project_manager',
                department: 'Project Management',
                avatar: '👨‍💻',
                phone: '+856 20 5553 3456'
            },
            {
                username: 'engineer',
                password: 'engineer123',
                name: 'Bounmy Xayavong',
                email: 'engineer@epc-laos.com',
                role: 'engineer',
                department: 'Engineering',
                avatar: '👷‍♂️',
                phone: '+856 20 5554 4567'
            },
            {
                username: 'viewer',
                password: 'viewer123',
                name: 'Khamla Saysana',
                email: 'viewer@epc-laos.com',
                role: 'viewer',
                department: 'Executive Office',
                avatar: '🕵️‍♂️',
                phone: '+856 20 5555 5678'
            }
        ];

        console.log('Seeding default users...');
        for (const u of defaultUsers) {
            const roleId = roleMap[u.role];
            if (!roleId) continue;

            const existing = await db.query(
                `SELECT id FROM users WHERE username = $1 OR email = $2`,
                [u.username, u.email]
            );

            if (existing.rowCount === 0) {
                const passHash = await bcrypt.hash(u.password, 10);
                await db.query(
                    `INSERT INTO users (username, password_hash, name, email, role_id, department, avatar, status, phone) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)`,
                    [u.username, passHash, u.name, u.email, roleId, u.department, u.avatar, u.phone]
                );
                console.log(`User created: ${u.username} (${u.role})`);
            }
        }
        console.log('Seeding completed successfully.');

        // Insert initial system initialization audit log if empty
        const logsCount = await db.query('SELECT count(*)::integer FROM audit_logs');
        if (logsCount.rows[0].count === 0) {
            await db.query(
                `INSERT INTO audit_logs (user_name, action, module, details) 
                 VALUES ($1, $2, $3, $4)`,
                ['system', 'SYSTEM_INITIALIZATION', 'system', 'Database successfully initialized on backend server.']
            );
        }

    } catch (err) {
        console.error('Error during database initialization:', err);
        throw err;
    }
}

module.exports = { initializeDatabase };
