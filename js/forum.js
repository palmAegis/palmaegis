// ✅ Firebase config
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

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const categoryTabs = document.querySelectorAll('.category-tabs .tab');
const createPostFab = document.getElementById('createPostFab');
const searchBtn = document.getElementById('searchBtn');
const searchModal = document.getElementById('searchModal');
const closeSearch = document.getElementById('closeSearch');
const searchInput = document.getElementById('searchInput');
const submitPost = document.getElementById('submitPost');
const cancelPost = document.getElementById('cancelPost');

// Current filter state
let currentFilter = {
    category: 'all',
    search: ''
};

// Cache for all posts to avoid repeated Firestore calls
let allPostsCache = [];
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds

// Initialize the forum
function initForum() {
    setupEventListeners();
    setupCategoryFilters();
    checkAuthState();
}

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('User is signed in:', user.email);
            loadPosts();
        } else {
            console.log('No user signed in');
            // Allow viewing posts without login, but show login prompt for interactions
            loadPosts();
            showNotification('Sign in to post and interact with the community', 'info');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Floating action button
    if (createPostFab) {
        createPostFab.addEventListener('click', () => {
            const user = auth.currentUser;
            if (!user) {
                showNotification('Please sign in to create a post', 'error');
                return;
            }
            document.querySelector('.create-post-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
            document.getElementById('postTitle').focus();
        });
    }

    // Search functionality
    if (searchBtn && searchModal) {
        searchBtn.addEventListener('click', () => {
            searchModal.classList.add('active');
            searchInput.focus();
        });

        closeSearch.addEventListener('click', () => {
            searchModal.classList.remove('active');
            searchInput.value = '';
            currentFilter.search = '';
            loadPosts();
        });

        searchInput.addEventListener('input', (e) => {
            currentFilter.search = e.target.value;
            loadPosts();
        });
    }

    // Post submission
    if (submitPost) {
        submitPost.addEventListener('click', handlePostSubmit);
    }
    
    if (cancelPost) {
        cancelPost.addEventListener('click', clearPostForm);
    }

    // Enter key to submit post
    const postTitle = document.getElementById('postTitle');
    const postContent = document.getElementById('postContent');
    
    if (postTitle) {
        postTitle.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePostSubmit();
            }
        });
    }

    if (postContent) {
        postContent.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                handlePostSubmit();
            }
        });
    }
}

// Get user's profile data (name + avatar) from Firestore
async function getUserProfile(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('User data from Firestore:', userData); // Debug
            
            // Extract full name
            let fullName = '';
            if (userData.firstName) {
                fullName = userData.firstName;
                if (userData.lastName) {
                    fullName += ' ' + userData.lastName;
                }
            } else if (userData.username) {
                fullName = userData.username;
            } else if (userData.displayName) {
                fullName = userData.displayName;
            }
            
            // Extract profile image - prioritize imageBase64
            const profileImage = userData.imageBase64 || userData.profileImage || userData.avatar || null;
            console.log('Profile image found:', profileImage ? 'Yes (' + (profileImage.startsWith('data:image') ? 'Base64' : 'URL') + ')' : 'No');
            
            return {
                fullName: fullName || null,
                profileImage: profileImage,
                isExpert: userData.isExpert || false
            };
        }
        console.log('No user document found for ID:', userId);
        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

