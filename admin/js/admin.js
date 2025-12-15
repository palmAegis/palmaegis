// Initialize Firebase (replace with your config)

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
let registrationChart, diseaseChart;
let currentUser = null;

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const adminName = document.getElementById('admin-name');
const adminEmail = document.getElementById('admin-email');
const currentDateElement = document.getElementById('current-date');
const notificationCount = document.getElementById('notification-count');

// Statistics elements
const activeUsersCount = document.getElementById('active-users-count');
const totalUsersCount = document.getElementById('total-users-count');
const newUsersCount = document.getElementById('new-users-count');
const totalDetections = document.getElementById('total-detections');

// Change percentages
const activeUsersChange = document.getElementById('active-users-change');
const totalUsersChange = document.getElementById('total-users-change');
const newUsersChange = document.getElementById('new-users-change');
const detectionsChange = document.getElementById('detections-change');

// Activity table
const activityTableBody = document.getElementById('activity-table-body');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and has admin privileges
    auth.onAuthStateChanged(async user => {
        if (!user) {
            // window.location.href = 'homepage.html';//
            return;
        }

        // Check if admin
        const userDoc = await db.collection('users').doc(user.uid).get();
        const isAdmin = userDoc.exists && userDoc.data().role === 'admin';

        // If admin and ?uid= is present, show that user's profile
        const targetUid = isAdmin && getQueryParam('uid') ? getQueryParam('uid') : user.uid;
        loadProfileData(targetUid);

        // Set email field
        if (targetUid === user.uid) {
            emailInput.value = user.email;
        } else {
            // Load email of the target user from Firestore
            const targetUserDoc = await db.collection('users').doc(targetUid).get();
            emailInput.value = targetUserDoc.exists ? targetUserDoc.data().email : '';
        }

        // User is signed in, check if admin
        checkAdminStatus(targetUid);
    });
    
    // Initialize charts
    initCharts();
    
    // Load data from Firestore
    loadUserStats();
    loadRecentActivity();
});

function checkAdminStatus(uid) {
    db.collection('users').doc(uid).get()
        .then(doc => {
            if (!doc.exists || doc.data().role !== 'admin') {
                // User is not admin, redirect
                window.location.href = 'admin-login.html';
            } else {
                // User is admin, load admin data
                loadAdminData();
            }
        })
        .catch(error => {
            console.error("Error checking admin status:", error);
            window.location.href = 'admin-login.html';
        });
}

function loadAdminData() {
    // Load admin user info
    const user = auth.currentUser;
    if (user) {
        adminName.textContent = user.displayName || 'Admin User';
        adminEmail.textContent = user.email || 'admin@example.com';
    }
    
    // Update current date
    const now = new Date();
    currentDateElement.textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Load dashboard data
    loadDashboardData();
}

function loadUserStats() {
    // Get total users count
    db.collection('users').get()
        .then(snapshot => {
            document.getElementById('total-users').textContent = snapshot.size;
        });
    
    // Get active users (users who logged in last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    db.collection('users')
        .where('lastActive', '>', thirtyMinutesAgo)
        .get()
        .then(snapshot => {
            document.getElementById('active-users').textContent = snapshot.size;
        });
    
    // Get new registrations (users who registered today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    db.collection('users')
        .where('registeredAt', '>', today)
        .get()
        .then(snapshot => {
            document.getElementById('new-users').textContent = snapshot.size;
        });
    
    // Get active sessions (you might need to implement this differently)
    db.collection('sessions')
        .where('active', '==', true)
        .get()
        .then(snapshot => {
            document.getElementById('active-sessions').textContent = snapshot.size;
        });
}

