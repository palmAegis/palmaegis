import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { 
    getAuth,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile
    
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { 
    getFirestore, 
    setDoc, 
    doc,
    updateDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ✅ Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAf-wtZpl8wVjCymdLlC-YGlv7xn0yEMMU",
    authDomain: "palmaegis-setup.firebaseapp.com",
    projectId: "palmaegis-setup",
    storageBucket: "palmaegis-setup.firebasestorage.app",
    messagingSenderId: "445887502374",
    appId: "1:445887502374:web:a5f6ecaa90b88447626ee7"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Message Display Helper
function showMessage(message, divId, isError = true) {
    const messageDiv = document.getElementById(divId);
    if (!messageDiv) return;

    messageDiv.style.display = "block";
    messageDiv.innerText = message;
    messageDiv.style.color = isError ? "red" : "green";
    messageDiv.style.opacity = 1;

    setTimeout(() => {
        messageDiv.style.opacity = 0;
    }, 5000);
}

// ✅ Handle Sign Up
const signUpBtn = document.getElementById('submitSignUp');
if (signUpBtn) {
    signUpBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        const email = document.getElementById('rEmail').value.trim();
        const password = document.getElementById('rPassword').value.trim();

        if (!email || !password) {
            showMessage('Email and password are required.', 'signUpMessage');
            return;
        }

        const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_-])[A-Za-z\d@$!%*#?&^_-]{8,}$/;
        if (!strongPasswordRegex.test(password)) {
            showMessage('Password must be at least 8 characters and include letters, numbers, and symbols.', 'signUpMessage');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                email: email,
                displayName: user.displayName || "",
                imageBase64: "", // ✅ Empty Base64 placeholder
                role: "user",
                createdAt: new Date(),
                status: "active"
            });

            showMessage('Account created successfully!', 'signUpMessage', false);
            setTimeout(() => window.location.href = 'signin.html', 1000);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                showMessage('Email address already in use!', 'signUpMessage');
            } else {
                showMessage('Failed to create account: ' + error.message, 'signUpMessage');
            }
        }
    });
}

// ✅ Handle Sign In
const signInBtn = document.getElementById('submitSignIn');
if (signInBtn) {
    signInBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!email || !password) {
            showMessage('Email and password are required.', 'signInMessage');
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            localStorage.setItem('loggedInUserId', user.uid);

            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { lastLogin: serverTimestamp() });

            const userDocSnap = await getDoc(userDocRef);
            showMessage('Login successful!', 'signInMessage', false);

            // ✅ Load avatar after login
            await loadUserAvatarFromFirestore(user.uid);

            setTimeout(() => {
                if (userDocSnap.exists() && userDocSnap.data().role === "admin") {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'homepage.html';
                }
            }, 1000);
        } catch (error) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                showMessage('Incorrect email or password.', 'signInMessage');
            } else {
                showMessage('Login failed: ' + error.message, 'signInMessage');
            }
        }
    });
}

// ✅ Handle Forgot Password - FIXED VERSION
const resetForm = document.getElementById('resetPasswordForm');

