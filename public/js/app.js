// Basketball Booking System - Frontend JavaScript

// Global variables
let currentUser = null;
let authToken = null;
let courts = [];
let bookings = [];
let selectedCourt = null;

// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadCourts();
    loadDocuments();
    
    // Setup form handlers
    setupFormHandlers();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Check authentication status
function checkAuthStatus() {
    authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (authToken && userData) {
        currentUser = JSON.parse(userData);
        updateUserUI();
    } else {
        updateAuthButtons();
    }
}

// Update user UI
function updateUserUI() {
    document.getElementById('auth-buttons').classList.add('hidden');
    document.getElementById('user-menu').classList.remove('hidden');
    document.getElementById('user-menu').classList.add('flex');
    
    document.getElementById('user-name').textContent = currentUser.name;
    
    if (currentUser.role === 'admin') {
        document.getElementById('admin-btn').classList.remove('hidden');
    }
    
    loadUserBookings();
    if (currentUser.role === 'admin') {
        loadAdminDashboard();
    }
}

// Update auth buttons
function updateAuthButtons() {
    document.getElementById('auth-buttons').classList.remove('hidden');
    document.getElementById('user-menu').classList.add('hidden');
}

// Setup form handlers
function setupFormHandlers() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            showLoader();
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                authToken = data.token;
                currentUser = data.user;
                
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('userData', JSON.stringify(currentUser));
                
                updateUserUI();
                hideModals();
                showToast('Login successful!', 'success');
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            hideLoader();
        }
    });
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        
        try {
            showLoader();
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, phone, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentUser = data.user;
                
                localStorage.setItem('userData', JSON.stringify(currentUser));
                
                updateUserUI();
                hideModals();
                showToast('Registration successful!', 'success');
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            hideLoader();
        }
    });
}

