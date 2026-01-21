/**
 * Dribble-Ground Academy - Complete Basketball Booking Application
 * Production-ready implementation with LocalStorage database
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
    UPI_ID: '8084970887@ybl',
    WEEKLY_PRICE: 200,
    MONTHLY_PRICE: 500,
    MAX_PLAYERS_PER_MONTH: 10,
    PAYMENT_TIMEOUT_HOURS: 24,
    TRAINING_TIME: '9:00 AM - 6:00 PM',
    STORAGE_KEYS: {
        USERS: 'dg_users',
        BOOKINGS: 'dg_bookings',
        DOCUMENTS: 'dg_documents',
        CURRENT_USER: 'dg_current_user'
    }
};

// ==================== UTILITY FUNCTIONS ====================
const Utils = {
    // Generate unique ID
    generateId: function () {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Format currency
    formatCurrency: function (amount) {
        return '₹' + amount.toLocaleString('en-IN');
    },

    // Format date
    formatDate: function (dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    // Format date-time
    formatDateTime: function (dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Get next months
    getNextMonths: function (count) {
        const months = [];
        const now = new Date();

        for (let i = 0; i < count; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            months.push({
                value: date.toISOString().slice(0, 7),
                label: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
            });
        }

        return months;
    },

    // Show toast notification
    showToast: function (message, type = 'info') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-pulse`;

        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-orange-500 text-white',
            info: 'bg-blue-500 text-white'
        };

        toast.className += ' ' + colors[type];

        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        toast.innerHTML = `
            <i data-lucide="${icons[type]}" class="w-5 h-5"></i>
            <span class="font-medium">${message}</span>
        `;

        document.body.appendChild(toast);
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Check if date is in the past
    isPastDate: function (dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    },

    // Calculate hours until deadline
    hoursUntil: function (dateString) {
        const deadline = new Date(dateString);
        const now = new Date();
        const diff = deadline - now;
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    },

    // Safe localStorage wrapper
    storage: {
        get: (key, defaultValue = null) => {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (e) {
                console.error('Storage get error:', e);
                return defaultValue;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error('Storage remove error:', e);
            }
        }
    }
};

// ============================================
// VALIDATION UTILS
// ============================================
const Validation = {
    email: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    phone: (phone) => {
        const re = /^[6-9]\d{9}$/;
        return re.test(phone.replace(/\s/g, ''));
    },

    password: (password) => {
        return password.length >= 6;
    },

    required: (value) => {
        return value && value.trim().length > 0;
    },

    validateForm: (formData, rules) => {
        const errors = {};
        for (const [field, fieldRules] of Object.entries(rules)) {
            for (const rule of fieldRules) {
                if (rule === 'required' && !Validation.required(formData[field])) {
                    errors[field] = `${field} is required`;
                    break;
                }
                if (rule === 'email' && formData[field] && !Validation.email(formData[field])) {
                    errors[field] = 'Invalid email format';
                    break;
                }
                if (rule === 'phone' && formData[field] && !Validation.phone(formData[field])) {
                    errors[field] = 'Invalid phone number (10 digits required)';
                    break;
                }
                if (rule === 'password' && formData[field] && !Validation.password(formData[field])) {
                    errors[field] = 'Password must be at least 6 characters';
                    break;
                }
            }
        }
        return { valid: Object.keys(errors).length === 0, errors };
    }
};

// ==================== USER MANAGER ====================
class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
    }

    // Load users from storage
    loadUsers() {
        const stored = Utils.storage.get(CONFIG.STORAGE_KEYS.USERS);
        return stored ? stored : this.getDemoUsers();
    }

    // Load current user from storage
    loadCurrentUser() {
        const stored = Utils.storage.get(CONFIG.STORAGE_KEYS.CURRENT_USER);
        return stored ? stored : null;
    }

    // Save users to storage
    saveUsers() {
        Utils.storage.set(CONFIG.STORAGE_KEYS.USERS, this.users);
    }

    // Save current user to storage
    saveCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            Utils.storage.set(CONFIG.STORAGE_KEYS.CURRENT_USER, user);
        } else {
            Utils.storage.remove(CONFIG.STORAGE_KEYS.CURRENT_USER);
        }
    }

    // Get demo users
    getDemoUsers() {
        return [
            {
                id: 'admin_001',
                name: 'Admin User',
                email: 'autionix2@gmail.com',
                phone: '8084970887',
                password: '12345678',
                role: 'admin',
                verified: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'user_001',
                name: 'Rahul Sharma',
                email: 'rahul@example.com',
                phone: '9876543210',
                password: 'player123',
                role: 'user',
                verified: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'user_002',
                name: 'Priya Patel',
                email: 'priya@example.com',
                phone: '9876543211',
                password: 'player123',
                role: 'user',
                verified: false,
                createdAt: new Date().toISOString()
            }
        ];
    }

    // Register new user
    register(userData) {
        // Check if email already exists
        if (this.users.find(u => u.email === userData.email)) {
            return { success: false, error: 'Email already registered' };
        }

        // Check if phone already exists (only if provided)
        if (userData.phone && this.users.find(u => u.phone === userData.phone)) {
            return { success: false, error: 'Phone number already registered' };
        }

        // Create new user
        const newUser = {
            id: Utils.generateId(),
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            password: userData.password, // In real app, this should be hashed
            role: 'user',
            verified: false,
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();

        // Auto login after registration
        this.saveCurrentUser(newUser);

        return { success: true, user: newUser };
    }

    // Login user
    login(email, password) {
        const user = this.users.find(u => u.email === email && u.password === password);

        if (!user) {
            return { success: false, error: 'Invalid email or password' };
        }

        this.saveCurrentUser(user);
        return { success: true, user: user };
    }

    // Logout user
    logout() {
        this.saveCurrentUser(null);
        return { success: true };
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Get user by ID
    getUserById(userId) {
        return this.users.find(u => u.id === userId);
    }

    // Update user profile
    updateProfile(userId, updates) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }

        this.users[userIndex] = { ...this.users[userIndex], ...updates };
        this.saveUsers();

        // Update current user if it's the same user
        if (this.currentUser && this.currentUser.id === userId) {
            this.saveCurrentUser(this.users[userIndex]);
        }

        return { success: true, user: this.users[userIndex] };
    }

    // Check if user is admin
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }

    // Get all users (admin only)
    getAllUsers() {
        return this.users;
    }

    // Delete user (admin only)
    deleteUser(userId) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }

        // Prevent deleting the main admin
        if (this.users[userIndex].email === 'autionix2@gmail.com') {
            return { success: false, error: 'Major administrator cannot be deleted' };
        }

        this.users.splice(userIndex, 1);
        this.saveUsers();
        return { success: true };
    }
}

// ==================== BOOKING MANAGER ====================
class BookingManager {
    constructor() {
        this.bookings = this.loadBookings();
    }

    // Load bookings from storage
    loadBookings() {
        const stored = Utils.storage.get(CONFIG.STORAGE_KEYS.BOOKINGS);
        return stored ? stored : this.getDemoBookings();
    }

    // Save bookings to storage
    saveBookings() {
        Utils.storage.set(CONFIG.STORAGE_KEYS.BOOKINGS, this.bookings);
    }

    // Get demo bookings
    getDemoBookings() {
        return [
            {
                id: 'BK001',
                userId: 'user_001',
                userName: 'Rahul Sharma',
                userEmail: 'rahul@example.com',
                userPhone: '9876543210',
                type: 'monthly',
                month: '2026-01',
                players: 1,
                amount: CONFIG.MONTHLY_PRICE,
                status: 'confirmed',
                paymentId: 'TXN123456789',
                createdAt: '2026-01-15T10:30:00.000Z',
                confirmedAt: '2026-01-15T10:35:00.000Z',
                expiresAt: null
            },
            {
                id: 'BK002',
                userId: 'user_002',
                userName: 'Priya Patel',
                userEmail: 'priya@example.com',
                userPhone: '9876543211',
                type: 'weekly',
                month: '2026-01',
                players: 1,
                amount: CONFIG.WEEKLY_PRICE,
                status: 'pending',
                paymentId: null,
                createdAt: '2026-01-20T14:00:00.000Z',
                confirmedAt: null,
                expiresAt: '2026-01-21T14:00:00.000Z'
            },
            {
                id: 'BK003',
                userId: 'user_001',
                userName: 'Rahul Sharma',
                userEmail: 'rahul@example.com',
                userPhone: '9876543210',
                type: 'monthly',
                month: '2026-01',
                players: 3,
                amount: CONFIG.MONTHLY_PRICE * 3,
                status: 'confirmed',
                paymentId: 'TXN987654321',
                createdAt: '2026-01-18T09:00:00.000Z',
                confirmedAt: '2026-01-18T09:05:00.000Z',
                expiresAt: null
            }
        ];
    }

    // Create new booking
    createBooking(bookingData) {
        // Check capacity for the month
        const availableSlots = this.getAvailableSlots(bookingData.month);
        if (availableSlots < bookingData.players) {
            return {
                success: false,
                error: `Only ${availableSlots} slots available for this month`
            };
        }

        // Check for duplicate booking
        const existing = this.bookings.find(b =>
            b.userId === bookingData.userId &&
            b.month === bookingData.month &&
            b.status !== 'cancelled'
        );

        if (existing) {
            return {
                success: false,
                error: 'You already have a booking for this month'
            };
        }

        // Create new booking
        const newBooking = {
            id: 'BK' + Date.now().toString().slice(-6),
            userId: bookingData.userId,
            userName: bookingData.userName,
            userEmail: bookingData.userEmail,
            userPhone: bookingData.userPhone,
            type: bookingData.type,
            month: bookingData.month,
            players: bookingData.players,
            amount: (bookingData.type === 'monthly' ? CONFIG.MONTHLY_PRICE : CONFIG.WEEKLY_PRICE) * bookingData.players,
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

    // Confirm payment for booking
    confirmPayment(bookingId, transactionId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) {
            return { success: false, error: 'Booking not found' };
        }

        if (booking.status === 'confirmed') {
            return { success: false, error: 'Payment already confirmed' };
        }

        if (booking.status === 'cancelled') {
            return { success: false, error: 'Booking was cancelled' };
        }

        // Check if expired
        if (booking.expiresAt && new Date() > new Date(booking.expiresAt)) {
            booking.status = 'expired';
            this.saveBookings();
            return { success: false, error: 'Booking expired' };
        }

        booking.status = 'confirmed';
        booking.paymentId = transactionId;
        booking.confirmedAt = new Date().toISOString();
        booking.expiresAt = null;

        this.saveBookings();
        return { success: true, booking: booking };
    }

    // Cancel booking
    cancelBooking(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) {
            return { success: false, error: 'Booking not found' };
        }

        if (booking.status === 'cancelled') {
            return { success: false, error: 'Booking already cancelled' };
        }

        booking.status = 'cancelled';
        booking.cancelledAt = new Date().toISOString();

        this.saveBookings();
        return { success: true, booking: booking };
    }

    // Get all bookings
    getAllBookings() {
        // Update expired bookings first
        this.updateExpiredBookings();
        return this.bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get bookings by user
    getBookingsByUser(userId) {
        this.updateExpiredBookings();
        return this.bookings
            .filter(b => b.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get available slots for a month
    getAvailableSlots(month) {
        const monthlyBookings = this.bookings.filter(b =>
            b.month === month &&
            b.status === 'confirmed'
        );

        const totalPlayers = monthlyBookings.reduce((sum, b) => sum + b.players, 0);
        return Math.max(0, CONFIG.MAX_PLAYERS_PER_MONTH - totalPlayers);
    }

    // Get booking statistics
    getStats() {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);

        const confirmed = this.bookings.filter(b => b.status === 'confirmed');
        const pending = this.bookings.filter(b => b.status === 'pending');
        const currentMonthBookings = confirmed.filter(b => b.month === currentMonth);

        const monthlyRevenue = confirmed
            .filter(b => b.month === currentMonth)
            .reduce((sum, b) => sum + b.amount, 0);

        const currentMonthPlayers = currentMonthBookings
            .reduce((sum, b) => sum + b.players, 0);

        return {
            totalBookings: this.bookings.length,
            activeBookings: confirmed.length,
            pendingBookings: pending.length,
            monthlyRevenue: monthlyRevenue,
            currentMonthPlayers: currentMonthPlayers,
            occupancyRate: Math.round((currentMonthPlayers / CONFIG.MAX_PLAYERS_PER_MONTH) * 100)
        };
    }

    // Check and update expired bookings
    updateExpiredBookings() {
        const now = new Date();
        let updated = false;

        this.bookings.forEach(booking => {
            if (booking.status === 'pending' &&
                booking.expiresAt &&
                new Date(booking.expiresAt) < now) {
                booking.status = 'expired';
                updated = true;
            }
        });

        if (updated) {
            this.saveBookings();
        }
    }
}

// ==================== DOCUMENT MANAGER ====================
class DocumentManager {
    constructor() {
        this.documents = this.loadDocuments();
        this.documentTemplates = this.getDocumentTemplates();
    }

    // Load documents from storage
    loadDocuments() {
        const stored = Utils.storage.get(CONFIG.STORAGE_KEYS.DOCUMENTS);
        return stored ? stored : [];
    }

    // Save documents to storage
    saveDocuments() {
        Utils.storage.set(CONFIG.STORAGE_KEYS.DOCUMENTS, this.documents);
    }

    // Get document templates
    getDocumentTemplates() {
        return [
            {
                id: 1,
                category: 'registration',
                title: 'Player Registration Form',
                description: 'Complete registration form for new players joining the academy. Must be filled before your first training session.',
                icon: 'clipboard-list',
                color: 'blue',
                requirements: ['Full Name', 'Date of Birth', 'Contact Details', 'Emergency Contact', 'Previous Experience', 'Medical History'],
                downloadable: true
            },
            {
                id: 2,
                category: 'payment',
                title: 'Payment Receipt',
                description: 'Official payment receipt for training fees. Generated after successful UPI payment.',
                icon: 'receipt',
                color: 'green',
                requirements: ['UPI Transaction ID', 'Amount Paid', 'Payment Date', 'Booking Reference'],
                downloadable: false
            },
            {
                id: 3,
                category: 'medical',
                title: 'Medical Fitness Certificate',
                description: 'Medical clearance from a registered physician confirming fitness for physical training.',
                icon: 'heart-pulse',
                color: 'red',
                requirements: ['Physical Examination', 'Heart Rate Check', 'Blood Pressure', 'Doctor Signature', 'Valid for 6 months'],
                downloadable: true
            },
            {
                id: 4,
                category: 'legal',
                title: 'Indemnity & Waiver Form',
                description: 'Liability waiver and consent form. Parent/Guardian signature required for minors.',
                icon: 'shield-check',
                color: 'purple',
                requirements: ['Risk Acknowledgement', 'Liability Release', 'Parent/Guardian Signature (if minor)', 'Witness Signature'],
                downloadable: true
            },
            {
                id: 5,
                category: 'policy',
                title: 'Code of Conduct',
                description: 'Academy rules and player conduct guidelines that all members must follow.',
                icon: 'book-open',
                color: 'orange',
                requirements: ['Punctuality', 'Respect for Coaches', 'Fair Play', 'Equipment Care', 'No Substance Abuse'],
                downloadable: true
            },
            {
                id: 6,
                category: 'policy',
                title: 'Refund & Cancellation Policy',
                description: 'Terms for refunds and booking cancellations. Please read carefully before booking.',
                icon: 'rotate-ccw',
                color: 'yellow',
                requirements: ['24-hour cancellation notice', 'No refund after session start', 'Transfer to next month allowed', 'Medical exceptions considered'],
                downloadable: true
            },
            {
                id: 7,
                category: 'schedule',
                title: 'Training Schedule',
                description: 'Weekly training timetable and session details. Training runs Monday to Saturday.',
                icon: 'calendar-days',
                color: 'cyan',
                requirements: ['Monday to Saturday', '9:00 AM - 6:00 PM', 'Skill-based groups', 'Rest on Sundays'],
                downloadable: true
            },
            {
                id: 8,
                category: 'emergency',
                title: 'Emergency Contact Form',
                description: 'Critical contact information for emergencies during training sessions.',
                icon: 'phone-call',
                color: 'pink',
                requirements: ['Primary Contact', 'Secondary Contact', 'Blood Group', 'Allergies', 'Preferred Hospital'],
                downloadable: true
            }
        ];
    }

    // Submit document
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

    // Get documents by user
    getDocumentsByUser(userId) {
        return this.documents
            .filter(d => d.userId === userId)
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }

    // Get all documents (for admin)
    getAllDocuments() {
        return this.documents
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }

    // Get document templates
    getAllTemplates() {
        return this.documentTemplates;
    }

    // Get templates by category
    getTemplatesByCategory(category) {
        if (category === 'all') return this.documentTemplates;
        return this.documentTemplates.filter(d => d.category === category);
    }

    // Review document (admin)
    reviewDocument(docId, status, notes, reviewerId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) {
            return { success: false, error: 'Document not found' };
        }

        doc.status = status;
        doc.notes = notes;
        doc.reviewedAt = new Date().toISOString();
        doc.reviewedBy = reviewerId;

        this.saveDocuments();
        return { success: true, document: doc };
    }

    // Get document statistics
    getStats() {
        const pending = this.documents.filter(d => d.status === 'pending');
        const approved = this.documents.filter(d => d.status === 'approved');
        const rejected = this.documents.filter(d => d.status === 'rejected');

        return {
            total: this.documents.length,
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length
        };
    }

    // Get color classes for UI
    getColorClasses(color) {
        const colorClasses = {
            blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
            green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
            red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
            purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
            orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
            yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
            cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-200' },
            pink: { bg: 'bg-pink-50', icon: 'text-pink-600', border: 'border-pink-200' }
        };
        return colorClasses[color] || colorClasses.blue;
    }
}

// ==================== INITIALIZATION ====================
// Create global instances
window.userManager = new UserManager();
window.bookingManager = new BookingManager();
window.documentManager = new DocumentManager();

// Initialize application
document.addEventListener('DOMContentLoaded', function () {
    // Update expired bookings
    window.bookingManager.updateExpiredBookings();

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('Dribble-Ground Academy Application Initialized');
});

// Handle logout
window.handleLogout = function (event) {
    if (event) event.preventDefault();
    userManager.logout();
    Utils.showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500);
};

// Auto-redirect if not logged in
window.checkAuth = function (requiredRole = null) {
    if (!userManager || !userManager.isLoggedIn()) {
        Utils.showToast('Please login to continue', 'warning');
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 1000);
        return false;
    }

    if (requiredRole && userManager.getCurrentUser().role !== requiredRole) {
        Utils.showToast('Access denied', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        return false;
    }

    return true;
};

// Auth guard functions
window.requireAuth = function (redirectTo = 'signin.html') {
    if (!userManager || !userManager.isLoggedIn()) {
        window.location.href = redirectTo;
        return false;
    }
    return true;
};

window.requireAdmin = function (redirectTo = 'dashboard.html') {
    if (!userManager || !userManager.isAdmin()) {
        window.location.href = redirectTo;
        return false;
    }
    return true;
};

// ==================== EXPORTS FOR TESTING ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils, Validation, UserManager, BookingManager, DocumentManager, CONFIG };
}