// Handle post submission
async function handlePostSubmit() {
    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const categoryInput = document.getElementById('postCategory');
    
    if (!titleInput || !contentInput || !categoryInput) {
        showNotification('Post form elements not found', 'error');
        return;
    }
    
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = categoryInput.value;
    
    if (!title || !content) {
        showNotification('Please fill in both title and content', 'error');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        showNotification('Please sign in to post', 'error');
        return;
    }
    
    try {
        submitPost.disabled = true;
        submitPost.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        
        // Get user's profile from Firestore
        const userProfile = await getUserProfile(user.uid);
        console.log('User profile data for post:', userProfile); // Debug log
        
        let authorName = userProfile?.fullName;
        let authorAvatar = userProfile?.profileImage;
        const isExpert = userProfile?.isExpert || false;
        
        // If no fullName in Firestore, fallback to displayName or email
        if (!authorName) {
            if (user.displayName) {
                authorName = user.displayName;
            } else {
                authorName = user.email ? user.email.split('@')[0] : 'Anonymous';
            }
        }
        
        // Debug: Check what avatar data we have
        console.log('Author Avatar:', authorAvatar ? (authorAvatar.substring(0, 50) + '...') : 'No avatar');
        
        // Create post data
        const postData = {
            title: title,
            content: content,
            category: category,
            authorId: user.uid,
            authorName: authorName,
            authorAvatar: authorAvatar, // Store the imageBase64 directly
            authorEmail: user.email || '',
            isExpert: isExpert,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: [],
            comments: [],
            likeCount: 0,
            commentCount: 0,
            views: 0
        };
        
        console.log('Creating post with author:', authorName, 'has avatar?', !!authorAvatar);
        
        // Add to Firestore
        const docRef = await db.collection('posts').add(postData);
        console.log('Post created with ID:', docRef.id);
        
        // Clear cache to force reload of posts
        allPostsCache = [];
        cacheTimestamp = null;
        
        clearPostForm();
        showNotification('Post created successfully!', 'success');
        loadPosts(); // Reload to show the new post
        
    } catch (error) {
        console.error('Error posting: ', error);
        showNotification('Error creating post: ' + error.message, 'error');
    } finally {
        submitPost.disabled = false;
        submitPost.innerHTML = '<i class="fas fa-paper-plane"></i><span>Post</span>';
    }
}

