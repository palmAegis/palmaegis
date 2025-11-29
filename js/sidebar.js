// sidebar.js
export class SidebarManager {
    constructor() {
        this.sidebar = null;
        this.currentPage = '';
        this.init();
    }

    async init() {
        await this.loadSidebar();
        this.setupSidebarToggle();
        this.setupActivePage();
        this.setupLogout();
    }

    async loadSidebar() {
        try {
            const response = await fetch('sidebar.html');
            const sidebarHTML = await response.text();
            
            // Create a temporary container to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sidebarHTML;
            this.sidebar = tempDiv.querySelector('.sidebar');
            
            // Insert sidebar at the beginning of the body
            document.body.insertBefore(this.sidebar, document.body.firstChild);
            
            console.log('Sidebar loaded successfully');
        } catch (error) {
            console.error('Error loading sidebar:', error);
        }
    }

    setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebarToggle && this.sidebar) {
            sidebarToggle.addEventListener('click', () => {
                const isCollapsing = !this.sidebar.classList.contains('collapsed');
                
                this.sidebar.classList.toggle('collapsed');
                if (mainContent) {
                    mainContent.classList.toggle('expanded');
                }
                
                // Update toggle icon
                const icon = sidebarToggle.querySelector('i');
                if (this.sidebar.classList.contains('collapsed')) {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-left';
                }
            });
        }
    }

    setupActivePage() {
        // Get current page filename
        const currentPath = window.location.pathname;
        this.currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        
        // Remove active class from all items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Add active class to current page
        const currentNavItem = document.querySelector(`a[href="${this.currentPage}"]`).parentElement;
        if (currentNavItem) {
            currentNavItem.classList.add('active');
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Your logout logic here
                console.log('Logout clicked');
            });
        }
    }

    updateUserProfile(user, userData) {
        const userNameElement = document.querySelector('.user-name');
        const userRoleElement = document.querySelector('.user-role');
        const userAvatar = document.querySelector('.user-avatar');
        
        if (userNameElement) {
            const displayName = userData.firstName && userData.lastName 
                ? `${userData.firstName} ${userData.lastName}`
                : userData.username 
                ? userData.username
                : userData.displayName || user.displayName || user.email.split('@')[0] || 'User';
            
            userNameElement.textContent = displayName;
        }

        if (userRoleElement) {
            userRoleElement.textContent = userData.bio || 'Farmer';
        }

        if (userAvatar) {
            let imageSource = 'images/user-avatar.jpg';
            
            if (userData.imageBase64 && userData.imageBase64.trim() !== '') {
                imageSource = userData.imageBase64.trim();
            } else if (userData.picture && userData.picture.trim() !== '') {
                imageSource = userData.picture.trim();
            } else if (userData.photoURL && userData.photoURL.trim() !== '') {
                imageSource = userData.photoURL.trim();
            }

            userAvatar.src = imageSource;
            userAvatar.onerror = function() {
                this.src = 'images/user-avatar.jpg';
            };
        }
    }
}