function loadRecentActivity() {
    const tableBody = document.querySelector('#user-activity-table tbody');
    
    db.collection('userActivity')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            tableBody.innerHTML = '';
            
            snapshot.forEach(doc => {
                const activity = doc.data();
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>
                        <div class="user-cell">
                            <img src="${activity.photoURL || 'https://via.placeholder.com/40'}" alt="${activity.displayName}">
                            <span>${activity.displayName || activity.email}</span>
                        </div>
                    </td>
                    <td>${activity.action}</td>
                    <td>${new Date(activity.timestamp).toLocaleString()}</td>
                    <td><span class="status-badge ${activity.status}">${activity.status}</span></td>
                `;
                
                tableBody.appendChild(row);
            });
        });
}

function initCharts() {
    // User Activity Chart
    const activityCtx = document.getElementById('activity-chart').getContext('2d');
    const activityChart = new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Active Users',
                data: [120, 190, 170, 210, 230, 200, 180],
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Registrations Chart
    const registrationsCtx = document.getElementById('registrations-chart').getContext('2d');
    const registrationsChart = new Chart(registrationsCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'New Registrations',
                data: [45, 60, 75, 90, 110, 95],
                backgroundColor: 'rgba(76, 175, 80, 0.7)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // You would replace the static data above with actual data from Firestore
    loadChartData();
}

function loadChartData() {
    // Example of loading real data for charts
    // This would be more complex in a real app
    
    // Get last 7 days activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // This is a simplified example - you'd need to aggregate data properly
    db.collection('userActivity')
        .where('timestamp', '>', sevenDaysAgo)
        .get()
        .then(snapshot => {
            // Process data for charts
            // Update chart.data.datasets[0].data with real values
        });
}

// Update loadDashboardData to show real-time users
async function loadDashboardData() {
    try {
        // Get all users
        const usersSnapshot = await db.collection('users').get();
        const now = new Date();
        let activeUsers = 0;
        let newUsers = 0;
        let totalUsers = usersSnapshot.size;

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            // Active if lastLogin within 10 minutes
            if (data.lastLogin && data.lastLogin.toDate) {
                const lastLogin = data.lastLogin.toDate();
                if ((now - lastLogin) / 60000 <= 10) {
                    activeUsers++;
                }
            }
            // New if createdAt within 24 hours
            if (data.createdAt && data.createdAt.toDate) {
                const createdAt = data.createdAt.toDate();
                if ((now - createdAt) / 3600000 <= 24) {
                    newUsers++;
                }
            }
        });

        // Update dashboard
        document.getElementById('active-users-count').textContent = activeUsers;
        document.getElementById('new-users-count').textContent = newUsers;
        document.getElementById('total-users-count').textContent = totalUsers;
        // You can update other stats as needed
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

// Call loadDashboardData on page load
window.addEventListener('DOMContentLoaded', loadDashboardData);

// Function to fetch and display active users
async function showActiveUsersList() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const now = new Date();
        const activeUsers = [];
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.lastLogin && data.lastLogin.toDate) {
                const lastLogin = data.lastLogin.toDate();
                if ((now - lastLogin) / 60000 <= 10) {
                    activeUsers.push({
                        email: data.email,
                        displayName: data.displayName || data.firstName || 'Unknown User',
                        lastLogin: lastLogin
                    });
                }
            }
        });
        
        // Render active users in a section
        const container = document.getElementById('active-users-list');
        if (container) {
            if (activeUsers.length === 0) {
                container.innerHTML = '<p>No users are currently active.</p>';
            } else {
                container.innerHTML = `
                    <table class="activity-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Last Login</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeUsers.map(user => `
                                <tr>
                                    <td>${user.email}</td>
                                    <td>${user.displayName}</td>
                                    <td>${user.lastLogin.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`;
            }
        }
    } catch (error) {
        console.error('Error fetching active users:', error);
    }
}

// Optionally, call this on page load or via a button
window.showActiveUsersList = showActiveUsersList;

// Tab switching logic for admin dashboard (sidebar version)
window.showAdminTab = function(tabId, sidebarLink = null) {
    // Hide all tab sections
    document.querySelectorAll('.admin-tab-section').forEach(section => {
        section.style.display = 'none';
    });
    // Show selected tab section
    const tabSection = document.getElementById(tabId);
    if (tabSection) tabSection.style.display = 'block';
    // Remove active class from all sidebar nav-items
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // Highlight the selected sidebar nav-item
    if (sidebarLink && sidebarLink.closest('.nav-item')) {
        sidebarLink.closest('.nav-item').classList.add('active');
    }
};

// USERS CRUD TABLE
async function loadUsersCrudTable() {
    const container = document.getElementById('users-crud-table');
    if (!container) return;
    try {
        const usersSnapshot = await db.collection('users').get();
        let html = `<table class="activity-table"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            html += `<tr>
                <td>${data.email || ''}</td>
                <td><input type="text" value="${data.displayName || ''}" data-uid="${doc.id}" class="edit-displayName" style="width:120px;"></td>
                <td>${data.role || ''}</td>
                <td>
                    <select data-uid="${doc.id}" class="edit-status">
                        <option value="active"${data.status === 'active' ? ' selected' : ''}>active</option>
                        <option value="inactive"${data.status === 'inactive' ? ' selected' : ''}>inactive</option>
                    </select>
                </td>
                <td>
                    <button onclick="saveUserEdits('${doc.id}')" class="action-btn-small"><i class="fas fa-save"></i></button>
                    <button onclick="deleteUser('${doc.id}')" class="action-btn-small" style="background:#e74c3c;"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="color:red;">Failed to load users.</p>';
        console.error('Error loading users:', error);
    }
}

// Save user edits (displayName, status)
window.saveUserEdits = async function(uid) {
    const displayNameInput = document.querySelector(`.edit-displayName[data-uid='${uid}']`);
    const statusSelect = document.querySelector(`.edit-status[data-uid='${uid}']`);
    if (!displayNameInput || !statusSelect) return;
    try {
        await db.collection('users').doc(uid).update({
            displayName: displayNameInput.value,
            status: statusSelect.value
        });
        alert('User updated!');
        loadUsersCrudTable();
    } catch (error) {
        alert('Failed to update user.');
        console.error(error);
    }
};

// Delete user
window.deleteUser = async function(uid) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        await db.collection('users').doc(uid).delete();
        alert('User deleted!');
        loadUsersCrudTable();
    } catch (error) {
        alert('Failed to delete user.');
        console.error(error);
    }
};

// Load users table when Users tab is shown
const usersTab = document.getElementById('users-tab');
if (usersTab) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (usersTab.style.display !== 'none') {
                loadUsersCrudTable();
            }
        });
    });
    observer.observe(usersTab, { attributes: true, attributeFilter: ['style'] });
}

// REPORTS CRUD TABLE
async function loadReportsCrudTable() {
    const container = document.getElementById('reports-crud-table');
    if (!container) return;
    try {
        const reportsSnapshot = await db.collection('palmDiseaseReports').get();
        if (reportsSnapshot.empty) {
            container.innerHTML = '<p style="color:#888;">No reports found.</p>';
            return;
        }
        let html = `<table class="activity-table"><thead><tr><th>Farmer Name</th><th>Location</th><th>Problem</th><th>Severity</th><th>Timestamp</th><th>User ID</th><th>Actions</th></tr></thead><tbody>`;
        reportsSnapshot.forEach(doc => {
            const data = doc.data();
            html += `<tr>
                <td>${data.farmerName || ''}</td>
                <td>${data.location || ''}</td>
                <td>${data.problem || ''}</td>
                <td>${data.severity || ''}</td>
                <td>${data.timestamp && data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : (typeof data.timestamp === 'string' ? data.timestamp : '')}</td>
                <td>${data.userId || ''}</td>
                <td>
                    <button onclick="viewReport('${doc.id}')" class="action-btn-small"><i class="fas fa-eye"></i></button>
                    <button onclick="deleteReport('${doc.id}')" class="action-btn-small" style="background:#e74c3c;"><i class="fas fa-trash"></i></button>
                    <button onclick="printReport('${doc.id}')" class="action-btn-small" style="background:#764ba2;"><i class="fas fa-print"></i></button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="color:red;">Failed to load reports.</p>';
        console.error('Error loading reports from palmDiseaseReports:', error);
    }
}

// View report (simple alert for now)
window.viewReport = async function(reportId) {
    try {
        const docSnap = await db.collection('palmDiseaseReports').doc(reportId).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            alert(`Farmer: ${data.farmerName}\nLocation: ${data.location}\nProblem: ${data.problem}\nSeverity: ${data.severity}\nUser ID: ${data.userId}\nTime: ${data.timestamp && data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : (typeof data.timestamp === 'string' ? data.timestamp : '')}`);
        }
    } catch (error) {
        alert('Failed to load report.');
        console.error(error);
    }
};

// Delete report
window.deleteReport = async function(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
        await db.collection('palmDiseaseReports').doc(reportId).delete();
        alert('Report deleted!');
        loadReportsCrudTable();
    } catch (error) {
        alert('Failed to delete report.');
        console.error(error);
    }
};

