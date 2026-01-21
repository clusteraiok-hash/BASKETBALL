/**
 * Basketball Court Booking System - Production Grade Server
 * Secure, scalable, and enterprise-ready implementation
 */

require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param, query } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const compression = require('compression');

// ==================== INITIALIZATION ====================
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ==================== SECURITY MIDDLEWARE ====================

// Helmet - Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Compression
app.use(compression());

// Remove powered by header
app.disable('x-powered-by');

// Logging
const morganFormat = NODE_ENV === 'production' ? 'combined' : 'dev';
const logStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
app.use(morgan(morganFormat, {
  skip: (req) => req.method === 'OPTIONS',
  stream: logStream
}));

// CORS - Restricted origins
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Static files - only serve public directory
app.use(express.static('public', {
  dotfiles: 'deny',
  maxAge: '1d',
  etag: false
}));

// ==================== RATE LIMITING ====================

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => NODE_ENV === 'development'
});

// Authentication rate limiter - stricter for login/register
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MINUTES) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_ATTEMPT_LIMIT) || 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true
});

app.use('/api/', apiLimiter);

// ==================== UTILITY FUNCTIONS ====================

const logger = {
  info: (message, data) => {
    console.log(`[${new Date().toISOString()}] INFO: ${message}`, data || '');
    fs.appendFileSync(path.join(logDir, 'app.log'), `[${new Date().toISOString()}] INFO: ${message} ${JSON.stringify(data || '')}\n`);
  },
  error: (message, error) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error || '');
    fs.appendFileSync(path.join(logDir, 'app.log'), `[${new Date().toISOString()}] ERROR: ${message} ${JSON.stringify(error || '')}\n`);
  },
  warn: (message, data) => {
    console.warn(`[${new Date().toISOString()}] WARN: ${message}`, data || '');
    fs.appendFileSync(path.join(logDir, 'app.log'), `[${new Date().toISOString()}] WARN: ${message} ${JSON.stringify(data || '')}\n`);
  }
};

// ==================== DATA MANAGEMENT ====================

const DATA_FILE = './data/database.json';

let data = {
  users: [],
  courts: [],
  bookings: [],
  sessions: [],
  auditLog: []
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      data = JSON.parse(fileData);
      logger.info('Database loaded successfully');
    } else {
      initializeData();
    }
  } catch (error) {
    logger.error('Error loading data:', error);
    initializeData();
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error('Error saving data:', error);
  }
}

function logAudit(action, userId, details) {
  const auditEntry = {
    id: 'audit_' + Date.now(),
    action,
    userId,
    timestamp: new Date().toISOString(),
    details
  };
  data.auditLog.push(auditEntry);
  if (data.auditLog.length > 10000) {
    data.auditLog = data.auditLog.slice(-10000); // Keep last 10000 entries
  }
  saveData();
  logger.info(`Audit: ${action}`, { userId, details });
}

function initializeData() {
  const adminPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 12);
  
  data = {
    users: [
      {
        id: 'admin_001',
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL || 'admin@basketball.com',
        password: adminPassword,
        phone: process.env.ADMIN_PHONE || '9876543210',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    courts: [
      {
        id: 'court_001',
        name: 'Main Court',
        location: 'Building A - Ground Floor',
        description: 'Professional hardwood court with NBA standards',
        pricePerHour: 500,
        amenities: 'Scoreboard, Lights, Changing Room, Water Fountain',
        capacity: 10,
        imageUrl: '/images/court1.jpg',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'court_002',
        name: 'Training Court B',
        location: 'Building B - First Floor',
        description: 'Smaller court perfect for group training',
        pricePerHour: 300,
        amenities: 'Lights, Training Equipment, Water Fountain',
        capacity: 6,
        imageUrl: '/images/court2.jpg',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ],
    bookings: [],
    sessions: [],
    auditLog: []
  };
  saveData();
  logger.info('Database initialized with default data');
}

// ==================== VALIDATION MIDDLEWARE ====================

const validateEmail = () => {
  return body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format');
};

const validatePassword = () => {
  return body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain at least one special character (!@#$%^&*)');
};

const validateName = () => {
  return body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes');
};

const validatePhone = () => {
  return body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be 10 digits');
};

// Custom error handler for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: e.param,
        message: e.msg
      }))
    });
  }
  next();
};

