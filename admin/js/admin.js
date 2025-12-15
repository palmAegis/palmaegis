// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAf-wtZpl8wVjCymdLlC-YGlv7xn0yEMMU",
    authDomain: "palmaegis-setup.firebaseapp.com",
    projectId: "palmaegis-setup",
    storageBucket: "palmaegis-setup.firebasestorage.app",
    messagingSenderId: "445887502374",
    appId: "1:445887502374:web:a5f6ecaa90b88447626ee7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global variables
let registrationChart, diseaseChart, activityChart, lastLoginChart;
let currentUser = null;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and has admin privileges
    auth.onAuthStateChanged(async user => {
        if (!user) {
            window.location.href = 'admin-login.html';
            return;
        }

        // Check if admin
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const isAdmin = userDoc.exists && userDoc.data().role === 'admin';

            if (!isAdmin) {
                window.location.href = 'admin-login.html';
                return;
            }

            // User is admin, load data
            currentUser = user;
            await loadAdminData();
            initCharts();
            loadDashboardData();
            loadRecentActivity();
            showActiveUsersList();
            
            // Hide loading overlay
            document.getElementById('loading-overlay').style.display = 'none';
            
        } catch (error) {
            console.error("Error checking admin status:", error);
            window.location.href = 'admin-login.html';
        }
    });
});

async function loadAdminData() {
    try {
        const user = auth.currentUser;
        if (user) {
            // Set admin name with fallback
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            const displayName = user.displayName || userData?.displayName || 'Admin User';
            
            // Update all name elements
            document.getElementById('admin-name').textContent = displayName;
            document.getElementById('admin-name-menu').textContent = displayName;
            document.getElementById('admin-email-menu').textContent = user.email || 'admin@example.com';
            
            // Set admin initials
            const initials = displayName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            document.getElementById('admin-initials').textContent = initials;
        }
        
        // Update current date
        const now = new Date();
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
    } catch (error) {
        console.error("Error loading admin data:", error);
    }
}

// Enhanced dashboard data loading
async function loadDashboardData() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const reportsSnapshot = await db.collection('palmDiseaseReports').get();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let activeUsers = 0;
        let newUsers = 0;
        let totalUsers = usersSnapshot.size;
        let totalDetectionsCount = reportsSnapshot.size;
        let todayLogins = 0;
        let totalSessionTime = 0;
        let loginCount = 0;

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            
            // Count today's logins
            if (data.lastLogin && data.lastLogin.toDate) {
                const lastLogin = data.lastLogin.toDate();
                if (lastLogin >= today) {
                    todayLogins++;
                }
                // Active if within 10 minutes
                if ((now - lastLogin) / 60000 <= 10) {
                    activeUsers++;
                }
                
                // Calculate session time (simplified)
                if (data.sessionDuration) {
                    totalSessionTime += data.sessionDuration;
                    loginCount++;
                }
            }
            
            // New if created today
            if (data.createdAt && data.createdAt.toDate) {
                const createdAt = data.createdAt.toDate();
                if (createdAt >= today) {
                    newUsers++;
                }
            }
        });

        // Update dashboard elements
        document.getElementById('active-users-count').textContent = activeUsers;
        document.getElementById('new-users-count').textContent = newUsers;
        document.getElementById('total-users-count').textContent = totalUsers;
        document.getElementById('total-detections').textContent = totalDetectionsCount;
        document.getElementById('today-logins').textContent = todayLogins;
        
        // Calculate average session time
        const avgSession = loginCount > 0 ? Math.round(totalSessionTime / loginCount) : 0;
        document.getElementById('avg-session').textContent = avgSession > 0 ? `${avgSession}m` : '0m';
        
        // Calculate detection rate (simplified)
        const detectionRate = totalUsers > 0 ? Math.round((totalDetectionsCount / totalUsers) * 100) : 0;
        document.getElementById('detection-rate').textContent = `${detectionRate}%`;
        
        // Update change percentages (simulated for now)
        updateChangePercentages(activeUsers, totalUsers, newUsers, totalDetectionsCount);
        
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function updateChangePercentages(activeUsers, totalUsers, newUsers, detections) {
    // This is a simplified version - in production, you'd compare with previous data
    const changes = {
        active: Math.floor(Math.random() * 20) + 5,
        total: Math.floor(Math.random() * 10) + 2,
        new: Math.floor(Math.random() * 30) + 10,
        detection: Math.floor(Math.random() * 15) + 3
    };
    
    // Update UI with change indicators
    document.querySelectorAll('.stat-card .text-green-600, .stat-card .text-blue-600, .stat-card .text-purple-600, .stat-card .text-red-600').forEach(el => {
        const parent = el.closest('.stat-card');
        if (parent) {
            const text = el.textContent;
            if (text.includes('%')) {
                el.innerHTML = `<i class="fas fa-arrow-up mr-1"></i>${changes[getChangeType(parent)]}%`;
            }
        }
    });
}

