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
    
    const uploadPromises = selectedImages.map(async (image, index) => {
        const fileName = `posts/${Date.now()}_${image.file.name}`;
        const storageRef = storage.ref().child(fileName);
        const uploadTask = storageRef.put(image.file);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Calculate progress for individual file
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    // Update overall progress
                    const overallProgress = (index / selectedImages.length) * 100 + (progress / selectedImages.length);
                    progressFill.style.width = overallProgress + '%';
                    progressText.textContent = `Uploading ${index + 1}/${selectedImages.length} (${Math.round(progress)}%)`;
                },
                (error) => {
                    reject(error);
                },
                async () => {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    resolve(downloadURL);
                }
            );
        });
    });
    
    try {
        const imageUrls = await Promise.all(uploadPromises);
        uploadProgress.style.display = 'none';
        return imageUrls;
    } catch (error) {
        console.error('Error uploading images:', error);
        uploadProgress.style.display = 'none';
        throw error;
    }
}

// Create new post
async function createPost() {
    const title = postTitleInput.value.trim();
    const content = postContentInput.value.trim();
    
    if (!title || !content) {
        alert('Please enter both title and content');
        return;
    }
    
    try {
        submitPostBtn.disabled = true;
        submitPostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Posting...</span>';
        
        // Upload images first
        const imageUrls = await uploadImages();
        
        // Create post object
        const post = {
            id: 'post_' + Date.now(),
            title: title,
            content: content,
            category: postCategorySelect.value,
            author: {
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar
            },
            images: imageUrls,
            likes: 0,
            comments: 0,
            shares: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore
        await db.collection('posts').doc(post.id).set(post);
        
        // Clear form
        clearPostForm();
        
        // Reload posts
        loadPosts();
        
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Error creating post. Please try again.');
    } finally {
        submitPostBtn.disabled = false;
        submitPostBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>Post</span>';
    }
}

// Clear post form
function clearPostForm() {
    postTitleInput.value = '';
    postContentInput.value = '';
    selectedImages = [];
    updateImagePreviews();
    uploadProgress.style.display = 'none';
}

// Open image modal
function openImageModal(images, startIndex) {
    currentImages = images;
    currentImageIndex = startIndex;
    updateModalImage();
    imageModal.classList.add('active');
}

// Update modal image
function updateModalImage() {
    if (currentImages.length === 0) return;
    
    modalImage.src = currentImages[currentImageIndex];
    imageCounter.textContent = `${currentImageIndex + 1}/${currentImages.length}`;
    
    // Show/hide navigation buttons
    prevImageBtn.style.display = currentImages.length > 1 ? 'flex' : 'none';
    nextImageBtn.style.display = currentImages.length > 1 ? 'flex' : 'none';
}

// Show previous image
function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    updateModalImage();
}

// Show next image
function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    updateModalImage();
}

// Like post
function likePost(postId) {
    const likeBtn = event.target.closest('.like');
    likeBtn.classList.toggle('liked');
    
    // Update Firestore
    db.collection('posts').doc(postId).update({
        likes: firebase.firestore.FieldValue.increment(1)
    });
}

// Comment on post
function commentOnPost(postId) {
    alert('Comment functionality to be implemented');
}

// Share post
function sharePost(postId) {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this post from Palm Aegis Community',
            url: window.location.href
        });
    } else {
        alert('Share link copied to clipboard!');
        navigator.clipboard.writeText(window.location.href);
    }
}

// Search posts
async function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        searchResults.innerHTML = '<p class="no-results">Enter search terms above</p>';
        return;
    }
    
    try {
        searchResults.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><span>Searching...</span></div>';
        
        const snapshot = await db.collection('posts')
            .orderBy('timestamp', 'desc')
            .get();
        
        const results = [];
        snapshot.forEach(doc => {
            const post = doc.data();
            const searchText = (post.title + ' ' + post.content).toLowerCase();
            
            if (searchText.includes(query)) {
                results.push(post);
            }
        });
        
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="no-results">No posts found</p>';
        } else {
            searchResults.innerHTML = '';
            results.forEach(post => {
                const postElement = createPostElement(post);
                searchResults.appendChild(postElement);
            });
        }
    } catch (error) {
        console.error('Error searching posts:', error);
        searchResults.innerHTML = '<p class="error">Error searching posts</p>';
    }
}

// Utility Functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval === 1 ? '' : 's') + ' ago';
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval === 1 ? '' : 's') + ' ago';
    
    return 'just now';
}

function getCategoryClass(category) {
    const classes = {
        'general': 'general',
        'question': 'question',
        'announcement': 'announcement',
        'idea': 'idea'
    };
    return classes[category] || 'general';
}

function getCategoryText(category) {
    const texts = {
        'general': '💬 General',
        'question': '❓ Question',
        'announcement': '📢 News',
        'idea': '💡 Idea'
    };
    return texts[category] || 'General';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the app
loadPosts();

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove('active');
    }
    if (e.target === searchModal) {
        searchModal.classList.remove('active');
    }
});
