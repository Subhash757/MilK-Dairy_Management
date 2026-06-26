// --- REST API Integration (Replaces Socket.io for Vercel) ---
let localMembers = [];
let localTransactions = [];
let isInitialLoad = true;

window.fetchServerData = async function() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Detect new activity (for toast notification)
        if (!isInitialLoad && localTransactions.length < data.transactions.length) {
            const newTransactions = data.transactions.slice(localTransactions.length);
            newTransactions.forEach(t => {
                const member = data.members.find(m => m.id === t.memberId);
                const memberName = member ? member.name : 'A member';
                showToast(`New Activity: ${memberName} deposited ${t.quantity}L`);
            });
        }
        
        localMembers = data.members || [];
        localTransactions = data.transactions || [];
        localStorage.setItem('milkDairy_members', JSON.stringify(localMembers));
        localStorage.setItem('milkDairy_transactions', JSON.stringify(localTransactions));
        
        if (currentUser && currentUser.role === 'admin') loadAdminDashboard();
        else if (currentUser && currentUser.role === 'customer') loadCustomerDashboard();
        
        isInitialLoad = false;
    } catch (error) {
        console.error("Failed to fetch data from server", error);
    }
}

// Initial fetch and set polling
fetchServerData();
setInterval(fetchServerData, 5000); // Poll every 5 seconds

// Helpers
const getMembers = () => localMembers.length > 0 ? localMembers : JSON.parse(localStorage.getItem('milkDairy_members') || '[]');
const getTransactions = () => localTransactions.length > 0 ? localTransactions : JSON.parse(localStorage.getItem('milkDairy_transactions') || '[]');
const saveMembers = (members) => { /* Managed by server */ };
const saveTransactions = (transactions) => { /* Managed by server */ };

// Current Session
let currentUser = null; // { role: 'admin' | 'customer', id: 'CUST-XXX' }

// --- DOM Elements ---

// Screens
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const customerSection = document.getElementById('customer-section');
const navbar = document.getElementById('navbar');
const navUserName = document.getElementById('nav-user-name');

// Login Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const loginForms = document.querySelectorAll('.login-form');
const customerLoginForm = document.getElementById('customer-login');
const adminLoginForm = document.getElementById('admin-login');
const registerForm = document.getElementById('register-form');
const otpForm = document.getElementById('otp-form');
const btnBackLogin = document.getElementById('btn-back-login');

// Buttons
const logoutBtn = document.getElementById('logout-btn');

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkSession();
    setupEventListeners();
    
    // Firebase Recaptcha removed
});

// --- Theme Logic ---
let themeToggleBtn = null;

function initTheme() {
    themeToggleBtn = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('milkDairy_theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if(themeToggleBtn) updateThemeIcon(currentTheme);
}

function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    if (theme === 'dark') {
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Listen for cross-tab storage changes (Real-Time Sync)
    window.addEventListener('storage', (e) => {
        if (e.key === 'milkDairy_transactions' || e.key === 'milkDairy_members') {
            if (currentUser && currentUser.role === 'admin') {
                loadAdminDashboard();
            } else if (currentUser && currentUser.role === 'customer') {
                loadCustomerDashboard();
            }
        }
    });

    // Theme Toggle
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            let theme = document.documentElement.getAttribute('data-theme');
            theme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('milkDairy_theme', theme);
            updateThemeIcon(theme);
            
            if (currentUser && currentUser.role === 'admin') {
                updateAnalytics(); // Re-render charts with new theme colors
            }
        });
    }

    // Login Tabs Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            loginForms.forEach(f => f.classList.remove('active'));
            
            // Add active to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Login Forms & Registration
    customerLoginForm.addEventListener('submit', handleRequestOTP);
    otpForm.addEventListener('submit', handleVerifyOTP);
    registerForm.addEventListener('submit', handleRegister);
    adminLoginForm.addEventListener('submit', handleAdminLogin);
    logoutBtn.addEventListener('click', handleLogout);

    // Back from OTP to Phone input
    btnBackLogin.addEventListener('click', () => {
        otpForm.classList.remove('active');
        customerLoginForm.classList.add('active');
    });

    // Admin Actions
    document.getElementById('btn-show-add-member').addEventListener('click', () => openModal('modal-add-member'));
    document.getElementById('btn-show-add-milk').addEventListener('click', () => {
        populateMemberSelect();
        openModal('modal-add-milk');
    });
    document.getElementById('btn-upload-doc').addEventListener('click', () => openModal('modal-upload-doc'));

    // Modals Close
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').classList.remove('active');
        });
    });

    // Form Submits
    document.getElementById('form-add-member').addEventListener('submit', handleAddMember);
    document.getElementById('form-add-milk').addEventListener('submit', handleAddMilkEntry);

    // Milk Entry Calculator
    const milkQty = document.getElementById('milk-quantity');
    const milkRate = document.getElementById('milk-rate');
    const totalAmountSpan = document.getElementById('milk-total-amount');

    const calcTotal = () => {
        const qty = parseFloat(milkQty.value) || 0;
        const rate = parseFloat(milkRate.value) || 0;
        totalAmountSpan.innerText = `₹${(qty * rate).toFixed(2)}`;
    };
    milkQty.addEventListener('input', calcTotal);
    milkRate.addEventListener('input', calcTotal);

    // Search Member
    document.getElementById('member-search').addEventListener('input', (e) => {
        renderAdminMembers(e.target.value);
    });

    // Document Upload Mock
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if(fileInput.files.length > 0) {
            document.getElementById('upload-status').classList.remove('hidden');
            setTimeout(() => {
                closeModal('modal-upload-doc');
                document.getElementById('upload-status').classList.add('hidden');
                showToast('Document uploaded successfully!');
            }, 1500);
        }
    });
}