// ==================== AUTHENTICATION ====================

function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET || 'dev_secret_key_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_change_in_production',
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'No authorization token provided' 
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev_secret_key_change_in_production'
    );

    const user = data.users.find(u => u.id === decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found or inactive' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt:', error.message);
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
}

function authorizeAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    logAudit('UNAUTHORIZED_ACCESS_ATTEMPT', req.user.id, 
      { endpoint: req.path, method: req.method });
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }
  next();
}

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '2.0.0'
  });
});

// ==================== AUTHENTICATION ROUTES ====================

app.post('/api/v1/auth/register',
  authLimiter,
  validateName(),
  validateEmail(),
  validatePassword(),
  validatePhone(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;

      // Check if user already exists
      if (data.users.find(u => u.email === email)) {
        logAudit('DUPLICATE_REGISTRATION', null, { email });
        return res.status(400).json({
          success: false,
          error: 'Email already registered'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = {
        id: 'user_' + Date.now(),
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: 'user',
        status: 'active',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      data.users.push(user);
      saveData();
      logAudit('USER_REGISTERED', user.id, { email });

      const { accessToken, refreshToken } = generateTokens(user.id);
      
      // Set secure cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({
        success: true,
        user: userWithoutPassword,
        accessToken
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again later.'
      });
    }
  }
);

app.post('/api/v1/auth/login',
  authLimiter,
  validateEmail(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = data.users.find(u => u.email === email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        logAudit('FAILED_LOGIN', email, { reason: 'invalid_credentials' });
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      if (user.status !== 'active') {
        logAudit('LOGIN_ATTEMPT_INACTIVE_USER', user.id, {});
        return res.status(403).json({
          success: false,
          error: 'Account is not active'
        });
      }

      const { accessToken, refreshToken } = generateTokens(user.id);
      logAudit('USER_LOGIN', user.id, { email });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword,
        accessToken
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again later.'
      });
    }
  }
);

app.post('/api/v1/auth/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_change_in_production'
    );

    const user = data.users.find(u => u.id === decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      accessToken
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

app.post('/api/v1/auth/logout', authenticate, (req, res) => {
  try {
    logAudit('USER_LOGOUT', req.user.id, {});
    res.clearCookie('refreshToken');
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

app.get('/api/v1/auth/me', authenticate, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({
    success: true,
    user: userWithoutPassword
  });
});

// ==================== COURTS ROUTES ====================

app.get('/api/v1/courts',
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  handleValidationErrors,
  (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const offset = req.query.offset || 0;

      const courts = data.courts.filter(c => c.isActive);
      const total = courts.length;
      const items = courts.slice(offset, offset + limit);

      res.json({
        success: true,
        data: items,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      logger.error('Get courts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch courts'
      });
    }
  }
);

app.get('/api/v1/courts/:id',
  param('id').trim().escape(),
  handleValidationErrors,
  (req, res) => {
    try {
      const court = data.courts.find(c => c.id === req.params.id && c.isActive);
      if (!court) {
        return res.status(404).json({
          success: false,
          error: 'Court not found'
        });
      }
      res.json({
        success: true,
        data: court
      });
    } catch (error) {
      logger.error('Get court error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch court'
      });
    }
  }
);

app.get('/api/v1/courts/:courtId/availability/:date',
  param('courtId').trim().escape(),
  param('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Invalid date format. Use YYYY-MM-DD'),
  handleValidationErrors,
  (req, res) => {
    try {
      const { courtId, date } = req.params;

      // Validate date is not in the past
      const requestedDate = new Date(date);
      if (requestedDate < new Date().setHours(0, 0, 0, 0)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot book for past dates'
        });
      }

      const court = data.courts.find(c => c.id === courtId);
      if (!court) {
        return res.status(404).json({
          success: false,
          error: 'Court not found'
        });
      }

      const bookings = data.bookings.filter(b => 
        b.courtId === courtId && 
        b.date === date && 
        b.status !== 'cancelled'
      );

      const slots = [];
      for (let hour = 6; hour <= 22; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        const isBooked = bookings.some(b => 
          timeSlot >= b.startTime && timeSlot < b.endTime
        );
        
        if (!isBooked) {
          slots.push(timeSlot);
        }
      }

      res.json({
        success: true,
        data: {
          courtId,
          date,
          availableSlots: slots,
          totalSlots: 17,
          bookedSlots: bookings.length
        }
      });
    } catch (error) {
      logger.error('Get availability error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch availability'
      });
    }
  }
);