// Clear post form
function clearPostForm() {
    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const categoryInput = document.getElementById('postCategory');
    
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
    if (categoryInput) categoryInput.value = 'general';
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Load all posts from Firestore and filter client-side
async function loadAllPosts() {
    try {
        console.log('Loading all posts from Firestore...');
        
        const querySnapshot = await db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        
        const posts = [];
        querySnapshot.forEach(doc => {
            const post = doc.data();
            const postId = doc.id;
            
            // Debug: Check what data we have for each post
            console.log(`Post ${postId}:`, {
                authorName: post.authorName,
                hasAvatar: !!post.authorAvatar,
                avatarType: post.authorAvatar ? (post.authorAvatar.startsWith('data:image') ? 'Base64' : 'URL') : 'None'
            });
            
            posts.push({ ...post, id: postId });
        });
        
        // Update cache
        allPostsCache = posts;
        cacheTimestamp = Date.now();
        
        console.log(`Loaded ${posts.length} posts into cache`);
        return posts;
        
    } catch (error) {
        console.error('Error loading posts from Firestore: ', error);
        throw error;
    }
}

// Check if cache is still valid
function isCacheValid() {
    if (!allPostsCache.length || !cacheTimestamp) return false;
    return (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

// Load posts with client-side filtering
async function loadPosts() {
    try {
        if (!postsContainer) {
            console.error('postsContainer not found');
            return;
        }
        
        postsContainer.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <span>Loading posts...</span>
            </div>
        `;
        
        // Load posts (from cache or Firestore)
        let posts = [];
        if (isCacheValid()) {
            console.log('Using cached posts');
            posts = allPostsCache;
        } else {
            posts = await loadAllPosts();
        }
        
        postsContainer.innerHTML = '';
        
        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No posts found</h3>
                    <p>Be the first to start a conversation!</p>
                </div>
            `;
            return;
        }
        
        // Apply category filter client-side
        let filteredPosts = posts;
        if (currentFilter.category !== 'all') {
            filteredPosts = posts.filter(post => post.category === currentFilter.category);
            console.log(`Filtered to ${filteredPosts.length} posts in category: ${currentFilter.category}`);
        }
        
        // Apply search filter client-side
        if (currentFilter.search) {
            const searchTerm = currentFilter.search.toLowerCase();
            filteredPosts = filteredPosts.filter(post => 
                post.title.toLowerCase().includes(searchTerm) ||
                post.content.toLowerCase().includes(searchTerm) ||
                (post.authorName && post.authorName.toLowerCase().includes(searchTerm))
            );
            console.log(`Filtered to ${filteredPosts.length} posts after search`);
        }
        
        if (filteredPosts.length === 0) {
            const categoryLabel = getCategoryInfo(currentFilter.category).label;
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No matching posts</h3>
                    <p>${currentFilter.search ? 
                        'Try adjusting your search terms' : 
                        `No posts found in ${categoryLabel} category`}
                    </p>
                    ${currentFilter.category !== 'all' ? 
                        `<p style="font-size: 14px; color: #666; margin-top: 10px;">
                            Showing ${filteredPosts.length} of ${posts.length} total posts
                        </p>` : ''}
                </div>
            `;
            return;
        }
        
        // Display posts count info
        const categoryLabel = getCategoryInfo(currentFilter.category).label;
        console.log(`Displaying ${filteredPosts.length} posts in category: ${categoryLabel}`);
        
        // Show category info
        if (currentFilter.category !== 'all') {
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.innerHTML = `
                <div class="category-info">
                    <span class="category-icon">${getCategoryInfo(currentFilter.category).icon}</span>
                    <span class="category-label">${categoryLabel}</span>
                    <span class="post-count">${filteredPosts.length} posts</span>
                </div>
            `;
            postsContainer.appendChild(categoryHeader);
        }
        
        // Display posts
        filteredPosts.forEach(post => {
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
        });
        
    } catch (error) {
        console.error('Error loading posts: ', error);
        if (postsContainer) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error loading posts</h3>
                    <p>Please try again later</p>
                    <p style="font-size: 12px; margin-top: 10px;">Error: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Set up category filtering with client-side only
function setupCategoryFilters() {
    if (!categoryTabs || categoryTabs.length === 0) {
        console.log('No category tabs found');
        return;
    }
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Get the category from data attribute
            const category = tab.dataset.category;
            
            // Update active state visually
            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update filter state
            currentFilter.category = category;
            
            console.log(`Category changed to: ${category}`);
            
            // Show loading state for category change
            if (postsContainer) {
                const categoryLabel = getCategoryInfo(category).label;
                postsContainer.innerHTML = `
                    <div class="loading-indicator">
                        <div class="loading-spinner"></div>
                        <span>Filtering ${category === 'all' ? 'all' : categoryLabel} posts...</span>
                    </div>
                `;
            }
            
            // Apply filters client-side (no Firestore call needed if cache is valid)
            setTimeout(() => {
                loadPosts();
            }, 100); // Small delay for better UX
        });
    });
}

// Create post element with new design
function createPostElement(post) {
    const postDate = post.createdAt ? 
        (post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt)).toLocaleString() : 'Just now';
    
    const user = auth.currentUser;
    const hasLiked = user && post.likes && post.likes.includes(user.uid);
    
    // Get category info
    const categoryInfo = getCategoryInfo(post.category);
    
    // Create avatar HTML - use profile image if available, otherwise use initials
    let avatarHtml = '';
    if (post.authorAvatar) {
        console.log(`Creating avatar for post ${post.id}: Using image`);
        avatarHtml = `<img src="${post.authorAvatar}" alt="${post.authorName || 'User'}" 
                         onerror="console.error('Failed to load image for post ${post.id}'); this.onerror=null; this.parentElement.innerHTML='<div class=\'avatar-initial\'>${post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}</div>';" />`;
    } else {
        console.log(`Creating avatar for post ${post.id}: Using initial`);
        avatarHtml = `<div class="avatar-initial">${post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}</div>`;
    }
    
    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.dataset.postId = post.id;
    
    postElement.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <div class="author-avatar">
                    ${avatarHtml}
                </div>
                <div class="author-info">
                    <div class="author-name">
                        ${post.authorName || 'Unknown User'}
                        ${post.isExpert ? '<span class="expert-badge"><i class="fas fa-star"></i> Expert</span>' : ''}
                    </div>
                    <div class="post-meta">
                        <span>${postDate}</span>
                        <span class="post-category ${categoryInfo.class}">
                            ${categoryInfo.icon} ${categoryInfo.label}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="post-title">${post.title || 'Untitled'}</div>
        <div class="post-content">${post.content || 'No content'}</div>
        <div class="post-footer">
            <div class="post-actions-bar">
                <button class="post-action like-action ${hasLiked ? 'liked' : ''}" data-post-id="${post.id}">
                    <i class="fas fa-heart"></i>
                    <span class="like-count">${post.likeCount || 0}</span>
                </button>
                <button class="post-action comment-action" data-post-id="${post.id}">
                    <i class="fas fa-comment"></i>
                    <span class="comment-count">${post.commentCount || 0}</span>
                </button>
            </div>
        </div>
        <div class="comments-container" id="comments-${post.id}" style="display: none;">
            <div class="add-comment">
                <textarea class="comment-input" placeholder="Write a comment..."></textarea>
                <button class="submit-comment" data-post-id="${post.id}">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
            <div class="comments-list" id="comments-list-${post.id}"></div>
        </div>
    `;
    
    // Add event listeners
    const likeBtn = postElement.querySelector('.like-action');
    const commentBtn = postElement.querySelector('.comment-action');
    const submitCommentBtn = postElement.querySelector('.submit-comment');
    
    if (likeBtn) likeBtn.addEventListener('click', handleLike);
    if (commentBtn) commentBtn.addEventListener('click', toggleComments);
    if (submitCommentBtn) submitCommentBtn.addEventListener('click', handleCommentSubmit);
    
    return postElement;
}

// Get category information
function getCategoryInfo(category) {
    const categories = {
        all: { label: 'All Posts', icon: '🌐', class: 'category-all' },
        general: { label: 'General', icon: '💬', class: 'category-general' },
        question: { label: 'Questions', icon: '❓', class: 'category-question' },
        announcement: { label: 'News', icon: '📢', class: 'category-announcement' },
        idea: { label: 'Ideas', icon: '💡', class: 'category-idea' },
        diseases: { label: 'Diseases', icon: '🌱', class: 'category-diseases' },
        treatments: { label: 'Treatments', icon: '💊', class: 'category-treatments' }
    };
    return categories[category] || categories.general;
}

// Handle like/unlike
async function handleLike(e) {
    const postId = e.currentTarget.dataset.postId;
    const user = auth.currentUser;
    
    if (!user) {
        showNotification('Please sign in to like posts', 'error');
        return;
    }
    
    try {
        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) {
            showNotification('Post not found', 'error');
            return;
        }
        
        const postData = postDoc.data();
        const likes = postData.likes || [];
        const hasLiked = likes.includes(user.uid);
        
        if (hasLiked) {
            // Unlike
            await postRef.update({
                likes: firebase.firestore.FieldValue.arrayRemove(user.uid),
                likeCount: firebase.firestore.FieldValue.increment(-1)
            });
            showNotification('Post unliked', 'info');
        } else {
            // Like
            await postRef.update({
                likes: firebase.firestore.FieldValue.arrayUnion(user.uid),
                likeCount: firebase.firestore.FieldValue.increment(1)
            });
            showNotification('Post liked!', 'success');
        }
        
        // Clear cache to force reload
        allPostsCache = [];
        cacheTimestamp = null;
        
        // Reload posts to update UI
        loadPosts();
        
    } catch (error) {
        console.error('Like error:', error);
        showNotification('Error updating like: ' + error.message, 'error');
    }
}

// Toggle comments visibility
function toggleComments(e) {
    const postId = e.currentTarget.dataset.postId;
    const commentsContainer = document.getElementById(`comments-${postId}`);
    
    if (!commentsContainer) {
        console.error('Comments container not found for post:', postId);
        return;
    }
    
    if (commentsContainer.style.display === 'none') {
        commentsContainer.style.display = 'block';
        loadComments(postId);
    } else {
        commentsContainer.style.display = 'none';
    }
}

// Load comments for a post
async function loadComments(postId) {
    try {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (!commentsList) {
            console.error('Comments list not found for post:', postId);
            return;
        }
        
        commentsList.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><span>Loading comments...</span></div>';
        
        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) {
            commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Post not found</p>';
            return;
        }
        
        const postData = postDoc.data();
        const comments = postData.comments || [];
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">No comments yet. Be the first to comment!</p>';
            return;
        }
        
        // Sort comments by date (newest first)
        comments.sort((a, b) => {
            const dateA = a.createdAt || 0;
            const dateB = b.createdAt || 0;
            return dateB - dateA;
        });
        
        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentDate = comment.createdAt ? 
                new Date(comment.createdAt).toLocaleString() : 'Recently';
            
            // Create comment avatar HTML
            let commentAvatarHtml = '';
            if (comment.authorAvatar) {
                commentAvatarHtml = `<img src="${comment.authorAvatar}" alt="${comment.authorName || 'User'}" 
                                      onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'avatar-initial\'>${comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}</div>';" />`;
            } else {
                commentAvatarHtml = `<div class="avatar-initial">${comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}</div>`;
            }
            
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.innerHTML = `
                <div class="comment-author">
                    <div class="comment-avatar">
                        ${commentAvatarHtml}
                    </div>
                    <div class="comment-info">
                        <div class="comment-meta">
                            <span class="comment-author-name">${comment.authorName || 'Unknown User'}</span>
                            ${comment.isExpert ? '<span class="expert-badge"><i class="fas fa-star"></i> Expert</span>' : ''}
                            <span class="comment-time">${commentDate}</span>
                        </div>
                        <div class="comment-content">${comment.content || ''}</div>
                    </div>
                </div>
            `;
            commentsList.appendChild(commentElement);
        });
        
    } catch (error) {
        console.error('Error loading comments: ', error);
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (commentsList) {
            commentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Error loading comments. Please try again.</p>';
        }
    }
}

