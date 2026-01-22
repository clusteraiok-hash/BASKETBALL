/**
 * Dashboard UI Logic - Production Grade
 * Optimized for localStorage-based data management
 * @version 2.0.0
 */

// ==================== BOOKING FLOW STATE ====================
const bookingState = {
    type: null,
    month: null,
    players: 1,
    amount: 0
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app.js to initialize managers
    setTimeout(() => {
        initializeDashboard();
    }, 100);
});

/**
 * Initialize dashboard
 */
function initializeDashboard() {
    // Check if user is logged in
    if (!window.userManager || !window.userManager.isLoggedIn()) {
        window.location.href = 'signin.html';
        return;
    }

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Set up user info
    setupUserInfo();

    // Load initial data
    loadDashboardStats();

    // Initialize booking months
    initializeMonths();

    // Show admin menu if user is admin
    setupAdminMenu();
}

/**
 * Setup user information display
 */
function setupUserInfo() {
    const user = window.userManager.getUser();
    if (!user) return;

    // Update user initials
    document.querySelectorAll('.current-user-initial').forEach(el => {
        el.textContent = user.name.charAt(0).toUpperCase();
    });

    // Update user names
    document.querySelectorAll('.current-user-name').forEach(el => {
        el.textContent = user.name;
    });

    // Update user emails
    document.querySelectorAll('.current-user-email').forEach(el => {
        el.textContent = user.email;
    });
}

/**
 * Setup admin menu visibility
 */
function setupAdminMenu() {
    if (window.userManager.isAdmin()) {
        const adminMenu = document.getElementById('admin-bookings-menu-item');
        if (adminMenu) adminMenu.classList.remove('hidden');
    }
}

/**
 * Show loading overlay
 * @param {boolean} show - Whether to show or hide
 */
function showLoadingOverlay(show) {
    let overlay = document.getElementById('loading-overlay');

    if (!overlay && show) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center transition-opacity duration-300';
        overlay.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p class="text-sm font-black uppercase tracking-widest text-slate-900">Loading...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    if (overlay) {
        overlay.style.opacity = show ? '1' : '0';
        if (!show) {
            setTimeout(() => overlay.remove(), 300);
        }
    }
}

// ==================== NAVIGATION ====================

/**
 * Show a section by ID
 * @param {string} sectionId - Section identifier
 */
function showSection(sectionId) {
    // Update sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active', 'bg-slate-50', 'text-slate-900');
        link.classList.add('text-slate-500');
    });

    // Find and highlight the current section's link
    const currentLink = document.querySelector(`[onclick*="showSection('${sectionId}')"]`);
    if (currentLink) {
        currentLink.classList.add('active', 'bg-slate-50', 'text-slate-900');
        currentLink.classList.remove('text-slate-500');
    }

    // Hide all sections
    document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));

    // Show target section
    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
        loadSectionData(sectionId);
    }

    // Re-initialize icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Load data for a specific section
 * @param {string} sectionId - Section identifier
 */