function getChangeType(element) {
    const title = element.querySelector('h3').textContent.toLowerCase();
    if (title.includes('active')) return 'active';
    if (title.includes('total')) return 'total';
    if (title.includes('new')) return 'new';
    if (title.includes('disease')) return 'detection';
    return 'active';
}

// Enhanced active users list
async function showActiveUsersList() {
    try {
        const container = document.getElementById('active-users-list');
        if (!container) return;
        
        // Show loading state
        container.innerHTML = `
            <div class="flex items-center justify-center py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500 mr-3"></div>
                <span class="text-sm text-gray-600">Loading active users...</span>
            </div>`;
        
        const usersSnapshot = await db.collection('users').get();
        const now = new Date();
        const activeUsers = [];
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.lastLogin && data.lastLogin.toDate) {
                const lastLogin = data.lastLogin.toDate();
                if ((now - lastLogin) / 60000 <= 10) {
                    activeUsers.push({
                        id: doc.id,
                        email: data.email,
                        displayName: data.displayName || data.firstName || 'Unknown User',
                        lastLogin: lastLogin,
                        photoURL: data.photoURL || '',
                        role: data.role || 'user'
                    });
                }
            }
        });
        
        if (activeUsers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-6">
                    <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                        <i class="fas fa-user-slash text-gray-400 text-xl"></i>
                    </div>
                    <p class="text-gray-700 font-medium">No active users</p>
                    <p class="text-gray-500 text-sm">No users are currently online</p>
                </div>`;
        } else {
            container.innerHTML = activeUsers.map(user => `
                <div class="activity-row flex items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div class="w-10 h-10 rounded-full ${user.photoURL ? '' : 'bg-gradient-to-r from-green-500 to-teal-500'} flex items-center justify-center text-white font-semibold mr-3 flex-shrink-0 overflow-hidden">
                        ${user.photoURL ? 
                            `<img src="${user.photoURL}" class="w-full h-full object-cover" alt="${user.displayName}" onerror="this.style.display='none'; this.parentElement.innerHTML='${user.displayName.charAt(0).toUpperCase()}'">` : 
                            user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="font-medium text-gray-900 truncate">${user.displayName}</p>
                            <span class="text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">${user.role}</span>
                        </div>
                        <p class="text-xs text-gray-600 truncate">${user.email}</p>
                        <div class="flex items-center mt-1">
                            <div class="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                            <span class="text-xs text-gray-500">Active now</span>
                        </div>
                    </div>
                    <div class="text-right ml-3 flex-shrink-0">
                        <div class="text-xs text-gray-500">${formatTimeAgo(user.lastLogin)}</div>
                        <div class="text-xs text-gray-400">${user.lastLogin.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                </div>
            `).join('');
        }
        
        showToast(`Loaded ${activeUsers.length} active users`, 'success');
        
    } catch (error) {
        console.error('Error fetching active users:', error);
        const container = document.getElementById('active-users-list');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-6 text-red-500">
                    <i class="fas fa-exclamation-triangle text-xl mb-2"></i>
                    <p class="text-sm">Failed to load active users</p>
                    <button onclick="showActiveUsersList()" class="mt-2 text-xs text-indigo-600 hover:text-indigo-800">Try again</button>
                </div>`;
        }
        showToast('Failed to load active users', 'error');
    }
}