// Handle comment submission
async function handleCommentSubmit(e) {
    const postId = e.currentTarget.dataset.postId;
    const user = auth.currentUser;
    const commentInput = e.currentTarget.previousElementSibling;
    
    if (!commentInput) {
        showNotification('Comment input not found', 'error');
        return;
    }
    
    const content = commentInput.value.trim();
    
    if (!user) {
        showNotification('Please sign in to comment', 'error');
        return;
    }
    
    if (!content) {
        showNotification('Please enter a comment', 'error');
        return;
    }
    
    try {
        const postRef = db.collection('posts').doc(postId);
        
        // Get user's profile from Firestore
        const userProfile = await getUserProfile(user.uid);
        
        let authorName = userProfile?.fullName;
        let authorAvatar = userProfile?.profileImage;
        const isExpert = userProfile?.isExpert || false;
        
        // If no fullName in Firestore, fallback to displayName or email
        if (!authorName) {
            if (user.displayName) {
                authorName = user.displayName;
            } else {
                authorName = user.email ? user.email.split('@')[0] : 'Anonymous';
            }
        }
        
        console.log('Comment author avatar:', authorAvatar ? 'Yes' : 'No');
        
        const newComment = {
            content,
            authorId: user.uid,
            authorName: authorName,
            authorAvatar: authorAvatar,
            isExpert: isExpert,
            createdAt: Date.now()
        };
        
        await postRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion(newComment),
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
        
        // Clear cache to force reload
        allPostsCache = [];
        cacheTimestamp = null;
        
        // Clear input
        commentInput.value = '';
        
        // Refresh comments
        loadComments(postId);
        
        showNotification('Comment posted successfully!', 'success');
        
    } catch (error) {
        console.error('Error posting comment: ', error);
        showNotification('Error posting comment: ' + error.message, 'error');
    }
}

