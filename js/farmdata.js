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

// Enhanced loadFarmData function with backward compatibility
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
        
        let snapshot;
        if (user) {
            console.log('👤 Loading data for user:', user.uid);
            
            // Try to load user-specific data first
            try {
                snapshot = await db.collection('farmData')
                    .where('createdBy', '==', user.uid)
                    .orderBy('createdAt', 'desc')
                    .get();
                    
                console.log(`📊 Found ${snapshot.size} user-specific documents`);
                
                // If no user-specific data found, try to load all data (for backward compatibility)
                if (snapshot.empty) {
                    console.log('ℹ️ No user-specific data found, loading all data for backward compatibility');
                    snapshot = await db.collection('farmData')
                        .orderBy('createdAt', 'desc')
                        .get();
                    console.log(`📊 Found ${snapshot.size} total documents for backward compatibility`);
                }
            } catch (error) {
                console.log('⚠️ User query failed, loading all data:', error.message);
                // If user query fails (maybe no createdBy field), load all data
                snapshot = await db.collection('farmData')
                    .orderBy('createdAt', 'desc')
                    .get();
            }
        } else {
            console.log('⚠️ No user logged in, loading all data');
            // No user logged in, load all data
            snapshot = await db.collection('farmData')
                .orderBy('createdAt', 'desc')
                .get();
        }
            
        console.log('✅ Query completed, processing results...');
        console.log(`📊 Total documents to process: ${snapshot.size}`);
            
        if (snapshot.empty) {
            console.log('ℹ️ No data found in farmData collection');
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
            console.log(`✅ Farm data loaded: ${window.farmData.length} records`);
            console.log('📝 Sample record:', window.farmData[0]);
        }
        
        return window.farmData;
        
    } catch (error) {
        console.error('❌ Error loading farm data:');
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Fallback to empty array
        window.farmData = [];
        console.log('🔄 Using offline mode with empty data');
        return window.farmData;
    }
};

// Load ALL farm data (for admin users only)
window.loadAllFarmData = async function() {
    console.log('🔗 loadAllFarmData called (admin function)');
    
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        const snapshot = await db.collection('farmData')
            .orderBy('createdAt', 'desc')
            .get();
            
        console.log(`📊 Admin: Found ${snapshot.size} total documents`);
            
        if (snapshot.empty) {
            return [];
        } else {
            const allData = snapshot.docs.map(doc => {
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
            console.log(`✅ All farm data loaded: ${allData.length} records`);
            return allData;
        }
        
    } catch (error) {
        console.error('❌ Error loading all farm data:', error);
        return [];
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
        
        // Get current user for context
        const user = await window.getCurrentUser();
        console.log('👤 Current user:', user ? user.uid : 'No user');
        
        // Test Firestore connection with all data
        const allDocs = await db.collection('farmData').get();
        console.log('✅ Firebase connection successful');
        console.log('📊 Total documents in collection:', allDocs.size);
        
        // Show all documents for debugging
        console.log('📋 All documents in farmData:');
        allDocs.docs.forEach(doc => {
            console.log('  📄', doc.id, '=>', doc.data());
        });
        
        return { 
            success: true, 
            user: user ? user.uid : 'No user',
            totalDocuments: allDocs.size,
            documents: allDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };
        
    } catch (error) {
        console.error('❌ Firebase debug failed:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code 
        };
    }
};

// Save farm data to Firebase
window.saveFarmData = async function(farmData) {
    console.log('💾 saveFarmData called');
    
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        // Get current user
        const user = await window.getCurrentUser();
        
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add user info if available
        if (user) {
            dataToSave.createdBy = user.uid;
            dataToSave.userEmail = user.email || 'unknown';
        } else {
            dataToSave.createdBy = 'anonymous';
            dataToSave.userEmail = 'anonymous';
        }
        
        console.log('📤 Saving data to Firebase:', dataToSave);
        
        const docRef = await db.collection('farmData').add(dataToSave);
        console.log('✅ Farm data saved with ID:', docRef.id);
        
        // IMPORTANT: Force refresh the data after saving
        await window.loadFarmData();
        
        return docRef.id;
        
    } catch (error) {
        console.error('❌ Error saving farm data:', error);
        
        // Fallback: Save locally
        const mockId = 'offline-' + Date.now();
        const user = await window.getCurrentUser();
        const offlineData = {
            id: mockId,
            ...farmData,
            status: 'Pending Review',
            createdAt: new Date().toISOString(),
            createdBy: user ? user.uid : 'offline-user',
            userEmail: user ? user.email : 'offline'
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

// Update farm data in Firebase
window.updateFarmData = async function(id, updatedData) {
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        // For now, allow updates without ownership check for backward compatibility
        await db.collection('farmData').doc(id).update({
            ...updatedData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Farm data updated:', id);
        
    } catch (error) {
        console.error('❌ Error updating farm data:', error);
        throw error;
    }
};

// Delete farm data from Firebase
window.deleteFarmData = async function(id) {
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        // For now, allow deletes without ownership check for backward compatibility
        await db.collection('farmData').doc(id).delete();
        console.log('✅ Farm data deleted:', id);
        
    } catch (error) {
        console.error('❌ Error deleting farm data:', error);
        throw error;
    }
};

// Real-time listener for farm data updates
window.setupFarmDataListener = function() {
    try {
        if (!db) {
            console.warn('⚠️ Firestore not available for real-time listener');
            return () => {};
        }
        
        console.log('👂 Setting up real-time listener for all farm data...');
        
        // Listen to all farm data changes (for now, for backward compatibility)
        return db.collection('farmData')
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                snapshot => {
                    console.log('📡 Real-time update received');
                    window.farmData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    if (typeof window.updateFarmDataUI === 'function') {
                        window.updateFarmDataUI();
                    }
                },
                error => {
                    console.error('❌ Real-time listener error:', error);
                }
            );
            
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
                resolve(null);
                return;
            }
            
            const unsubscribe = auth.onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            });
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

// Test Firebase connection
window.testFirebaseConnection = async function() {
    try {
        console.log('🔍 Testing Firebase connection...');
        
        if (!db) {
            console.error('❌ Firestore not initialized');
            return { success: false, error: 'Firestore not initialized' };
        }
        
        // Test with a simple query
        const testDoc = await db.collection('farmData').limit(1).get();
        console.log('✅ Firebase connection test passed');
        
        return { 
            success: true, 
            message: 'Firebase connection successful',
            documentCount: testDoc.size
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
    
    // Test connection
    setTimeout(async () => {
        const testResult = await window.testFirebaseConnection();
        console.log('Connection test result:', testResult);
        
        // Also run debug to see what data exists
        const debugResult = await window.debugFirebase();
        console.log('Debug result:', debugResult);
    }, 1000);
});