// Load courts
async function loadCourts() {
    try {
        const response = await fetch(`${API_BASE}/courts`);
        const data = await response.json();
        courts = data.courts;
        
        const grid = document.getElementById('courts-grid');
        grid.innerHTML = courts.map(court => `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onclick="selectCourt('${court.id}')">
                <div class="h-48 bg-gray-200 flex items-center justify-center">
                    <i data-lucide="map-pin" class="w-16 h-16 text-gray-400"></i>
                </div>
                <div class="p-6">
                    <h3 class="font-display text-xl uppercase mb-2">${court.name}</h3>
                    <p class="text-gray-600 mb-4">${court.description}</p>
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-sm">
                            <i data-lucide="map-pin" class="w-4 h-4 text-gray-500"></i>
                            <span>${court.location}</span>
                        </div>
                        <div class="flex items-center gap-2 text-sm">
                            <i data-lucide="users" class="w-4 h-4 text-gray-500"></i>
                            <span>Capacity: ${court.capacity}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-sm">
                                <i data-lucide="clock" class="w-4 h-4 text-gray-500"></i>
                                <span>₹${court.pricePerHour}/hour</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        showToast('Failed to load courts', 'error');
    }
}

// Select court for booking
function selectCourt(courtId) {
    selectedCourt = courts.find(c => c.id === courtId);
    location.href = '#booking';
    loadBookingForm();
}

// Load booking form
function loadBookingForm() {
    const form = document.getElementById('booking-form');
    
    if (!currentUser) {
        form.innerHTML = `
            <div class="text-center py-12">
                <i data-lucide="lock" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                <h3 class="font-display text-2xl uppercase mb-2">Login Required</h3>
                <p class="text-gray-600 mb-6">Please login to book a court</p>
                <button onclick="showLogin()" class="px-6 py-3 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors">
                    Login Now
                </button>
            </div>
        `;
        return;
    }
    
    if (!selectedCourt) {
        form.innerHTML = `
            <div class="text-center py-12">
                <i data-lucide="calendar" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                <h3 class="font-display text-2xl uppercase mb-2">Select a Court</h3>
                <p class="text-gray-600 mb-6">Please select a court from the courts section first</p>
                <button onclick="location.href='#courts'" class="px-6 py-3 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors">
                    View Courts
                </button>
            </div>
        `;
        return;
    }
    
    form.innerHTML = `
        <div class="mb-6">
            <h3 class="font-display text-2xl uppercase mb-2">${selectedCourt.name}</h3>
            <p class="text-gray-600">${selectedCourt.description}</p>
        </div>
        
        <form id="booking-submit-form" class="space-y-6">
            <div class="grid md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Date</label>
                    <input type="date" id="booking-date" class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-yellow-500" required>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Time Slot</label>
                    <select id="booking-time" class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-yellow-500" required>
                        <option value="">Select time</option>
                    </select>
                </div>
            </div>
            
            <div class="grid md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Start Time</label>
                    <select id="start-time" class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-yellow-500" required>
                        <option value="">Select start time</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">End Time</label>
                    <select id="end-time" class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-yellow-500" required>
                        <option value="">Select end time</option>
                    </select>
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-600">Rate:</span>
                    <span class="font-medium">₹${selectedCourt.pricePerHour}/hour</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="font-bold">Total:</span>
                    <span id="total-price" class="font-bold text-xl text-yellow-600">₹0</span>
                </div>
            </div>
            
            <button type="submit" class="w-full bg-yellow-500 text-black py-4 rounded-lg font-medium hover:bg-yellow-400 transition-colors">
                Book Now
            </button>
        </form>
    `;
    
    // Setup time slots
    setupTimeSlots();
    
    // Setup booking form handler
    document.getElementById('booking-submit-form').addEventListener('submit', handleBookingSubmit);
}

// Setup time slots
function setupTimeSlots() {
    const startTime = document.getElementById('start-time');
    const endTime = document.getElementById('end-time');
    
    // Generate time slots from 6 AM to 10 PM
    for (let hour = 6; hour <= 22; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        
        const startOption = document.createElement('option');
        startOption.value = time;
        startOption.textContent = time;
        startTime.appendChild(startOption);
        
        if (hour > 6) {
            const endOption = document.createElement('option');
            endOption.value = time;
            endOption.textContent = time;
            endTime.appendChild(endOption);
        }
    }
    
    // Add change handlers
    startTime.addEventListener('change', calculatePrice);
    endTime.addEventListener('change', calculatePrice);
}

// Calculate price
function calculatePrice() {
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    
    if (startTime && endTime && selectedCourt) {
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);
        const hours = Math.max(1, endHour - startHour);
        const total = hours * selectedCourt.pricePerHour;
        
        document.getElementById('total-price').textContent = `₹${total}`;
    }
}

// Handle booking submit
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const date = document.getElementById('booking-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    
    if (!date || !startTime || !endTime) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    try {
        showLoader();
        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                courtId: selectedCourt.id,
                date,
                startTime,
                endTime
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Booking created successfully!', 'success');
            // Reset form
            document.getElementById('booking-submit-form').reset();
            // Refresh bookings
            loadUserBookings();
        } else {
            showToast(data.error || 'Booking failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoader();
    }
}

// Load user bookings
async function loadUserBookings() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/bookings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        bookings = data.bookings;
        
        displayBookings();
    } catch (error) {
        console.error('Failed to load bookings:', error);
    }
}

// Display bookings
function displayBookings() {
    const list = document.getElementById('bookings-list');
    
    if (!bookings || bookings.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12">
                <i data-lucide="calendar-x" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                <h3 class="font-display text-2xl uppercase mb-2">No Bookings Yet</h3>
                <p class="text-gray-600">Book your first court to get started!</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = bookings.map(booking => {
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        
        const statusClass = statusColors[booking.status] || 'bg-gray-100 text-gray-800';
        
        return `
            <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="calendar" class="w-6 h-6 text-gray-600"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-lg">${booking.court ? booking.court.name : 'Unknown Court'}</h4>
                            <p class="text-gray-600">${booking.date} • ${booking.startTime} - ${booking.endTime}</p>
                            <p class="text-sm text-gray-500">${booking.court ? booking.court.location : ''}</p>
                        </div>
                    </div>
                    
                    <div class="text-right">
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${statusClass}">
                            ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        <p class="font-bold text-lg mt-2">₹${booking.totalPrice}</p>
                        
                        ${booking.status === 'pending' ? `
                            <button onclick="cancelBooking('${booking.id}')" class="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors">
                                Cancel
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Booking cancelled successfully', 'success');
            loadUserBookings();
        } else {
            showToast(data.error || 'Failed to cancel booking', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        const stats = data.stats;
        
        const content = document.getElementById('admin-content');
        content.innerHTML = `
            <div class="md:col-span-4">
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center gap-3 mb-4">
                        <i data-lucide="calendar" class="w-8 h-8 text-yellow-500"></i>
                        <h3 class="text-xl font-bold">Total Bookings</h3>
                    </div>
                    <div class="text-3xl font-bold text-yellow-500">${stats.totalBookings}</div>
                    <div class="text-sm text-gray-400 mt-2">All time bookings</div>
                </div>
            </div>
            
            <div class="md:col-span-4">
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center gap-3 mb-4">
                        <i data-lucide="check-circle" class="w-8 h-8 text-green-500"></i>
                        <h3 class="text-xl font-bold">Confirmed</h3>
                    </div>
                    <div class="text-3xl font-bold text-green-500">${stats.confirmedBookings}</div>
                    <div class="text-sm text-gray-400 mt-2">Confirmed bookings</div>
                </div>
            </div>
            
            <div class="md:col-span-4">
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center gap-3 mb-4">
                        <i data-lucide="clock" class="w-8 h-8 text-yellow-500"></i>
                        <h3 class="text-xl font-bold">Pending</h3>
                    </div>
                    <div class="text-3xl font-bold text-yellow-500">${stats.pendingBookings}</div>
                    <div class="text-sm text-gray-400 mt-2">Pending confirmation</div>
                </div>
            </div>
            
            <div class="md:col-span-4">
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div class="flex items-center gap-3 mb-4">
                        <i data-lucide="indian-rupee" class="w-8 h-8 text-green-500"></i>
                        <h3 class="text-xl font-bold">Revenue</h3>
                    </div>
                    <div class="text-3xl font-bold text-green-500">₹${stats.totalRevenue.toLocaleString()}</div>
                    <div class="text-sm text-gray-400 mt-2">Total revenue</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
    }
}

// Load documents
function loadDocuments() {
    const documents = [
        {
            title: 'Player Registration Form',
            category: 'Registration',
            icon: 'user-plus',
            description: 'Complete form for new players'
        },
        {
            title: 'Code of Conduct',
            category: 'Policy',
            icon: 'book',
            description: 'Rules and guidelines for players'
        },
        {
            title: 'Emergency Contact Form',
            category: 'Emergency',
            icon: 'phone',
            description: 'Emergency contact information'
        },
        {
            title: 'Medical Fitness Certificate',
            category: 'Medical',
            icon: 'heart',
            description: 'Medical clearance form'
        },
        {
            title: 'Equipment Requirements',
            category: 'Requirements',
            icon: 'package',
            description: 'What to bring and what we provide'
        },
        {
            title: 'Training Schedule',
            category: 'Schedule',
            icon: 'calendar-clock',
            description: 'Available training times'
        }
    ];
    
    const grid = document.getElementById('documents-grid');
    grid.innerHTML = documents.map(doc => `
        <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i data-lucide="${doc.icon}" class="w-6 h-6 text-yellow-600"></i>
                </div>
                <div>
                    <span class="text-xs text-gray-500 uppercase tracking-wide">${doc.category}</span>
                    <h4 class="font-bold">${doc.title}</h4>
                </div>
            </div>
            <p class="text-gray-600 mb-4">${doc.description}</p>
            <button onclick="downloadDocument('${doc.title}')" class="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                Download PDF
            </button>
        </div>
    `).join('');
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Download document
function downloadDocument(title) {
    showToast(`Downloading ${title}...`, 'info');
    // In a real app, this would download an actual PDF
    setTimeout(() => {
        showToast(`${title} downloaded successfully!`, 'success');
    }, 1500);
}

// Utility functions
function showLogin() {
    hideModals();
    document.getElementById('login-modal').classList.remove('hidden');
}

function showRegister() {
    hideModals();
    document.getElementById('register-modal').classList.remove('hidden');
}

function hideModals() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('register-modal').classList.add('hidden');
}

function logout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    // Call logout API
    fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    }).finally(() => {
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // Reset globals
        currentUser = null;
        authToken = null;
        bookings = [];
        
        // Update UI
        updateAuthButtons();
        location.href = '#home';
        showToast('Logged out successfully', 'success');
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-black'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${colors[type]} px-6 py-3 rounded-lg shadow-lg mb-2 flex items-center gap-2`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}" class="w-5 h-5"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoader() {
    // Show loading indicator
    document.body.style.cursor = 'wait';
}

function hideLoader() {
    // Hide loading indicator
    document.body.style.cursor = 'default';
}

// Handle navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = this.getAttribute('href').substring(1);
        const element = document.getElementById(target);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    });
});