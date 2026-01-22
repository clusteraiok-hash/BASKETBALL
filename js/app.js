/**
 * Dribble-Ground Academy - Basketball Booking Application
 * Production-ready static implementation with LocalStorage persistence
 * @version 2.0.0
 */

// ==================== CONFIGURATION ====================
const CONFIG = Object.freeze({
    APP_NAME: 'Dribble-Ground Academy',
    VERSION: '2.0.0',

    // Pricing (centralized, no hardcoding)
    PRICING: {
        WEEKLY: 200,
        MONTHLY: 500
    },

    // Payment
    UPI_ID: '8084970887@ybl',
    PAYMENT_TIMEOUT_HOURS: 24,
    PHONEPE_MERCHANT_NAME: 'Dribble Ground Academy', // Replace with actual merchant name if available

    // Capacity
    MAX_PLAYERS_PER_MONTH: 10,

    // Training Schedule
    TRAINING: {
        DAYS: 'Monday to Saturday',
        TIME: '9:00 AM - 6:00 PM',
        REST_DAY: 'Sunday'
    },

    // LocalStorage Keys
    STORAGE_KEYS: Object.freeze({
        USERS: 'dg_users',
        BOOKINGS: 'dg_bookings',
        DOCUMENTS: 'dg_documents',
        CURRENT_USER: 'dg_current_user',
        SESSION_TOKEN: 'dg_token'
    }),

    // Default Admin Account
    DEFAULT_ADMIN: {
        id: 'admin_001',
        name: 'Admin',
        email: 'admin@dribbleground.com',
        phone: '9876543210',
        password: 'admin123',
        role: 'admin',
        isVerified: true,
        createdAt: new Date().toISOString()
    }
});

