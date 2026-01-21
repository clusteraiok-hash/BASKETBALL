const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Data Storage (in-memory with file backup)
const DATA_FILE = './data/database.json';

// Initialize data
let data = {
  users: [],
  courts: [],
  bookings: [],
  sessions: []
};

// Load data from file
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const fileData = fs.readFileSync(DATA_FILE, 'utf8');
    data = JSON.parse(fileData);
  } else {
    initializeData();
  }
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Initialize default data
function initializeData() {
  data = {
    users: [
      {
        id: 'admin_001',
        name: 'Admin User',
        email: 'admin@basketball.com',
        password: bcrypt.hashSync('admin123', 10),
        phone: '9876543210',
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_001',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        password: bcrypt.hashSync('user123', 10),
        phone: '9876543211',
        role: 'user',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_002',
        name: 'Priya Patel',
        email: 'priya@example.com',
        password: bcrypt.hashSync('user123', 10),
        phone: '9876543212',
        role: 'user',
        createdAt: new Date().toISOString()
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
        isActive: true
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
        isActive: true
      },
      {
        id: 'court_003',
        name: 'Half Court C',
        location: 'Outdoor Area',
        description: 'Outdoor half-court with adjustable hoops',
        pricePerHour: 200,
        amenities: 'Lights, Water Fountain, Restrooms',
        capacity: 5,
        imageUrl: '/images/court3.jpg',
        isActive: true
      }
    ],
    bookings: [
      {
        id: 'booking_001',
        userId: 'user_001',
        courtId: 'court_001',
        date: '2026-01-21',
        startTime: '09:00',
        endTime: '11:00',
        status: 'confirmed',
        totalPrice: 1000,
        paymentId: 'PAY_001',
        createdAt: new Date().toISOString()
      },
      {
        id: 'booking_002',
        userId: 'user_002',
        courtId: 'court_002',
        date: '2026-01-22',
        startTime: '14:00',
        endTime: '16:00',
        status: 'pending',
        totalPrice: 600,
        paymentId: null,
        createdAt: new Date().toISOString()
      }
    ],
    sessions: []
  };
  saveData();
}

// Authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const session = data.sessions.find(s => s.token === token && s.expiresAt > new Date().toISOString());
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.users.find(u => u.id === session.userId);
  next();
}

// Helper functions
function getAvailableSlots(courtId, date) {
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

  return slots;
}

// API Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (data.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: 'user_' + Date.now(),
      name,
      email,
      phone: phone || null, // Make phone optional
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    data.users.push(user);
    saveData();

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = data.users.find(u => u.email === email);
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    data.sessions.push({ token, userId: user.id, expiresAt });
    saveData();

    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      success: true, 
      user: userWithoutPassword, 
      token,
      expiresAt 
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const { token } = req.body;
  data.sessions = data.sessions.filter(s => s.token !== token);
  saveData();
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

// Courts Routes
app.get('/api/courts', (req, res) => {
  res.json({ 
    courts: data.courts.filter(c => c.isActive) 
  });
});

app.get('/api/courts/:id', (req, res) => {
  const court = data.courts.find(c => c.id === req.params.id);
  if (!court) {
    return res.status(404).json({ error: 'Court not found' });
  }
  res.json({ court });
});

app.get('/api/courts/:id/availability/:date', (req, res) => {
  const { id, date } = req.params;
  const availableSlots = getAvailableSlots(id, date);
  res.json({ availableSlots });
});

// Bookings Routes
app.get('/api/bookings', authenticate, (req, res) => {
  const userBookings = data.bookings.filter(b => b.userId === req.user.id);
  
  const bookingsWithDetails = userBookings.map(booking => {
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

  res.json({ bookings: bookingsWithDetails });
});

app.post('/api/bookings', authenticate, (req, res) => {
  try {
    const { courtId, date, startTime, endTime } = req.body;

    // Check if court exists
    const court = data.courts.find(c => c.id === courtId);
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }

    // Check if slots are available
    const availableSlots = getAvailableSlots(courtId, date);
    const requestedSlots = [];
    for (let hour = parseInt(startTime.split(':')[0]); hour < parseInt(endTime.split(':')[0]); hour++) {
      requestedSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    const isSlotAvailable = requestedSlots.every(slot => availableSlots.includes(slot));
    if (!isSlotAvailable) {
      return res.status(400).json({ error: 'Requested slot is not available' });
    }

    // Calculate price
    const hours = parseInt(endTime.split(':')[0]) - parseInt(startTime.split(':')[0]);
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
      createdAt: new Date().toISOString()
    };

    data.bookings.push(booking);
    saveData();

    res.json({ 
      success: true, 
      booking: {
        ...booking,
        court: {
          id: court.id,
          name: court.name,
          location: court.location
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Booking failed' });
  }
});

app.patch('/api/bookings/:id', authenticate, (req, res) => {
  const booking = data.bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { status } = req.body;
  booking.status = status;
  booking.updatedAt = new Date().toISOString();

  saveData();
  res.json({ success: true, booking });
});

// Admin Routes
app.get('/api/admin/bookings', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const bookingsWithDetails = data.bookings.map(booking => {
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

  res.json({ bookings: bookingsWithDetails });
});

app.get('/api/admin/stats', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const stats = {
    totalBookings: data.bookings.length,
    confirmedBookings: data.bookings.filter(b => b.status === 'confirmed').length,
    pendingBookings: data.bookings.filter(b => b.status === 'pending').length,
    totalRevenue: data.bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.totalPrice, 0),
    totalUsers: data.users.filter(u => u.role === 'user').length,
    totalCourts: data.courts.filter(c => c.isActive).length
  };

  res.json({ stats });
});

// Admin user management endpoints
app.get('/api/admin/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { password: _, ...usersWithoutPassword } = data.users;
  res.json({ users: usersWithoutPassword });
});

app.delete('/api/admin/users/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const userIndex = data.users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = data.users[userIndex];
  
  // Don't allow deleting admin users
  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Cannot delete admin user' });
  }

  // Also delete user's bookings
  data.bookings = data.bookings.filter(b => b.userId !== req.params.id);
  
  // Remove user
  data.users.splice(userIndex, 1);
  
  saveData();
  res.json({ success: true });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Initialize data and start server
loadData();
app.listen(PORT, () => {
  console.log(`🏀 Basketball Booking System running at http://localhost:${PORT}`);
  console.log('📊 Admin: admin@basketball.com / admin123');
  console.log('👤 User: rahul@example.com / user123');
  console.log('👤 User: priya@example.com / user123');
});