// Add CSS for styling
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .loading-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px;
        color: #666;
    }
    
    .loading-spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #2c7744;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #666;
    }
    
    .empty-state i {
        font-size: 48px;
        margin-bottom: 20px;
        color: #ccc;
    }
    
    .empty-state h3 {
        margin-bottom: 10px;
        color: #333;
    }
    
    .category-header {
        background: #f8f9fa;
        padding: 15px 20px;
        border-radius: 10px;
        margin-bottom: 20px;
        border-left: 4px solid #2c7744;
    }
    
    .category-info {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .category-icon {
        font-size: 1.2em;
    }
    
    .category-label {
        font-weight: 600;
        color: #2c7744;
        font-size: 1.1em;
    }
    
    .post-count {
        background: #2c7744;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        margin-left: auto;
    }
    
    /* Avatar styles */
    .author-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #2e7d32;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
    }
    
    .author-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
    
    .avatar-initial {
        color: white;
        font-weight: 600;
        font-size: 1.2rem;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .comment-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #2e7d32;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
    }
    
    .comment-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
    
    .comment-avatar .avatar-initial {
        font-size: 1rem;
        color: white;
        font-weight: 600;
    }
    
    .comment-author {
        display: flex;
        gap: 12px;
        align-items: flex-start;
    }
    
    .comment-info {
        flex: 1;
    }
    
    .comment-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
    }
    
    .comment-author-name {
        font-weight: 600;
        color: #333;
    }
    
    .comment-time {
        color: #666;
        font-size: 0.85rem;
    }
    
    .comment-content {
        color: #444;
        line-height: 1.5;
    }
    
    .expert-badge {
        background-color: #ff9800;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    
    .expert-badge i {
        font-size: 0.7rem;
    }
`;
document.head.appendChild(style);

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initForum);

// Export functions for global access (useful for debugging)
window.forumApp = {
    initForum,
    loadPosts,
    handlePostSubmit,
    showNotification,
    getUserProfile,
    auth
};