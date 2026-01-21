# 🏀 Basketball Court Booking System

A secure, production-ready basketball court booking system built with Node.js, Express, and SQLite. This system implements comprehensive security measures, database management, and follows industry best practices.

## 📋 Table of Contents

- [Features](#-features)
- [Security](#-security)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Database Management](#-database-management)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Backup & Recovery](#-backup--recovery)
- [Monitoring](#-monitoring)
- [Contributing](#-contributing)

## ✨ Features

### Core Functionality
- **User Management**: Registration, authentication, role-based access control
- **Court Management**: Multiple courts with pricing, amenities, and availability
- **Booking System**: Time-slot based bookings with payment integration
- **Admin Dashboard**: User management, booking oversight, system statistics
- **Real-time Availability**: Court scheduling and conflict detection

### Security Features
- **Strong Authentication**: BCrypt password hashing, secure session management
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Protection against brute force attacks
- **XSS Protection**: Input sanitization and CSP headers
- **SQL Injection Prevention**: Parameterized queries and input validation
- **HTTPS Enforcement**: TLS/SSL configuration with HSTS
- **Audit Logging**: Comprehensive security event tracking
- **CORS Protection**: Configurable cross-origin resource sharing

### Database Features
- **SQLite Database**: Lightweight, file-based database with full SQL support
- **Schema Management**: Version-controlled database schema with migrations
- **Transaction Support**: ACID compliance for data integrity
- **Connection Pooling**: Efficient database connection management
- **Backup & Recovery**: Automated backup system with point-in-time recovery
- **Performance Optimization**: Indexed queries and optimized data structures

## 🔒 Security

This application implements defense-in-depth security architecture:

### Authentication & Authorization
- **Password Policy**: Minimum 12 characters with complexity requirements
- **Secure Hashing**: BCrypt with 12 salt rounds
- **Session Management**: JWT tokens with configurable expiration
- **Role-Based Access**: Admin and user roles with granular permissions
- **Account Lockout**: Temporary locking after failed attempts

### Input Validation & Sanitization
- **Server-Side Validation**: Comprehensive validation for all inputs
- **XSS Prevention**: Input sanitization and output encoding
- **SQL Injection Protection**: Parameterized queries only
- **File Upload Security**: Restricted file types and size limits
- **CSRF Protection**: Token-based CSRF prevention

### Network Security
- **HTTPS Enforcement**: TLS 1.2+ with valid certificates
- **Security Headers**: Helmet.js with comprehensive header configuration
- **Rate Limiting**: Configurable limits per endpoint and user
- **CORS Configuration**: Restricted cross-origin requests
- **IP Whitelisting**: Configurable IP-based access control

### Monitoring & Auditing
- **Security Event Logging**: Comprehensive audit trail
- **Failed Login Tracking**: Monitoring and alerting for suspicious activity
- **Data Access Logging**: All sensitive data operations logged
- **Error Tracking**: Secure error logging without information disclosure

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd basketball-booking
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize the database**
```bash
npm run migrate
```

5. **Start the application**
```bash
npm start
```

6. **Access the application**
- Frontend: http://localhost:3000
- API Health Check: http://localhost:3000/api/health
- Admin Dashboard: http://localhost:3000/admin

### Default Credentials
After initial setup, the following default accounts are created:

**Admin Account:**
- Email: `admin@basketball.com`
- Password: `admin123`

**Test Users:**
- Email: `rahul@example.com`
- Password: `user123`
- Email: `priya@example.com`
- Password: `user123`

⚠️ **Important**: Change default passwords immediately after first login!

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_PATH=./data/basketball.db

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-here
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-here
BCRYPT_SALT_ROUNDS=12

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Backup Configuration
BACKUP_DIR=./backups
AUTO_BACKUP_INTERVAL_HOURS=6
MAX_BACKUPS=30

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Security Configuration

#### Password Policy
```javascript
const passwordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true
};
```

#### Rate Limiting
```javascript
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // General requests
  authMax: 5, // Authentication requests
  skipSuccessfulRequests: true
};
```

## 🗄️ Database Management

### Database Schema

The application uses SQLite with the following main tables:

- **users**: User accounts and authentication data
- **courts**: Basketball court information and pricing
- **bookings**: Court reservations and booking details
- **sessions**: Authentication tokens and session management
- **audit_logs**: Security event logging and audit trail
- **payment_transactions**: Payment processing and transaction history

### Database Operations

#### Migration
```bash
# Run database migrations
npm run migrate

# Create fresh database
rm -f ./data/basketball.db
npm run migrate
```

#### Database Statistics
```bash
# View database statistics
npm run db:stats
```

#### Manual Database Operations
```javascript
// Initialize database
const db = new Database('./data/basketball.db');
await db.initialize();

// Get database statistics
const stats = await db.getDatabaseStats();
console.log(stats);

// Close connection
await db.close();
```

### Schema Updates

When modifying the database schema:

1. Create a new migration file in `database/migrations/`
2. Update `database/schema.sql`
3. Test migration on development environment
4. Run migration in production with backup

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "9876543210"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Court Endpoints

#### Get All Courts
```http
GET /api/courts
```

#### Get Court by ID
```http
GET /api/courts/:id
```

### Booking Endpoints

#### Get User Bookings
```http
GET /api/bookings/my
Authorization: Bearer <token>
```

#### Create Booking
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "court_id": "court_001",
  "date": "2026-12-01",
  "start_time": "10:00",
  "end_time": "12:00"
}
```

#### Update Booking
```http
PATCH /api/bookings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed",
  "cancellation_reason": "User requested cancellation"
}
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users
Authorization: Bearer <admin-token>
```

#### Get All Bookings
```http
GET /api/admin/bookings
Authorization: Bearer <admin-token>
```

#### Get System Statistics
```http
GET /api/admin/stats
Authorization: Bearer <admin-token>
```

### Health Check
```http
GET /api/health
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run security tests only
npm run test:security

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

The test suite covers:

- **Security Tests**: Authentication, authorization, input validation
- **Database Tests**: CRUD operations, transactions, constraints
- **API Tests**: Endpoint functionality, error handling
- **Performance Tests**: Load testing, concurrent requests
- **Integration Tests**: End-to-end workflows

### Test Structure

```
tests/
├── security.test.js      # Security and authentication tests
├── database.test.js      # Database operation tests
├── api.test.js           # API endpoint tests
└── integration.test.js   # End-to-end tests
```

### Writing Tests

```javascript
const request = require('supertest');
const assert = require('chai').assert;

describe('Feature Tests', () => {
    it('should test expected behavior', async () => {
        const response = await request(app)
            .post('/api/endpoint')
            .send(data);
            
        assert.equal(response.status, 200);
        assert.isTrue(response.body.success);
    });
});
```

## 🚀 Deployment

### Production Deployment

#### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Application Setup

```bash
# Clone repository
git clone <repository-url> /var/www/basketball-booking
cd /var/www/basketball-booking

# Install dependencies
npm ci --production

# Set up environment
cp .env.example .env
# Edit .env with production values

# Initialize database
npm run migrate

# Create necessary directories
mkdir -p logs data backups
sudo chown -R www-data:www-data /var/www/basketball-booking
```

#### 3. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 4. Process Management

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'basketball-booking',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start the application:

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

#### 5. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /static {
        alias /var/www/basketball-booking/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directories
RUN mkdir -p data logs backups

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./backups:/app/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped
```

## 💾 Backup & Recovery

### Automated Backups

#### Full Backup
```bash
# Create full backup
npm run backup

# Manual full backup
node database/backup-cli.js full
```

#### Incremental Backup
```bash
# Create incremental backup
node database/backup-cli.js incremental
```

#### Automatic Backup Scheduler
```bash
# Start automatic backup (every 6 hours)
npm run backup:auto

# Custom interval (every 12 hours)
node database/backup-cli.js auto 12
```

### Backup Management

#### List Backups
```bash
node database/backup-cli.js list
```

#### Verify Backup Integrity
```bash
node database/backup-cli.js verify <backup_path>
```

#### Restore from Backup
```bash
node database/backup-cli.js restore <backup_path>
```

### Backup Configuration

```javascript
const backupConfig = {
    maxBackups: 30,           // Keep last 30 backups
    compressionEnabled: true, // Compress backup files
    autoBackupInterval: 6,    // Hours between automatic backups
    backupDir: './backups',   // Backup directory
    encryptionEnabled: false  // Enable backup encryption
};
```

### Recovery Procedures

#### 1. Database Corruption
```bash
# Stop application
pm2 stop basketball-booking

# Restore from latest backup
node database/backup-cli.js restore ./backups/latest_backup.sql

# Verify database integrity
node database/backup-cli.js verify ./backups/latest_backup.sql

# Start application
pm2 start basketball-booking
```

#### 2. Point-in-Time Recovery
```bash
# List available backups
node database/backup-cli.js list

# Restore from specific backup
node database/backup-cli.js restore ./backups/basketball_full_2026-01-21T10-30-00-000Z.sql

# Apply incremental backups if needed
# (Manual process for SQLite)
```

## 📊 Monitoring

### Health Monitoring

#### Application Health
```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-01-21T10:30:00.000Z",
  "database": {
    "connected": true,
    "stats": {
      "users": 150,
      "courts": 3,
      "bookings": 1250,
      "sessions": 45,
      "audit_logs": 5600
    }
  }
}
```

#### Database Monitoring
```bash
# Database statistics
npm run db:stats

# Check database file size
ls -lh ./data/basketball.db

# Monitor database connections
sqlite3 ./data/basketball.db "PRAGMA database_list;"
```

### Log Monitoring

#### Application Logs
```bash
# View real-time logs
pm2 logs basketball-booking

# View error logs
tail -f ./logs/err.log

# View access logs
tail -f ./logs/combined.log
```

#### Security Events
```sql
-- View recent security events
SELECT * FROM audit_logs 
WHERE created_at >= datetime('now', '-24 hours')
ORDER BY created_at DESC;

-- View failed login attempts
SELECT * FROM audit_logs 
WHERE event_type = 'login_failure' 
AND created_at >= datetime('now', '-1 hour');
```

### Performance Monitoring

#### Key Metrics
- **Response Time**: API endpoint response times
- **Error Rate**: HTTP 5xx and 4xx error rates
- **Database Performance**: Query execution times
- **Memory Usage**: Application memory consumption
- **CPU Usage**: Process CPU utilization

#### Monitoring Tools
```bash
# PM2 Monitoring
pm2 monit

# System Resource Monitoring
htop
iostat -x 1
df -h

# Application Performance
npm install clinic
clinic doctor -- node server.js
```

### Alerting

#### Security Alerts
- Multiple failed login attempts
- Unusual data access patterns
- Administrative actions
- System errors and exceptions

#### Performance Alerts
- High response times
- Database connection issues
- Memory usage thresholds
- Disk space warnings

## 🔧 Maintenance

### Regular Maintenance Tasks

#### Daily
- Review application logs
- Check backup completion
- Monitor system resources

#### Weekly
- Review security events
- Update dependencies
- Performance analysis

#### Monthly
- Security audit
- Database optimization
- Backup verification
- Update documentation

### Dependency Management

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Security audit
npm audit

# Fix security issues
npm audit fix
```

### Database Maintenance

```sql
-- Clean up old sessions
DELETE FROM sessions WHERE expires_at < datetime('now', '-7 days');

-- Archive old audit logs
DELETE FROM audit_logs WHERE created_at < datetime('now', '-90 days');

-- Optimize database
VACUUM;
ANALYZE;

-- Check database integrity
PRAGMA integrity_check;
```

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: Follow ESLint configuration
2. **Testing**: Write tests for new features
3. **Security**: Follow security best practices
4. **Documentation**: Update API documentation
5. **Commits**: Use conventional commit messages

### Security Considerations

- Never commit secrets or credentials
- Validate all user inputs
- Use parameterized queries
- Implement proper error handling
- Follow principle of least privilege

### Pull Request Process

1. Fork the repository
2. Create feature branch
3. Write tests for changes
4. Ensure all tests pass
5. Submit pull request with description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:

- **Documentation**: Check this README and API docs
- **Issues**: Create an issue on GitHub
- **Security**: Report security vulnerabilities privately
- **Email**: support@basketball-booking.com

---

**Built with ❤️ for the basketball community**