// --- Authentication Logic ---

let tempLoginPhone = '';

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    
    const members = getMembers();
    
    // Check if phone already exists
    if(members.find(m => m.phone === phone)) {
        showToast('Phone number is already registered!');
        return;
    }

    // Generate ID e.g., CUST-002
    const nextIdNum = members.length > 0 ? 
        Math.max(...members.map(m => parseInt(m.id.split('-')[1]))) + 1 : 1;
    const newId = `CUST-${nextIdNum.toString().padStart(3, '0')}`;

    const newMember = {
        id: newId,
        name,
        phone,
        totalMilk: 0,
        balance: 0
    };

    fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
    }).then(res => res.json()).then(data => {
        if(data.success) {
            e.target.reset();
            showToast(`Registration successful! You can now login.`);
            fetchServerData();
            document.querySelector('[data-target="customer-login"]').click();
        }
    }).catch(err => {
        console.error(err);
        showToast('Registration failed');
    });
}

async function handleRequestOTP(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('login-phone').value.trim();
    const members = getMembers();
    
    const member = members.find(m => m.phone === phoneInput);
    if (member) {
        tempLoginPhone = phoneInput;

        showToast('Sending OTP...');
        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phoneInput })
            });
            
            const data = await response.json();

            if (data.success) {
                // Switch forms
                customerLoginForm.classList.remove('active');
                otpForm.classList.add('active');
                
                if (data.mockOtp) {
                    document.getElementById('login-otp').value = data.mockOtp;
                    showToast(`Mock OTP Auto-filled: ${data.mockOtp}`);
                } else {
                    showToast(`OTP sent successfully to ${phoneInput}`);
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error("OTP Send Error:", error);
            showToast(error.message || 'Failed to connect to backend server. Make sure it is running.');
        }
    } else {
        showToast('Number not registered. Please register first.');
    }
}

async function handleVerifyOTP(e) {
    e.preventDefault();
    const enteredOTP = document.getElementById('login-otp').value.trim();
    
    try {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: tempLoginPhone, otp: enteredOTP })
        });
        
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Invalid OTP");
        }
        
        // Successful login
        const members = getMembers();
        const member = members.find(m => m.phone === tempLoginPhone);
        
        currentUser = { role: 'customer', id: member.id, name: member.name };
        sessionStorage.setItem('milkDairy_session', JSON.stringify(currentUser));
        
        showToast(`Welcome back, ${member.name}`);
        switchScreen('customer');
        
        // Reset forms
        otpForm.classList.remove('active');
        customerLoginForm.classList.add('active');
        document.getElementById('login-otp').value = '';
        document.getElementById('login-phone').value = '';
    } catch (error) {
        console.error("Verify Error:", error);
        showToast(error.message || 'Invalid OTP! Please try again.');
    }
}

function handleAdminLogin(e) {
    e.preventDefault();
    const passcode = document.getElementById('admin-passcode').value;
    if (passcode === 'admin123') {
        currentUser = { role: 'admin', name: 'Administrator' };
        sessionStorage.setItem('milkDairy_session', JSON.stringify(currentUser));
        showToast('Admin logged in successfully');
        switchScreen('admin');
    } else {
        showToast('Incorrect Admin Passcode');
    }
}

function handleLogout() {
    sessionStorage.removeItem('milkDairy_session');
    currentUser = null;
    document.getElementById('customer-login').reset();
    document.getElementById('admin-login').reset();
    switchScreen('login');
    showToast('Logged out successfully');
}

