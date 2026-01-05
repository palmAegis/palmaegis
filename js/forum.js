// Firebase configuration
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
const storage = firebase.storage();

// Get current user (you would have your own auth system)
const currentUser = {
    id: 'user_' + Date.now(),
    name: 'Anonymous User',
    avatar: 'A'
};

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const submitPostBtn = document.getElementById('submitPost');
const cancelPostBtn = document.getElementById('cancelPost');
const postTitleInput = document.getElementById('postTitle');
const postContentInput = document.getElementById('postContent');
const postCategorySelect = document.getElementById('postCategory');
const imageUploadInput = document.getElementById('imageUpload');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const searchBtn = document.getElementById('searchBtn');
const closeSearchBtn = document.getElementById('closeSearch');
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const tabs = document.querySelectorAll('.tab');
const imageModal = document.getElementById('imageModal');
const closeImageModal = document.getElementById('closeImageModal');
const modalImage = document.getElementById('modalImage');
const prevImageBtn = document.getElementById('prevImage');
const nextImageBtn = document.getElementById('nextImage');
const imageCounter = document.getElementById('imageCounter');

// State Variables
let selectedImages = [];
let currentImageIndex = 0;
let currentImages = [];
let currentCategory = 'all';

// Event Listeners
document.addEventListener('DOMContentLoaded', loadPosts);

submitPostBtn.addEventListener('click', createPost);
cancelPostBtn.addEventListener('click', clearPostForm);
imageUploadInput.addEventListener('change', handleImageUpload);
searchBtn.addEventListener('click', () => searchModal.classList.add('active'));
closeSearchBtn.addEventListener('click', () => searchModal.classList.remove('active'));
closeImageModal.addEventListener('click', () => imageModal.classList.remove('active'));
prevImageBtn.addEventListener('click', showPrevImage);
nextImageBtn.addEventListener('click', showNextImage);

// Tab switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category;
        loadPosts();
    });
});

// Search functionality
searchInput.addEventListener('input', debounce(handleSearch, 300));

// Load posts from Firestore
async function loadPosts() {
    try {
        postsContainer.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <span>Loading posts...</span>
            </div>
        `;

        let postsRef = db.collection('posts').orderBy('timestamp', 'desc');
        
        if (currentCategory !== 'all') {
            postsRef = postsRef.where('category', '==', currentCategory);
        }
        
        const snapshot = await postsRef.get();
        
        if (snapshot.empty) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <i class="fas fa-comments fa-3x"></i>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something!</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const post = doc.data();
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
        });
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <h3>Error loading posts</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Create post element
function createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    
    const postDate = new Date(post.timestamp?.toDate());
    const timeAgo = getTimeAgo(postDate);
    
    const categoryClass = getCategoryClass(post.category);
    
    let imagesHTML = '';
    if (post.images && post.images.length > 0) {
        imagesHTML = createImagesHTML(post.images);
    }
    
    postElement.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <div class="author-avatar">
                    <span>${post.author?.avatar || 'U'}</span>
                </div>
                <div class="author-info">
                    <h3>${post.author?.name || 'Anonymous'}</h3>
                    <span class="post-time">${timeAgo}</span>
                </div>
            </div>
            <div class="post-category ${categoryClass}">
                ${getCategoryText(post.category)}
            </div>
        </div>
        
        <div class="post-content">
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
            <p class="post-text">${escapeHtml(post.content)}</p>
        </div>
        
        ${imagesHTML}
        
        <div class="post-actions-footer">
            <div class="post-stats">
                <span class="post-stat">
                    <i class="fas fa-thumbs-up"></i>
                    <span>${post.likes || 0}</span>
                </span>
                <span class="post-stat">
                    <i class="fas fa-comment"></i>
                    <span>${post.comments || 0}</span>
                </span>
                <span class="post-stat">
                    <i class="fas fa-share"></i>
                    <span>${post.shares || 0}</span>
                </span>
            </div>
            <div class="post-buttons-footer">
                <button class="action-btn like" onclick="likePost('${post.id}')">
                    <i class="fas fa-thumbs-up"></i>
                    <span>Like</span>
                </button>
                <button class="action-btn" onclick="commentOnPost('${post.id}')">
                    <i class="fas fa-comment"></i>
                    <span>Comment</span>
                </button>
                <button class="action-btn" onclick="sharePost('${post.id}')">
                    <i class="fas fa-share"></i>
                    <span>Share</span>
                </button>
            </div>
        </div>
    `;
    
    // Add image click handlers
    if (post.images && post.images.length > 0) {
        const imageItems = postElement.querySelectorAll('.post-image-item');
        imageItems.forEach((item, index) => {
            item.addEventListener('click', () => openImageModal(post.images, index));
        });
    }
    
    return postElement;
}

// Create images HTML
function createImagesHTML(images) {
    const imageCount = images.length;
    let gridClass = '';
    
    if (imageCount === 1) gridClass = 'single';
    else if (imageCount === 2) gridClass = 'double';
    else if (imageCount === 3) gridClass = 'triple';
    else gridClass = 'multiple';
    
    let imagesHTML = '<div class="post-images">';
    imagesHTML += `<div class="post-image-grid ${gridClass}">`;
    
    const displayCount = Math.min(imageCount, 4);
    for (let i = 0; i < displayCount; i++) {
        const imageUrl = images[i];
        const isLast = i === 3 && imageCount > 4;
        
        imagesHTML += `
            <div class="post-image-item" data-index="${i}">
                <img src="${imageUrl}" alt="Post image ${i + 1}" loading="lazy">
                ${isLast ? `<div class="more-images-overlay">+${imageCount - 4}</div>` : ''}
            </div>
        `;
    }
    
    imagesHTML += '</div></div>';
    return imagesHTML;
}

// Handle image upload
async function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload only image files');
            continue;
        }
        
        if (file.size > maxSize) {
            alert(`File ${file.name} is too large. Maximum size is 5MB.`);
            continue;
        }
        
        if (selectedImages.length >= 10) {
            alert('Maximum 10 images per post');
            break;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageId = 'img_' + Date.now() + Math.random();
            selectedImages.push({
                id: imageId,
                file: file,
                preview: e.target.result
            });
            updateImagePreviews();
        };
        reader.readAsDataURL(file);
    }
    
    // Reset file input
    imageUploadInput.value = '';
}

// Update image previews
function updateImagePreviews() {
    imagePreviewContainer.innerHTML = '';
    
    selectedImages.forEach((image, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image-preview';
        previewDiv.innerHTML = `
            <img src="${image.preview}" alt="Preview ${index + 1}">
            <button class="remove-image" onclick="removeImage('${image.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        imagePreviewContainer.appendChild(previewDiv);
    });
}

// Remove image
function removeImage(imageId) {
    selectedImages = selectedImages.filter(img => img.id !== imageId);
    updateImagePreviews();
}

// Upload images to Firebase Storage
async function uploadImages() {
    if (selectedImages.length === 0) return [];
    
    uploadProgress.style.display = 'flex';
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading...';
    