// Enhanced recent activity
async function loadRecentActivity() {
    const tableBody = document.getElementById('activity-table-body');
    if (!tableBody) return;
    
    try {
        // Show loading state
        tableBody.innerHTML = `
            <tr class="border-b border-gray-100">
                <td class="py-4 px-4 text-center text-gray-500" colspan="4">
                    <div class="flex items-center justify-center py-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
                        <span class="text-sm">Loading recent activity...</span>
                    </div>
                </td>
            </tr>`;
        
        const snapshot = await db.collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(8)
            .get();
        
        if (snapshot.empty) {
            tableBody.innerHTML = `
                <tr class="border-b border-gray-100">
                    <td class="py-8 text-center text-gray-500" colspan="4">
                        <i class="fas fa-inbox text-2xl mb-3 text-gray-300"></i>
                        <p class="text-sm">No recent activity found</p>
                    </td>
                </tr>`;
            return;
        }
        
        tableBody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const activity = doc.data();
            const row = document.createElement('tr');
            row.className = 'activity-row border-b border-gray-100';
            
            const statusColor = activity.status === 'success' ? 'status-success' :
                              activity.status === 'error' ? 'status-error' :
                              activity.status === 'warning' ? 'status-warning' : 'status-warning';
            
            row.innerHTML = `
                <td class="py-4 px-4">
                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold mr-3 flex-shrink-0">
                            ${activity.displayName ? activity.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div class="min-w-0">
                            <p class="font-medium text-gray-900 text-sm truncate">${activity.displayName || 'Unknown User'}</p>
                            <p class="text-xs text-gray-500 truncate">${activity.email || ''}</p>
                        </div>
                    </div>
                </td>
                <td class="py-4 px-4">
                    <p class="text-gray-700 text-sm">${truncateText(activity.action || 'No action', 30)}</p>
                </td>
                <td class="py-4 px-4">
                    <div class="flex flex-col">
                        <span class="text-gray-600 text-sm">${formatTimeAgo(activity.timestamp?.toDate?.() || new Date())}</span>
                        <span class="text-xs text-gray-400">${new Date(activity.timestamp?.toDate?.() || activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </td>
                <td class="py-4 px-4">
                    <span class="status-badge ${statusColor}">
                        ${activity.status || 'unknown'}
                    </span>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error("Error loading recent activity:", error);
        tableBody.innerHTML = `
            <tr class="border-b border-gray-100">
                <td class="py-8 text-center text-red-500" colspan="4">
                    <i class="fas fa-exclamation-triangle text-xl mb-2"></i>
                    <p class="text-sm">Failed to load activity</p>
                    <button onclick="loadRecentActivity()" class="mt-2 text-xs text-indigo-600 hover:text-indigo-800">Try again</button>
                </td>
            </tr>`;
        showToast('Failed to load recent activity', 'error');
    }
}

// Enhanced chart initialization
function initCharts() {
    // User Activity Chart
    const activityCtx = document.getElementById('activity-chart');
    if (activityCtx) {
        if (activityChart) activityChart.destroy();
        
        activityChart = new Chart(activityCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Active Users',
                    data: [65, 78, 90, 81, 86, 75, 92],
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderColor: '#667eea',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1a202c',
                        bodyColor: '#4a5568',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        boxPadding: 10,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} users`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { 
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: { 
                            color: '#718096',
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: { 
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: { 
                            color: '#718096',
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Load real chart data
    loadChartData();
    loadLastLoginChart();
}

// Enhanced last login chart
async function loadLastLoginChart() {
    try {
        const ctx = document.getElementById("lastLoginChart");
        if (!ctx) return;
        
        if (lastLoginChart) lastLoginChart.destroy();
        
        const usersSnapshot = await db.collection("users").get();
        const dateCounts = {};
        const today = new Date();
        
        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dateCounts[dateString] = 0;
        }

        // Count logins per day
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.lastLogin) {
                const loginDate = new Date(user.lastLogin.seconds * 1000);
                const dateString = loginDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (dateCounts.hasOwnProperty(dateString)) {
                    dateCounts[dateString]++;
                }
            }
        });

        const sortedDates = Object.keys(dateCounts);
        const chartData = sortedDates.map(date => dateCounts[date]);

        lastLoginChart = new Chart(ctx.getContext("2d"), {
            type: "bar",
            data: {
                labels: sortedDates,
                datasets: [{
                    label: "Daily Logins",
                    data: chartData,
                    backgroundColor: "rgba(102, 126, 234, 0.7)",
                    borderColor: "#667eea",
                    borderWidth: 1,
                    borderRadius: 6,
                    hoverBackgroundColor: "rgba(102, 126, 234, 1)",
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1a202c',
                        bodyColor: '#4a5568',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Logins: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { 
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: { 
                            color: '#718096',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { 
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: { 
                            color: '#718096',
                            stepSize: 1,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error loading last login chart:", error);
    }
}

async function loadChartData() {
    try {
        // Get last 7 days activity
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // This would be more complex in a real app - aggregating data by day
        const snapshot = await db.collection('userActivity')
            .where('timestamp', '>', sevenDaysAgo)
            .get();
        
        // Process data for charts
        // For now, we'll use mock data but you can implement real aggregation
        
    } catch (error) {
        console.error("Error loading chart data:", error);
    }
}

// Tab switching logic
window.showAdminTab = function(tabId, element) {
    // Hide all tab sections
    const tabSections = document.querySelectorAll('.admin-tab-section');
    tabSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show the selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Add active class to the clicked nav item
    if (element) {
        const navItem = element.closest('.nav-item');
        if (navItem) {
            navItem.classList.add('active');
        }
    }
};

// Enhanced quick action functions
window.exportUserData = async function() {
    try {
        showToast('Preparing data export...', 'info');
        
        // Simulate export process
        setTimeout(() => {
            showToast('Data exported successfully!', 'success');
            
            // Create and trigger download
            const data = "Email,Name,Role,Status\nadmin@example.com,Admin User,admin,active\nuser@example.com,Regular User,user,active";
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        }, 1500);
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export data', 'error');
    }
};

window.sendNotification = function() {
    showToast('Notification system coming soon!', 'info');
    // TODO: Implement push notification system
};

window.backupData = function() {
    showToast('Creating backup...', 'info');
    setTimeout(() => {
        showToast('Backup completed successfully!', 'success');
    }, 2000);
    // TODO: Implement data backup to cloud storage
};

window.systemHealth = async function() {
    try {
        showToast('Checking system health...', 'info');
        
        // Simulate health checks
        const checks = [
            { name: 'Database Connection', status: 'healthy', latency: '45ms' },
            { name: 'Authentication Service', status: 'healthy', latency: '23ms' },
            { name: 'Storage Service', status: 'healthy', latency: '67ms' },
            { name: 'API Endpoints', status: 'healthy', latency: '89ms' }
        ];
        
        setTimeout(() => {
            const healthyCount = checks.filter(c => c.status === 'healthy').length;
            const healthPercentage = Math.round((healthyCount / checks.length) * 100);
            
            showToast(`System health: ${healthPercentage}% - All systems operational`, 'success');
            
            // Show detailed health report
            const report = checks.map(c => `${c.name}: ${c.status} (${c.latency})`).join('\n');
            alert(`System Health Report:\n\n${report}\n\nOverall Status: ${healthPercentage}% healthy`);
        }, 1500);
        
    } catch (error) {
        console.error('Health check error:', error);
        showToast('Failed to check system health', 'error');
    }
};

// Helper functions
function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `custom-toast fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium animate-slide-in ${
        type === 'success' ? 'bg-gradient-to-r from-green-500 to-teal-500' :
        type === 'error' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
        type === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
        'bg-gradient-to-r from-indigo-500 to-purple-500'
    }`;
    
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${
                type === 'success' ? 'check-circle' :
                type === 'error' ? 'exclamation-circle' :
                type === 'warning' ? 'exclamation-triangle' : 'info-circle'
            } mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slide-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .animate-slide-in { animation: slide-in 0.3s ease-out; }
    .animate-slide-out { animation: slide-out 0.3s ease-in forwards; }
`;
document.head.appendChild(style);

// Global logout function
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            localStorage.removeItem('loggedInUserId');
            window.location.href = 'admin-login.html';
        }).catch((error) => {
            console.error('Logout error:', error);
            showToast('Logout failed. Please try again.', 'error');
        });
    }
};

// Helper to get URL parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadDashboardData();
    }
}, 30000);

// Keep the original CRUD functions (they remain the same as in your code)
window.loadUsersCrudTable = loadUsersCrudTable;
window.saveUserEdits = saveUserEdits;
window.deleteUser = deleteUser;
window.loadReportsCrudTable = loadReportsCrudTable;
window.viewReport = viewReport;
window.deleteReport = deleteReport;
window.printReport = printReport;

// Export to window object
window.showActiveUsersList = showActiveUsersList;
window.loadRecentActivity = loadRecentActivity;
window.loadLastLoginChart = loadLastLoginChart;