function checkSession() {
    const session = sessionStorage.getItem('milkDairy_session');
    if (session) {
        currentUser = JSON.parse(session);
        switchScreen(currentUser.role);
    } else {
        switchScreen('login');
    }
}

// --- Screen Management ---

function switchScreen(screen) {
    // Hide all
    loginSection.classList.remove('active');
    adminSection.classList.remove('active');
    customerSection.classList.remove('active');
    loginSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    customerSection.classList.add('hidden');
    navbar.classList.add('hidden');

    if (screen === 'login') {
        loginSection.classList.remove('hidden');
        loginSection.classList.add('active');
    } else {
        navbar.classList.remove('hidden');
        navUserName.innerText = `Welcome, ${currentUser.name}`;
        
        if (screen === 'admin') {
            adminSection.classList.remove('hidden');
            adminSection.classList.add('active');
            loadAdminDashboard();
        } else if (screen === 'customer') {
            customerSection.classList.remove('hidden');
            customerSection.classList.add('active');
            loadCustomerDashboard();
        }
    }
}

// --- Admin Dashboard Logic ---

function loadAdminDashboard() {
    const members = getMembers();
    const transactions = getTransactions();
    
    // Calculate stats
    const today = new Date().toLocaleDateString();
    let todayMilk = 0;
    let todayPayout = 0;

    transactions.forEach(t => {
        if (t.date === today) {
            todayMilk += parseFloat(t.quantity);
            todayPayout += parseFloat(t.amount);
        }
    });

    document.getElementById('admin-total-members').innerText = members.length;
    document.getElementById('admin-today-milk').innerText = todayMilk.toFixed(1);
    document.getElementById('admin-today-payout').innerText = `₹${todayPayout.toFixed(2)}`;

    renderAdminMembers();
    updateAnalytics();
}

// --- Real-Time Analytics Logic ---
let collectionChartInstance = null;
let farmersChartInstance = null;

if (window.Chart) {
    Chart.defaults.font.family = 'Inter, sans-serif';
}

function updateAnalytics() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = theme === 'dark';
    
    if (window.Chart) {
        Chart.defaults.color = isDark ? '#94A3B8' : '#8B7E74';
    }

    const lineColor = isDark ? '#4F46E5' : '#8C5C38';
    const lineBg = isDark ? 'rgba(79, 70, 229, 0.1)' : 'rgba(140, 92, 56, 0.1)';
    const doughnutColors = isDark 
        ? ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
        : ['#8C5C38', '#D4A373', '#A67C52', '#EFE0D1', '#754B2D'];

    const transactions = getTransactions();
    const members = getMembers();
    
    // 1. Process Data for Daily Collection Trend (Last 7 Days)
    const dates = [];
    const milkData = [];
    
    // Generate last 7 days strings
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toLocaleDateString());
        milkData.push(0);
    }
    
    transactions.forEach(t => {
        const idx = dates.indexOf(t.date);
        if(idx !== -1) {
            milkData[idx] += parseFloat(t.quantity);
        }
    });

    const ctx1 = document.getElementById('collection-chart');
    if (ctx1 && window.Chart) {
        if (collectionChartInstance) collectionChartInstance.destroy();
        collectionChartInstance = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Milk Collected (L)',
                    data: milkData,
                    borderColor: lineColor,
                    backgroundColor: lineBg,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 2. Process Data for Top Farmers Doughnut Chart
    // Sort members by totalMilk
    const sortedFarmers = [...members].sort((a,b) => b.totalMilk - a.totalMilk).slice(0, 5);
    const farmerNames = sortedFarmers.map(m => m.name.split(' ')[0]);
    const farmerMilk = sortedFarmers.map(m => m.totalMilk);

    const ctx2 = document.getElementById('farmers-chart');
    if (ctx2 && window.Chart) {
        if (farmersChartInstance) farmersChartInstance.destroy();
        farmersChartInstance = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: farmerNames,
                datasets: [{
                    data: farmerMilk,
                    backgroundColor: doughnutColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' }
                },
                cutout: '70%'
            }
        });
    }

    // 3. Update Activity Feed
    const feedContainer = document.getElementById('activity-feed');
    if (feedContainer) {
        feedContainer.innerHTML = '';
        // Get last 20 transactions
        const recentTx = [...transactions].reverse().slice(0, 20);
        
        if (recentTx.length === 0) {
            feedContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No activity yet.</p>';
        } else {
            recentTx.forEach((t, index) => {
                const member = members.find(m => m.id === t.memberId);
                const memberName = member ? member.name : 'Unknown';
                // Highlight the very latest one across tabs for a real-time feel
                const isNew = index === 0 && (Date.now() - t.id < 5000); 
                
                const div = document.createElement('div');
                div.className = `activity-item ${isNew ? 'new' : ''}`;
                div.innerHTML = `
                    <div class="activity-item-header">
                        <strong>${memberName}</strong>
                        <span class="activity-item-time">${t.date} ${t.time}</span>
                    </div>
                    <div class="activity-item-body">
                        Deposited <span>${parseFloat(t.quantity).toFixed(1)} L</span> milk
                    </div>
                `;
                feedContainer.appendChild(div);
            });
        }
    }
}

