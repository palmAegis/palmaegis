// Farm Data - Data storage for farmer interface with Firebase integration

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAf-wtZpl8wVjCymdLlC-YGlv7xn0yEMMU",
    authDomain: "palmaegis-setup.firebaseapp.com",
    projectId: "palmaegis-setup",
    storageBucket: "palmaegis-setup.firebasestorage.app",
    messagingSenderId: "445887502374",
    appId: "1:445887502374:web:a5f6ecaa90b88447626ee7"
};

console.log('🚀 Starting Firebase initialization...');

// Initialize Firebase
let db, auth;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
    } else {
        firebase.app(); // Use existing app
        console.log('✅ Firebase already initialized');
    }
    
    // Initialize Firebase services
    db = firebase.firestore();
    auth = firebase.auth();
    
    console.log('✅ Firebase services initialized');
    
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// Farm data array (fallback if Firebase fails)
window.farmData = [];

// Enhanced loadFarmData function with user-specific data
window.loadFarmData = async function() {
    console.log('🔗 loadFarmData called');
    
    try {
        console.log('📡 Attempting to connect to Firebase...');
        
        // Check if Firebase is properly initialized
        if (!db) {
            console.error('❌ Firestore database not initialized');
            // Try to reinitialize
            if (firebase.apps.length) {
                db = firebase.firestore();
                console.log('🔄 Reinitialized Firestore');
            } else {
                throw new Error('Firestore not initialized');
            }
        }
        
        // Get current user
        const user = await window.getCurrentUser();
        if (!user) {
            console.log('⚠️ No user logged in, cannot load farm data');
            window.farmData = [];
            return window.farmData;
        }
        
        console.log('👤 Loading data for user:', user.uid);
        console.log('✅ Firestore is available, making query...');
        
        // Get only the current user's data
        const snapshot = await db.collection('farmData')
            .where('userId', '==', user.uid) // Only get documents for this user
            .orderBy('createdAt', 'desc')
            .get();
            
        console.log('✅ Query completed, processing results...');
        console.log(`📊 Found ${snapshot.size} documents for user ${user.uid}`);
            
        if (snapshot.empty) {
            console.log('ℹ️ No data found for current user');
            window.farmData = [];
        } else {
            window.farmData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Handle Firebase timestamp conversion
                const createdAt = data.createdAt ? 
                    (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : 
                    new Date().toISOString();
                
                return {
                    id: doc.id,
                    ...data,
                    createdAt: createdAt
                };
            });
            console.log(`✅ Farm data loaded from Firebase: ${window.farmData.length} records`);
            if (window.farmData.length > 0) {
                console.log('📝 Sample record:', window.farmData[0]);
            }
        }
        
        return window.farmData;
        
    } catch (error) {
        console.error('❌ Error loading farm data:');
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Fallback to empty array instead of sample data
        window.farmData = [];
        console.log('🔄 Using offline mode with empty data');
        return window.farmData;
    }
};

// Debug function to check Firebase connection and data
window.debugFirebase = async function() {
    console.log('🔍 Debugging Firebase connection...');
    
    try {
        // Test if Firebase is initialized
        if (!firebase.apps.length) {
            console.error('❌ Firebase not initialized');
            return { success: false, error: 'Firebase not initialized' };
        }
        
        // Get current user
        const user = await window.getCurrentUser();
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        console.log('👤 Current user:', user.uid, user.email);
        
        // Test Firestore connection with user-specific query
        const testQuery = await db.collection('farmData')
            .where('userId', '==', user.uid)
            .limit(1)
            .get();
            
        console.log('✅ Firebase connection successful');
        console.log('📊 Documents for current user:', testQuery.size);
        
        // Get all documents for current user to see what's there
        const userDocs = await db.collection('farmData')
            .where('userId', '==', user.uid)
            .get();
            
        console.log('📋 All documents for current user:', userDocs.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        })));
        
        return { 
            success: true, 
            documentCount: userDocs.size,
            userId: user.uid,
            userEmail: user.email
        };
        
    } catch (error) {
        console.error('❌ Firebase debug failed:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code,
            name: error.name
        };
    }
};

