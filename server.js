const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const Database = require('./database/database');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// General middleware
app.use(limiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// Request logging middleware
app.use(async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', async () => {
        const duration = Date.now() - start;
        
        // Log audit event for sensitive operations
        if (['POST', 'PUT', 'DELETE'].includes(req.method) && req.path.startsWith('/api/')) {
            await db.logAuditEvent({
                user_id: req.user?.id,
                event_type: `${req.method} ${req.path}`,
                event_description: `${req.method} request to ${req.path}`,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                success: res.statusCode < 400,
                error_message: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null
            });
        }
        
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
});

// Authentication middleware
async function authenticate(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Authentication required' 
            });
        }

        const session = await db.getSessionByToken(token);
        
        if (!session) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid or expired token' 
            });
        }

        // Update last used time
        await db.run('UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE token = ?', [token]);
        
        req.user = {
            id: session.user_id,
            name: session.user_name,
            email: session.user_email,
            role: session.role
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Authentication error' 
        });
    }
}

// Admin authorization middleware
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            message: 'Admin access required' 
        });
    }
    next();
}

// Validation middleware
const validateRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .isLength({ max: 255 })
        .withMessage('Email address too long'),
    
    body('phone')
        .optional()
        .trim()
        .isMobilePhone('any', { strictMode: false })
        .withMessage('Please provide a valid phone number'),
    
    body('password')
        .isLength({ min: 12, max: 128 })
        .withMessage('Password must be between 12 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

const validateLogin = [
    body('email')
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// API Routes

// Authentication routes
app.post('/api/auth/register', authLimiter, validateRegistration, async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        // Check if user already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }
        
        // Create new user
        const userId = uuidv4();
        const user = await db.createUser({
            id: userId,
            name,
            email,
            password,
            phone,
            role: 'user'
        });
        
        // Log registration event
        await db.logAuditEvent({
            user_id: userId,
            event_type: 'user_registration',
            event_description: 'New user registered',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            resource_id: userId,
            resource_type: 'user',
            new_values: { name, email, phone }
        });
        
        // Remove password from response
        const { password: _, ...userResponse } = user;
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userResponse
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

app.post('/api/auth/login', authLimiter, validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await db.getUserByEmail(email);
        if (!user) {
            await db.logAuditEvent({
                event_type: 'login_failure',
                event_description: 'Login attempt with non-existent email',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                success: false,
                error_message: 'User not found'
            });
            
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Check if account is locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return res.status(423).json({
                success: false,
                message: 'Account temporarily locked due to too many failed attempts'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            await db.incrementLoginAttempts(email);
            
            // Lock account after too many attempts
            if (user.login_attempts >= 4) {
                const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                await db.run('UPDATE users SET locked_until = ? WHERE id = ?', [lockedUntil.toISOString(), user.id]);
            }
            
            await db.logAuditEvent({
                user_id: user.id,
                event_type: 'login_failure',
                event_description: 'Login attempt with invalid password',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                success: false,
                error_message: 'Invalid password'
            });
            
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        
        // Update last login and reset login attempts
        await db.updateUserLastLogin(user.id);
        
        // Create session token
        const sessionId = uuidv4();
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        await db.createSession({
            id: sessionId,
            user_id: user.id,
            token: token,
            expires_at: expiresAt.toISOString(),
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });
        
        // Log successful login
        await db.logAuditEvent({
            user_id: user.id,
            event_type: 'login_success',
            event_description: 'User logged in successfully',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            success: true
        });
        
        // Remove password from response
        const { password: _, login_attempts, locked_until, ...userResponse } = user;
        
        res.json({
            success: true,
            message: 'Login successful',
            user: userResponse,
            token: token,
            expiresAt: expiresAt.toISOString()
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

app.post('/api/auth/logout', authenticate, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;
        
        if (token) {
            await db.revokeSession(token);
        }
        
        // Log logout event
        await db.logAuditEvent({
            user_id: req.user.id,
            event_type: 'logout',
            event_description: 'User logged out',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            success: true
        });
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// Court routes
app.get('/api/courts', async (req, res) => {
    try {
        const courts = await db.getAllCourts(true);
        
        res.json({
            success: true,
            courts: courts
        });
        
    } catch (error) {
        console.error('Error fetching courts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courts'
        });
    }
});

app.get('/api/courts/:id', async (req, res) => {
    try {
        const court = await db.getCourtById(req.params.id);
        
        if (!court) {
            return res.status(404).json({
                success: false,
                message: 'Court not found'
            });
        }
        
        res.json({
            success: true,
            court: court
        });
        
    } catch (error) {
        console.error('Error fetching court:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch court'
        });
    }
});

// Booking routes
app.get('/api/bookings/my', authenticate, async (req, res) => {
    try {
        const { status } = req.query;
        const bookings = await db.getUserBookings(req.user.id, status);
        
        res.json({
            success: true,
            bookings: bookings
        });
        
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings'
        });
    }
});

app.post('/api/bookings', authenticate, async (req, res) => {
    try {
        const { court_id, date, start_time, end_time } = req.body;
        
        // Validate booking data
        if (!court_id || !date || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required booking information'
            });
        }
        
        // Check if court exists and is active
        const court = await db.getCourtById(court_id);
        if (!court || !court.is_active) {
            return res.status(404).json({
                success: false,
                message: 'Court not available'
            });
        }
        
        // Check for booking conflicts
        const existingBookings = await db.getBookingsByCourt(court_id, date);
        const hasConflict = existingBookings.some(booking => {
            return (start_time < booking.end_time && end_time > booking.start_time);
        });
        
        if (hasConflict) {
            return res.status(409).json({
                success: false,
                message: 'Court already booked for this time slot'
            });
        }
        
        // Calculate total price
        const startTime = new Date(`2000-01-01T${start_time}`);
        const endTime = new Date(`2000-01-01T${end_time}`);
        const hours = (endTime - startTime) / (1000 * 60 * 60);
        const total_price = Math.round(court.price_per_hour * hours);
        
        // Create booking
        const bookingId = uuidv4();
        const booking = await db.createBooking({
            id: bookingId,
            user_id: req.user.id,
            court_id: court_id,
            date: date,
            start_time: start_time,
            end_time: end_time,
            total_price: total_price,
            payment_id: null
        });
        
        // Log booking creation
        await db.logAuditEvent({
            user_id: req.user.id,
            event_type: 'booking_created',
            event_description: 'New booking created',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            resource_id: bookingId,
            resource_type: 'booking',
            new_values: { court_id, date, start_time, end_time, total_price }
        });
        
        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking: booking
        });
        
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking'
        });
    }
});

