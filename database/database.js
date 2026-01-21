const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class Database {
    constructor(dbPath = './data/basketball.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.isConnected = false;
    }

    // Initialize database connection
    async initialize() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Create database connection
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    throw err;
                }
                console.log('Connected to SQLite database');
                this.isConnected = true;
            });

            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');
            
            // Set WAL mode for better concurrency
            await this.run('PRAGMA journal_mode = WAL');
            
            // Create schema
            await this.createSchema();
            
            // Initialize default data
            await this.initializeDefaultData();
            
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    // Execute schema file
    async createSchema() {
        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                const schema = fs.readFileSync(schemaPath, 'utf8');
                
                // Execute each statement individually, handling multi-line statements
                const statements = this.parseSQLStatements(schema);
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        try {
                            await this.run(statement);
                        } catch (stmtError) {
                            console.error(`Error in statement: ${statement.substring(0, 100)}...`);
                            throw stmtError;
                        }
                    }
                }
                console.log('Database schema created successfully');
            }
        } catch (error) {
            console.error('Error creating schema:', error);
            throw error;
        }
    }

    // Parse SQL statements properly
    parseSQLStatements(schema) {
        const statements = [];
        let currentStatement = '';
        let inTrigger = false;
        
        const lines = schema.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip comments and empty lines
            if (trimmedLine.startsWith('--') || trimmedLine === '') {
                continue;
            }
            
            currentStatement += line + '\n';
            
            // Check if we're in a trigger block
            if (trimmedLine.toUpperCase().startsWith('CREATE TRIGGER')) {
                inTrigger = true;
            }
            
            // End of statement
            if (trimmedLine.endsWith(';')) {
                if (inTrigger) {
                    inTrigger = false;
                }
                
                statements.push(currentStatement.trim());
                currentStatement = '';
            }
        }
        
        return statements;
    }

    // Initialize default data
    async initializeDefaultData() {
        try {
            // Check if admin user exists
            const adminExists = await this.get(
                'SELECT id FROM users WHERE email = ?',
                ['admin@basketball.com']
            );

            if (!adminExists) {
                // Create default admin user
                const adminId = 'admin_001';
                const hashedPassword = await bcrypt.hash('admin123', 12);
                
                await this.run(`
                    INSERT INTO users (
                        id, name, email, password, phone, role, is_verified, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    adminId,
                    'Admin User',
                    'admin@basketball.com',
                    hashedPassword,
                    '9876543210',
                    'admin',
                    true,
                    new Date().toISOString()
                ]);

                console.log('Default admin user created');
            }

            // Check if courts exist
            const courtsCount = await this.get('SELECT COUNT(*) as count FROM courts');
            
            if (courtsCount.count === 0) {
                // Create default courts
                const courts = [
                    {
                        id: 'court_001',
                        name: 'Main Court',
                        location: 'Building A - Ground Floor',
                        description: 'Professional hardwood court with NBA standards',
                        price_per_hour: 500,
                        amenities: 'Scoreboard, Lights, Changing Room, Water Fountain',
                        capacity: 10,
                        image_url: '/images/court1.jpg'
                    },
                    {
                        id: 'court_002',
                        name: 'Training Court B',
                        location: 'Building B - First Floor',
                        description: 'Smaller court perfect for group training',
                        price_per_hour: 300,
                        amenities: 'Lights, Training Equipment, Water Fountain',
                        capacity: 6,
                        image_url: '/images/court2.jpg'
                    },
                    {
                        id: 'court_003',
                        name: 'Half Court C',
                        location: 'Outdoor Area',
                        description: 'Outdoor half-court with adjustable hoops',
                        price_per_hour: 200,
                        amenities: 'Lights, Water Fountain, Restrooms',
                        capacity: 5,
                        image_url: '/images/court3.jpg'
                    }
                ];

                for (const court of courts) {
                    await this.run(`
                        INSERT INTO courts (
                            id, name, location, description, price_per_hour, 
                            amenities, capacity, image_url, is_active, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        court.id,
                        court.name,
                        court.location,
                        court.description,
                        court.price_per_hour,
                        court.amenities,
                        court.capacity,
                        court.image_url,
                        true,
                        new Date().toISOString()
                    ]);
                }

                console.log('Default courts created');
            }

            // Create default test users if they don't exist
            const testUsers = [
                {
                    id: 'user_001',
                    name: 'Rahul Sharma',
                    email: 'rahul@example.com',
                    password: 'user123',
                    phone: '9876543211'
                },
                {
                    id: 'user_002',
                    name: 'Priya Patel',
                    email: 'priya@example.com',
                    password: 'user123',
                    phone: '9876543212'
                }
            ];

            for (const user of testUsers) {
                const exists = await this.get(
                    'SELECT id FROM users WHERE email = ?',
                    [user.email]
                );

                if (!exists) {
                    const hashedPassword = await bcrypt.hash(user.password, 12);
                    
                    await this.run(`
                        INSERT INTO users (
                            id, name, email, password, phone, role, is_verified, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        user.id,
                        user.name,
                        user.email,
                        hashedPassword,
                        user.phone,
                        'user',
                        true,
                        new Date().toISOString()
                    ]);
                }
            }

            console.log('Default data initialization completed');
        } catch (error) {
            console.error('Error initializing default data:', error);
            throw error;
        }
    }

    // Generic query methods
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Transaction support
    async transaction(callback) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION', async (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    try {
                        const result = await callback(this);
                        this.db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                reject(commitErr);
                            } else {
                                resolve(result);
                            }
                        });
                    } catch (error) {
                        this.db.run('ROLLBACK', (rollbackErr) => {
                            if (rollbackErr) {
                                console.error('Rollback error:', rollbackErr);
                            }
                            reject(error);
                        });
                    }
                });
            });
        });
    }

    // User operations
    async createUser(userData) {
        const { id, name, email, password, phone, role = 'user' } = userData;
        const hashedPassword = await bcrypt.hash(password, 12);
        
        await this.run(`
            INSERT INTO users (
                id, name, email, password, phone, role, is_verified, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            name,
            email,
            hashedPassword,
            phone,
            role,
            false,
            new Date().toISOString()
        ]);

        return await this.getUserById(id);
    }

    async getUserById(id) {
        return await this.get(
            'SELECT id, name, email, phone, role, is_verified, created_at, last_login FROM users WHERE id = ?',
            [id]
        );
    }

    async getUserByEmail(email) {
        return await this.get(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
    }

    async updateUserLastLogin(userId) {
        await this.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_attempts = 0 WHERE id = ?',
            [userId]
        );
    }

    async incrementLoginAttempts(email) {
        await this.run(
            'UPDATE users SET login_attempts = login_attempts + 1 WHERE email = ?',
            [email]
        );
    }

    // Court operations
    async getAllCourts(activeOnly = true) {
        const sql = activeOnly 
            ? 'SELECT * FROM courts WHERE is_active = TRUE ORDER BY name'
            : 'SELECT * FROM courts ORDER BY name';
        
        return await this.all(sql);
    }

    async getCourtById(id) {
        return await this.get('SELECT * FROM courts WHERE id = ?', [id]);
    }

    // Booking operations
    async createBooking(bookingData) {
        const { id, user_id, court_id, date, start_time, end_time, total_price, payment_id } = bookingData;
        
        await this.run(`
            INSERT INTO bookings (
                id, user_id, court_id, date, start_time, end_time, 
                total_price, payment_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            user_id,
            court_id,
            date,
            start_time,
            end_time,
            total_price,
            payment_id,
            'pending',
            new Date().toISOString()
        ]);

        return await this.getBookingById(id);
    }

    async getBookingById(id) {
        return await this.get(`
            SELECT b.*, u.name as user_name, u.email as user_email,
                   c.name as court_name, c.location as court_location
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN courts c ON b.court_id = c.id
            WHERE b.id = ?
        `, [id]);
    }

    async getUserBookings(userId, status = null) {
        let sql = `
            SELECT b.*, c.name as court_name, c.location as court_location
            FROM bookings b
            JOIN courts c ON b.court_id = c.id
            WHERE b.user_id = ?
        `;
        const params = [userId];

        if (status) {
            sql += ' AND b.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY b.date DESC, b.start_time DESC';

        return await this.all(sql, params);
    }

    async getBookingsByCourt(courtId, date) {
        return await this.all(`
            SELECT * FROM bookings 
            WHERE court_id = ? AND date = ? AND status IN ('pending', 'confirmed')
            ORDER BY start_time
        `, [courtId, date]);
    }

    async updateBookingStatus(bookingId, status, additionalData = {}) {
        let sql = 'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP';
        const params = [status];

        if (additionalData.payment_status) {
            sql += ', payment_status = ?';
            params.push(additionalData.payment_status);
        }

        if (additionalData.cancellation_reason) {
            sql += ', cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP';
            params.push(additionalData.cancellation_reason);
        }

        sql += ' WHERE id = ?';
        params.push(bookingId);

        await this.run(sql, params);
        return await this.getBookingById(bookingId);
    }

    // Session operations
    async createSession(sessionData) {
        const { id, user_id, token, token_type = 'access', expires_at, ip_address, user_agent } = sessionData;
        
        await this.run(`
            INSERT INTO sessions (
                id, user_id, token, token_type, expires_at, ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            user_id,
            token,
            token_type,
            expires_at,
            ip_address,
            user_agent,
            new Date().toISOString()
        ]);

        return await this.getSessionByToken(token);
    }

    async getSessionByToken(token) {
        return await this.get(`
            SELECT s.*, u.name as user_name, u.email as user_email, u.role
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND s.is_active = TRUE
        `, [token]);
    }

    async revokeSession(token) {
        await this.run(
            'UPDATE sessions SET is_active = FALSE WHERE token = ?',
            [token]
        );
    }

    async revokeUserSessions(userId, excludeToken = null) {
        let sql = 'UPDATE sessions SET is_active = FALSE WHERE user_id = ?';
        const params = [userId];

        if (excludeToken) {
            sql += ' AND token != ?';
            params.push(excludeToken);
        }

        await this.run(sql, params);
    }

    // Audit logging
    async logAuditEvent(eventData) {
        const { 
            user_id, event_type, event_description, ip_address, user_agent,
            resource_id, resource_type, old_values, new_values, success, error_message
        } = eventData;

        await this.run(`
            INSERT INTO audit_logs (
                id, user_id, event_type, event_description, ip_address, user_agent,
                resource_id, resource_type, old_values, new_values, success, error_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            require('uuid').v4(),
            user_id,
            event_type,
            event_description,
            ip_address,
            user_agent,
            resource_id,
            resource_type,
            old_values ? JSON.stringify(old_values) : null,
            new_values ? JSON.stringify(new_values) : null,
            success !== false,
            error_message,
            new Date().toISOString()
        ]);
    }

    // Cleanup operations
    async cleanupExpiredSessions() {
        const result = await this.run(
            'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP'
        );
        return result.changes;
    }

    async getDatabaseStats() {
        const stats = await this.all(`
            SELECT 
                'users' as table_name, COUNT(*) as count FROM users
            UNION ALL
            SELECT 
                'courts' as table_name, COUNT(*) as count FROM courts
            UNION ALL
            SELECT 
                'bookings' as table_name, COUNT(*) as count FROM bookings
            UNION ALL
            SELECT 
                'sessions' as table_name, COUNT(*) as count FROM sessions
            UNION ALL
            SELECT 
                'audit_logs' as table_name, COUNT(*) as count FROM audit_logs
        `);

        return stats.reduce((acc, row) => {
            acc[row.table_name] = row.count;
            return acc;
        }, {});
    }

    // Close database connection
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        this.isConnected = false;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database;