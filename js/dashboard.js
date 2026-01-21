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
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    checkAdminAuth();
    loadDashboardStats();
    initializeMonths();
});

function checkAdminAuth() {
    const user = window.userManager.getCurrentUser();
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
function showSection(sectionId) {
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
        loadSectionData(sectionId);
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'overview': loadDashboardStats(); break;
        case 'bookings': renderAdminBookings(); break;
        case 'my-bookings': renderMyBookings(); break;
        case 'documents': renderDocumentsView(); break;
        case 'admin': renderAdminUsers(); break;
        case 'new-booking': initializeBookingFlow(); break;
    }
}

// --- Section Renderers ---

function loadDashboardStats() {
    if (!bookingManager) return;
    const stats = bookingManager.getStats();
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="bg-white rounded-2xl p-6 text-slate-900 h-40 flex flex-col justify-between shadow-soft border border-slate-100">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Active Bookings</p>
            <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-primary-dark">${stats.activeBookings}</span>
                <span class="text-[10px] text-slate-400">Real-time</span>
            </div>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Revenue</p>
            <div>
                <span class="text-3xl font-bold text-slate-900">${Utils.formatCurrency(stats.monthlyRevenue)}</span>
                <p class="text-[10px] text-slate-400 mt-1">Estimated Earnings</p>
            </div>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Students</p>
            <span class="text-3xl font-bold text-slate-900">${userManager.getAllUsers().length}</span>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft h-40 flex flex-col justify-between">
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Occupancy</p>
            <div>
                <span class="text-3xl font-bold text-slate-900">${stats.occupancyRate}%</span>
                <div class="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div class="h-full bg-primary rounded-full" style="width: ${stats.occupancyRate}%"></div>
                </div>
            </div>
        </div>
    `;
}

function renderAdminBookings() {
    const section = document.getElementById('bookings-section');
    const bookings = bookingManager.getAllBookings();
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
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Flow Status</th>
                            <th class="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Fee Paid</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${bookings.length === 0 ? '<tr><td colspan="5" class="px-8 py-12 text-center text-slate-400 italic font-medium">No bookings recorded yet</td></tr>' : bookings.map(b => `
                            <tr class="hover:bg-slate-50 transition-colors group">
                                <td class="px-8 py-6">
                                    <p class="font-bold text-slate-900 leading-none mb-1">${b.userName}</p>
                                    <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">${b.userEmail}</p>
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
                                    <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'}">
                                        ${b.status}
                                    </span>
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

function renderMyBookings() {
    const section = document.getElementById('my-bookings-section');
    const user = userManager.getCurrentUser();
    if (!user) return;
    const bookings = bookingManager.getBookingsByUser(user.id);

    section.innerHTML = `
        <div class="flex justify-between items-center mb-10">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-slate-900 leading-tight">My Training Schedule</h2>
                <p class="text-sm text-slate-400 font-medium">Your active passes and session history</p>
            </div>
            <button onclick="showSection('new-booking')" class="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 hover:-translate-y-1">
                <i data-lucide="plus-circle" class="w-5 h-5"></i>
                New Booking
            </button>
        </div>
        <div class="grid gap-8">
            ${bookings.length === 0 ? `
                <div class="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i data-lucide="calendar" class="w-10 h-10 text-slate-200"></i>
                    </div>
                    <p class="text-slate-900 font-bold text-xl mb-2">No Active Training Passes</p>
                    <p class="text-slate-400 text-sm mb-8 max-w-xs mx-auto">Start your journey at Dribble Ground by booking your first session.</p>
                    <button onclick="showSection('new-booking')" class="px-8 py-3 bg-primary text-black rounded-xl font-bold hover:scale-105 transition-transform">Book Now</button>
                </div>
            ` : bookings.map(booking => `
                <div class="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 -mr-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-colors"></div>
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                        <div class="flex items-center gap-6">
                            <div class="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-primary transition-all rotate-3 group-hover:rotate-0 shadow-inner">
                                <i data-lucide="basketball" class="w-8 h-8 text-slate-400 group-hover:text-black transition-colors"></i>
                            </div>
                            <div>
                                <h3 class="font-black text-xl text-slate-900 uppercase tracking-tighter leading-none mb-2">${booking.type} Pass</h3>
                                <p class="text-sm text-slate-500 font-medium">${new Date(booking.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} • ${booking.players} Athletes</p>
                                <div class="flex items-center gap-3 mt-4">
                                    <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'}">
                                        ${booking.status}
                                    </span>
                                    <span class="text-[10px] text-slate-300 font-black tracking-widest uppercase">ID: ${booking.id}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col md:text-right border-t md:border-t-0 border-slate-50 pt-6 md:pt-0">
                            <p class="text-3xl font-black text-slate-900 leading-none mb-1">${Utils.formatCurrency(booking.amount)}</p>
                            <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest">Payment Confirmed</p>
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
    console.log('Templates loaded:', templates.length);

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


function renderAdminUsers() {
    const section = document.getElementById('admin-section');
    const users = userManager.getAllUsers();

    section.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <h2 class="text-3xl font-display font-bold uppercase tracking-tight text-neutral-900">Student Directory</h2>
                <p class="text-sm text-neutral-400 font-medium">Manage and monitor all registered athletes in the system</p>
            </div>
            <button onclick="showAddUserModal()" class="bg-slate-900 text-white px-8 py-4 rounded-[1.25rem] font-bold flex items-center gap-3 hover:bg-black transition-all shadow-lg hover:-translate-y-1 active:translate-y-0">
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
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Trust Score</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400">Account Role</th>
                            <th class="px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${users.map(user => `
                            <tr class="hover:bg-slate-50 transition-colors group">
                                <td class="px-8 py-6">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-slate-900 shadow-sm capitalize border-2 border-white group-hover:bg-primary transition-all relative">
                                            ${user.name.charAt(0)}
                                            ${user.verified ? `
                                                <div class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white text-white">
                                                    <i data-lucide="check" class="w-3 h-3"></i>
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div>
                                            <p class="font-bold text-slate-900 text-lg leading-none">${user.name}</p>
                                            <p class="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase mt-1.5">Athlete Member</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <p class="text-sm font-bold text-slate-700">${user.email}</p>
                                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">${user.phone || 'PHONE NOT PROVIDED'}</p>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="flex items-center gap-3">
                                        <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.verified ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}">
                                            ${user.verified ? 'Verified' : 'Unverified'}
                                        </span>
                                        <button onclick="toggleUserVerification('${user.id}')" class="text-xs font-bold text-slate-400 hover:text-primary-dark underline decoration-2 underline-offset-4">
                                            ${user.verified ? 'Revoke' : 'Verify Now'}
                                        </button>
                                    </div>
                                </td>
                                <td class="px-8 py-6">
                                    <div class="inline-flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 rounded-full">
                                        <div class="w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-orange-500' : 'bg-blue-500'}"></div>
                                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-700">${user.role}</span>
                                    </div>
                                </td>
                                <td class="px-8 py-6 text-right">
                                    <div class="flex items-center justify-end gap-3">
                                        <button onclick="showUpdateUserModal('${user.id}')" class="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm" title="Edit student">
                                            <i data-lucide="edit-3" class="w-5 h-5"></i>
                                        </button>
                                        <button onclick="deleteUser('${user.id}')" class="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Remove student">
                                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                                        </button>
                                    </div>
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

function showUpdateUserModal(userId) {
    const user = userManager.getAllUsers().find(u => u.id === userId);
    if (!user) return;

    const newName = prompt('Enter New Name:', user.name);
    if (newName === null) return;

    const newEmail = prompt('Enter New Email:', user.email);
    if (newEmail === null) return;

    const newRole = prompt('Enter Role (user/admin):', user.role);
    if (newRole === null) return;

    const result = userManager.updateUser(userId, {
        name: newName,
        email: newEmail,
        role: newRole
    });

    if (result.success) {
        Utils.showToast('Student profile updated successfully', 'success');
        renderAdminUsers();
        if (userId === userManager.getCurrentUser()?.id) {
            location.reload(); // Refresh if updating currently logged in user
        }
    } else {
        Utils.showToast(result.error, 'error');
    }
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

function confirmPayment() {
    const user = userManager.getCurrentUser();
    if (!user) {
        window.location.href = 'signin.html';
        return;
    }

    const result = bookingManager.createBooking({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        type: bookingState.type,
        month: bookingState.month,
        players: bookingState.players
    });

    if (!result.success) {
        Utils.showToast(result.error, 'error');
        return;
    }

    // Auto-confirm since we removed transaction ID entry
    bookingManager.confirmPayment(result.booking.id, 'MANUAL_VERIFICATION_PENDING');

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
    Utils.showToast('Booking processing... Redirecting for verification', 'info');

    // Automatically trigger WhatsApp redirection after a short delay
    setTimeout(() => {
        sendWhatsAppConfirmation();
    }, 2000);
}

// --- Admin Helper Functions ---

function deleteUser(userId) {
    if (confirm('Permanently remove this student record? This action cannot be undone.')) {
        const result = userManager.deleteUser(userId);
        if (result.success) {
            Utils.showToast('Student record removed successfully', 'success');
            renderAdminUsers();
        } else {
            Utils.showToast(result.error, 'error');
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

function showUpdateUserModal(userId) {
    const user = userManager.getUserById(userId);
    if (!user) return;

    document.getElementById('modalTitle').textContent = 'Update Athlete';
    document.getElementById('modalUserId').value = user.id;
    document.getElementById('modalUserName').value = user.name;
    document.getElementById('modalUserEmail').value = user.email;
    document.getElementById('modalUserPassword').value = user.password;
    document.getElementById('userModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function hideUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

function saveUserFromModal() {
    const userId = document.getElementById('modalUserId').value;
    const name = document.getElementById('modalUserName').value;
    const email = document.getElementById('modalUserEmail').value;
    const password = document.getElementById('modalUserPassword').value;

    if (!name || !email || !password) {
        Utils.showToast('Please fill all fields', 'warning');
        return;
    }

    let result;
    if (userId) {
        // Update existing user
        result = userManager.updateProfile(userId, { name, email, password });
    } else {
        // Register new user
        result = userManager.register({ name, email, password });
    }

    if (result.success) {
        Utils.showToast(userId ? 'Student record updated' : 'Student registered successfully', 'success');
        hideUserModal();
        renderAdminUsers();
    } else {
        Utils.showToast(result.error, 'error');
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

function toggleUserVerification(userId) {
    const user = userManager.getUserById(userId);
    if (!user) return;

    const newStatus = !user.verified;
    const result = userManager.updateProfile(userId, { verified: newStatus });

    if (result.success) {
        Utils.showToast(`User ${newStatus ? 'Verified' : 'Unverified'} Successfully`, 'success');
        renderAdminUsers();
    } else {
        Utils.showToast(result.error, 'error');
    }
}

function sendWhatsAppConfirmation() {
    const user = window.userManager.getCurrentUser();
    const bookingId = document.getElementById('confirmBookingId').textContent;
    const amount = document.getElementById('confirmAmount').textContent;
    const type = document.getElementById('confirmType').textContent;

    const message = `Hello Academy Admin, I have completed the payment for my Dribble Ground Training.%0A%0A*Reference:* ${bookingId}%0A*Athlete:* ${user.name}%0A*Package:* ${type}%0A*Amount:* ${amount}%0A%0APlease verify my transaction.`;

    const whatsappUrl = `https://wa.me/918084970887?text=${message}`;
    window.open(whatsappUrl, '_blank');
}