// Print report
window.printReport = async function(reportId) {
    try {
        const docSnap = await db.collection('palmDiseaseReports').doc(reportId).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            const printWindow = window.open('', '', 'width=800,height=600');
            printWindow.document.write(`
<html>
<head>
    <title>Print Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
        .report-container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 18px; box-shadow: 0 8px 32px rgba(102,126,234,0.15); padding: 2.5rem 2rem; }
        .report-header { display: flex; align-items: center; gap: 16px; margin-bottom: 2rem; }
        .report-logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; }
        .report-logo img { width: 32px; height: 32px; }
        .report-title { font-size: 2rem; font-weight: 700; color: #764ba2; letter-spacing: 1px; }
        .report-section { margin-bottom: 1.5rem; }
        .report-label { color: #667eea; font-weight: 600; font-size: 1.05rem; display: block; margin-bottom: 0.2rem; }
        .report-value { color: #222; font-size: 1.1rem; margin-bottom: 0.5rem; }
        .report-footer { margin-top: 2.5rem; text-align: right; color: #888; font-size: 0.95rem; }
        @media print { body { background: #fff; } .report-container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <div class="report-logo">
                <img src="images/logo.png" alt="Palm Admin Logo" />
            </div>
            <div class="report-title">Palm Disease Report</div>
        </div>
        <div class="report-section">
            <span class="report-label">Farmer Name</span>
            <div class="report-value">${data.farmerName || ''}</div>
        </div>
        <div class="report-section">
            <span class="report-label">Location</span>
            <div class="report-value">${data.location || ''}</div>
        </div>
        <div class="report-section">
            <span class="report-label">Problem</span>
            <div class="report-value">${data.problem || ''}</div>
        </div>
        <div class="report-section">
            <span class="report-label">Severity</span>
            <div class="report-value">${data.severity || ''}</div>
        </div>
        <div class="report-section">
            <span class="report-label">User ID</span>
            <div class="report-value">${data.userId || ''}</div>
        </div>
        <div class="report-section">
            <span class="report-label">Timestamp</span>
            <div class="report-value">${data.timestamp && data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : (typeof data.timestamp === 'string' ? data.timestamp : '')}</div>
        </div>
        <div class="report-footer">
            Generated by Palm Admin &mdash; ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    } catch (error) {
        alert('Failed to print report.');
        console.error(error);
    }
};

// Load reports table when Reports tab is shown
const reportsTab = document.getElementById('reports-tab');
if (reportsTab) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (reportsTab.style.display !== 'none') {
                loadReportsCrudTable();
            }
        });
    });
    observer.observe(reportsTab, { attributes: true, attributeFilter: ['style'] });
}

// Admin Logout Button
const adminLogoutBtn = document.querySelector('.logout-btn');
if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            localStorage.removeItem('loggedInUserId');
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Logout error:', error);
        });
    });
}

// Global logout function for HTML onclick
window.logout = function() {
    auth.signOut().then(() => {
        localStorage.removeItem('loggedInUserId');
        window.location.href = 'admin-login.html';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
};

// Global function to show admin tabs
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

// Quick Action Functions
window.exportUserData = function() {
    alert('Export functionality will be implemented soon!');
    // TODO: Implement CSV export of user data
};

window.sendNotification = function() {
    alert('Notification system will be implemented soon!');
    // TODO: Implement push notification system
};

window.backupData = function() {
    alert('Backup functionality will be implemented soon!');
    // TODO: Implement data backup to cloud storage
};

window.systemHealth = function() {
    alert('System health check will be implemented soon!');
    // TODO: Implement system health monitoring
};

// Helper to get URL parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
// ============================
// Load Last Login Users Chart
// ============================
async function loadLastLoginChart() {
  try {
    const usersSnapshot = await db.collection("users").get();

    // Map of date => number of users who logged in
    const dateCounts = {};

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.lastLogin) {
        // Convert Firestore timestamp to readable date
        const date = new Date(user.lastLogin.seconds * 1000).toLocaleDateString();
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });

    // Sort by date (ascending)
    const sortedDates = Object.keys(dateCounts).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // Extract data
    const chartData = sortedDates.map(date => dateCounts[date]);

    // Create Chart.js line graph
    const ctx = document.getElementById("lastLoginChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedDates,
        datasets: [
          {
            label: "Users Logged In",
            data: chartData,
            backgroundColor: "rgba(34,197,94,0.6)",
            borderColor: "#16a34a",
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Date",
              color: "#4b5563",
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Number of Logins",
              color: "#4b5563",
            },
            ticks: { stepSize: 1 },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error loading last login chart:", error);
  }
}

// Call when page loads
window.addEventListener("load", loadLastLoginChart);