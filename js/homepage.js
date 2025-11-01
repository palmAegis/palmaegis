// js/homepage.js

import { signOutUser, getUserActivities, getCurrentUser, getUserData } from './firebaseauth.js';

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await signOutUser();
        });
    }

    // Profile button functionality
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            // Add profile dropdown functionality here
            console.log('Profile button clicked');
        });
    }

    // Notification button functionality
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            // Add notification dropdown functionality here
            console.log('Notification button clicked');
        });
    }

    // Edit profile button functionality
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            // Redirect to settings page for profile editing
            window.location.href = 'settings.html';
        });
    }

    // Edit avatar button functionality
    const editAvatarBtn = document.querySelector('.edit-avatar-btn');
    if (editAvatarBtn) {
        editAvatarBtn.addEventListener('click', function() {
            // Add edit avatar functionality here
            alert('Edit avatar functionality would open here');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnMenuToggle = menuToggle.contains(event.target);
            
            if (!isClickInsideSidebar && !isClickOnMenuToggle && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Load user activities and data when user is available
    const checkUserAndLoadData = setInterval(() => {
        if (window.currentUser) {
            clearInterval(checkUserAndLoadData);
            loadUserActivities();
            loadCropProgress();
        }
    }, 100);

    // Add loading state to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('btn-primary') || this.classList.contains('edit-profile-btn')) {
                this.classList.add('loading');
                setTimeout(() => {
                    this.classList.remove('loading');
                }, 2000);
            }
        });
    });

    console.log('Palm Aegis Dashboard loaded successfully!');
});

// Load user activities from Firestore
async function loadUserActivities() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        console.log('No user found, cannot load activities');
        return;
    }

    try {
        const result = await getUserActivities(currentUser.uid);
        const activityList = document.getElementById('activityList');
        
        if (result.success && result.activities && result.activities.length > 0) {
            activityList.innerHTML = '';
            result.activities.forEach(activity => {
                const activityItem = createActivityItem(activity);
                activityList.appendChild(activityItem);
            });
        } else {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon info">
                        <i class="fas fa-info"></i>
                    </div>
                    <div class="activity-content">
                        <p>No recent activities found</p>
                        <span class="activity-time">Get started with your farm management</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon warning">
                    <i class="fas fa-exclamation"></i>
                </div>
                <div class="activity-content">
                    <p>Error loading activities</p>
                    <span class="activity-time">Please try refreshing the page</span>
                </div>
            </div>
        `;
    }
}

// Create activity item element
function createActivityItem(activity) {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const iconClass = getActivityIconClass(activity.type);
    const timeAgo = getTimeAgo(activity.timestamp);
    
    activityItem.innerHTML = `
        <div class="activity-icon ${iconClass.class}">
            <i class="fas ${iconClass.icon}"></i>
        </div>
        <div class="activity-content">
            <p>${activity.message || 'Activity completed'}</p>
            <span class="activity-time">${timeAgo}</span>
        </div>
    `;
    
    return activityItem;
}

// Get appropriate icon class for activity type
function getActivityIconClass(type) {
    const types = {
        'success': { class: 'success', icon: 'fa-check' },
        'warning': { class: 'warning', icon: 'fa-exclamation' },
        'info': { class: 'info', icon: 'fa-info' },
        'error': { class: 'error', icon: 'fa-times' }
    };
    
    return types[type] || types.info;
}

// Calculate time ago
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    
    const now = new Date();
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// Load crop progress from user data
function loadCropProgress() {
    const progressGrid = document.getElementById('progressGrid');
    
    if (window.userData && window.userData.crops && window.userData.crops.length > 0) {
        progressGrid.innerHTML = '';
        window.userData.crops.forEach(crop => {
            const progressItem = createProgressItem(crop);
            progressGrid.appendChild(progressItem);
        });
    } else {
        // Default crops if no data
        const defaultCrops = [
            { name: 'Tomatoes', progress: 85 },
            { name: 'Wheat', progress: 62 },
            { name: 'Corn', progress: 45 },
            { name: 'Potatoes', progress: 78 }
        ];
        
        progressGrid.innerHTML = '';
        defaultCrops.forEach(crop => {
            const progressItem = createProgressItem(crop);
            progressGrid.appendChild(progressItem);
        });
    }
}

// Create progress item element
function createProgressItem(crop) {
    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';
    
    progressItem.innerHTML = `
        <div class="progress-info">
            <span class="crop-name">${crop.name}</span>
            <span class="progress-percent">${crop.progress}%</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${crop.progress}%"></div>
        </div>
    `;
    
    return progressItem;
}