/**
 * Basketball Booking System - Local Development Server
 * SQLite version for easy local testing without PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_min_32_chars_long_123456';

// ============= MIDDLEWARE =============
app.use(helmet());
app.use(cors({
  origin: ['localhost:3000', '127.0.0.1:3000', 'localhost:8080'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// ============= IN-MEMORY DATABASE (For Local Testing) =============
const db = {
  users: [
    {
      id: 'admin-001',
      name: 'Admin User',
      email: 'admin@basketball.local',
      password_hash: bcryptjs.hashSync('Admin@123456', 10),
      phone: '+1234567890',
      role: 'admin',
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    }
  ],
  courts: [
    {
      id: 'court-001',
      name: 'Downtown Court A',
      location: '123 Main St',
      description: 'Professional basketball court with lighting',
      price_per_hour: 50,
      amenities: ['Lighting', 'Scoreboard', 'Parking'],
      capacity: 10,
      image_url: '/images/court-1.jpg',
      is_active: true
    },
    {
      id: 'court-002',
      name: 'Uptown Court B',
      location: '456 Park Ave',
      description: 'Indoor court with AC',
      price_per_hour: 60,
      amenities: ['Air Conditioning', 'Scoreboard', 'Parking', 'Restrooms'],
      capacity: 12,
      image_url: '/images/court-2.jpg',
      is_active: true
    }
  ],
  bookings: [],
  sessions: [],
  audit_logs: []
};

// ============= AUTHENTICATION HELPERS =============
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_SECRET + '_refresh',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authorizeAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function logAudit(action, userId, details) {
  db.audit_logs.push({
    id: uuid(),
    action,
    user_id: userId || 'system',
    details,
    timestamp: new Date().toISOString(),
    ip_address: '127.0.0.1'
  });
}

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    version: '2.0.0',
    environment: 'local-development',
    database: 'in-memory',
    timestamp: new Date().toISOString()
  });
});

// ============= AUTH ENDPOINTS =============

// Register
app.post('/api/v1/auth/register', (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (db.users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const user = {
      id: uuid(),
      name,
      email,
      password_hash: bcryptjs.hashSync(password, 10),
      phone: phone || '',
      role: 'user',
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: null
    };
    
    db.users.push(user);
    logAudit('USER_REGISTERED', user.id, { email });
    
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/v1/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = db.users.find(u => u.email === email);
    
    if (!user || !bcryptjs.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    user.last_login = new Date().toISOString();
    const { accessToken, refreshToken } = generateTokens(user);
    
    logAudit('USER_LOGIN', user.id, { email });
    
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/v1/auth/me', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status
  });
});

// ============= COURTS ENDPOINTS =============

// List courts
app.get('/api/v1/courts', (req, res) => {
  const activeCourts = db.courts.filter(c => c.is_active);
  res.json(activeCourts);
});

// Get court details
app.get('/api/v1/courts/:courtId', (req, res) => {
  const court = db.courts.find(c => c.id === req.params.courtId);
  
  if (!court) {
    return res.status(404).json({ error: 'Court not found' });
  }
  
  res.json(court);
});

// Get court availability
app.get('/api/v1/courts/:courtId/availability', (req, res) => {
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ error: 'Date parameter required' });
  }
  
  const courtBookings = db.bookings.filter(
    b => b.court_id === req.params.courtId && 
         b.booking_date === date && 
         b.status === 'confirmed'
  );
  
  const timeSlots = [];
  for (let hour = 7; hour < 22; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    const isBooked = courtBookings.some(b => b.start_time === time);
    timeSlots.push({ time, available: !isBooked });
  }
  
  res.json({ date, slots: timeSlots });
});

// ============= BOOKINGS ENDPOINTS =============

// List user bookings
app.get('/api/v1/bookings', authenticate, (req, res) => {
  const userBookings = db.bookings.filter(b => b.user_id === req.user.id);
  res.json(userBookings);
});

// Create booking
app.post('/api/v1/bookings', authenticate, (req, res) => {
  try {
    const { court_id, booking_date, start_time, end_time } = req.body;
    
    if (!court_id || !booking_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const court = db.courts.find(c => c.id === court_id);
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }
    
    // Check availability
    const conflict = db.bookings.find(
      b => b.court_id === court_id &&
           b.booking_date === booking_date &&
           b.start_time === start_time &&
           b.status === 'confirmed'
    );
    
    if (conflict) {
      return res.status(409).json({ error: 'Time slot already booked' });
    }
    
    // Calculate price
    const startHour = parseInt(start_time.split(':')[0]);
    const endHour = parseInt(end_time.split(':')[0]);
    const hours = endHour - startHour;
    const total_price = court.price_per_hour * hours;
    
    const booking = {
      id: uuid(),
      user_id: req.user.id,
      court_id,
      booking_date,
      start_time,
      end_time,
      status: 'confirmed',
      total_price,
      payment_id: 'payment-' + uuid(),
      payment_status: 'completed',
      created_at: new Date().toISOString()
    };
    
    db.bookings.push(booking);
    logAudit('BOOKING_CREATED', req.user.id, { booking_id: booking.id, court_id });
    
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Booking failed' });
  }
});

// Update booking
app.put('/api/v1/bookings/:bookingId', authenticate, (req, res) => {
  try {
    const booking = db.bookings.find(b => b.id === req.params.bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { start_time, end_time, booking_date } = req.body;
    
    if (start_time) booking.start_time = start_time;
    if (end_time) booking.end_time = end_time;
    if (booking_date) booking.booking_date = booking_date;
    
    booking.updated_at = new Date().toISOString();
    
    logAudit('BOOKING_UPDATED', req.user.id, { booking_id: booking.id });
    
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Cancel booking
app.delete('/api/v1/bookings/:bookingId', authenticate, (req, res) => {
  try {
    const booking = db.bookings.find(b => b.id === req.params.bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    booking.status = 'cancelled';
    booking.cancelled_at = new Date().toISOString();
    
    logAudit('BOOKING_CANCELLED', req.user.id, { booking_id: booking.id });
    
    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

// ============= ADMIN ENDPOINTS =============

// Get all bookings (admin)
app.get('/api/v1/admin/bookings', authenticate, authorizeAdmin, (req, res) => {
  res.json(db.bookings);
});

// Get booking stats (admin)
app.get('/api/v1/admin/stats', authenticate, authorizeAdmin, (req, res) => {
  const totalBookings = db.bookings.length;
  const revenue = db.bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const totalUsers = db.users.length;
  
  res.json({
    total_bookings: totalBookings,
    total_revenue: revenue,
    total_users: totalUsers,
    active_bookings: db.bookings.filter(b => b.status === 'confirmed').length,
    cancelled_bookings: db.bookings.filter(b => b.status === 'cancelled').length
  });
});

// Get all users (admin)
app.get('/api/v1/admin/users', authenticate, authorizeAdmin, (req, res) => {
  const users = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    created_at: u.created_at
  }));
  res.json(users);
});

// Delete user (admin)
app.delete('/api/v1/admin/users/:userId', authenticate, authorizeAdmin, (req, res) => {
  const index = db.users.findIndex(u => u.id === req.params.userId);
  
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const user = db.users[index];
  db.users.splice(index, 1);
  
  logAudit('USER_DELETED', req.user.id, { deleted_user_id: user.id });
  
  res.json({ message: 'User deleted' });
});

// Get audit logs (admin)
app.get('/api/v1/admin/audit-logs', authenticate, authorizeAdmin, (req, res) => {
  res.json(db.audit_logs);
});

// ============= ERROR HANDLING =============
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============= SERVER START =============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏀 Basketball Booking System - LOCAL DEVELOPMENT        ║
║   Version 2.0.0                                            ║
║                                                            ║
║   Status: ✅ Running                                       ║
║   Server: http://localhost:${PORT}                        ║
║   Database: In-Memory (SQLite simulation)                  ║
║                                                            ║
║   📚 API Docs: http://localhost:${PORT}/                  ║
║   🏥 Health: http://localhost:${PORT}/health              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

📋 DEFAULT ADMIN ACCOUNT:
   Email: admin@basketball.local
   Password: Admin@123456
   Role: admin

🔗 KEY ENDPOINTS:
   POST   /api/v1/auth/register      - Register new user
   POST   /api/v1/auth/login         - Login
   GET    /api/v1/courts             - List courts
   POST   /api/v1/bookings           - Create booking
   GET    /api/v1/admin/stats        - View stats (admin)

💡 TIPS:
   1. Open http://localhost:${PORT} in browser
   2. Use admin account to explore features
   3. Check console for request logs
   4. API docs available in public/api.html

⏸️  Press Ctrl+C to stop the server
`);
});