// ==================== UTILITY FUNCTIONS ====================
const Utils = {
    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
    },

    /**
     * Format currency in Indian Rupees
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    },

    /**
     * Format date
     * @param {string|Date} dateString - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    /**
     * Format date-time
     * @param {string|Date} dateString - Date to format
     * @returns {string} Formatted date-time string
     */
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Get next N months for booking selection
     * @param {number} count - Number of months to get
     * @returns {Array} Array of month objects
     */
    getNextMonths(count = 6) {
        const months = [];
        const now = new Date();

        for (let i = 0; i < count; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            months.push({
                value: date.toISOString().slice(0, 7), // YYYY-MM format
                label: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
            });
        }

        return months;
    },

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     */
    showToast(message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast-notification fixed top-4 right-4 z-[9999] px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 transition-all duration-300';

        const colorMap = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-orange-500 text-white',
            info: 'bg-blue-500 text-white'
        };

        const iconMap = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        toast.classList.add(...colorMap[type].split(' '));

        toast.innerHTML = `
            <i data-lucide="${iconMap[type]}" class="w-5 h-5"></i>
            <span class="font-medium">${this.escapeHtml(message)}</span>
        `;

        document.body.appendChild(toast);

        // Initialize lucide icons if available
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: { [iconMap[type]]: true } });
        }

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Simple hash function for passwords (demo purposes)
     * In production, use proper bcrypt on server
     * @param {string} str - String to hash
     * @returns {string} Hashed string
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },

    /**
     * Generate UPI Deep Link for Payment
     * @param {string} amount - Transaction amount
     * @param {string} note - Transaction note/description
     * @returns {string} - UPI deep link
     */
    generateUPILink(amount, note = 'Booking Payment') {
        const upiId = CONFIG.UPI_ID;
        const name = encodeURIComponent(CONFIG.PHONEPE_MERCHANT_NAME || 'Merchant');
        const tr = this.generateId(); // Transaction Ref ID
        const tn = encodeURIComponent(note); // Transaction Note

        // UPI Deep Link Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&tn=NOTE&tr=REF_ID&cu=INR
        return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&tn=${tn}&tr=${tr}&cu=INR`;
    },

    /**
     * Safe localStorage wrapper with error handling
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (error) {
                console.error(`Storage get error for key "${key}":`, error);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error(`Storage set error for key "${key}":`, error);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error(`Storage remove error for key "${key}":`, error);
                return false;
            }
        },

        clear() {
            try {
                Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
                    localStorage.removeItem(key);
                });
                return true;
            } catch (error) {
                console.error('Storage clear error:', error);
                return false;
            }
        }
    }
};

// ==================== VALIDATION ====================
const Validation = {
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    email(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Validate Indian phone number (10 digits starting with 6-9)
     * @param {string} phone - Phone to validate
     * @returns {boolean}
     */
    phone(phone) {
        const cleaned = phone.replace(/\s/g, '');
        const regex = /^[6-9]\d{9}$/;
        return regex.test(cleaned);
    },

    /**
     * Validate password (minimum 6 characters)
     * @param {string} password - Password to validate
     * @returns {boolean}
     */
    password(password) {
        return password && password.length >= 6;
    },

    /**
     * Check if value is required and not empty
     * @param {string} value - Value to check
     * @returns {boolean}
     */
    required(value) {
        return value && value.trim().length > 0;
    },

    /**
     * Validate form data against rules
     * @param {Object} formData - Form data object
     * @param {Object} rules - Validation rules
     * @returns {Object} Validation result
     */
    validateForm(formData, rules) {
        const errors = {};

        for (const [field, fieldRules] of Object.entries(rules)) {
            for (const rule of fieldRules) {
                const value = formData[field];

                if (rule === 'required' && !this.required(value)) {
                    errors[field] = `${this.formatFieldName(field)} is required`;
                    break;
                }
                if (rule === 'email' && value && !this.email(value)) {
                    errors[field] = 'Please enter a valid email address';
                    break;
                }
                if (rule === 'phone' && value && !this.phone(value)) {
                    errors[field] = 'Please enter a valid 10-digit phone number';
                    break;
                }
                if (rule === 'password' && value && !this.password(value)) {
                    errors[field] = 'Password must be at least 6 characters';
                    break;
                }
            }
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    },

    /**
     * Format field name for error messages
     * @param {string} field - Field name
     * @returns {string} Formatted name
     */
    formatFieldName(field) {
        return field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
    }
};

// ==================== USER MANAGER ====================
class UserManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.init();
    }

    /**
     * Initialize user manager
     */
    init() {
        this.loadUsers();
        this.loadCurrentUser();
        this.ensureDefaultAdmin();
    }

    /**
     * Load users from localStorage
     */
    loadUsers() {
        this.users = Utils.storage.get(CONFIG.STORAGE_KEYS.USERS, []);
    }

    /**
     * Save users to localStorage
     */
    saveUsers() {
        Utils.storage.set(CONFIG.STORAGE_KEYS.USERS, this.users);
    }

    /**
     * Load current user session
     */
    loadCurrentUser() {
        this.currentUser = Utils.storage.get(CONFIG.STORAGE_KEYS.CURRENT_USER, null);
    }

    /**
     * Ensure default admin account exists
     */
    ensureDefaultAdmin() {
        const adminExists = this.users.some(u => u.role === 'admin');
        if (!adminExists) {
            const admin = { ...CONFIG.DEFAULT_ADMIN };
            admin.passwordHash = Utils.simpleHash(admin.password);
            delete admin.password;
            this.users.push(admin);
            this.saveUsers();
        }
    }

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Object} Result object
     */
    register(userData) {
        const { name, email, phone, password } = userData;

        // Check if email already exists
        const existingUser = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            return { success: false, error: 'An account with this email already exists' };
        }

        // Create new user
        const newUser = {
            id: Utils.generateId(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone ? phone.trim() : null,
            passwordHash: Utils.simpleHash(password),
            role: 'user',
            isVerified: false,
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();

        // Auto login after registration
        this.setSession(newUser);

        return { success: true, user: this.sanitizeUser(newUser) };
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} Result object
     */
    login(email, password) {
        const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return { success: false, error: 'No account found with this email' };
        }

        const passwordHash = Utils.simpleHash(password);
        if (user.passwordHash !== passwordHash) {
            return { success: false, error: 'Incorrect password' };
        }

        this.setSession(user);
        return { success: true, user: this.sanitizeUser(user) };
    }

    /**
     * Set user session
     * @param {Object} user - User object
     */
    setSession(user) {
        const sanitizedUser = this.sanitizeUser(user);
        this.currentUser = sanitizedUser;
        Utils.storage.set(CONFIG.STORAGE_KEYS.CURRENT_USER, sanitizedUser);
        Utils.storage.set(CONFIG.STORAGE_KEYS.SESSION_TOKEN, Utils.generateId());
    }

    /**
     * Remove sensitive data from user object
     * @param {Object} user - User object
     * @returns {Object} Sanitized user
     */
    sanitizeUser(user) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }

    /**
     * Logout current user
     * @returns {Object} Result object
     */
    logout() {
        this.currentUser = null;
        Utils.storage.remove(CONFIG.STORAGE_KEYS.CURRENT_USER);
        Utils.storage.remove(CONFIG.STORAGE_KEYS.SESSION_TOKEN);
        return { success: true };
    }

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * Check if current user is admin
     * @returns {boolean}
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    /**
     * Get current user
     * @returns {Object|null}
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Get all users (admin only)
     * @returns {Array}
     */
    getAllUsers() {
        return this.users.map(u => this.sanitizeUser(u));
    }

    /**
     * Update user data
     * @param {string} userId - User ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Result object
     */
    updateUser(userId, updates) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }

        // Prevent updating sensitive fields directly
        const allowedFields = ['name', 'phone', 'isVerified'];
        const safeUpdates = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                safeUpdates[field] = updates[field];
            }
        }

        this.users[userIndex] = { ...this.users[userIndex], ...safeUpdates };
        this.saveUsers();

        // Update current user if it's the same user
        if (this.currentUser && this.currentUser.id === userId) {
            this.setSession(this.users[userIndex]);
        }

        return { success: true, user: this.sanitizeUser(this.users[userIndex]) };
    }

    /**
     * Delete user (admin only)
     * @param {string} userId - User ID
     * @returns {Object} Result object
     */
    deleteUser(userId) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }

        // Prevent deleting admin
        if (this.users[userIndex].role === 'admin') {
            return { success: false, error: 'Cannot delete admin account' };
        }

        this.users.splice(userIndex, 1);
        this.saveUsers();

        return { success: true };
    }
}

// ==================== BOOKING MANAGER ====================
class BookingManager {
    constructor() {
        this.bookings = [];
        this.init();
    }

    /**
     * Initialize booking manager
     */
    init() {
        this.loadBookings();
    }

    /**
     * Load bookings from localStorage
     */
    loadBookings() {
        this.bookings = Utils.storage.get(CONFIG.STORAGE_KEYS.BOOKINGS, []);
    }

    /**
     * Save bookings to localStorage
     */
    saveBookings() {
        Utils.storage.set(CONFIG.STORAGE_KEYS.BOOKINGS, this.bookings);
    }

    /**
     * Create a new booking
     * @param {Object} bookingData - Booking data
     * @returns {Object} Result object
     */
    createBooking(bookingData) {
        const { userId, userName, userEmail, type, month, players } = bookingData;

        // Calculate amount based on type
        const pricePerPlayer = type === 'weekly' ? CONFIG.PRICING.WEEKLY : CONFIG.PRICING.MONTHLY;
        const amount = pricePerPlayer * (players || 1);

        const newBooking = {
            id: Utils.generateId(),
            userId,
            userName,
            userEmail,
            type,
            month,
            players: players || 1,
            amount,
            status: 'pending',
            paymentId: null,
            createdAt: new Date().toISOString(),
            confirmedAt: null,
            expiresAt: new Date(Date.now() + CONFIG.PAYMENT_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString()
        };

        this.bookings.push(newBooking);
        this.saveBookings();

        return { success: true, booking: newBooking };
    }

    /**
     * Confirm payment for a booking
     * @param {string} bookingId - Booking ID
     * @param {string} transactionId - Payment transaction ID
     * @returns {Object} Result object
     */
    confirmPayment(bookingId, transactionId) {
        const bookingIndex = this.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) {
            return { success: false, error: 'Booking not found' };
        }

        this.bookings[bookingIndex] = {
            ...this.bookings[bookingIndex],
            status: 'confirmed',
            paymentId: transactionId,
            confirmedAt: new Date().toISOString()
        };

        this.saveBookings();
        return { success: true, booking: this.bookings[bookingIndex] };
    }

    /**
     * Admin confirm booking
     * @param {string} bookingId - Booking ID
     * @returns {Object} Result object
     */
    adminConfirmBooking(bookingId) {
        const bookingIndex = this.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) {
            return { success: false, error: 'Booking not found' };
        }

        this.bookings[bookingIndex] = {
            ...this.bookings[bookingIndex],
            status: 'confirmed',
            confirmedAt: new Date().toISOString()
        };

        this.saveBookings();
        return { success: true, booking: this.bookings[bookingIndex] };
    }

    /**
     * Cancel a booking
     * @param {string} bookingId - Booking ID
     * @returns {Object} Result object
     */
    cancelBooking(bookingId) {
        const bookingIndex = this.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) {
            return { success: false, error: 'Booking not found' };
        }

        this.bookings[bookingIndex].status = 'cancelled';
        this.saveBookings();

        return { success: true, booking: this.bookings[bookingIndex] };
    }

    /**
     * Get all bookings (admin)
     * @returns {Array}
     */
    getAllBookings() {
        return this.bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get bookings by user ID
     * @param {string} userId - User ID
     * @returns {Array}
     */
    getBookingsByUser(userId) {
        return this.bookings
            .filter(b => b.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get available slots for a month
     * @param {string} month - Month in YYYY-MM format
     * @returns {number}
     */
    getAvailableSlots(month) {
        const confirmedBookings = this.bookings.filter(
            b => b.month === month && b.status === 'confirmed'
        );
        const bookedPlayers = confirmedBookings.reduce((sum, b) => sum + b.players, 0);
        return Math.max(0, CONFIG.MAX_PLAYERS_PER_MONTH - bookedPlayers);
    }

    /**
     * Get booking statistics
     * @returns {Object}
     */
    getStats() {
        const now = new Date();
        const thisMonth = now.toISOString().slice(0, 7);

        const total = this.bookings.length;
        const confirmed = this.bookings.filter(b => b.status === 'confirmed').length;
        const pending = this.bookings.filter(b => b.status === 'pending').length;
        const thisMonthBookings = this.bookings.filter(b => b.month === thisMonth && b.status === 'confirmed');
        const revenue = this.bookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, b) => sum + b.amount, 0);

        return {
            total,
            confirmed,
            pending,
            thisMonth: thisMonthBookings.length,
            revenue
        };
    }
}

// ==================== DOCUMENT MANAGER ====================
class DocumentManager {
    constructor() {
        this.documents = [];
        this.templates = this.getDocumentTemplates();
        this.init();
    }

    /**
     * Initialize document manager
     */
    init() {
        this.loadDocuments();
    }

    /**
     * Load documents from localStorage
     */
    loadDocuments() {
        this.documents = Utils.storage.get(CONFIG.STORAGE_KEYS.DOCUMENTS, []);
    }

    /**
     * Save documents to localStorage
     */
    saveDocuments() {
        Utils.storage.set(CONFIG.STORAGE_KEYS.DOCUMENTS, this.documents);
    }

    /**
     * Get document templates
     * @returns {Array}
     */
    getDocumentTemplates() {
        return [
            {
                id: 1,
                category: 'registration',
                title: 'Player Registration Form',
                description: 'Complete registration form for new players joining the academy.',
                icon: 'clipboard-list',
                color: 'blue',
                requirements: ['Full Name', 'Date of Birth', 'Contact Details', 'Emergency Contact'],
                downloadable: true
            },
            {
                id: 2,
                category: 'payment',
                title: 'Payment Receipt',
                description: 'Official payment receipt for training fees.',
                icon: 'receipt',
                color: 'green',
                requirements: ['UPI Transaction ID', 'Amount Paid', 'Payment Date'],
                downloadable: false
            },
            {
                id: 3,
                category: 'medical',
                title: 'Medical Fitness Certificate',
                description: 'Medical clearance from a registered physician.',
                icon: 'heart-pulse',
                color: 'red',
                requirements: ['Physical Examination', 'Doctor Signature'],
                downloadable: true
            },
            {
                id: 4,
                category: 'legal',
                title: 'Indemnity & Waiver Form',
                description: 'Liability waiver and consent form.',
                icon: 'shield-check',
                color: 'purple',
                requirements: ['Risk Acknowledgement', 'Signature'],
                downloadable: true
            },
            {
                id: 5,
                category: 'policy',
                title: 'Code of Conduct',
                description: 'Academy rules and player conduct guidelines.',
                icon: 'book-open',
                color: 'orange',
                requirements: ['Punctuality', 'Fair Play', 'Equipment Care'],
                downloadable: true
            },
            {
                id: 6,
                category: 'schedule',
                title: 'Training Schedule',
                description: 'Weekly training timetable and session details.',
                icon: 'calendar-days',
                color: 'cyan',
                requirements: [CONFIG.TRAINING.DAYS, CONFIG.TRAINING.TIME],
                downloadable: true
            }
        ];
    }

    /**
     * Get all document templates
     * @returns {Array}
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * Get templates by category
     * @param {string} category - Category filter
     * @returns {Array}
     */
    getTemplatesByCategory(category) {
        if (category === 'all') return this.templates;
        return this.templates.filter(t => t.category === category);
    }

    /**
     * Submit a document
     * @param {Object} docData - Document data
     * @returns {Object} Result object
     */
    submitDocument(docData) {
        const newDoc = {
            id: Utils.generateId(),
            userId: docData.userId,
            documentType: docData.documentType,
            fileName: docData.fileName,
            fileSize: docData.fileSize,
            submittedAt: new Date().toISOString(),
            status: 'pending',
            reviewedAt: null,
            reviewedBy: null,
            notes: null
        };

        this.documents.push(newDoc);
        this.saveDocuments();

        return { success: true, document: newDoc };
    }

    /**
     * Get documents by user
     * @param {string} userId - User ID
     * @returns {Array}
     */
    getDocumentsByUser(userId) {
        return this.documents
            .filter(d => d.userId === userId)
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }

    /**
     * Get all documents (admin)
     * @returns {Array}
     */
    getAllDocuments() {
        return this.documents.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }

    /**
     * Review a document (admin)
     * @param {string} docId - Document ID
     * @param {string} status - New status
     * @param {string} notes - Review notes
     * @param {string} reviewerId - Reviewer ID
     * @returns {Object} Result object
     */
    reviewDocument(docId, status, notes, reviewerId) {
        const docIndex = this.documents.findIndex(d => d.id === docId);
        if (docIndex === -1) {
            return { success: false, error: 'Document not found' };
        }

        this.documents[docIndex] = {
            ...this.documents[docIndex],
            status,
            notes,
            reviewedAt: new Date().toISOString(),
            reviewedBy: reviewerId
        };

        this.saveDocuments();
        return { success: true, document: this.documents[docIndex] };
    }

    /**
     * Get document statistics
     * @returns {Object}
     */
    getStats() {
        return {
            total: this.documents.length,
            pending: this.documents.filter(d => d.status === 'pending').length,
            approved: this.documents.filter(d => d.status === 'approved').length,
            rejected: this.documents.filter(d => d.status === 'rejected').length
        };
    }

    /**
     * Get color classes for UI
     * @param {string} color - Color name
     * @returns {Object}
     */
    getColorClasses(color) {
        const colorMap = {
            blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
            green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
            red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
            purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
            orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
            yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
            cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-200' },
            pink: { bg: 'bg-pink-50', icon: 'text-pink-600', border: 'border-pink-200' }
        };
        return colorMap[color] || colorMap.blue;
    }
}

// ==================== GLOBAL INSTANCES ====================
let userManager;
let bookingManager;
let documentManager;

/**
 * Initialize all managers
 */
function initializeApp() {
    userManager = new UserManager();
    bookingManager = new BookingManager();
    documentManager = new DocumentManager();

    // Make managers globally accessible
    window.userManager = userManager;
    window.bookingManager = bookingManager;
    window.documentManager = documentManager;
    window.CONFIG = CONFIG;
    window.Utils = Utils;
    window.Validation = Validation;

    console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initialized`);
}

// ==================== GLOBAL HELPER FUNCTIONS ====================

/**
 * Handle logout
 * @param {Event} event - Click event
 */
window.handleLogout = function (event) {
    if (event) event.preventDefault();
    if (userManager) {
        userManager.logout();
        Utils.showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }
};

/**
 * Auth guard for protected pages
 * @param {string} redirectTo - Redirect URL if not authenticated
 * @returns {boolean}
 */
window.requireAuth = function (redirectTo = 'signin.html') {
    if (!userManager || !userManager.isLoggedIn()) {
        window.location.href = redirectTo;
        return false;
    }
    return true;
};

/**
 * Admin guard for admin-only pages
 * @param {string} redirectTo - Redirect URL if not admin
 * @returns {boolean}
 */
window.requireAdmin = function (redirectTo = 'dashboard.html') {
    if (!userManager || !userManager.isAdmin()) {
        Utils.showToast('Admin access required', 'error');
        window.location.href = redirectTo;
        return false;
    }
    return true;
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();

    // Initialize Lucide icons if available
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// ==================== EXPORTS FOR TESTING ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        Utils,
        Validation,
        UserManager,
        BookingManager,
        DocumentManager
    };
}
