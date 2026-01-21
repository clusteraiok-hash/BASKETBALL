# Security Vulnerabilities Report - Basketball Booking Web App

## Production Security Issues Found

### 🔴 CRITICAL VULNERABILITIES

#### 1. **Hardcoded Credentials in Source Code**
- **Location**: [server.js (Lines 47-65)](server.js#L47-L65)
- **Issue**: Default credentials are hardcoded in initialization
  - Admin: `admin@basketball.com` / `admin123`
  - User: `rahul@example.com` / `user123`
  - User: `priya@example.com` / `user123`
- **Also Logged in Console**: [server.js (Lines 455-457)](server.js#L455-L457)
- **Impact**: Anyone with source code access can login as admin
- **Fix**: 
  - Use environment variables for default credentials
  - Remove hardcoded passwords from initialization
  - Use secure password generation
  - Never log credentials in console

#### 2. **Weak Password Policy**
- **Location**: [signup.html (Line 73)](signup.html#L73) - Only 6 character minimum
- **Issue**: Minimum password length is only 6 characters
- **Impact**: Easily cracked passwords, brute force attacks succeed quickly
- **Fix**: Enforce minimum 12 characters, complexity requirements (uppercase, numbers, special chars)

#### 3. **No Input Validation & SQL Injection Risk**
- **Location**: [server.js (Lines 170-180)](server.js#L170-L180)
- **Issue**: 
  - `name`, `email`, `phone`, `password` fields not validated before database insertion
  - No sanitization of special characters
  - Potential for NoSQL/JSON injection if upgraded to real database
- **Impact**: Malformed data, injection attacks
- **Fix**: 
  - Implement input validation using `validator` package
  - Sanitize all user inputs
  - Use parameterized queries (when using real database)

#### 4. **No HTTPS/TLS Enforcement**
- **Location**: Entire application
- **Issue**: No mention of HTTPS, app runs on plain HTTP
- **Impact**: 
  - All authentication tokens transmitted in plain text
  - Credentials exposed to MITM attacks
  - Session hijacking possible
- **Fix**: 
  - Implement HTTPS with valid SSL certificate
  - Add HSTS headers
  - Use secure cookie flags

#### 5. **Insecure Token Generation**
- **Location**: [server.js (Line 195)](server.js#L195)
- **Issue**: Uses UUID v4 for session tokens (predictable format)
- **Impact**: Tokens could be guessed or predicted
- **Fix**: Use cryptographically secure random token generation with sufficient entropy

#### 6. **No Rate Limiting on Authentication Endpoints**
- **Location**: [server.js (Lines 165-202)](server.js#L165-L202)
- **Issue**: No protection against brute force attacks on login/register endpoints
- **Impact**: Attackers can perform unlimited login attempts
- **Fix**: Implement rate limiting using middleware like `express-rate-limit`

#### 7. **Long Token Expiration (7 Days)**
- **Location**: [server.js (Line 196)](server.js#L196)
- **Issue**: Session tokens valid for 7 days
- **Impact**: Increased risk from stolen tokens, no token refresh mechanism
- **Fix**: 
  - Reduce expiration to 1-2 hours
  - Implement refresh token mechanism
  - Add token revocation capability

#### 8. **No CORS Validation**
- **Location**: [server.js (Line 12)](server.js#L12)
- **Issue**: CORS enabled with no restrictions (`app.use(cors())`)
- **Impact**: Any domain can make requests to the API, CSRF attacks possible
- **Fix**: 
  ```javascript
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
    credentials: true
  }));
  ```

#### 9. **In-Memory Data Storage with File-Based Persistence**
- **Location**: [server.js (Lines 23-35)](server.js#L23-L35)
- **Issue**: 
  - All data stored in JSON file (plaintext passwords, payment info)
  - No encryption at rest
  - File permissions not restricted
- **Impact**: 
  - Data breach if server compromised
  - Passwords readable in database.json
  - Payment data exposed
- **Fix**: 
  - Use proper database with encryption (PostgreSQL, MongoDB with encryption)
  - Hash all sensitive data
  - Implement database access controls

#### 10. **Admin Password Stored in Plaintext in Database**
- **Location**: [server.js (Line 48)](server.js#L48) - Database stores hashed password but initialization creates plaintext risk
- **Issue**: Admins can be easily recreated with hardcoded credentials
- **Impact**: Permanent admin access backdoor
- **Fix**: Remove initialization defaults, use proper admin setup process

---

### 🟠 HIGH VULNERABILITIES

#### 11. **Missing CSRF Protection**
- **Location**: All POST/PATCH/DELETE endpoints
- **Issue**: No CSRF tokens on state-changing operations
- **Impact**: Cross-site requests can modify data
- **Fix**: 
  - Implement CSRF tokens using `csurf` middleware
  - Validate tokens on all state-changing requests

#### 12. **No Request Validation Middleware**
- **Location**: All API endpoints
- **Issue**: Missing validation of request body size, content-type
- **Impact**: Buffer overflow, malformed request attacks
- **Fix**: Add `express-validator` or similar for body validation

#### 13. **Insufficient Authorization Checks**
- **Location**: [server.js (Line 308)](server.js#L308) - Booking patch endpoint
- **Issue**: Only checks `userId` match or admin role, no granular permissions
- **Impact**: Admin can modify/delete any booking, potential data tampering
- **Fix**: Implement role-based access control (RBAC) with granular permissions

#### 14. **No Logging of Security Events**
- **Location**: Entire application
- **Issue**: No audit logging of login attempts, failed operations, admin actions
- **Impact**: Cannot detect breach, forensic analysis impossible
- **Fix**: Implement comprehensive audit logging with timestamps and user info

#### 15. **Sensitive Data Exposure in Responses**
- **Location**: [server.js (Line 366)](server.js#L366) - Admin users endpoint
- **Issue**: Returns all user data including partial info in filtered responses
- **Impact**: Information disclosure, user enumeration possible
- **Fix**: 
  - Return only necessary fields
  - Implement data sanitization in response objects

#### 16. **No Encryption for Sensitive Data in Transit**
- **Location**: Payment information handling
- **Issue**: No encryption for `paymentId`, `totalPrice` fields in transmission
- **Impact**: Payment data can be intercepted
- **Fix**: Use HTTPS + encrypt sensitive fields end-to-end

#### 17. **Directory Traversal Risk**
- **Location**: [server.js (Line 14)](server.js#L14) - `app.use(express.static('.'))`
- **Issue**: Serving entire directory as static files, may expose sensitive files
- **Impact**: Exposure of `database.json`, `server.js`, `.env` files
- **Fix**: 
  ```javascript
  app.use(express.static('public', {
    dotfiles: 'deny'
  }));
  ```

#### 18. **No Content Security Policy (CSP)**
- **Location**: [index.html](index.html) and all HTML files
- **Issue**: No CSP headers, relying on external CDNs without integrity checking
- **Impact**: XSS attacks possible, supply chain attacks
- **Fix**: 
  - Add CSP headers: `Content-Security-Policy: default-src 'self'`
  - Use SRI (Subresource Integrity) for CDN resources
  - Example: `<script src="https://cdn.tailwindcss.com" integrity="sha384-..." crossorigin="anonymous"></script>`

#### 19. **No Authentication on Public Endpoints**
- **Location**: [server.js (Lines 253-268)](server.js#L253-L268) - GET /api/courts, /api/courts/:id
- **Issue**: Court endpoints accessible without authentication (may be intentional but check)
- **Impact**: If sensitive court info exists, it's exposed
- **Fix**: Ensure only public courts are exposed without auth

#### 20. **Missing Security Headers**
- **Location**: Entire application
- **Issue**: No implementation of:
  - X-Frame-Options (clickjacking protection)
  - X-Content-Type-Options (MIME sniffing prevention)
  - Strict-Transport-Security (HSTS)
  - X-XSS-Protection
- **Impact**: Browser-level attacks possible
- **Fix**: Add helmet.js middleware

---

### 🟡 MEDIUM VULNERABILITIES

#### 21. **No Encryption of Sensitive API Keys**
- **Location**: `UPI_ID` hardcoded in [js/app.js (Line 4)](js/app.js#L4)
- **Issue**: UPI ID exposed in client-side code
- **Impact**: UPI account takeover, payment fraud
- **Fix**: Move to backend, implement secure payment API

#### 22. **LocalStorage Usage for Sensitive Data**
- **Location**: [js/app.js (Lines 16-21)](js/app.js#L16-L21) - STORAGE_KEYS
- **Issue**: Authentication tokens stored in LocalStorage (not httpOnly)
- **Impact**: XSS attacks can steal tokens easily
- **Fix**: Use httpOnly secure cookies instead of localStorage

#### 23. **No Error Message Sanitization**
- **Location**: API error responses throughout server.js
- **Issue**: Error messages may leak system information
- **Impact**: Information disclosure helps attackers
- **Fix**: Return generic error messages in production, log details server-side

#### 24. **No Input Size Limits**
- **Location**: [server.js (Line 11)](server.js#L11)
- **Issue**: No limit on JSON request size
- **Impact**: DoS attacks via large payloads
- **Fix**: 
  ```javascript
  app.use(express.json({ limit: '1mb' }));
  ```

#### 25. **No Email Verification**
- **Location**: [server.js (Lines 170-178)](server.js#L170-L178) - Register endpoint
- **Issue**: Users can register with any email, no verification required
- **Impact**: Fake accounts, email enumeration, spam registrations
- **Fix**: Implement email verification token sent to email address

#### 26. **No Account Lockout After Failed Attempts**
- **Location**: [server.js (Lines 184-192)](server.js#L184-L192) - Login endpoint
- **Issue**: No protection against brute force
- **Impact**: Password brute force attacks succeed
- **Fix**: Implement account lockout after N failed attempts

#### 27. **Passwords Not Salted Properly**
- **Location**: [server.js (Line 177, 186)](server.js#L177)
- **Issue**: While using bcrypt (good), salt rounds could be higher
- **Impact**: Faster password cracking with GPU attacks
- **Fix**: Increase salt rounds to 12-15

#### 28. **No Session Timeout**
- **Location**: Session management throughout
- **Issue**: Sessions don't expire due to inactivity
- **Impact**: Abandoned sessions can be hijacked
- **Fix**: Add activity-based session timeout

#### 29. **Missing Pagination on List Endpoints**
- **Location**: [server.js (Lines 253, 364, 369)](server.js#L364-L369)
- **Issue**: Admin endpoints return all records without pagination
- **Impact**: DoS through large data fetches, performance issues
- **Fix**: Implement pagination with limit/offset

#### 30. **No API Versioning**
- **Location**: All API routes use `/api/` without version
- **Issue**: Breaking changes affect all clients
- **Impact**: Difficult to maintain backward compatibility
- **Fix**: Use `/api/v1/` versioning scheme

---

### 🔵 LOW VULNERABILITIES

#### 31. **Hardcoded Port Number**
- **Location**: [server.js (Line 10)](server.js#L10)
- **Issue**: Default port 3000 (well-known development port)
- **Impact**: Information disclosure
- **Fix**: Use random port or environment variable

#### 32. **No Request Timeout**
- **Location**: Express server configuration
- **Issue**: No timeout on requests
- **Impact**: Slow-read DoS attacks possible
- **Fix**: Set request timeout: `server.setTimeout(30000)`

#### 33. **No Database Connection Pooling**
- **Location**: File-based storage
- **Issue**: Direct file I/O on every request
- **Impact**: Performance bottleneck, concurrency issues
- **Fix**: Use database connection pooling

#### 34. **No Version Information Hiding**
- **Location**: Response headers
- **Issue**: Express version may be leaked in headers
- **Impact**: Information disclosure
- **Fix**: 
  ```javascript
  app.disable('x-powered-by');
  ```

#### 35. **No Dependency Audit**
- **Location**: [package.json](package.json)
- **Issue**: No automatic security scanning mentioned
- **Impact**: Known vulnerabilities in dependencies
- **Fix**: Run `npm audit` regularly, use `npm audit fix`

---

## Summary Table

| Severity | Count | Main Issues |
|----------|-------|------------|
| 🔴 Critical | 10 | Hardcoded credentials, weak passwords, no HTTPS, weak tokens, no rate limiting |
| 🟠 High | 10 | No CSRF, insufficient validation, authorization issues, no logging |
| 🟡 Medium | 10 | API key exposure, localStorage usage, no error sanitization |
| 🔵 Low | 5 | Hardcoded ports, missing headers, dependency audit |
| **Total** | **35** | **Multiple critical security issues** |

---

## Recommended Priority Fix Order

### Phase 1: CRITICAL (Do immediately before production)
1. Remove hardcoded credentials
2. Implement HTTPS/TLS
3. Add input validation & sanitization
4. Implement rate limiting
5. Add CORS restrictions
6. Encrypt sensitive data at rest

### Phase 2: HIGH (Do before launch)
7. Add security headers (helmet.js)
8. Implement CSRF protection
9. Add comprehensive logging
10. Implement RBAC for authorization
11. Fix authentication token handling

### Phase 3: MEDIUM (Do in next release)
12. Fix data storage (move to proper database)
13. Add email verification
14. Implement session timeouts
15. Add API versioning
16. Implement pagination

### Phase 4: LOW (Ongoing maintenance)
17. Regular dependency audits
18. Security testing & penetration testing
19. Implement monitoring & alerting
20. Security training for team

---

## Quick Fix Code Examples

### Security Headers (Helmet.js)
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);
```

### Input Validation
```javascript
const { body, validationResult } = require('express-validator');
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12 }),
  body('name').trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  // Process registration
});
```

### CORS Configuration
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
```

### Secure Cookies
```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 3600000 // 1 hour
});
```

---

## Testing Recommendations

- [ ] Perform OWASP Top 10 security testing
- [ ] Conduct dependency vulnerability scanning
- [ ] Perform penetration testing
- [ ] Implement security unit tests
- [ ] Set up automated security scanning in CI/CD
- [ ] Conduct code review focused on security

---

**Status**: ⚠️ **NOT PRODUCTION READY** - Multiple critical security issues must be addressed before deployment.

**Last Updated**: January 21, 2026