// Save farm data to Firebase with user ID
window.saveFarmData = async function(farmData) {
    console.log('💾 saveFarmData called');
    
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        // Get current user
        const user = await window.getCurrentUser();
        if (!user) {
            throw new Error('User must be logged in to save data');
        }
        
        const dataToSave = {
            farmerName: farmData.farmerName,
            locationFarm: farmData.locationFarm,
            soilType: farmData.soilType,
            cropType: farmData.cropType,
            plantingDate: farmData.plantingDate,
            weather: farmData.weather,
            disease: farmData.disease || 'None',
            yield: farmData.yield || null,
            status: 'Pending Review',
            userId: user.uid, // Critical: Store user ID with data
            userEmail: user.email || 'unknown', // Store email for reference
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('📤 Saving data to Firebase for user:', user.uid);
        console.log('Data to save:', dataToSave);
        
        const docRef = await db.collection('farmData').add(dataToSave);
        console.log('✅ Farm data saved with ID:', docRef.id);
        
        // IMPORTANT: Force refresh the data after saving
        await window.loadFarmData();
        
        return docRef.id;
        
    } catch (error) {
        console.error('❌ Error saving farm data:', error);
        
        // Fallback: Save locally with user ID if available
        const user = await window.getCurrentUser();
        const userId = user ? user.uid : 'anonymous';
        const mockId = 'offline-' + Date.now();
        const offlineData = {
            id: mockId,
            ...farmData,
            userId: userId,
            userEmail: user ? user.email : 'offline',
            status: 'Pending Review',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        window.farmData.unshift(offlineData);
        console.log('🔄 Data saved locally (offline mode)');
        
        // Update UI
        if (typeof window.updateFarmDataUI === 'function') {
            window.updateFarmDataUI();
        }
        
        return mockId;
    }
};

// Update farm data in Firebase with user verification
window.updateFarmData = async function(id, updatedData) {
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        // Get current user
        const user = await window.getCurrentUser();
        if (!user) {
            throw new Error('User must be logged in to update data');
        }
        
        // First, verify the document belongs to the current user
        const docRef = db.collection('farmData').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            throw new Error('Document not found');
        }
        
        const docData = doc.data();
        if (docData.userId !== user.uid) {
            throw new Error('Unauthorized: You can only update your own data');
        }
        
        await docRef.update({
            ...updatedData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Farm data updated:', id);
        
    } catch (error) {
        console.error('❌ Error updating farm data:', error);
        throw error;
    }
};

// Delete farm data from Firebase with user verification
window.deleteFarmData = async function(id) {
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        // Get current user
        const user = await window.getCurrentUser();
        if (!user) {
            throw new Error('User must be logged in to delete data');
        }
        
        // First, verify the document belongs to the current user
        const docRef = db.collection('farmData').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            throw new Error('Document not found');
        }
        
        const docData = doc.data();
        if (docData.userId !== user.uid) {
            throw new Error('Unauthorized: You can only delete your own data');
        }
        
        await docRef.delete();
        console.log('✅ Farm data deleted:', id);
        
    } catch (error) {
        console.error('❌ Error deleting farm data:', error);
        throw error;
    }
};

