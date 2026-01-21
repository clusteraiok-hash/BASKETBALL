const request = require('supertest');
const assert = require('chai').assert;
const Database = require('../database/database');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_DB_PATH = './data/test_basketball.db';

describe('🏀 Basketball Booking System - Security & Database Tests', () => {
    let app;
    let db;
    let testUser;
    let adminUser;
    let authToken;

    before(async () => {
        // Clean up any existing test database
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }

        // Initialize test database
        db = new Database(TEST_DB_PATH);
        await db.initialize();

        // Start test server
        process.env.NODE_ENV = 'test';
        app = require('../server');
        
        // Create test users
        testUser = await createTestUser();
        adminUser = await createAdminUser();
    });

    after(async () => {
        // Clean up test database
        if (db) {
            await db.close();
        }
        
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    describe('🔐 Authentication Security Tests', () => {
        it('should prevent brute force login attempts', async () => {
            const credentials = { 
                email: 'nonexistent@test.com', 
                password: 'wrongpassword' 
            };
            
            // Make 6 login attempts (exceeds rate limit)
            let response;
            for (let i = 0; i < 6; i++) {
                response = await request(app)
                    .post('/api/auth/login')
                    .send(credentials);
                
                if (i < 5) {
                    assert.equal(response.status, 401);
                    assert.isFalse(response.body.success);
                } else {
                    assert.equal(response.status, 429);
                    assert.include(response.body.message, 'Too many authentication attempts');
                }
            }
        });

        it('should enforce strong password requirements', async () => {
            const weakPasswords = [
                'password',           // Common password
                '12345678',           // No complexity
                'Basketball123',      // No special character
                'short',              // Too short
                'verylongpasswordthatexceedsthemaximumallowedlengthandshouldberejected', // Too long
                'NoSpecialChar123',   // Missing special character
                'nouppercase123!',    // Missing uppercase
                'NOLOWERCASE123!',    // Missing lowercase
                'NoNumber!@#'         // Missing number
            ];

            for (const password of weakPasswords) {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Test User',
                        email: `test${Date.now()}${Math.random()}@example.com`,
                        password: password,
                        phone: '9876543210'
                    });
                
                assert.equal(response.status, 400, `Password "${password}" should be rejected`);
                assert.isFalse(response.body.success);
                assert.exists(response.body.errors);
            }
        });

        it('should accept valid strong passwords', async () => {
            const strongPasswords = [
                'SecurePass123!',
                'BasketBall@2026',
                'MyStrongP@ssw0rd',
                'Complex#Password789'
            ];

            for (const password of strongPasswords) {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Valid User',
                        email: `valid${Date.now()}${Math.random()}@example.com`,
                        password: password,
                        phone: '9876543210'
                    });
                
                assert.equal(response.status, 201, `Password "${password}" should be accepted`);
                assert.isTrue(response.body.success);
            }
        });

        it('should prevent XSS in user input', async () => {
            const xssPayload = '<script>alert("xss")</script>';
            
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: xssPayload,
                    email: `xss${Date.now()}@example.com`,
                    password: 'SecurePass123!',
                    phone: '9876543210'
                });
            
            // Should either reject or sanitize the input
            if (response.status === 201) {
                const user = await db.getUserByEmail(response.body.user.email);
                assert.notInclude(user.name, '<script>');
            } else {
                assert.equal(response.status, 400);
            }
        });

        it('should implement secure session management', async () => {
            // Login to get token
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'TestPassword123!'
                });
            
            assert.equal(loginResponse.status, 200);
            assert.exists(loginResponse.body.token);
            
            const token = loginResponse.body.token;
            
            // Verify token is stored securely in database
            const session = await db.getSessionByToken(token);
            assert.exists(session);
            assert.equal(session.user_id, testUser.id);
            assert.isTrue(new Date(session.expires_at) > new Date());
            
            // Test logout
            const logoutResponse = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`);
            
            assert.equal(logoutResponse.status, 200);
            
            // Verify token is revoked
            const revokedSession = await db.getSessionByToken(token);
            assert.isNull(revokedSession);
        });
    });

    describe('🛡️ Input Validation Tests', () => {
        it('should reject SQL injection attempts', async () => {
            const sqlPayloads = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "1' UNION SELECT * FROM users--",
                "admin'; DELETE FROM users; --"
            ];

            for (const payload of sqlPayloads) {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: payload,
                        password: 'password'
                    });
                
                assert.equal(response.status, 400);
                assert.isFalse(response.body.success);
            }
        });

        it('should validate email format strictly', async () => {
            const invalidEmails = [
                'invalid-email',
                '@example.com',
                'test@',
                'test..test@example.com',
                'test@example..com',
                'test@.com',
                'test@com.',
                'test space@example.com',
                'test@exa mple.com'
            ];

            for (const email of invalidEmails) {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Test User',
                        email: email,
                        password: 'SecurePass123!',
                        phone: '9876543210'
                    });
                
                assert.equal(response.status, 400);
                assert.include(response.body.message, 'valid email');
            }
        });

        it('should validate phone number format', async () => {
            const invalidPhones = [
                '123',           // Too short
                'abc',           // Non-numeric
                '12345678901234567890', // Too long
                '+1-300-555-1234', // Invalid format for current validation
            ];

            for (const phone of invalidPhones) {
                const response = await request(app)
                    .post('/api/auth/register')
                    .send({
                        name: 'Test User',
                        email: `phone${Date.now()}@example.com`,
                        password: 'SecurePass123!',
                        phone: phone
                    });
                
                // Phone is optional, but if provided should be valid
                if (response.status === 400) {
                    assert.include(response.body.message, 'valid phone');
                }
            }
        });

        it('should prevent large payload attacks', async () => {
            const largePayload = {
                name: 'A'.repeat(10000), // Very long name
                email: `large${Date.now()}@example.com`,
                password: 'SecurePass123!',
                phone: '9876543210'
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(largePayload);
            
            assert.equal(response.status, 400);
            assert.include(response.body.message, 'between 2 and 50 characters');
        });
    });

    describe('👥 Authorization Tests', () => {
        let userToken;
        let adminToken;

        before(async () => {
            // Get user token
            const userLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'TestPassword123!'
                });
            userToken = userLogin.body.token;

            // Get admin token
            const adminLogin = await request(app)
                .post('/api/auth/login')
                .send({
                    email: adminUser.email,
                    password: 'AdminPassword123!'
                });
            adminToken = adminLogin.body.token;
        });

        it('should prevent unauthorized access to admin endpoints', async () => {
            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`);
            
            assert.equal(response.status, 403);
            assert.include(response.body.message, 'Admin access required');
        });

        it('should allow admin access to admin endpoints', async () => {
            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);
            
            assert.equal(response.status, 200);
            assert.isTrue(response.body.success);
            assert.isArray(response.body.users);
        });

        it('should prevent users from accessing other users data', async () => {
            // Create another user
            const otherUser = await createTestUser();
            
            // Try to access other user's bookings
            const response = await request(app)
                .get('/api/bookings/my')
                .set('Authorization', `Bearer ${userToken}`);
            
            assert.equal(response.status, 200);
            
            // Should only return current user's bookings
            if (response.body.bookings && response.body.bookings.length > 0) {
                response.body.bookings.forEach(booking => {
                    assert.equal(booking.user_id, testUser.id);
                });
            }
        });

        it('should allow admins to access any booking data', async () => {
            const response = await request(app)
                .get('/api/admin/bookings')
                .set('Authorization', `Bearer ${adminToken}`);
            
            assert.equal(response.status, 200);
            assert.isTrue(response.body.success);
            assert.isArray(response.body.bookings);
        });
    });

    describe('💾 Database Operations Tests', () => {
        it('should create and retrieve users correctly', async () => {
            const userData = {
                id: 'test_user_' + Date.now(),
                name: 'Database Test User',
                email: `dbtest${Date.now()}@example.com`,
                password: 'TestPass123!',
                phone: '9876543210'
            };

            // Create user
            const createdUser = await db.createUser(userData);
            assert.exists(createdUser);
            assert.equal(createdUser.email, userData.email);
            assert.notExists(createdUser.password); // Password should not be returned

            // Retrieve user
            const retrievedUser = await db.getUserById(userData.id);
            assert.exists(retrievedUser);
            assert.equal(retrievedUser.email, userData.email);

            // Retrieve by email
            const userByEmail = await db.getUserByEmail(userData.email);
            assert.exists(userByEmail);
            assert.equal(userByEmail.id, userData.id);
        });

        it('should handle booking conflicts correctly', async () => {
            // Create a booking
            const bookingData = {
                id: 'booking_' + Date.now(),
                user_id: testUser.id,
                court_id: 'court_001',
                date: '2026-12-01',
                start_time: '10:00',
                end_time: '12:00',
                total_price: 1000
            };

            const firstBooking = await db.createBooking(bookingData);
            assert.exists(firstBooking);
            assert.equal(firstBooking.status, 'pending');

            // Try to create conflicting booking
            const conflictingData = {
                ...bookingData,
                id: 'booking_conflict_' + Date.now(),
                user_id: adminUser.id
            };

            try {
                await db.createBooking(conflictingData);
                assert.fail('Should have thrown an error for conflicting booking');
            } catch (error) {
                assert.include(error.message, 'UNIQUE constraint failed');
            }
        });

        it('should manage sessions correctly', async () => {
            const sessionData = {
                id: 'session_' + Date.now(),
                user_id: testUser.id,
                token: 'test_token_' + Date.now(),
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
                ip_address: '127.0.0.1',
                user_agent: 'Test Agent'
            };

            // Create session
            const createdSession = await db.createSession(sessionData);
            assert.exists(createdSession);
            assert.equal(createdSession.token, sessionData.token);

            // Retrieve session by token
            const retrievedSession = await db.getSessionByToken(sessionData.token);
            assert.exists(retrievedSession);
            assert.equal(retrievedSession.user_id, testUser.id);

            // Revoke session
            await db.revokeSession(sessionData.token);
            const revokedSession = await db.getSessionByToken(sessionData.token);
            assert.isNull(revokedSession);
        });

        it('should log audit events correctly', async () => {
            const auditData = {
                user_id: testUser.id,
                event_type: 'test_event',
                event_description: 'Test audit event',
                ip_address: '127.0.0.1',
                user_agent: 'Test Agent',
                resource_id: 'test_resource',
                resource_type: 'test',
                old_values: { status: 'old' },
                new_values: { status: 'new' },
                success: true
            };

            await db.logAuditEvent(auditData);

            // Verify audit log was created
            const auditLogs = await db.all(
                'SELECT * FROM audit_logs WHERE event_type = ? AND user_id = ?',
                ['test_event', testUser.id]
            );

            assert.isTrue(auditLogs.length > 0);
            const logEntry = auditLogs[0];
            assert.equal(logEntry.event_type, 'test_event');
            assert.equal(logEntry.user_id, testUser.id);
            assert.isTrue(logEntry.success);
        });
    });

    describe('🔍 API Endpoint Security Tests', () => {
        it('should require authentication for protected endpoints', async () => {
            const protectedEndpoints = [
                '/api/bookings/my',
                '/api/admin/users',
                '/api/admin/bookings',
                '/api/admin/stats'
            ];

            for (const endpoint of protectedEndpoints) {
                const response = await request(app).get(endpoint);
                assert.equal(response.status, 401);
                assert.include(response.body.message, 'Authentication required');
            }
        });

        it('should validate request size limits', async () => {
            const largePayload = {
                data: 'x'.repeat(2 * 1024 * 1024) // 2MB payload
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(largePayload);
            
            // Should be rejected due to size limit
            assert.isTrue(response.status >= 400);
        });

        it('should handle malformed JSON requests', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}');
            
            assert.equal(response.status, 400);
        });

        it('should implement proper CORS headers', async () => {
            const response = await request(app)
                .options('/api/courts')
                .set('Origin', 'http://localhost:3000');
            
            assert.equal(response.status, 200);
            assert.exists(response.headers['access-control-allow-origin']);
        });
    });

    describe('📊 Performance & Load Tests', () => {
        it('should handle concurrent requests gracefully', async () => {
            const promises = [];
            
            // Make 20 concurrent requests
            for (let i = 0; i < 20; i++) {
                promises.push(
                    request(app)
                        .get('/api/courts')
                        .expect(200)
                );
            }
            
            const results = await Promise.all(promises);
            assert.equal(results.length, 20);
            
            // All requests should succeed
            results.forEach(response => {
                assert.equal(response.status, 200);
                assert.isTrue(response.body.success);
            });
        });

        it('should maintain database integrity under load', async () => {
            const promises = [];
            
            // Create multiple users concurrently
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/auth/register')
                        .send({
                            name: `Load Test User ${i}`,
                            email: `loadtest${i}${Date.now()}@example.com`,
                            password: 'LoadTestPass123!',
                            phone: `9876543${i.toString().padStart(4, '0')}`
                        })
                );
            }
            
            const results = await Promise.all(promises);
            
            // All should succeed or fail gracefully (no server errors)
            results.forEach(response => {
                assert.isTrue(response.status === 201 || response.status === 400);
                assert.notEqual(response.status, 500);
            });
        });
    });

    describe('🔧 Data Integrity Tests', () => {
        it('should enforce foreign key constraints', async () => {
            try {
                // Try to create booking with non-existent user
                await db.run(`
                    INSERT INTO bookings (id, user_id, court_id, date, start_time, end_time, total_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    'invalid_booking_' + Date.now(),
                    'non_existent_user',
                    'court_001',
                    '2026-12-01',
                    '10:00',
                    '11:00',
                    500
                ]);
                
                assert.fail('Should have failed due to foreign key constraint');
            } catch (error) {
                assert.include(error.message, 'FOREIGN KEY constraint failed');
            }
        });

        it('should maintain data consistency in transactions', async () => {
            const userId = 'transaction_user_' + Date.now();
            
            try {
                await db.transaction(async (db) => {
                    // Create user
                    await db.run(`
                        INSERT INTO users (id, name, email, password, role, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        userId,
                        'Transaction User',
                        `transaction${Date.now()}@example.com`,
                        'hashed_password',
                        'user',
                        new Date().toISOString()
                    ]);
                    
                    // Create booking for this user
                    await db.run(`
                        INSERT INTO bookings (id, user_id, court_id, date, start_time, end_time, total_price, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        'transaction_booking_' + Date.now(),
                        userId,
                        'court_001',
                        '2026-12-01',
                        '10:00',
                        '11:00',
                        500,
                        new Date().toISOString()
                    ]);
                });
                
                // Verify both records exist
                const user = await db.getUserById(userId);
                assert.exists(user);
                
                const bookings = await db.all('SELECT * FROM bookings WHERE user_id = ?', [userId]);
                assert.isTrue(bookings.length > 0);
                
            } catch (error) {
                assert.fail('Transaction should have succeeded');
            }
        });
    });

    // Helper functions
    async function createTestUser() {
        const userId = 'test_user_' + Date.now();
        const userData = {
            id: userId,
            name: 'Test User',
            email: `test${Date.now()}@example.com`,
            password: 'TestPassword123!',
            phone: '9876543210',
            role: 'user'
        };

        return await db.createUser(userData);
    }

    async function createAdminUser() {
        const adminId = 'test_admin_' + Date.now();
        const adminData = {
            id: adminId,
            name: 'Test Admin',
            email: `admin${Date.now()}@example.com`,
            password: 'AdminPassword123!',
            phone: '9876543211',
            role: 'admin'
        };

        return await db.createUser(adminData);
    }
});

// Database-specific tests
describe('🗄️ Database Engine Tests', () => {
    let db;

    before(async () => {
        // Clean up any existing test database
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }

        db = new Database(TEST_DB_PATH);
        await db.initialize();
    });

    after(async () => {
        if (db) {
            await db.close();
        }
        
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    it('should handle database connection errors gracefully', async () => {
        // Test with invalid database path
        const invalidDb = new Database('/invalid/path/test.db');
        
        try {
            await invalidDb.initialize();
            assert.fail('Should have failed with invalid path');
        } catch (error) {
            assert.include(error.message, 'Error opening database');
        }
    });

    it('should support transaction rollback on errors', async () => {
        const userId = 'rollback_user_' + Date.now();
        
        try {
            await db.transaction(async (db) => {
                // Create user
                await db.run(`
                    INSERT INTO users (id, name, email, password, role, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    userId,
                    'Rollback User',
                    `rollback${Date.now()}@example.com`,
                    'hashed_password',
                    'user',
                    new Date().toISOString()
                ]);
                
                // Intentionally cause an error
                await db.run('INSERT INTO invalid_table (id) VALUES (?)', [1]);
            });
            
            assert.fail('Transaction should have failed and rolled back');
        } catch (error) {
            // Verify rollback occurred
            const user = await db.getUserById(userId);
            assert.isNull(user);
        }
    });

    it('should cleanup expired sessions automatically', async () => {
        // Create expired session
        const expiredSession = {
            id: 'expired_session_' + Date.now(),
            user_id: 'test_user',
            token: 'expired_token_' + Date.now(),
            expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Expired 1 hour ago
            ip_address: '127.0.0.1',
            user_agent: 'Test Agent'
        };

        await db.createSession(expiredSession);
        
        // Run cleanup
        const deletedCount = await db.cleanupExpiredSessions();
        assert.isTrue(deletedCount >= 1);
        
        // Verify session is gone
        const session = await db.getSessionByToken(expiredSession.token);
        assert.isNull(session);
    });
});