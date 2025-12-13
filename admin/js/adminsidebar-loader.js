// sidebar-loader.js

// Global configuration
const SIDEBAR_CONFIG = {
    isCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
    adminData: {
        name: localStorage.getItem('adminName') || 'Admin User',
        email: localStorage.getItem('adminEmail') || 'admin@palm-aegis.com'
    }
};

// Main function to initialize sidebar
function initializeSidebar() {
    loadSidebar().then(success => {
        if (success) {
            setupSidebarInteractions();
            highlightCurrentPage();
            updateAdminInfo();
            setupLogoutHandler();
            adjustMainContent();
            
            // Dispatch event that sidebar is loaded
            window.dispatchEvent(new CustomEvent('sidebarLoaded'));
        }
    });
}

// Load sidebar HTML
function loadSidebar() {
    return fetch('../components/sidebar-admin.html')
        .then(response => {
            if (!response.ok) throw new Error('Sidebar not found');
            return response.text();
        })
        .then(html => {
            // Create a temporary div to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Extract only the sidebar HTML (excluding head and body tags)
            const sidebarContent = tempDiv.querySelector('#admin-sidebar') || tempDiv.querySelector('.admin-sidebar');
            
            if (!sidebarContent) {
                throw new Error('Sidebar content not found in HTML');
            }
            
            // Insert into container
            const container = document.getElementById('sidebar-container');
            if (container) {
                container.innerHTML = sidebarContent.outerHTML;
                return true;
            }
            return false;
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            // Fallback: Create basic sidebar if file not found
            createFallbackSidebar();
            return true;
        });
}

// Fallback sidebar if file not found
function createFallbackSidebar() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;
    
    container.innerHTML = `
        <aside class="admin-sidebar" id="admin-sidebar">
            <div class="logo-section">
                <img src="https://cdn-icons-png.flaticon.com/512/194/194938.png" alt="Palm Aegis Logo">
                <h2>Palm Admin</h2>
            </div>
            <nav class="sidebar-nav">
                <ul class="nav-list">
                    <li class="nav-item"><a href="admindashboard.html"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></a></li>
                    <li class="nav-item"><a href="user.html"><i class="fas fa-users"></i><span>Users</span></a></li>
                    <li class="nav-item"><a href="admin-assessment.html"><i class="fas fa-leaf"></i><span>Assessments</span></a></li>
                    <li class="nav-item"><a href="treatment_admin.html"><i class="fas fa-pills"></i><span>Treatment</span></a></li>
                    <li class="nav-item"><a href="farmdataadmin.html"><i class="fas fa-database"></i><span>Farm Data</span></a></li>
                    <li class="nav-item"><a href="report.html"><i class="fas fa-file-alt"></i><span>Reports</span></a></li>
                </ul>
            </nav>
            <div class="admin-profile-section">
                <div class="profile-info">
                    <div class="profile-icon"><i class="fas fa-user-shield"></i></div>
                    <div class="profile-details">
                        <h4 id="admin-name">Admin User</h4>
                        <p id="admin-email">admin@palm-aegis.com</p>
                    </div>
                </div>
                <button class="logout-btn" id="logout-btn">Logout</button>
            </div>
        </aside>
    `;
}

// Setup all sidebar interactions
function setupSidebarInteractions() {
    const sidebar = document.querySelector('.admin-sidebar');
    if (!sidebar) return;
    
    // Toggle collapse state
    const toggleBtn = sidebar.querySelector('.toggle-sidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }
    
    // Apply initial collapsed state
    if (SIDEBAR_CONFIG.isCollapsed) {
        sidebar.classList.add('collapsed');
    }
    
    // Setup navigation item hover effects
    const navItems = sidebar.querySelectorAll('.nav-item a');
    navItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(5px)';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateX(0)';
            }
        });
    });
}

// Toggle sidebar collapsed state
function toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    if (!sidebar) return;
    
    sidebar.classList.toggle('collapsed');
    SIDEBAR_CONFIG.isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', SIDEBAR_CONFIG.isCollapsed);
    
    // Dispatch custom event for other components to react
    window.dispatchEvent(new CustomEvent('sidebarToggled', {
        detail: { isCollapsed: SIDEBAR_CONFIG.isCollapsed }
    }));
    
    adjustMainContent();
}

// Highlight current page in sidebar
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-item a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        
        if (href && currentPage === href) {
            link.classList.add('active');
        }
    });
}

// Update admin information
function updateAdminInfo() {
    const adminNameEl = document.getElementById('admin-name');
    const adminEmailEl = document.getElementById('admin-email');
    
    if (adminNameEl) adminNameEl.textContent = SIDEBAR_CONFIG.adminData.name;
    if (adminEmailEl) adminEmailEl.textContent = SIDEBAR_CONFIG.adminData.email;
}

// Setup logout handler
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        // Clear local storage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminName');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('sidebarCollapsed');
        
        // Redirect to login page
        window.location.href = '../index.html';
    }
}

// Adjust main content based on sidebar state
function adjustMainContent() {
    const sidebar = document.querySelector('.admin-sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (!sidebar || !mainContent) return;
    
    const isCollapsed = sidebar.classList.contains('collapsed');
    const sidebarWidth = isCollapsed || window.innerWidth <= 768 ? '5rem' : '16rem';
    
    mainContent.style.marginLeft = sidebarWidth;
    mainContent.style.width = `calc(100% - ${sidebarWidth})`;
    mainContent.style.transition = 'margin-left 0.3s ease, width 0.3s ease';
}

// Set admin data (call this after login)
function setAdminData(name, email) {
    SIDEBAR_CONFIG.adminData.name = name;
    SIDEBAR_CONFIG.adminData.email = email;
    localStorage.setItem('adminName', name);
    localStorage.setItem('adminEmail', email);
    
    updateAdminInfo();
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if sidebar container exists
    if (document.getElementById('sidebar-container')) {
        initializeSidebar();
    }
    
    // Adjust on window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(adjustMainContent, 250);
    });
});

// Export functions
window.SidebarManager = {
    initializeSidebar,
    toggleSidebar,
    setAdminData,
    handleLogout,
    adjustMainContent
};