// adminforum.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const logoutBtn = document.getElementById('logout-btn');
    const totalPostsEl = document.getElementById('total-posts');
    const totalRepliesEl = document.getElementById('total-replies');
    const activeUsersEl = document.getElementById('active-users');
    const popularCategoryEl = document.getElementById('popular-category');
    const postsTableBody = document.getElementById('posts-table-body');
    
    // Charts
    let categoryChart, timelineChart;
    
    // Initialize the admin app
    initAdminApp();
    
    function initAdminApp() {
        // Set up authentication state observer
        auth.onAuthStateChanged(user => {
            if (user) {
                loadAdminData();
            } else {
                // Redirect to login or show login modal
                window.location.href = 'forum.html';
            }
        });
        
        // Event listeners
        logoutBtn.addEventListener('click', signOut);
    }
    
    function signOut() {
        auth.signOut()
            .then(() => {
                window.location.href = 'forum.html';
            })
            .catch(error => {
                alert('Error signing out: ' + error.message);
            });
    }
    
    function loadAdminData() {
        // Load all posts for analysis
        db.collection('posts').orderBy('createdAt', 'desc').get()
            .then(snapshot => {
                const posts = [];
                let totalReplies = 0;
                const categoryCount = {};
                const userActivity = {};
                const timelineData = {};
                
                snapshot.forEach(doc => {
                    const post = doc.data();
                    post.id = doc.id;
                    posts.push(post);
                    
                    // Count replies
                    if (post.replies) {
                        totalReplies += post.replies.length;
                    }
                    
                    // Count by category
                    categoryCount[post.category] = (categoryCount[post.category] || 0) + 1;
                    
                    // Track user activity
                    userActivity[post.authorId] = true;
                    if (post.replies) {
                        post.replies.forEach(reply => {
                            userActivity[reply.authorId] = true;
                        });
                    }
                    
                    // Prepare timeline data
                    if (post.createdAt) {
                        const date = new Date(post.createdAt.toDate());
                        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                        timelineData[dateKey] = (timelineData[dateKey] || 0) + 1;
                    }
                });
                
                // Update stats
                totalPostsEl.textContent = posts.length;
                totalRepliesEl.textContent = totalReplies;
                activeUsersEl.textContent = Object.keys(userActivity).length;
                
                // Find most popular category
                let maxCount = 0;
                let popularCategory = '-';
                for (const category in categoryCount) {
                    if (categoryCount[category] > maxCount) {
                        maxCount = categoryCount[category];
                        popularCategory = category;
                    }
                }
                popularCategoryEl.textContent = popularCategory;
                
                // Create charts
                createCategoryChart(categoryCount);
                createTimelineChart(timelineData);
                
                // Populate posts table
                populatePostsTable(posts);
            })
            .catch(error => {
                console.error('Error loading admin data: ', error);
            });
    }
    
    function createCategoryChart(categoryData) {
        const ctx = document.getElementById('category-chart').getContext('2d');
        
        if (categoryChart) {
            categoryChart.destroy();
        }
        
        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const backgroundColors = [
            '#2c7744', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b'
        ];
        
        categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    function createTimelineChart(timelineData) {
        const ctx = document.getElementById('timeline-chart').getContext('2d');
        
        if (timelineChart) {
            timelineChart.destroy();
        }
        
        // Sort dates
        const sortedDates = Object.keys(timelineData).sort();
        const data = sortedDates.map(date => timelineData[date]);
        
        timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Posts',
                    data: data,
                    backgroundColor: 'rgba(44, 119, 68, 0.2)',
                    borderColor: '#2c7744',
                    borderWidth: 2,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    function populatePostsTable(posts) {
        postsTableBody.innerHTML = '';
        
        if (posts.length === 0) {
            postsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No posts found.</td></tr>';
            return;
        }
        
        posts.forEach(post => {
            const row = document.createElement('tr');
            
            const date = post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : 'Date unknown';
            const repliesCount = post.replies ? post.replies.length : 0;
            const voteCount = (post.upvotes || 0) - (post.downvotes || 0);
            
            row.innerHTML = `
                <td>${post.title}</td>
                <td>${post.category}</td>
                <td>${post.author}</td>
                <td>${date}</td>
                <td>${repliesCount}</td>
                <td>${voteCount}</td>
                <td>
                    <button class="action-btn delete-btn" data-id="${post.id}">Delete</button>
                </td>
            `;
            
            postsTableBody.appendChild(row);
        });
        
        // Add event listeners to delete buttons
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const postId = e.target.dataset.id;
                deletePost(postId);
            });
        });
    }
    
    function deletePost(postId) {
        if (confirm('Are you sure you want to delete this post?')) {
            db.collection('posts').doc(postId).delete()
                .then(() => {
                    alert('Post deleted successfully.');
                    loadAdminData(); // Refresh the data
                })
                .catch(error => {
                    console.error('Error deleting post: ', error);
                    alert('Error deleting post.');
                });
        }
    }
});