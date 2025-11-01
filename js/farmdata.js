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

// Enhanced loadFarmData function with better error handling
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
        
        console.log('✅ Firestore is available, making query...');
        
        // Get all data without limits for testing
        const snapshot = await db.collection('farmData')
            .orderBy('createdAt', 'desc')
            .get();
            
        console.log('✅ Query completed, processing results...');
        console.log(`📊 Found ${snapshot.size} documents in farmData collection`);
            
        if (snapshot.empty) {
            console.log('ℹ️ No data found in farmData collection');
            window.farmData = getSampleData();
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
            console.log('📝 Sample record:', window.farmData[0]);
        }
        
        return window.farmData;
        
    } catch (error) {
        console.error('❌ Error loading farm data:');
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        
        // Fallback to sample data
        window.farmData = getSampleData();
        console.log('🔄 Using offline mode with sample data:', window.farmData.length, 'records');
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
        
        // Test Firestore connection
        const testQuery = await db.collection('farmData').limit(1).get();
        console.log('✅ Firebase connection successful');
        console.log('📊 Documents in collection:', testQuery.size);
        
        // Get all documents to see what's there
        const allDocs = await db.collection('farmData').get();
        console.log('📋 All documents:', allDocs.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        })));
        
        return { 
            success: true, 
            documentCount: allDocs.size,
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: auth?.currentUser ? auth.currentUser.uid : 'anonymous'
        };
        
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
        const offlineData = {
            id: mockId,
            ...farmData,
            status: 'Pending Review',
            createdAt: new Date().toISOString(),
            createdBy: 'offline-user'
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
        
        console.log('👂 Setting up real-time listener...');
        
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

// Sample data for fallback
function getSampleData() {
    return [
        {
            id: 'sample-1',
            farmerName: "John Smith",
            locationFarm: "Green Valley Farm",
            soilType: "loamy",
            cropType: "Corn",
            plantingDate: "2023-04-15",
            weather: "sunny",
            disease: "None",
            yield: 8500,
            status: "Approved",
            createdAt: "2023-06-01T00:00:00Z"
        },
        {
            id: 'sample-2',
            farmerName: "Maria Garcia",
            locationFarm: "Sunrise Acres",
            soilType: "sandy",
            cropType: "Wheat",
            plantingDate: "2023-03-10",
            weather: "cloudy",
            disease: "Rust fungus detected",
            yield: 4200,
            status: "Pending Review",
            createdAt: "2023-06-02T00:00:00Z"
        }
    ];
}

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
    }, 1000);
});