app.patch('/api/bookings/:id', authenticate, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { status, cancellation_reason } = req.body;
        
        // Get existing booking
        const booking = await db.getBookingById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Check authorization
        if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this booking'
            });
        }
        
        // Update booking status
        const updatedBooking = await db.updateBookingStatus(bookingId, status, {
            cancellation_reason: cancellation_reason
        });
        
        // Log booking update
        await db.logAuditEvent({
            user_id: req.user.id,
            event_type: 'booking_updated',
            event_description: `Booking status changed to ${status}`,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            resource_id: bookingId,
            resource_type: 'booking',
            old_values: { status: booking.status },
            new_values: { status, cancellation_reason }
        });
        
        res.json({
            success: true,
            message: 'Booking updated successfully',
            booking: updatedBooking
        });
        
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking'
        });
    }
});

// Admin routes
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const users = await db.all(`
            SELECT id, name, email, phone, role, is_verified, created_at, last_login
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            users: users
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

app.get('/api/admin/bookings', authenticate, requireAdmin, async (req, res) => {
    try {
        const bookings = await db.all(`
            SELECT b.*, u.name as user_name, u.email as user_email,
                   c.name as court_name, c.location as court_location
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN courts c ON b.court_id = c.id
            ORDER BY b.created_at DESC
        `);
        
        res.json({
            success: true,
            bookings: bookings
        });
        
    } catch (error) {
        console.error('Error fetching all bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings'
        });
    }
});

app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
    try {
        const stats = await db.getDatabaseStats();
        
        // Additional statistics
        const revenue = await db.get(`
            SELECT SUM(total_price) as total_revenue
            FROM bookings 
            WHERE status = 'confirmed' AND payment_status = 'paid'
        `);
        
        const recentActivity = await db.get(`
            SELECT COUNT(*) as recent_bookings
            FROM bookings 
            WHERE created_at >= datetime('now', '-7 days')
        `);
        
        res.json({
            success: true,
            stats: {
                ...stats,
                total_revenue: revenue.total_revenue || 0,
                recent_bookings: recentActivity.recent_bookings || 0
            }
        });
        
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbStats = await db.getDatabaseStats();
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: db.isConnected,
                stats: dbStats
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Log error event
    if (db && db.isConnected) {
        db.logAuditEvent({
            user_id: req.user?.id,
            event_type: 'system_error',
            event_description: err.message,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            success: false,
            error_message: err.stack
        }).catch(logErr => {
            console.error('Failed to log error event:', logErr);
        });
    }
    
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Initialize and start server
async function startServer() {
    try {
        // Initialize database
        await db.initialize();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🏀 Basketball Booking Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🔒 Security features enabled`);
            console.log(`💾 Database: SQLite`);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    
    try {
        await db.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    
    try {
        await db.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Start the server
startServer();

module.exports = app;