if (resetForm) {
    // Helper function for loading state
    const setLoadingState = (isLoading) => {
        const resetBtn = document.getElementById('resetBtn');
        const btnText = document.getElementById('btnText');
        const btnLoading = document.getElementById('btnLoading');
        if (!resetBtn || !btnText || !btnLoading) return;

        if (isLoading) {
            resetBtn.disabled = true;
            btnText.textContent = 'Sending...';
            btnLoading.style.display = 'inline-block';
        } else {
            resetBtn.disabled = false;
            btnText.textContent = 'Send Reset Link';
            btnLoading.style.display = 'none';
        }
    }
    
    // Helper function to show messages - FIXED VERSION
    const showResetMessage = (message, type = 'error') => {
        const successDiv = document.getElementById('successMessage');
        const errorDiv = document.getElementById('errorMessage');
        const infoDiv = document.getElementById('infoMessage');

        // Hide all messages first
        if (successDiv) successDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        if (infoDiv) infoDiv.style.display = 'none';
        
        // Show the appropriate message
        switch(type) {
            case 'success':
                if (successDiv) {
                    successDiv.style.display = 'block';
                }
                break;
            case 'error':
                if (errorDiv && message) {
                    errorDiv.textContent = message;
                    errorDiv.style.display = 'block';
                }
                break;
            case 'info':
                if (infoDiv && message) {
                    infoDiv.textContent = message;
                    infoDiv.style.display = 'block';
                }
                break;
        }
    };

    resetForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            showResetMessage('Please enter your email address.', 'error');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showResetMessage('Please enter a valid email address.', 'error');
            return;
        }

        setLoadingState(true);
        showResetMessage(`Sending reset link to ${email}...`, 'info');

        try {
            console.log('Attempting to send password reset email to:', email);
            
            // The Firebase function that sends the password reset email
            await sendPasswordResetEmail(auth, email);
            
            // Success
            showResetMessage('', 'success');
            resetForm.reset();
            console.log('✅ Password reset email sent successfully!');

        } catch (error) {
            console.error('Firebase password reset error:', error);
            
            let errorMsg = 'An error occurred. Please try again.';
            
            // Handle specific Firebase auth errors
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMsg = 'No account found with this email address.';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Please enter a valid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMsg = 'Too many attempts. Please try again in a few minutes.';
                    break;
                case 'auth/network-request-failed':
                    errorMsg = 'Network error. Please check your internet connection.';
                    break;
                default:
                    errorMsg = `Error: ${error.message}`;
            }
            
            showResetMessage(errorMsg, 'error');
            console.error('Error sending password reset email:', error);

        } finally {
            setLoadingState(false);
        }
    });
}

// ✅ Logout Button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            localStorage.removeItem('loggedInUserId');
            window.location.href = 'signin.html';
        }).catch((error) => {
            console.error('Logout error:', error);
        });
    });
}

// ✅ Helper: Load user avatar (Base64) from Firestore
export async function loadUserAvatarFromFirestore(userId) {
    try {
        const userDocRef = doc(db, "users", userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const base64Image = data.imageBase64 || data.image || data.photoURL || "";
            updateAllAvatars(base64Image || "images/user-avatar.jpg");
            return base64Image;
        } else {
            updateAllAvatars("images/user-avatar.jpg");
            return null;
        }
    } catch (error) {
        console.error("Error loading avatar:", error);
        updateAllAvatars("images/user-avatar.jpg");
        return null;
    }
}

// ✅ Update all avatars (Base64 + fallback)
export function updateAllAvatars(imageSource) {
    console.log('Updating avatars with:', imageSource);

    const avatarSelectors = [
        '.user-avatar',
        '.profile-avatar img',
        '.user-profile-mini img',
        '.profile-btn img',
        '.header-avatar img',
        '[class*="avatar"] img',
        '.sidebar-footer img'
    ];

    let avatarElements = [];
    avatarSelectors.forEach(selector => {
        avatarElements = [...avatarElements, ...document.querySelectorAll(selector)];
    });

    avatarElements = [...new Set(avatarElements)];

    avatarElements.forEach(avatar => {
        if (imageSource && imageSource.startsWith("data:image/")) {
            avatar.src = imageSource; // ✅ Base64
        } else if (imageSource && !imageSource.includes('user-avatar.jpg')) {
            avatar.src = imageSource; // ✅ Normal URL
        } else {
            avatar.src = 'images/user-avatar.jpg'; // ✅ Default
        }

        avatar.onerror = function() {
            this.src = 'images/user-avatar.jpg';
        };
    });
}

// ✅ Update user profile with Base64 image
export async function updateUserProfileWithPhoto(user, base64Image, displayName = '') {
    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            imageBase64: base64Image,
            displayName: displayName || user.displayName || '',
            updatedAt: serverTimestamp()
        });

        await updateProfile(user, { displayName: displayName || user.displayName });
        updateAllAvatars(base64Image);
        console.log("✅ Profile updated with Base64");
        return true;
    } catch (err) {
        console.error("❌ Error updating Base64 image:", err);
        return false;
    }
}