function renderAdminMembers(searchTerm = '') {
    const members = getMembers();
    const tbody = document.getElementById('members-list-body');
    tbody.innerHTML = '';

    const filtered = members.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No members found</td></tr>`;
        return;
    }

    filtered.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.id}</strong></td>
            <td>${m.name}</td>
            <td>${m.phone}</td>
            <td>${m.totalMilk.toFixed(1)} L</td>
            <td style="color: var(--secondary); font-weight: 600;">₹${m.balance.toFixed(2)}</td>
            <td>
                <button class="btn btn-outline" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="viewMemberHistory('${m.id}')">
                    <i class="fa-solid fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleAddMember(e) {
    e.preventDefault();
    const name = document.getElementById('new-member-name').value.trim();
    const phone = document.getElementById('new-member-phone').value.trim();
    
    const members = getMembers();
    // Generate ID e.g., CUST-002
    const nextIdNum = members.length > 0 ? 
        Math.max(...members.map(m => parseInt(m.id.split('-')[1]))) + 1 : 1;
    const newId = `CUST-${nextIdNum.toString().padStart(3, '0')}`;

    const newMember = {
        id: newId,
        name,
        phone,
        totalMilk: 0,
        balance: 0
    };

    fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
    }).then(res => res.json()).then(data => {
        if(data.success) {
            closeModal('modal-add-member');
            e.target.reset();
            showToast(`Member added successfully: ${newId}`);
            fetchServerData();
        }
    }).catch(err => {
        console.error(err);
        showToast('Failed to add member');
    });
}

function populateMemberSelect() {
    const members = getMembers();
    const select = document.getElementById('milk-member-select');
    select.innerHTML = '<option value="">-- Select Farmer --</option>';
    members.forEach(m => {
        select.innerHTML += `<option value="${m.id}">${m.name} (${m.id})</option>`;
    });
}

function handleAddMilkEntry(e) {
    e.preventDefault();
    const memberId = document.getElementById('milk-member-select').value;
    const quantity = parseFloat(document.getElementById('milk-quantity').value);
    const rate = parseFloat(document.getElementById('milk-rate').value);
    
    if(!memberId) {
        showToast('Please select a member');
        return;
    }

    const amount = quantity * rate;
    const now = new Date();
    
    const transaction = {
        id: Date.now(),
        memberId,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        quantity,
        rate,
        amount
    };

    // Save transaction via REST API
    fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
    }).then(res => res.json()).then(data => {
        if(data.success) {
            closeModal('modal-add-milk');
            e.target.reset();
            document.getElementById('milk-total-amount').innerText = '₹0.00';
            showToast('Milk entry added successfully');
            fetchServerData();
        }
    }).catch(err => {
        console.error(err);
        showToast('Failed to add milk entry');
    });
}

// Optional: Admin viewing a specific user's history
window.viewMemberHistory = function(memberId) {
    showToast(`Feature: View history for ${memberId}. Coming soon!`);
    // In a full app, this would open a modal with their transactions
}

// --- Customer Dashboard Logic ---

function loadCustomerDashboard() {
    const memberId = currentUser.id;
    const members = getMembers();
    const transactions = getTransactions();
    
    const member = members.find(m => m.id === memberId);
    if(!member) return;

    // Update Stats
    document.getElementById('cust-balance').innerText = `₹${member.balance.toFixed(2)}`;
    document.getElementById('cust-total-milk').innerText = `${member.totalMilk.toFixed(1)} L`;

    // Filter transactions
    const myTransactions = transactions.filter(t => t.memberId === memberId).reverse(); // Newest first

    const tbody = document.getElementById('customer-history-body');
    tbody.innerHTML = '';

    if(myTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No entries found</td></tr>`;
        return;
    }

    myTransactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.date}</td>
            <td><i class="fa-regular fa-clock" style="margin-right:5px; color:var(--text-muted);"></i>${t.time}</td>
            <td><strong>${t.quantity.toFixed(1)}</strong> L</td>
            <td style="color: var(--secondary); font-weight: 600;">₹${t.amount.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Utilities ---

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').innerText = message;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