// ==================== BOOKINGS ROUTES ====================

app.get('/api/v1/bookings',
  authenticate,
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  handleValidationErrors,
  (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const offset = req.query.offset || 0;

      const userBookings = data.bookings.filter(b => b.userId === req.user.id);
      const total = userBookings.length;

      const bookingsWithDetails = userBookings
        .slice(offset, offset + limit)
        .map(booking => {
          const court = data.courts.find(c => c.id === booking.courtId);
          return {
            ...booking,
            court: court ? {
              id: court.id,
              name: court.name,
              location: court.location
            } : null
          };
        });

      res.json({
        success: true,
        data: bookingsWithDetails,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      logger.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings'
      });
    }
  }
);

app.post('/api/v1/bookings',
  authenticate,
  body('courtId').trim().escape(),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Invalid date format'),
  body('startTime').matches(/^\d{2}:\d{2}$/).withMessage('Invalid time format'),
  body('endTime').matches(/^\d{2}:\d{2}$/).withMessage('Invalid time format'),
  handleValidationErrors,
  (req, res) => {
    try {
      const { courtId, date, startTime, endTime } = req.body;

      // Validate date
      const bookingDate = new Date(date);
      if (bookingDate < new Date().setHours(0, 0, 0, 0)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot book for past dates'
        });
      }

      // Find court
      const court = data.courts.find(c => c.id === courtId && c.isActive);
      if (!court) {
        return res.status(404).json({
          success: false,
          error: 'Court not found'
        });
      }

      // Validate time range
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      if (startHour >= endHour || startHour < 6 || endHour > 22) {
        return res.status(400).json({
          success: false,
          error: 'Invalid time range. Courts open 6 AM - 10 PM'
        });
      }

      // Check availability
      const availableSlots = [];
      for (let hour = 6; hour <= 22; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        const isBooked = data.bookings.some(b => 
          b.courtId === courtId &&
          b.date === date &&
          b.status !== 'cancelled' &&
          timeSlot >= b.startTime && timeSlot < b.endTime
        );
        if (!isBooked) availableSlots.push(timeSlot);
      }

      const requestedSlots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        requestedSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      }

      const isSlotAvailable = requestedSlots.every(slot => availableSlots.includes(slot));
      if (!isSlotAvailable) {
        return res.status(400).json({
          success: false,
          error: 'Requested slots are not available'
        });
      }

      // Calculate price
      const hours = endHour - startHour;
      const totalPrice = hours * court.pricePerHour;

      // Create booking
      const booking = {
        id: 'booking_' + Date.now(),
        userId: req.user.id,
        courtId,
        date,
        startTime,
        endTime,
        status: 'pending',
        totalPrice,
        paymentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      data.bookings.push(booking);
      saveData();
      logAudit('BOOKING_CREATED', req.user.id, { courtId, date, totalPrice });

      res.status(201).json({
        success: true,
        data: {
          ...booking,
          court: {
            id: court.id,
            name: court.name,
            location: court.location
          }
        }
      });
    } catch (error) {
      logger.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create booking'
      });
    }
  }
);

app.patch('/api/v1/bookings/:id',
  authenticate,
  param('id').trim().escape(),
  body('status').isIn(['confirmed', 'cancelled', 'pending']).withMessage('Invalid status'),
  handleValidationErrors,
  (req, res) => {
    try {
      const booking = data.bookings.find(b => b.id === req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // Authorization: user can only modify own bookings, admin can modify any
      if (booking.userId !== req.user.id && req.user.role !== 'admin') {
        logAudit('UNAUTHORIZED_BOOKING_MODIFICATION', req.user.id, { bookingId: req.params.id });
        return res.status(403).json({
          success: false,
          error: 'Not authorized to modify this booking'
        });
      }

      const { status } = req.body;
      booking.status = status;
      booking.updatedAt = new Date().toISOString();

      saveData();
      logAudit('BOOKING_UPDATED', req.user.id, { bookingId: req.params.id, status });

      res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      logger.error('Update booking error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update booking'
      });
    }
  }
);

