document.addEventListener('DOMContentLoaded', () => {
    // Check if firebase is initialized
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error('Firebase not initialized! Make sure to include Firebase SDKs before this script.');
        return;
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Logout Functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'signin.html';
            }).catch((error) => {
                console.error('Logout error:', error);
                alert('Error logging out: ' + error.message);
            });
        });
    }

    // User Profile in Sidebar
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            updateSidebarProfile(user);
        } else {
            // Optional: Redirect to login if not authenticated
            // window.location.href = 'signin.html';
            const userMini = document.querySelector('.user-profile-mini');
            if (userMini) {
                const userName = userMini.querySelector('.user-name');
                if (userName) userName.textContent = 'Guest';
            }
        }
    });

    async function updateSidebarProfile(user) {
        const userMini = document.querySelector('.user-profile-mini');
        if (!userMini) return;

        const userName = userMini.querySelector('.user-name');
        const userRole = userMini.querySelector('.user-role');
        const userAvatar = userMini.querySelector('.user-avatar');

        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                
                // Update Name
                if (userName) {
                    userName.textContent = data.firstName && data.lastName 
                        ? `${data.firstName} ${data.lastName}` 
                        : (data.username || user.displayName || user.email.split('@')[0]);
                }

                // Update Role
                if (userRole) {
                    userRole.textContent = data.bio || 'Farmer'; // Using bio as role/title fallback
                }

                // Update Avatar
                if (userAvatar) {
                    if (data.imageBase64) {
                        userAvatar.src = data.imageBase64;
                    } else if (data.picture) {
                        userAvatar.src = data.picture;
                    } else if (data.photoURL) {
                        userAvatar.src = data.photoURL;
                    }
                }
            } else {
                // Fallback if no user doc
                if (userName) userName.textContent = user.displayName || user.email.split('@')[0];
            }
        } catch (error) {
            console.error('Error fetching user profile for sidebar:', error);
        }
    }
});
