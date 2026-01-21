-- Basketball Booking System Database Schema
-- SQLite Database Schema v1.0
-- Created: 2026-01-21

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires DATETIME
);

-- Courts table
CREATE TABLE IF NOT EXISTS courts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    price_per_hour REAL NOT NULL CHECK (price_per_hour > 0),
    amenities TEXT,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    court_id TEXT NOT NULL,
    date TEXT NOT NULL CHECK (date = date(date)),
    start_time TEXT NOT NULL CHECK (start_time GLOB '[0-9][0-9]:[0-9][0-9]'),
    end_time TEXT NOT NULL CHECK (end_time GLOB '[0-9][0-9]:[0-9][0-9]'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    total_price REAL NOT NULL CHECK (total_price >= 0),
    payment_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cancelled_at DATETIME,
    cancellation_reason TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
);

-- Sessions table (for authentication tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    token_type TEXT DEFAULT 'access' CHECK (token_type IN ('access', 'refresh', 'email_verification', 'password_reset')),
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit log table for security events
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    event_type TEXT NOT NULL,
    event_description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    resource_id TEXT,
    resource_type TEXT,
    old_values TEXT, -- JSON string
    new_values TEXT, -- JSON string
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Court availability table (for optimized booking queries)
CREATE TABLE IF NOT EXISTS court_availability (
    id TEXT PRIMARY KEY,
    court_id TEXT NOT NULL,
    date TEXT NOT NULL CHECK (date = date(date)),
    start_time TEXT NOT NULL CHECK (start_time MATCH '^[0-9]{2}:[0-9]{2}$'),
    end_time TEXT NOT NULL CHECK (end_time MATCH '^[0-9]{2}:[0-9]{2}$'),
    is_available BOOLEAN DEFAULT TRUE,
    booking_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    UNIQUE(court_id, date, start_time, end_time)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    preferred_court_ids TEXT, -- JSON array
    notification_preferences TEXT, -- JSON object
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'INR',
    payment_method TEXT,
    payment_gateway TEXT,
    gateway_transaction_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    gateway_response TEXT, -- JSON object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_courts_active ON courts(is_active);
CREATE INDEX IF NOT EXISTS idx_courts_location ON courts(location);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, date);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_court_availability_court_date ON court_availability(court_id, date);
CREATE INDEX IF NOT EXISTS idx_court_availability_available ON court_availability(is_available);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- View for active bookings with user and court details
CREATE VIEW IF NOT EXISTS active_bookings_view AS
SELECT 
    b.id,
    b.date,
    b.start_time,
    b.end_time,
    b.status,
    b.total_price,
    b.payment_status,
    b.created_at,
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    c.id as court_id,
    c.name as court_name,
    c.location as court_location,
    c.price_per_hour as court_price_per_hour
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN courts c ON b.court_id = c.id
WHERE b.status NOT IN ('cancelled');

-- View for court utilization
CREATE VIEW IF NOT EXISTS court_utilization_view AS
SELECT 
    c.id as court_id,
    c.name as court_name,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.date >= date('now', '-30 days') THEN 1 END) as recent_bookings,
    SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as total_revenue,
    AVG(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE NULL END) as average_booking_price
FROM courts c
LEFT JOIN bookings b ON c.id = b.court_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name;

-- View for user activity
CREATE VIEW IF NOT EXISTS user_activity_view AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    u.created_at as user_created_at,
    u.last_login,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.date >= date('now', '-30 days') THEN 1 END) as recent_bookings,
    SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as total_spent,
    MAX(b.created_at) as last_booking_date
FROM users u
LEFT JOIN bookings b ON u.id = b.user_id
GROUP BY u.id, u.name, u.email, u.created_at, u.last_login;