function loadSectionData(sectionId) {
    showLoadingOverlay(true);

    try {
        switch (sectionId) {
            case 'overview':
                loadDashboardStats();
                break;
            case 'bookings':
                renderAdminBookings();
                break;
            case 'my-bookings':
                renderMyBookings();
                break;
            case 'documents':
                renderDocumentsView();
                break;
            case 'crm':
                renderCRMView();
                break;
            case 'admin':
                renderAdminUsers();
                break;
            case 'new-booking':
                initializeBookingFlow();
                break;
        }
    } catch (error) {
        Utils.showToast(`Error loading ${sectionId}: ${error.message}`, 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// ==================== DASHBOARD STATS ====================

/**
 * Load and display dashboard statistics (role-based)
 */
function loadDashboardStats() {
    if (!window.bookingManager || !window.userManager) return;

    const isAdmin = window.userManager.isAdmin();

    if (isAdmin) {
        loadAdminDashboard();
    } else {
        loadStudentDashboard();
    }
}

/**
 * Load admin-specific dashboard
 */
function loadAdminDashboard() {
    const stats = window.bookingManager.getStats();
    const users = window.userManager.getAllUsers();
    const occupancyRate = Math.min(100, Math.round((stats.thisMonth / window.CONFIG.MAX_PLAYERS_PER_MONTH) * 100));
    const allBookings = window.bookingManager.getAllBookings();
    const pendingBookings = allBookings.filter(b => b.status === 'pending').slice(0, 5);

    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    // Admin Stats Grid
    grid.innerHTML = `
        <div class="bg-white rounded-2xl p-6 text-slate-900 h-40 flex flex-col justify-between shadow-soft border border-slate-100">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Active Bookings</p>
            <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-primary-dark">${stats.confirmed}</span>
                <span class="text-[10px] text-slate-400">Confirmed</span>
            </div>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Revenue</p>
            <div>
                <span class="text-3xl font-bold text-slate-900">${Utils.formatCurrency(stats.revenue)}</span>
                <p class="text-[10px] text-slate-400 mt-1">Total Confirmed</p>
            </div>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Students</p>
            <span class="text-3xl font-bold text-slate-900">${users.length}</span>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Occupancy</p>
            <div>
                <span class="text-3xl font-bold text-slate-900">${occupancyRate}%</span>
                <div class="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div class="h-full bg-primary rounded-full" style="width: ${occupancyRate}%"></div>
                </div>
            </div>
        </div>
    `;

    // Admin Content Section (replaces activity highlights)
    const contentSection = document.querySelector('#overview-section .grid.lg\\:grid-cols-3');
    if (contentSection) {
        contentSection.innerHTML = `
            <div class="lg:col-span-2 space-y-8">
                <!-- Pending Approvals -->
                <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-soft">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-display text-2xl font-bold uppercase tracking-tight">Pending Approvals</h3>
                        ${stats.pending > 0 ? `<span class="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black uppercase tracking-widest">${stats.pending} Pending</span>` : ''}
                    </div>
                    <div class="space-y-4">
                        ${pendingBookings.length === 0 ? `
                            <div class="text-center py-12 text-slate-400">
                                <i data-lucide="check-circle" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
                                <p class="font-medium">All caught up! No pending approvals.</p>
                            </div>
                        ` : pendingBookings.map(b => `
                            <div class="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border-2 border-transparent hover:border-slate-100">
                                <div class="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <i data-lucide="clock" class="w-6 h-6 text-orange-500"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-bold text-slate-900 leading-none mb-1">${Utils.escapeHtml(b.userName)}</p>
                                    <p class="text-xs text-slate-400 font-medium truncate">${b.type} Pass • ${formatMonth(b.month)} • ${Utils.formatCurrency(b.amount)}</p>
                                </div>
                                <button onclick="confirmAdminBooking('${b.id}')" class="px-4 py-2 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark transition-all">
                                    Approve
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    ${stats.pending > 5 ? `
                        <button onclick="showSection('bookings')" class="w-full mt-6 text-primary-dark font-bold text-sm hover:underline">
                            View All Pending (${stats.pending})
                        </button>
                    ` : ''}
                </div>

                <!-- Quick Actions -->
                <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-soft">
                    <h3 class="font-display text-2xl font-bold uppercase tracking-tight mb-6">Quick Actions</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="showSection('bookings')" class="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-primary hover:text-black rounded-2xl transition-all group">
                            <i data-lucide="calendar" class="w-8 h-8 text-slate-400 group-hover:text-black"></i>
                            <span class="font-bold text-sm">All Bookings</span>
                        </button>
                        <button onclick="showSection('admin')" class="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-primary hover:text-black rounded-2xl transition-all group">
                            <i data-lucide="users" class="w-8 h-8 text-slate-400 group-hover:text-black"></i>
                            <span class="font-bold text-sm">Manage Students</span>
                        </button>
                        <button onclick="showSection('crm')" class="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-primary hover:text-black rounded-2xl transition-all group">
                            <i data-lucide="database" class="w-8 h-8 text-slate-400 group-hover:text-black"></i>
                            <span class="font-bold text-sm">Student CRM</span>
                        </button>
                        <button onclick="showSection('documents')" class="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-primary hover:text-black rounded-2xl transition-all group">
                            <i data-lucide="folder-open" class="w-8 h-8 text-slate-400 group-hover:text-black"></i>
                            <span class="font-bold text-sm">Policy Vault</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="space-y-8">
                <!-- Revenue Insights -->
                <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
                    <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-primary rounded-full blur-[80px] opacity-20"></div>
                    <h3 class="font-display text-2xl font-bold uppercase tracking-tight mb-6">Revenue Insights</h3>
                    <div class="space-y-6 relative z-10">
                        <div>
                            <p class="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Total Revenue</p>
                            <p class="text-4xl font-black text-primary">${Utils.formatCurrency(stats.revenue)}</p>
                        </div>
                        <div class="pt-6 border-t border-white/10">
                            <p class="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Package Breakdown</p>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm font-medium">Monthly Passes</span>
                                    <span class="font-bold">${allBookings.filter(b => b.type === 'monthly' && b.status === 'confirmed').length}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm font-medium">Weekly Passes</span>
                                    <span class="font-bold">${allBookings.filter(b => b.type === 'weekly' && b.status === 'confirmed').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Support Card -->
                <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-soft">
                    <h3 class="font-display text-2xl font-bold uppercase tracking-tight mb-2">System Status</h3>
                    <p class="text-sm text-slate-400 mb-6">All systems operational</p>
                    <div class="space-y-3">
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span class="text-sm font-medium text-slate-700">Database Active</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span class="text-sm font-medium text-slate-700">Bookings System</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span class="text-sm font-medium text-slate-700">User Management</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Load student-specific dashboard
 */
function loadStudentDashboard() {
    const user = window.userManager.getUser();
    const userBookings = window.bookingManager.getBookingsByUser(user.id);
    const totalSpent = userBookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.amount, 0);
    const lastBooking = userBookings[0];
    const activeBookings = userBookings.filter(b => b.status === 'confirmed').slice(0, 3);

    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    // Student Stats Grid
    grid.innerHTML = `
        <div class="bg-white rounded-2xl p-6 text-slate-900 h-40 flex flex-col justify-between shadow-soft border border-slate-100">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">My Bookings</p>
            <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-primary-dark">${userBookings.length}</span>
                <span class="text-[10px] text-slate-400">Total</span>
            </div>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Spent</p>
            <div>
                <span class="text-3xl font-bold text-slate-900">${Utils.formatCurrency(totalSpent)}</span>
                <p class="text-[10px] text-slate-400 mt-1">All Time</p>
            </div>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Active Passes</p>
            <span class="text-3xl font-bold text-slate-900">${userBookings.filter(b => b.status === 'confirmed').length}</span>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Last Booking</p>
            <div>
                <span class="text-lg font-bold text-slate-900">${lastBooking ? Utils.formatDate(lastBooking.createdAt) : 'Never'}</span>
            </div>
        </div>
    `;

    // Student Content Section
    const contentSection = document.querySelector('#overview-section .grid.lg\\:grid-cols-3');
    if (contentSection) {
        contentSection.innerHTML = `
            <div class="lg:col-span-2 space-y-8">
                <!-- My Active Bookings -->
                <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-soft">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-display text-2xl font-bold uppercase tracking-tight">My Active Passes</h3>
                        <button onclick="showSection('my-bookings')" class="text-primary-dark font-bold text-sm hover:underline">View All</button>
                    </div>
                    <div class="space-y-4">
                        ${activeBookings.length === 0 ? `
                            <div class="text-center py-12">
                                <i data-lucide="calendar-x" class="w-12 h-12 mx-auto mb-3 text-slate-300"></i>
                                <p class="text-slate-500 font-medium mb-4">No active training passes</p>
                                <button onclick="showSection('new-booking')" class="px-6 py-3 bg-primary text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all">
                                    NEW BOOKING
                                </button>
                            </div>
                        ` : activeBookings.map(b => `
                            <div class="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border-2 border-transparent hover:border-primary/20">
                                <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <i data-lucide="calendar-check" class="w-6 h-6 text-primary-dark"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">${b.type} Pass</p>
                                    <p class="text-xs text-slate-400 font-medium">${formatMonth(b.month)} • ${b.players} ${b.players === 1 ? 'Athlete' : 'Athletes'}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-lg font-black text-slate-900">${Utils.formatCurrency(b.amount)}</p>
                                    <span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[9px] font-black uppercase tracking-widest">${b.status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-soft">
                    <h3 class="font-display text-2xl font-bold uppercase tracking-tight mb-6">Recent Activity</h3>
                    <div class="space-y-4">
                        ${userBookings.slice(0, 3).length === 0 ? `
                            <p class="text-center text-slate-400 py-8">No recent activity</p>
                        ` : userBookings.slice(0, 3).map(b => `
                            <div class="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                                <div class="w-12 h-12 ${b.status === 'confirmed' ? 'bg-green-50' : 'bg-orange-50'} rounded-xl flex items-center justify-center">
                                    <i data-lucide="${b.status === 'confirmed' ? 'check-circle' : 'clock'}" class="w-6 h-6 ${b.status === 'confirmed' ? 'text-green-500' : 'text-orange-500'}"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="font-bold text-slate-900">${b.status === 'confirmed' ? 'Payment Confirmed' : 'Payment Pending'}</p>
                                    <p class="text-xs text-slate-400 font-medium">${b.type} Pass for ${formatMonth(b.month)} • ${Utils.formatDate(b.createdAt)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="space-y-8">
                <!-- Quick Action Card -->
                <div class="bg-gradient-to-br from-primary to-primary-dark rounded-[2rem] p-8 text-black relative overflow-hidden group hover:shadow-2xl transition-all">
                    <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-white rounded-full blur-[80px] opacity-20"></div>
                    <h3 class="font-display text-2xl font-bold uppercase tracking-tight mb-2 relative z-10">Ready to Train?</h3>
                    <p class="text-black/60 text-sm mb-8 leading-relaxed relative z-10">Book your next training session and elevate your game to the next level.</p>
                    <button onclick="showSection('new-booking')" class="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl relative z-10">
                        NEW BOOKING
                    </button>
                </div>

                <!-- Support Card -->
                <div class="bg-white rounded-[2rem] p-8 relative overflow-hidden group border border-slate-100 shadow-soft">
                    <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-primary rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                    <h3 class="font-display text-2xl font-bold uppercase tracking-tight mb-2 relative z-10">Need Help?</h3>
                    <p class="text-slate-400 text-sm mb-8 leading-relaxed relative z-10">Our academy support team is available 24/7 for technical and administrative assistance.</p>
                    <a href="tel:+918084970887" class="flex items-center gap-3 bg-slate-50 hover:bg-primary hover:text-black p-4 rounded-2xl transition-all font-bold relative z-10 group/link">
                        <i data-lucide="phone-call" class="w-5 h-5"></i>
                        +91 8084970887
                    </a>
                </div>

                <!-- Policy Vault Quick Link -->
                <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-soft">
                    <h3 class="font-display text-xl font-bold uppercase tracking-tight mb-4">Resources</h3>
                    <button onclick="showSection('documents')" class="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-primary hover:text-black rounded-2xl transition-all group/btn">
                        <div class="flex items-center gap-3">
                            <i data-lucide="folder-open" class="w-5 h-5"></i>
                            <span class="font-bold text-sm">Policy Vault</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        `;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==================== BOOKINGS SECTION ====================

/**
 * Render admin bookings view
 */
function renderAdminBookings() {
    const section = document.getElementById('bookings-section');
    if (!section || !window.bookingManager) return;

    const bookings = window.bookingManager.getAllBookings();

    section.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-slate-900 leading-tight">Academy Bookings</h2>
                <p class="text-sm text-slate-400 font-medium">Overview of all student training schedules</p>
            </div>
        </div>
        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
            <div class="overflow-x-auto no-scrollbar">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200">
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Athlete</th>
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Package Type</th>
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Active Month</th>
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Fee</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${bookings.length === 0
            ? '<tr><td colspan="5" class="px-8 py-12 text-center text-slate-400 italic font-medium">No bookings recorded</td></tr>'
            : bookings.map(b => `
                            <tr class="hover:bg-slate-50 transition-colors group">
                                <td class="px-8 py-6">
                                    <p class="font-bold text-slate-900 leading-none mb-1">${Utils.escapeHtml(b.userName || 'Unknown')}</p>
                                    <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">${Utils.escapeHtml(b.userEmail || '')}</p>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                        <span class="text-[10px] font-black uppercase tracking-widest text-primary-dark">${b.type} Pass</span>
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <p class="text-sm font-bold text-slate-700">${formatMonth(b.month)}</p>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="flex items-center gap-3">
                                        <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'}">
                                            ${b.status}
                                        </span>
                                        ${b.status === 'pending' && window.userManager.isAdmin() ? `
                                            <button onclick="confirmAdminBooking('${b.id}')" class="text-[10px] font-black uppercase tracking-widest text-primary-dark underline hover:no-underline">Approve</button>
                                        ` : ''}
                                    </div>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <p class="text-lg font-black text-slate-900">${Utils.formatCurrency(b.amount)}</p>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Confirm a booking (admin action)
 * @param {string} id - Booking ID
 */
function confirmAdminBooking(id) {
    if (confirm('Approve this payment and confirm the training slot?')) {
        const result = window.bookingManager.adminConfirmBooking(id);
        if (result.success) {
            Utils.showToast('Booking confirmed', 'success');
            renderAdminBookings();
        } else {
            Utils.showToast(result.error, 'error');
        }
    }
}

/**
 * Render user's bookings view
 */
function renderMyBookings() {
    const section = document.getElementById('my-bookings-section');
    if (!section || !window.bookingManager || !window.userManager) return;

    const user = window.userManager.getUser();
    const bookings = window.bookingManager.getBookingsByUser(user.id);

    section.innerHTML = `
        <div class="flex justify-between items-center mb-10">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-slate-900 leading-tight underline decoration-primary decoration-4">Booking</h2>
                <p class="text-sm text-slate-400 font-medium">Your active passes and session history</p>
            </div>
            <button onclick="showSection('new-booking')" class="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 hover:-translate-y-1">
                <i data-lucide="plus-circle" class="w-5 h-5"></i>
                NEW BOOKING
            </button>
        </div>
        <div class="grid gap-8">
            ${bookings.length === 0 ? `
                <div class="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <p class="text-slate-900 font-bold text-xl mb-2">No Active Training Passes</p>
                    <button onclick="showSection('new-booking')" class="px-8 py-3 bg-primary text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all">NEW BOOKING</button>
                </div>
            ` : bookings.map(booking => `
                <div class="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                        <div class="flex items-center gap-6">
                            <div class="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-primary transition-all">
                                <i data-lucide="calendar-check" class="w-8 h-8 text-slate-400 group-hover:text-black"></i>
                            </div>
                            <div>
                                <h3 class="font-black text-xl text-slate-900 uppercase tracking-tighter leading-none mb-2">${booking.type} Pass</h3>
                                <p class="text-sm text-slate-500 font-medium">${formatMonth(booking.month)} • ${booking.players} ${booking.players === 1 ? 'Athlete' : 'Athletes'}</p>
                                <div class="flex items-center gap-3 mt-4">
                                    <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'}">
                                        ${booking.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col md:text-right border-t md:border-t-0 border-slate-50 pt-6 md:pt-0">
                            <p class="text-3xl font-black text-slate-900 leading-none mb-1">${Utils.formatCurrency(booking.amount)}</p>
                            <p class="text-[10px] text-slate-400 uppercase tracking-widest">${Utils.formatDate(booking.createdAt)}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==================== DOCUMENTS SECTION ====================

/**
 * Render documents view
 */
function renderDocumentsView() {
    const section = document.getElementById('documents-section');
    if (!section || !window.documentManager) return;

    const templates = window.documentManager.getAllTemplates();

    section.innerHTML = `
        <div class="mb-10">
            <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-slate-900 leading-tight">Policy Vault & Documents</h2>
            <p class="text-sm text-slate-400 font-medium">Download forms, read academy policies, and access training materials.</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${templates.map(doc => {
        const colors = window.documentManager.getColorClasses(doc.color);
        return `
                <div class="bg-white rounded-[2rem] border border-slate-100 p-8 hover:shadow-xl transition-all group flex flex-col relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-12 -mt-12 rounded-full group-hover:bg-primary/5 transition-colors"></div>
                    <div class="w-14 h-14 ${colors.bg} rounded-2xl flex items-center justify-center group-hover:bg-primary transition-all mb-6 relative z-10">
                        <i data-lucide="${doc.icon}" class="w-7 h-7 ${colors.icon} group-hover:text-black transition-colors"></i>
                    </div>
                    <h3 class="font-bold text-xl leading-tight mb-3 text-slate-900 relative z-10">${doc.title}</h3>
                    <p class="text-sm text-slate-500 mb-8 line-clamp-3 leading-relaxed relative z-10">${doc.description}</p>
                    <div class="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-300">${doc.category}</span>
                        <button onclick="showDocumentModal(${doc.id})" class="flex items-center gap-2 text-primary-dark font-bold text-sm hover:underline translate-y-0 hover:-translate-y-0.5 transition-transform">
                            Read Docs
                            <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
    }).join('')}
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==================== CRM SECTION ====================

/**
 * Render CRM view with optional filter
 * @param {string} filter - Search filter
 */
function renderCRMView(filter = '') {
    const section = document.getElementById('crm-section');
    if (!section || !window.userManager || !window.bookingManager) return;

    const users = window.userManager.getAllUsers().filter(u => u.role !== 'admin');
    const bookings = window.bookingManager.getAllBookings();

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
    );

    section.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-neutral-900">Student CRM</h2>
                <p class="text-sm text-neutral-400 font-medium">Customer relationship management and athlete tracking</p>
            </div>
            <div class="relative w-full md:w-96 group">
                <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors"></i>
                <input type="text" id="crmSearch" placeholder="Search athletes by name or email..." 
                    class="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 focus:border-primary rounded-2xl outline-none font-bold transition-all shadow-sm"
                    oninput="filterCRM(this.value)" value="${Utils.escapeHtml(filter)}">
            </div>
        </div>

        <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <div class="overflow-x-auto no-scrollbar">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200">
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Athlete</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Tier</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Enrollments</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Revenue</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Last Session</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${filteredUsers.map(user => {
        const userBookings = bookings.filter(b => b.userId === user.id);
        const totalSpent = userBookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.amount, 0);
        const lastBooking = userBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        return `
                                <tr class="hover:bg-slate-50 transition-colors group">
                                    <td class="px-8 py-6">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black capitalize shadow-lg">
                                                ${user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p class="font-bold text-slate-900 leading-none mb-1">${Utils.escapeHtml(user.name)}</p>
                                                <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">${Utils.escapeHtml(user.email)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-8 py-6">
                                        ${totalSpent > 1000
                ? '<span class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-200">Elite</span>'
                : '<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">Standard</span>'}
                                    </td>
                                    <td class="px-8 py-6">
                                        <p class="font-black text-slate-900">${userBookings.length} Bookings</p>
                                    </td>
                                    <td class="px-8 py-6">
                                        <p class="font-black text-green-600">${Utils.formatCurrency(totalSpent)}</p>
                                    </td>
                                    <td class="px-8 py-6 text-sm text-slate-500 font-medium">
                                        ${lastBooking ? Utils.formatDate(lastBooking.createdAt) : 'Never Active'}
                                    </td>
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Filter CRM view
 * @param {string} val - Filter value
 */
function filterCRM(val) {
    renderCRMView(val);
    const searchInput = document.getElementById('crmSearch');
    if (searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(val.length, val.length);
    }
}

// ==================== ADMIN USERS SECTION ====================

/**
 * Render admin users view
 */
function renderAdminUsers() {
    const section = document.getElementById('admin-section');
    if (!section || !window.userManager) return;

    const users = window.userManager.getAllUsers();

    section.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-neutral-900">Student Directory</h2>
                <p class="text-sm text-neutral-400 font-medium">Manage all registered athletes</p>
            </div>
            <button onclick="showAddUserModal()" class="bg-slate-900 text-white px-8 py-4 rounded-[1.25rem] font-bold flex items-center gap-3">
                <i data-lucide="plus" class="w-5 h-5 text-primary"></i>
                Add New Athlete
            </button>
        </div>
        
        <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <div class="overflow-x-auto no-scrollbar">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200">
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Athlete Profile</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Contact Details</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Account Role</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${users.map(user => `
                            <tr class="hover:bg-slate-50 transition-colors group">
                                <td class="px-8 py-6">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-slate-900 border-2 border-white">
                                            ${user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p class="font-bold text-slate-900 text-lg leading-none">${Utils.escapeHtml(user.name)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <p class="text-sm font-bold text-slate-700">${Utils.escapeHtml(user.email)}</p>
                                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">${user.phone || 'NO PHONE'}</p>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="inline-flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 rounded-full">
                                        <div class="w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-orange-500' : 'bg-blue-500'}"></div>
                                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-700">${user.role}</span>
                                    </div>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    ${user.role !== 'admin' ? `
                                        <button onclick="deleteUser('${user.id}')" class="p-3 bg-red-100 text-red-600 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                                        </button>
                                    ` : '<span class="text-slate-300 text-xs">Protected</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Delete a user
 * @param {string} userId - User ID
 */
function deleteUser(userId) {
    if (confirm('Permanently remove this student record? This action cannot be undone.')) {
        const result = window.userManager.deleteUser(userId);
        if (result.success) {
            Utils.showToast('Student record removed successfully', 'success');
            renderAdminUsers();
        } else {
            Utils.showToast(result.error, 'error');
        }
    }
}

// ==================== BOOKING FLOW ====================

/**
 * Initialize booking flow
 */
function initializeBookingFlow() {
    bookingState.type = null;
    bookingState.players = 1;
    bookingState.amount = 0;
    goToBookingStep(1);
    initializeMonths();
}

/**
 * Initialize month selector
 */
function initializeMonths() {
    const select = document.getElementById('monthSelect');
    if (!select) return;

    select.innerHTML = '';
    const months = Utils.getNextMonths(6);

    months.forEach(m => {
        const option = document.createElement('option');
        option.value = m.value;
        option.textContent = m.label;
        select.appendChild(option);
    });

    bookingState.month = months[0].value;
    updateAvailability();
}

/**
 * Select booking type
 * @param {string} type - 'weekly' or 'monthly'
 */
function selectBookingType(type) {
    bookingState.type = type;

    // Update card styles
    document.querySelectorAll('.booking-type-card').forEach(card => {
        card.classList.remove('border-primary', 'bg-primary/5');
        card.classList.add('border-gray-200');
    });

    const selectedCard = document.getElementById(type + 'Card');
    if (selectedCard) {
        selectedCard.classList.remove('border-gray-200');
        selectedCard.classList.add('border-primary', 'bg-primary/5');
    }

    updateAmount();
    setTimeout(() => goToBookingStep(2), 300);
}

/**
 * Update availability display
 */
function updateAvailability() {
    const monthEl = document.getElementById('monthSelect');
    if (!monthEl) return;

    const month = monthEl.value;
    bookingState.month = month;

    const available = window.bookingManager.getAvailableSlots(month);

    const slotsEl = document.getElementById('availableSlots');
    if (slotsEl) slotsEl.textContent = available;

    const bar = document.getElementById('availabilityBar');
    if (bar) {
        const usedPercent = ((window.CONFIG.MAX_PLAYERS_PER_MONTH - available) / window.CONFIG.MAX_PLAYERS_PER_MONTH) * 100;
        bar.style.width = usedPercent + '%';

        if (available <= 2) {
            bar.className = 'h-full bg-red-500 rounded-full transition-all';
        } else if (available <= 5) {
            bar.className = 'h-full bg-yellow-500 rounded-full transition-all';
        } else {
            bar.className = 'h-full bg-green-500 rounded-full transition-all';
        }
    }

    if (bookingState.players > available) {
        bookingState.players = Math.max(1, available);
        const countEl = document.getElementById('playerCount');
        if (countEl) countEl.textContent = bookingState.players;
    }

    updateAmount();
}

/**
 * Adjust player count
 * @param {number} delta - Change amount (+1 or -1)
 */
function adjustPlayers(delta) {
    const available = window.bookingManager.getAvailableSlots(bookingState.month);
    const newCount = bookingState.players + delta;

    if (newCount >= 1 && newCount <= available) {
        bookingState.players = newCount;
        const countEl = document.getElementById('playerCount');
        if (countEl) countEl.textContent = newCount;
        updateAmount();
    }
}

/**
 * Update total amount
 */
function updateAmount() {
    const price = bookingState.type === 'monthly'
        ? window.CONFIG.PRICING.MONTHLY
        : window.CONFIG.PRICING.WEEKLY;

    bookingState.amount = price * bookingState.players;

    const totalEl = document.getElementById('totalAmount');
    if (totalEl) totalEl.textContent = Utils.formatCurrency(bookingState.amount);
}

/**
 * Navigate to booking step
 * @param {number} step - Step number (1-4)
 */
function goToBookingStep(step) {
    if (step === 2 && !bookingState.type) {
        Utils.showToast('Please select a booking type', 'error');
        return;
    }

    if (step === 3) {
        const available = window.bookingManager.getAvailableSlots(bookingState.month);
        if (available === 0) {
            Utils.showToast('No slots available for this month', 'error');
            return;
        }
        updatePaymentSummary();
    }

    // Hide all steps
    document.querySelectorAll('.booking-step-content').forEach(el => el.classList.add('hidden'));

    // Show current step
    const target = document.getElementById('booking-step-' + step);
    if (target) target.classList.remove('hidden');

    // Update step indicators
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById('booking-step-' + i + '-indicator');
        if (!indicator) continue;

        if (i < step) {
            indicator.className = 'step-completed w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm';
        } else if (i === step) {
            indicator.className = 'step-active w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm';
        } else {
            indicator.className = 'step-pending w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm';
        }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Update payment summary display
 */
function updatePaymentSummary() {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;

    const monthLabel = monthSelect.options[monthSelect.selectedIndex].textContent;

    const elements = {
        type: document.getElementById('summaryType'),
        month: document.getElementById('summaryMonth'),
        players: document.getElementById('summaryPlayers'),
        total: document.getElementById('summaryTotal'),
        qr: document.getElementById('paymentQRCode')
    };

    if (elements.type) elements.type.textContent = bookingState.type === 'monthly' ? 'Monthly Pass' : 'Weekly Pass';
    if (elements.month) elements.month.textContent = monthLabel;
    if (elements.players) elements.players.textContent = bookingState.players;
    if (elements.total) elements.total.textContent = Utils.formatCurrency(bookingState.amount);

    // Generate QR Code
    if (elements.qr) {
        const upiUrl = `upi://pay?pa=${window.CONFIG.UPI_ID}&pn=DribbleGround&am=${bookingState.amount}&cu=INR`;
        elements.qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
    }
}

/**
 * Copy UPI ID to clipboard
 */
function copyUPI() {
    navigator.clipboard.writeText(window.CONFIG.UPI_ID);
    Utils.showToast('UPI ID copied!', 'success');
}

/**
 * Confirm payment and create booking
 */
function confirmPayment() {
    const user = window.userManager.getUser();
    if (!user) {
        window.location.href = 'signin.html';
        return;
    }

    showLoadingOverlay(true);

    try {
        const result = window.bookingManager.createBooking({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            type: bookingState.type,
            month: bookingState.month,
            players: bookingState.players
        });

        if (!result.success) {
            Utils.showToast(result.error, 'error');
            showLoadingOverlay(false);
            return;
        }

        // Update confirmation screen
        const monthEl = document.getElementById('monthSelect');
        const monthLabel = monthEl ? monthEl.options[monthEl.selectedIndex].textContent : '';

        const confirmElements = {
            id: document.getElementById('confirmBookingId'),
            type: document.getElementById('confirmType'),
            month: document.getElementById('confirmMonth'),
            players: document.getElementById('confirmPlayers'),
            amount: document.getElementById('confirmAmount')
        };

        if (confirmElements.id) confirmElements.id.textContent = result.booking.id;
        if (confirmElements.type) confirmElements.type.textContent = bookingState.type === 'monthly' ? 'Monthly Pass' : 'Weekly Pass';
        if (confirmElements.month) confirmElements.month.textContent = monthLabel;
        if (confirmElements.players) confirmElements.players.textContent = bookingState.players;
        if (confirmElements.amount) confirmElements.amount.textContent = Utils.formatCurrency(bookingState.amount);

        goToBookingStep(4);
        Utils.showToast('Booking Created Successfully!', 'success');

        // Trigger WhatsApp confirmation after delay
        setTimeout(() => {
            sendWhatsAppConfirmation();
        }, 2000);

    } catch (error) {
        Utils.showToast('Booking failed: ' + error.message, 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Send WhatsApp confirmation
 */
function sendWhatsAppConfirmation() {
    const user = window.userManager.getUser();
    const bookingId = document.getElementById('confirmBookingId')?.textContent || '';
    const amount = document.getElementById('confirmAmount')?.textContent || '';
    const type = document.getElementById('confirmType')?.textContent || '';

    const message = encodeURIComponent(
        `Hello Academy Admin, I have completed the training payment.\n\n` +
        `*Ref:* ${bookingId}\n` +
        `*Athlete:* ${user.name}\n` +
        `*Package:* ${type}\n` +
        `*Amount:* ${amount}\n\n` +
        `Please verify my transaction.`
    );

    const whatsappUrl = `https://wa.me/918084970887?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// ==================== USER MODAL ====================

/**
 * Show add user modal
 */
function showAddUserModal() {
    const modal = document.getElementById('userModal');
    if (!modal) return;

    document.getElementById('modalTitle').textContent = 'Add Athlete';
    document.getElementById('modalUserId').value = '';
    document.getElementById('modalUserName').value = '';
    document.getElementById('modalUserEmail').value = '';
    document.getElementById('modalUserPassword').value = '';

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Hide user modal
 */
function hideUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Save user from modal
 */
function saveUserFromModal() {
    const name = document.getElementById('modalUserName').value;
    const email = document.getElementById('modalUserEmail').value;
    const password = document.getElementById('modalUserPassword').value;

    if (!name || !email || !password) {
        Utils.showToast('Please fill all required fields', 'warning');
        return;
    }

    const result = window.userManager.register({ name, email, password });

    if (result.success) {
        Utils.showToast('Student registered successfully', 'success');
        hideUserModal();
        renderAdminUsers();
    } else {
        Utils.showToast(result.error, 'error');
    }
}

// ==================== DOCUMENT MODAL ====================

const documentContent = {
    1: {
        title: 'Player Registration Form',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Dribble Ground Academy - Player Registration</h3>
            <div class="bg-slate-50 p-6 rounded-2xl">
                <h4 class="font-bold text-slate-900 mb-4">Personal Information</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Full Name:</strong> [Player Name]</div>
                    <div><strong>Date of Birth:</strong> [DD/MM/YYYY]</div>
                    <div><strong>Age:</strong> [Age] years</div>
                    <div><strong>Gender:</strong> [Male/Female/Other]</div>
                </div>
            </div>
            <div class="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-2xl">
                <h4 class="font-bold text-yellow-800 mb-3">Important Notes</h4>
                <ul class="text-sm text-yellow-700 space-y-2 list-disc list-inside">
                    <li>This form must be completed before first training session</li>
                    <li>Medical clearance required for pre-existing conditions</li>
                    <li>Parent signature mandatory for players under 18</li>
                </ul>
            </div>
        </div>
    `},
    2: {
        title: 'Payment Receipt',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Official Payment Receipt</h3>
            <div class="bg-green-50 border-2 border-green-200 p-6 rounded-2xl">
                <h4 class="font-bold text-green-800 mb-4">Payment Confirmed</h4>
                <p class="text-sm text-green-700">Your payment has been verified. Training access is now active.</p>
            </div>
        </div>
    `},
    3: {
        title: 'Medical Fitness Certificate',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Medical Fitness Certificate</h3>
            <div class="bg-red-50 border-2 border-red-200 p-6 rounded-2xl">
                <p class="text-sm text-red-700">Medical clearance from a registered physician is required for all players.</p>
            </div>
        </div>
    `},
    4: {
        title: 'Indemnity & Waiver Form',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Liability Waiver & Indemnity Form</h3>
            <div class="bg-purple-50 border-2 border-purple-200 p-6 rounded-2xl">
                <p class="text-sm text-purple-700">All participants must acknowledge the risks associated with basketball training.</p>
            </div>
        </div>
    `},
    5: {
        title: 'Code of Conduct',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Academy Code of Conduct</h3>
            <div class="bg-orange-50 border-2 border-orange-200 p-6 rounded-2xl">
                <ul class="text-sm text-orange-700 space-y-2 list-disc list-inside">
                    <li>Punctuality: Arrive 10 minutes before training</li>
                    <li>Respect coaches and fellow players</li>
                    <li>Fair play and good sportsmanship</li>
                    <li>Take care of academy equipment</li>
                </ul>
            </div>
        </div>
    `},
    6: {
        title: 'Training Schedule',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Training Schedule</h3>
            <div class="bg-cyan-50 border-2 border-cyan-200 p-6 rounded-2xl">
                <p class="text-sm text-cyan-700"><strong>Days:</strong> Monday to Saturday</p>
                <p class="text-sm text-cyan-700"><strong>Time:</strong> 9:00 AM - 6:00 PM</p>
                <p class="text-sm text-cyan-700"><strong>Rest:</strong> Sundays</p>
            </div>
        </div>
    `}
};

/**
 * Show document modal
 * @param {number} docId - Document ID
 */
function showDocumentModal(docId) {
    const doc = documentContent[docId];
    if (!doc) return;

    const modal = document.createElement('div');
    modal.id = 'docModal';
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div class="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 class="text-2xl font-black uppercase tracking-tight text-slate-900">${doc.title}</h2>
                <button onclick="document.getElementById('docModal').remove()" class="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <i data-lucide="x" class="w-6 h-6 text-slate-400"></i>
                </button>
            </div>
            <div class="p-10 max-h-[70vh] overflow-y-auto">
                ${doc.content}
            </div>
            <div class="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
                <button onclick="document.getElementById('docModal').remove()" class="px-8 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-300 transition-all">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Format month string to readable format
 * @param {string} month - Month in YYYY-MM format
 * @returns {string} Formatted month
 */
function formatMonth(month) {
    try {
        const date = new Date(month + '-01');
        return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
        return month;
    }
}

/**
 * Handle logout
 * @param {Event} e - Click event
 */
function handleLogout(e) {
    if (e) e.preventDefault();
    if (window.userManager) {
        window.userManager.logout();
    }
    window.location.href = 'signin.html';
}

// Make functions globally available
window.showSection = showSection;
window.confirmAdminBooking = confirmAdminBooking;
window.deleteUser = deleteUser;
window.selectBookingType = selectBookingType;
window.adjustPlayers = adjustPlayers;
window.goToBookingStep = goToBookingStep;
window.confirmPayment = confirmPayment;
window.copyUPI = copyUPI;
window.updateAvailability = updateAvailability;
window.filterCRM = filterCRM;
window.showAddUserModal = showAddUserModal;
window.hideUserModal = hideUserModal;
window.saveUserFromModal = saveUserFromModal;
window.showDocumentModal = showDocumentModal;
window.sendWhatsAppConfirmation = sendWhatsAppConfirmation;
window.handleLogout = handleLogout;