app.delete('/api/v1/bookings/:id',
  authenticate,
  param('id').trim().escape(),
  handleValidationErrors,
  (req, res) => {
    try {
      const booking = data.bookings.find(b => b.id === req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      if (booking.userId !== req.user.id && req.user.role !== 'admin') {
        logAudit('UNAUTHORIZED_BOOKING_DELETION', req.user.id, { bookingId: req.params.id });
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this booking'
        });
      }

      booking.status = 'cancelled';
      booking.updatedAt = new Date().toISOString();

      saveData();
      logAudit('BOOKING_CANCELLED', req.user.id, { bookingId: req.params.id });

      res.json({
        success: true,
        message: 'Booking cancelled successfully'
      });
    } catch (error) {
      logger.error('Delete booking error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel booking'
      });
    }
  }
);

// ==================== ADMIN ROUTES ====================

app.get('/api/v1/admin/bookings',
  authenticate,
  authorizeAdmin,
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled']),
  handleValidationErrors,
  (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const offset = req.query.offset || 0;
      const statusFilter = req.query.status;

      let bookings = data.bookings;
      if (statusFilter) {
        bookings = bookings.filter(b => b.status === statusFilter);
      }

      const total = bookings.length;
      const items = bookings.slice(offset, offset + limit);

      const bookingsWithDetails = items.map(booking => {
        const court = data.courts.find(c => c.id === booking.courtId);
        const user = data.users.find(u => u.id === booking.userId);
        return {
          ...booking,
          court: court ? {
            id: court.id,
            name: court.name,
            location: court.location
          } : null,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email
          } : null
        };
      });

      res.json({
        success: true,
        data: bookingsWithDetails,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      logger.error('Get admin bookings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings'
      });
    }
  }
);

app.get('/api/v1/admin/stats',
  authenticate,
  authorizeAdmin,
  (req, res) => {
    try {
      const stats = {
        totalBookings: data.bookings.length,
        confirmedBookings: data.bookings.filter(b => b.status === 'confirmed').length,
        pendingBookings: data.bookings.filter(b => b.status === 'pending').length,
        totalRevenue: data.bookings
          .filter(b => b.status === 'confirmed')
          .reduce((sum, b) => sum + b.totalPrice, 0),
        totalUsers: data.users.filter(u => u.role === 'user').length,
        totalCourts: data.courts.filter(c => c.isActive).length,
        occupancyRate: ((data.bookings.filter(b => b.status === 'confirmed').length / 
          (data.courts.filter(c => c.isActive).length * 30)) * 100).toFixed(2)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }
  }
);

app.get('/api/v1/admin/users',
  authenticate,
  authorizeAdmin,
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  handleValidationErrors,
  (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const offset = req.query.offset || 0;

      const users = data.users.map(({ password: _, ...user }) => user);
      const total = users.length;
      const items = users.slice(offset, offset + limit);

      res.json({
        success: true,
        data: items,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  }
);

app.delete('/api/v1/admin/users/:id',
  authenticate,
  authorizeAdmin,
  param('id').trim().escape(),
  handleValidationErrors,
  (req, res) => {
    try {
      const userIndex = data.users.findIndex(u => u.id === req.params.id);
      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const user = data.users[userIndex];
      if (user.role === 'admin') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete admin users'
        });
      }

      // Delete user's bookings
      data.bookings = data.bookings.filter(b => b.userId !== req.params.id);
      data.users.splice(userIndex, 1);

      saveData();
      logAudit('USER_DELETED', req.user.id, { deletedUserId: req.params.id, email: user.email });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  }
);

app.get('/api/v1/admin/audit-log',
  authenticate,
  authorizeAdmin,
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  handleValidationErrors,
  (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const offset = req.query.offset || 0;

      const total = data.auditLog.length;
      const items = data.auditLog
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(offset, offset + limit);

      res.json({
        success: true,
        data: items,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      logger.error('Get audit log error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit log'
      });
    }
  }
);

// ==================== ERROR HANDLING ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);

  // Don't leak error details in production
  const message = NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: message,
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ==================== SERVER STARTUP ====================

loadData();
const server = app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  logger.info(`🏀 Basketball Booking System started`, {
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
  
  if (NODE_ENV === 'development') {
    console.log('📝 Test Credentials:');
    console.log('Admin: admin@basketball.com / (check .env)');
    console.log('API Docs: http://localhost:' + PORT + '/api/health');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