// Real-time listener for farm data updates - user specific
window.setupFarmDataListener = function() {
    try {
        if (!db) {
            console.warn('⚠️ Firestore not available for real-time listener');
            return () => {};
        }
        
        console.log('👂 Setting up real-time listener...');
        
        let unsubscribe = null;
        
        // Get current user for the query
        window.getCurrentUser().then(user => {
            if (!user) {
                console.warn('⚠️ No user logged in, cannot setup real-time listener');
                window.farmData = [];
                if (typeof window.updateFarmDataUI === 'function') {
                    window.updateFarmDataUI();
                }
                return;
            }
            
            unsubscribe = db.collection('farmData')
                .where('userId', '==', user.uid) // Only listen to current user's data
                .orderBy('createdAt', 'desc')
                .onSnapshot(
                    snapshot => {
                        console.log('📡 Real-time update received for user:', user.uid);
                        window.farmData = snapshot.docs.map(doc => {
                            const data = doc.data();
                            const createdAt = data.createdAt ? 
                                (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : 
                                new Date().toISOString();
                            
                            return {
                                id: doc.id,
                                ...data,
                                createdAt: createdAt
                            };
                        });
                        
                        if (typeof window.updateFarmDataUI === 'function') {
                            window.updateFarmDataUI();
                        }
                    },
                    error => {
                        console.error('❌ Real-time listener error:', error);
                    }
                );
        });
        
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
            
    } catch (error) {
        console.error('❌ Error setting up real-time listener:', error);
        return () => {};
    }
};

// Get current user
window.getCurrentUser = function() {
    return new Promise((resolve) => {
        try {
            if (!auth) {
                console.log('❌ Auth not initialized');
                resolve(null);
                return;
            }
            
            const unsubscribe = auth.onAuthStateChanged(user => {
                unsubscribe();
                console.log('👤 Auth state changed, user:', user ? user.uid : 'null');
                resolve(user);
            }, error => {
                console.error('❌ Auth state change error:', error);
                resolve(null);
            });
            
            // Fallback in case auth doesn't respond
            setTimeout(() => {
                unsubscribe();
                if (auth.currentUser) {
                    resolve(auth.currentUser);
                } else {
                    resolve(null);
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error getting current user:', error);
            resolve(null);
        }
    });
};

// Get user data from Firestore
window.getUserData = async function(uid) {
    try {
        if (!db) {
            return null;
        }
        
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
        
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        return null;
    }
};

// Check if current user owns a specific farm data record
window.userOwnsFarmData = async function(farmDataId) {
    try {
        const user = await window.getCurrentUser();
        if (!user) return false;
        
        if (!db) return false;
        
        const doc = await db.collection('farmData').doc(farmDataId).get();
        if (!doc.exists) return false;
        
        return doc.data().userId === user.uid;
    } catch (error) {
        console.error('❌ Error checking farm data ownership:', error);
        return false;
    }
};

// Test Firebase connection
window.testFirebaseConnection = async function() {
    try {
        console.log('🔍 Testing Firebase connection...');
        
        if (!db) {
            console.error('❌ Firestore not initialized');
            return { success: false, error: 'Firestore not initialized' };
        }
        
        // Get current user
        const user = await window.getCurrentUser();
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }
        
        console.log('👤 Testing with user:', user.uid);
        
        // Test with a user-specific query
        const testDoc = await db.collection('farmData')
            .where('userId', '==', user.uid)
            .limit(1)
            .get();
            
        console.log('✅ Firebase connection test passed');
        
        return { 
            success: true, 
            message: 'Firebase connection successful',
            documentCount: testDoc.size,
            userId: user.uid,
            userEmail: user.email
        };
        
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code,
            name: error.name
        };
    }
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 FarmData module loaded');
    
    // Test connection after a short delay
    setTimeout(async () => {
        console.log('🔧 Running initial connection test...');
        const testResult = await window.testFirebaseConnection();
        console.log('Connection test result:', testResult);
        
        // If not logged in, show message
        if (testResult.error === 'No user logged in') {
            console.log('ℹ️ Please log in to access farm data');
        }
    }, 2000);
});

// Add this function to help diagnose the issue
window.diagnoseIssue = async function() {
    console.log('🔧 Diagnosing Firebase issue...');
    
    const results = {
        firebaseInitialized: !!firebase.apps.length,
        firestoreInitialized: !!db,
        authInitialized: !!auth,
        currentUser: null,
        firestoreTest: null
    };
    
    try {
        results.currentUser = await window.getCurrentUser();
        
        if (db && results.currentUser) {
            results.firestoreTest = await window.testFirebaseConnection();
        }
    } catch (error) {
        results.error = error.message;
    }
    
    console.log('🔧 Diagnosis results:', results);
    return results;
};