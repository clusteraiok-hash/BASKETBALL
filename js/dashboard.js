/**
 * Dashboard UI Logic - Production Grade
 */

// Booking Flow State
let bookingState = {
    type: null,
    month: null,
    players: 1,
    amount: 0
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    checkAdminAuth();
    await loadInitialData();
    initializeMonths();
});

async function loadInitialData() {
    showLoadingOverlay(true);
    try {
        await Promise.all([
            loadDashboardStats(),
            // Prefetch other critical data if needed
        ]);
    } catch (error) {
        console.error('Initialization error:', error);
        Utils.showToast('Failed to load dashboard data', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

function showLoadingOverlay(show) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay && show) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center transition-opacity duration-300';
        overlay.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p class="text-sm font-black uppercase tracking-widest text-slate-900">Synchronizing Academy Data...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    if (overlay) {
        overlay.style.opacity = show ? '1' : '0';
        if (!show) setTimeout(() => overlay.remove(), 300);
    }
}

function checkAdminAuth() {
    const user = window.userManager.currentUser;
    if (user) {
        // Update user widget initials and names separately
        const initialEls = document.querySelectorAll('.current-user-initial');
        initialEls.forEach(el => el.textContent = user.name.charAt(0).toUpperCase());

        const nameEls = document.querySelectorAll('.current-user-name');
        nameEls.forEach(el => el.textContent = user.name);

        const emailEls = document.querySelectorAll('.current-user-email');
        emailEls.forEach(el => el.textContent = user.email);

        if (user.role === 'admin') {
            const adminMenu = document.getElementById('admin-bookings-menu-item');
            if (adminMenu) adminMenu.classList.remove('hidden');
        }
    } else {
        window.location.href = 'signin.html';
    }
}

// Sidebar Navigation
async function showSection(sectionId) {
    // Update Sidebar UI
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active', 'bg-slate-50', 'text-slate-900');
        link.classList.add('text-slate-500');
    });

    // Find the link that was clicked or the one corresponding to the sectionId
    let currentLink = event?.currentTarget?.classList?.contains('sidebar-link') ? event.currentTarget : null;
    if (!currentLink) {
        currentLink = document.querySelector(`[onclick*="showSection('${sectionId}')"]`);
    }

    if (currentLink) {
        currentLink.classList.add('active', 'bg-slate-50', 'text-slate-900');
        currentLink.classList.remove('text-slate-500');
    }

    // Switch Visibility
    document.querySelectorAll('.section-content').forEach(el => el.classList.add('hidden'));
    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
        await loadSectionData(sectionId);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadSectionData(sectionId) {
    showLoadingOverlay(true);
    try {
        switch (sectionId) {
            case 'overview': await loadDashboardStats(); break;
            case 'bookings': await renderAdminBookings(); break;
            case 'my-bookings': await renderMyBookings(); break;
            case 'documents': renderDocumentsView(); break;
            case 'crm': await renderCRMView(); break;
            case 'admin': await renderAdminUsers(); break;
            case 'new-booking': initializeBookingFlow(); break;
        }
    } catch (error) {
        Utils.showToast(`Error loading ${sectionId}: ` + error.message, 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// --- Section Renderers ---

async function loadDashboardStats() {
    if (!bookingManager) return;
    const bookings = await bookingManager.getAllBookings();
    const users = await userManager.getAllUsers();

    // Calculate stats locally from fetched data
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const monthlyRevenue = confirmed
        .filter(b => b.month === currentMonth)
        .reduce((sum, b) => sum + b.amount, 0);
    const currentMonthPlayers = confirmed
        .filter(b => b.month === currentMonth)
        .reduce((sum, b) => sum + b.players, 0);
    const occupancyRate = Math.round((currentMonthPlayers / 10) * 100);

    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="bg-white rounded-2xl p-6 text-slate-900 h-40 flex flex-col justify-between shadow-soft border border-slate-100">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Active Bookings</p>
            <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-primary-dark">${confirmed.length}</span>
                <span class="text-[10px] text-slate-400">Live API</span>
            </div>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Revenue</p>
            <div>
                <span class="text-3xl font-bold text-slate-900">${Utils.formatCurrency(monthlyRevenue)}</span>
                <p class="text-[10px] text-slate-400 mt-1">Confirmed Growth</p>
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
}

async function renderAdminBookings() {
    const section = document.getElementById('bookings-section');
    const bookings = await bookingManager.getAllBookings();
    section.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-slate-900 leading-tight">Academy Bookings</h2>
                <p class="text-sm text-slate-400 font-medium">Overview of all student training schedules from cloud database</p>
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
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Flow Status</th>
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Fee Paid</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${bookings.length === 0 ? '<tr><td colspan="5" class="px-8 py-12 text-center text-slate-400 italic font-medium">No bookings recorded in database</td></tr>' : bookings.map(b => `
                            <tr class="hover:bg-slate-50 transition-colors group">
                                <td class="px-8 py-6">
                                    <p class="font-bold text-slate-900 leading-none mb-1">${b.User?.name || 'Unknown'}</p>
                                    <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">${b.User?.email || ''}</p>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                                        <span class="text-[10px] font-black uppercase tracking-widest text-primary-dark">${b.type} Pass</span>
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <p class="text-sm font-bold text-slate-700">${new Date(b.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="flex items-center gap-3">
                                        <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'}">
                                            ${b.status}
                                        </span>
                                        ${b.status === 'pending' ? `
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

async function confirmAdminBooking(id) {
    if (confirm('Approve this payment and confirm the training slot?')) {
        const result = await bookingManager.confirmPayment(id, 'VERIFIED_BY_ADMIN');
        if (result.success) {
            Utils.showToast('Booking confirmed', 'success');
            await renderAdminBookings();
        } else {
            Utils.showToast(result.error, 'error');
        }
    }
}

async function renderMyBookings() {
    const section = document.getElementById('my-bookings-section');
    const bookings = await bookingManager.getBookingsByUser();

    section.innerHTML = `
        <div class="flex justify-between items-center mb-10">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-slate-900 leading-tight">My Training Schedule</h2>
                <p class="text-sm text-slate-400 font-medium">Your active passes and session history from cloud</p>
            </div>
            <button onclick="showSection('new-booking')" class="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 hover:-translate-y-1">
                <i data-lucide="plus-circle" class="w-5 h-5"></i>
                New Booking
            </button>
        </div>
        <div class="grid gap-8">
            ${bookings.length === 0 ? `
                <div class="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <p class="text-slate-900 font-bold text-xl mb-2">No Active Training Passes</p>
                    <button onclick="showSection('new-booking')" class="px-8 py-3 bg-primary text-black rounded-xl font-bold">Book Now</button>
                </div>
            ` : bookings.map(booking => `
                <div class="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                        <div class="flex items-center gap-6">
                            <div class="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-primary transition-all">
                                <i data-lucide="basketball" class="w-8 h-8 text-slate-400 group-hover:text-black"></i>
                            </div>
                            <div>
                                <h3 class="font-black text-xl text-slate-900 uppercase tracking-tighter leading-none mb-2">${booking.type} Pass</h3>
                                <p class="text-sm text-slate-500 font-medium">${new Date(booking.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} • ${booking.players} Athletes</p>
                                <div class="flex items-center gap-3 mt-4">
                                    <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'}">
                                        ${booking.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col md:text-right border-t md:border-t-0 border-slate-50 pt-6 md:pt-0">
                            <p class="text-3xl font-black text-slate-900 leading-none mb-1">${Utils.formatCurrency(booking.amount)}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderDocumentsView() {
    const section = document.getElementById('documents-section');
    if (!window.documentManager) {
        console.error('DocumentManager not initialized');
        return;
    }
    const templates = window.documentManager.getAllTemplates();

    section.innerHTML = `
        <div class="mb-10">
            <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-slate-900 leading-tight">Policy Vault & Documents</h2>
            <p class="text-sm text-slate-400 font-medium">Download forms, read academy policies, and access training materials.</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${templates.map(doc => `
                <div class="bg-white rounded-[2rem] border border-slate-100 p-8 hover:shadow-xl transition-all group flex flex-col relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-12 -mt-12 rounded-full group-hover:bg-primary/5 transition-colors"></div>
                    <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary transition-all mb-6 relative z-10">
                        <i data-lucide="${doc.icon}" class="w-7 h-7 text-slate-600 group-hover:text-black transition-colors"></i>
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
            `).join('')}
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function renderCRMView(filter = '') {
    const section = document.getElementById('crm-section');
    const users = (await userManager.getAllUsers()).filter(u => u.role !== 'admin');
    const bookings = await bookingManager.getAllBookings();

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
    );

    section.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-neutral-900">Student CRM</h2>
                <p class="text-sm text-neutral-400 font-medium">Customer relationship management and athlete lifecycle tracking</p>
            </div>
            <div class="relative w-full md:w-96 group">
                <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors"></i>
                <input type="text" id="crmSearch" placeholder="Search athletes by name or email..." 
                    class="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-100 focus:border-primary rounded-2xl outline-none font-bold transition-all shadow-sm"
                    oninput="filterCRM(this.value)" value="${filter}">
            </div>
        </div>

        <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
            <div class="overflow-x-auto no-scrollbar">
                <table class="w-full text-left">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-200">
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Athlete Entity</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Lifecycle</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Enrollments</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Net Revenue</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Last Session</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Insight</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${filteredUsers.map(user => {
        const userBookings = bookings.filter(b => b.UserId === user.id);
        const totalSpent = userBookings.reduce((sum, b) => b.status === 'confirmed' ? sum + b.amount : sum, 0);
        const lastBooking = userBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        return `
                                <tr class="hover:bg-slate-50 transition-colors group">
                                    <td class="px-8 py-6">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black capitalize shadow-lg">
                                                ${user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p class="font-bold text-slate-900 leading-none mb-1">${user.name}</p>
                                                <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">${user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-8 py-6">
                                        ${totalSpent > 1000 ?
                '<span class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-200">Elite Tier</span>' :
                '<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">Standard</span>'}
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
                                    <td class="px-8 py-6 text-right">
                                        <button onclick="showUpdateUserModal('${user.id}')" class="text-xs font-bold text-slate-400 hover:text-black transition-colors underline decoration-2 underline-offset-4">View Full Profile</button>
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

function filterCRM(val) {
    renderCRMView(val);
    const searchInput = document.getElementById('crmSearch');
    if (searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(val.length, val.length);
    }
}

async function renderAdminUsers() {
    const section = document.getElementById('admin-section');
    const users = await userManager.getAllUsers();

    section.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-neutral-900">Student Directory</h2>
                <p class="text-sm text-neutral-400 font-medium">Managing athletes via PostgreSQL production engine</p>
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
                                            <p class="font-bold text-slate-900 text-lg leading-none">${user.name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <p class="text-sm font-bold text-slate-700">${user.email}</p>
                                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">${user.phone || 'NO PHONE'}</p>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="inline-flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 rounded-full">
                                        <div class="w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-orange-500' : 'bg-blue-500'}"></div>
                                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-700">${user.role}</span>
                                    </div>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <button class="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                                        <i data-lucide="edit-3" class="w-5 h-5"></i>
                                    </button>
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

// --- Booking Flow Integrated Functions ---

function initializeBookingFlow() {
    goToBookingStep(1);
    initializeMonths();
}

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

function selectBookingType(type) {
    bookingState.type = type;
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

function updateAvailability() {
    const monthEl = document.getElementById('monthSelect');
    if (!monthEl) return;
    const month = monthEl.value;
    bookingState.month = month;

    const available = bookingManager.getAvailableSlots(month);
    const slotsEl = document.getElementById('availableSlots');
    if (slotsEl) slotsEl.textContent = available;

    const bar = document.getElementById('availabilityBar');
    if (bar) {
        const usedPercent = ((10 - available) / 10) * 100;
        bar.style.width = usedPercent + '%';
        if (available <= 2) bar.className = 'h-full bg-red-500 rounded-full transition-all';
        else if (available <= 5) bar.className = 'h-full bg-yellow-500 rounded-full transition-all';
        else bar.className = 'h-full bg-green-500 rounded-full transition-all';
    }

    if (bookingState.players > available) {
        bookingState.players = Math.max(1, available);
        const countEl = document.getElementById('playerCount');
        if (countEl) countEl.textContent = bookingState.players;
    }

    updateAmount();
}

function adjustPlayers(delta) {
    const available = bookingManager.getAvailableSlots(bookingState.month);
    const newCount = bookingState.players + delta;

    if (newCount >= 1 && newCount <= available) {
        bookingState.players = newCount;
        const countEl = document.getElementById('playerCount');
        if (countEl) countEl.textContent = newCount;
        updateAmount();
    }
}

function updateAmount() {
    const price = bookingState.type === 'monthly' ? CONFIG.MONTHLY_PRICE : CONFIG.WEEKLY_PRICE;
    bookingState.amount = price * bookingState.players;
    const totalEl = document.getElementById('totalAmount');
    if (totalEl) totalEl.textContent = Utils.formatCurrency(bookingState.amount);
}

function goToBookingStep(step) {
    if (step === 2 && !bookingState.type) {
        Utils.showToast('Please select a booking type', 'error');
        return;
    }

    if (step === 3) {
        const available = bookingManager.getAvailableSlots(bookingState.month);
        if (available === 0) {
            Utils.showToast('No slots available for this month', 'error');
            return;
        }
        updatePaymentSummary();
    }

    document.querySelectorAll('.booking-step-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('booking-step-' + step);
    if (target) target.classList.remove('hidden');

    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById('booking-step-' + i + '-indicator');
        if (!indicator) continue;
        if (i < step) indicator.className = 'step-completed w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm';
        else if (i === step) indicator.className = 'step-active w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm';
        else indicator.className = 'step-pending w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updatePaymentSummary() {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;
    const monthLabel = monthSelect.options[monthSelect.selectedIndex].textContent;

    const els = {
        type: document.getElementById('summaryType'),
        month: document.getElementById('summaryMonth'),
        players: document.getElementById('summaryPlayers'),
        total: document.getElementById('summaryTotal'),
        qr: document.getElementById('paymentQRCode')
    };

    if (els.type) els.type.textContent = bookingState.type === 'monthly' ? 'Monthly Pass' : 'Weekly Pass';
    if (els.month) els.month.textContent = monthLabel;
    if (els.players) els.players.textContent = bookingState.players;
    if (els.total) els.total.textContent = Utils.formatCurrency(bookingState.amount);

    // Update QR Code with exact amount
    if (els.qr) {
        const upiUrl = `upi://pay?pa=8084970887@ybl&pn=DribbleGround&am=${bookingState.amount}&cu=INR`;
        els.qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
    }
}

function copyUPI() {
    navigator.clipboard.writeText(CONFIG.UPI_ID);
    Utils.showToast('UPI ID copied!', 'success');
}

async function confirmPayment() {
    const user = userManager.currentUser;
    if (!user) {
        window.location.href = 'signin.html';
        return;
    }

    showLoadingOverlay(true);
    try {
        const result = await bookingManager.createBooking({
            type: bookingState.type,
            month: bookingState.month,
            players: bookingState.players,
            amount: bookingState.amount
        });

        if (!result.success) {
            Utils.showToast(result.error, 'error');
            return;
        }

        // Update confirmation screen
        const monthEl = document.getElementById('monthSelect');
        const monthLabel = monthEl ? monthEl.options[monthEl.selectedIndex].textContent : '';
        const confIds = {
            id: document.getElementById('confirmBookingId'),
            type: document.getElementById('confirmType'),
            month: document.getElementById('confirmMonth'),
            players: document.getElementById('confirmPlayers'),
            amount: document.getElementById('confirmAmount')
        };

        if (confIds.id) confIds.id.textContent = result.booking.id;
        if (confIds.type) confIds.type.textContent = bookingState.type === 'monthly' ? 'Monthly Pass' : 'Weekly Pass';
        if (confIds.month) confIds.month.textContent = monthLabel;
        if (confIds.players) confIds.players.textContent = bookingState.players;
        const formattedAmount = Utils.formatCurrency(bookingState.amount);
        if (confIds.amount) confIds.amount.textContent = formattedAmount;

        goToBookingStep(4);
        Utils.showToast('Booking Securely Created', 'success');

        // Automatically trigger WhatsApp redirection after a short delay
        setTimeout(() => {
            sendWhatsAppConfirmation();
        }, 2000);
    } catch (error) {
        Utils.showToast('Booking failed: ' + error.message, 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

// --- Admin Helper Functions ---

async function deleteUser(userId) {
    if (confirm('Permanently remove this student record? This action cannot be undone.')) {
        showLoadingOverlay(true);
        try {
            const result = await userManager.deleteUser(userId);
            if (result.success) {
                Utils.showToast('Student record removed successfully', 'success');
                await renderAdminUsers();
            } else {
                Utils.showToast(result.error, 'error');
            }
        } catch (error) {
            Utils.showToast('Failed to delete user', 'error');
        } finally {
            showLoadingOverlay(false);
        }
    }
}

function showAddUserModal() {
    document.getElementById('modalTitle').textContent = 'Add Athlete';
    document.getElementById('modalUserId').value = '';
    document.getElementById('modalUserName').value = '';
    document.getElementById('modalUserEmail').value = '';
    document.getElementById('modalUserPassword').value = '';
    document.getElementById('userModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function showUpdateUserModal(userId) {
    showLoadingOverlay(true);
    try {
        const user = await userManager.getUserById(userId);
        if (!user) {
            Utils.showToast('User not found', 'error');
            return;
        }

        document.getElementById('modalTitle').textContent = 'Update Athlete';
        document.getElementById('modalUserId').value = user.id;
        document.getElementById('modalUserName').value = user.name;
        document.getElementById('modalUserEmail').value = user.email;
        document.getElementById('modalUserPassword').value = ''; // Don't show password for security
        document.getElementById('userModal').classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (error) {
        Utils.showToast('Failed to load user data', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

function hideUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

async function saveUserFromModal() {
    const userId = document.getElementById('modalUserId').value;
    const name = document.getElementById('modalUserName').value;
    const email = document.getElementById('modalUserEmail').value;
    const password = document.getElementById('modalUserPassword').value;

    if (!name || !email || (!userId && !password)) {
        Utils.showToast('Please fill required fields', 'warning');
        return;
    }

    showLoadingOverlay(true);
    try {
        let result;
        if (userId) {
            // Update existing user
            const updateData = { name, email };
            if (password) updateData.password = password;
            result = await userManager.updateProfile(userId, updateData);
        } else {
            // Register new user
            result = await userManager.register({ name, email, password });
        }

        if (result.success) {
            Utils.showToast(userId ? 'Student record updated' : 'Student registered successfully', 'success');
            hideUserModal();
            await renderAdminUsers();
        } else {
            Utils.showToast(result.error, 'error');
        }
    } catch (error) {
        Utils.showToast('Failed to save user', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

function handleLogout(e) {
    if (e) e.preventDefault();
    userManager.logout();
    window.location.href = 'signin.html';
}

function logout() {
    handleLogout();
}

async function toggleUserVerification(userId) {
    showLoadingOverlay(true);
    try {
        const user = await userManager.getUserById(userId);
        if (!user) return;

        const newStatus = !user.verified;
        const result = await userManager.updateProfile(userId, { verified: newStatus });

        if (result.success) {
            Utils.showToast(`User ${newStatus ? 'Verified' : 'Unverified'} Successfully`, 'success');
            await renderAdminUsers();
        } else {
            Utils.showToast(result.error, 'error');
        }
    } catch (error) {
        Utils.showToast('Failed to toggle verification', 'error');
    } finally {
        showLoadingOverlay(false);
    }
}

function sendWhatsAppConfirmation() {
    const user = window.userManager.currentUser;
    const bookingId = document.getElementById('confirmBookingId').textContent;
    const amount = document.getElementById('confirmAmount').textContent;
    const type = document.getElementById('confirmType').textContent;

    const message = `Hello Academy Admin, I have completed the training payment.%0A%0A*Ref:* ${bookingId}%0A*Athlete:* ${user.name}%0A*Package:* ${type}%0A*Amount:* ${amount}%0A%0APlease verify my cloud transaction.`;

    const whatsappUrl = `https://wa.me/918084970887?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// --- Document Modal Functions ---

const fakeDocumentContent = {
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
                    <div><strong>Email:</strong> [email@example.com]</div>
                    <div><strong>Phone:</strong> [+91 XXXXX XXXXX]</div>
                </div>
            </div>

            <div class="bg-slate-50 p-6 rounded-2xl">
                <h4 class="font-bold text-slate-900 mb-4">Training Details</h4>
                <div class="space-y-3 text-sm">
                    <div><strong>Program Type:</strong> Monthly/Weekly Training Pass</div>
                    <div><strong>Preferred Schedule:</strong> Morning/Evening Sessions</div>
                    <div><strong>Skill Level:</strong> Beginner/Intermediate/Advanced</div>
                    <div><strong>Previous Experience:</strong> [Years of basketball experience]</div>
                </div>
            </div>

            <div class="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-2xl">
                <h4 class="font-bold text-yellow-800 mb-3">Important Notes</h4>
                <ul class="text-sm text-yellow-700 space-y-2 list-disc list-inside">
                    <li>This form must be completed before first training session</li>
                    <li>Medical clearance required for players with pre-existing conditions</li>
                    <li>Parent signature mandatory for players under 18 years</li>
                    <li>Bring original ID proof for verification</li>
                </ul>
            </div>
        </div>
    `
    },
    2: {
        title: 'Payment Receipt',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Official Payment Receipt</h3>
            
            <div class="bg-green-50 border-2 border-green-200 p-6 rounded-2xl">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <i data-lucide="check" class="w-6 h-6 text-white"></i>
                    </div>
                    <h4 class="font-bold text-green-800">Payment Confirmed</h4>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Receipt Number:</strong> DRG-2024-XXXX</div>
                    <div><strong>Transaction ID:</strong> [UPI Transaction ID]</div>
                    <div><strong>Payment Date:</strong> [DD/MM/YYYY HH:MM]</div>
                    <div><strong>Payment Method:</strong> UPI (GPay/PhonePe/Paytm)</div>
                    <div><strong>Amount Paid:</strong> ₹[Amount]</div>
                    <div><strong>Booking Reference:</strong> [Booking ID]</div>
                </div>
            </div>

            <div class="text-center pt-4 border-t">
                <p class="text-xs text-slate-500">This receipt is automatically generated upon successful payment verification.</p>
                <p class="text-xs text-slate-500">For any queries, contact: +91 8084970887</p>
            </div>
        </div>
    `
    },
    3: {
        title: 'Medical Fitness Certificate',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Medical Fitness Certificate</h3>
            
            <div class="bg-red-50 border-2 border-red-200 p-6 rounded-2xl">
                <h4 class="font-bold text-red-800 mb-4">Physician's Certification</h4>
                <div class="text-sm text-red-700 space-y-3">
                    <p><strong>Patient Name:</strong> [Player Name]</p>
                    <p><strong>Age:</strong> [Age] years</p>
                    <p><strong>Examination Date:</strong> [DD/MM/YYYY]</p>
                    <p><strong>Certificate Valid Until:</strong> [DD/MM/YYYY]</p>
                </div>
            </div>

            <div class="bg-green-50 p-6 rounded-2xl">
                <h4 class="font-bold text-green-800 mb-3">Fitness Declaration</h4>
                <p class="text-sm text-green-700 leading-relaxed">
                    I, Dr. [Physician Name], MBBS, after conducting a thorough medical examination, 
                    hereby certify that the above-named individual is medically fit to participate in 
                    basketball training activities at Dribble Ground Academy.
                </p>
            </div>
        </div>
    `
    },
    4: {
        title: 'Indemnity & Waiver Form',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Liability Waiver & Indemnity Form</h3>
            
            <div class="bg-purple-50 border-2 border-purple-200 p-6 rounded-2xl">
                <h4 class="font-bold text-purple-800 mb-4">Participant Declaration</h4>
                <p class="text-sm text-purple-700 leading-relaxed mb-4">
                    I, [Participant Name], hereby acknowledge and agree to the following terms and conditions 
                    for my participation in basketball training activities at Dribble Ground Academy.
                </p>
            </div>

            <div class="bg-slate-50 p-6 rounded-2xl">
                <h4 class="font-bold text-slate-900 mb-4">Risk Acknowledgement</h4>
                <ul class="text-sm text-slate-700 space-y-2 list-disc list-inside">
                    <li>I understand that basketball involves inherent risks of physical injury</li>
                    <li>I acknowledge that accidents can occur despite safety precautions</li>
                    <li>I voluntarily assume all risks associated with training participation</li>
                </ul>
            </div>
        </div>
    `
    },
    5: {
        title: 'Code of Conduct',
        content: `
        <div class="space-y-6">
            <h3 class="text-2xl font-bold text-slate-900 mb-6">Dribble Ground Academy - Code of Conduct</h3>
            
            <div class="bg-orange-50 border-2 border-orange-200 p-6 rounded-2xl">
                <h4 class="font-bold text-orange-800 mb-4">Academy Values & Principles</h4>
                <p class="text-sm text-orange-700 leading-relaxed">
                    All members of Dribble Ground Academy are expected to uphold the highest standards 
                    of sportsmanship, respect, and integrity both on and off the court.
                </p>
            </div>

            <div class="bg-slate-50 p-6 rounded-2xl">
                <h4 class="font-bold text-slate-900 mb-4">Behavioral Expectations</h4>
                <ul class="text-sm text-slate-700 space-y-2 list-disc list-inside">
                    <li><strong>Punctuality:</strong> Arrive 10 minutes before scheduled training time</li>
                    <li><strong>Respect for Coaches:</strong> Follow instructions and maintain respectful communication</li>
                    <li><strong>Fair Play:</strong> Demonstrate good sportsmanship during all activities</li>
                    <li><strong>Equipment Care:</strong> Handle academy equipment with care and return items properly</li>
                    <li><strong>No Substance Abuse:</strong> Strictly prohibited during academy hours and events</li>
                </ul>
            </div>
        </div>
    `
    }
};

function showDocumentModal(docId) {
    const doc = fakeDocumentContent[docId];
    if (!doc) return;

    const modal = document.createElement('div');
    modal.id = 'docModal';
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div class="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 class="text-2xl font-black uppercase tracking-tight text-slate-900">${doc.title}</h2>
                <button onclick="document.getElementById('docModal').remove()" class="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <i data-lucide="x" class="w-6 h-6 text-slate-400"></i>
                </button>
            </div>
            <div class="p-10 max-h-[70vh] overflow-y-auto no-scrollbar">
                ${doc.content}
            </div>
            <div class="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
                <button onclick="document.getElementById('docModal').remove()" class="px-8 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-300 transition-all">Close Viewer</button>
                <button onclick="window.print()" class="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg">Download PDF</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
