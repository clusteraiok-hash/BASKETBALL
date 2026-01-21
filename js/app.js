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

// ==================== API MANAGER ====================
const Api = {
    baseUrl: '/api',

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('dg_token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }
        return data;
    }
};

// ==================== USER MANAGER ====================
class UserManager {
    constructor() {
        this.currentUser = this.loadCurrentUser();
    }

    loadCurrentUser() {
        const stored = localStorage.getItem('dg_current_user');
        return stored ? JSON.parse(stored) : null;
    }

    async register(userData) {
        try {
            const data = await Api.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            this.setSession(data);
            return { success: true, user: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const data = await Api.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.setSession(data);
            return { success: true, user: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    setSession(data) {
        this.currentUser = data;
        localStorage.setItem('dg_token', data.token);
        localStorage.setItem('dg_current_user', JSON.stringify(data));
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('dg_token');
        localStorage.removeItem('dg_current_user');
        return { success: true };
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    async getAllUsers() {
        try {
            return await Api.request('/users');
        } catch (error) {
            console.error('Fetch users error:', error);
            return [];
        }
    }
}

// ==================== BOOKING MANAGER ====================
class BookingManager {
    async createBooking(bookingData) {
        try {
            const data = await Api.request('/bookings', {
                method: 'POST',
                body: JSON.stringify(bookingData)
            });
            return { success: true, booking: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async confirmPayment(bookingId, transactionId) {
        try {
            const data = await Api.request(`/bookings/${bookingId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'confirmed', paymentId: transactionId })
            });
            return { success: true, booking: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getAllBookings() {
        try {
            return await Api.request('/bookings');
        } catch (error) {
            console.error('Fetch all bookings error:', error);
            return [];
        }
    }

    async getBookingsByUser() {
        try {
            return await Api.request('/bookings/my');
        } catch (error) {
            console.error('Fetch my bookings error:', error);
            return [];
        }
    }

    // Local utility for frontend compatibility
    getAvailableSlots(month) {
        // For production, this should be handled by backend
        return 10;
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


