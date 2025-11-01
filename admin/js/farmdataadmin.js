// Admin Farm Data - Shared data between farmer and admin interfaces with Firebase integration

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAf-wtZpl8wVjCymdLlC-YGlv7xn0yEMMU",
    authDomain: "palmaegis-setup.firebaseapp.com",
    projectId: "palmaegis-setup",
    storageBucket: "palmaegis-setup.firebasestorage.app",
    messagingSenderId: "445887502374",
    appId: "1:445887502374:web:a5f6ecaa90b88447626ee7"
};

console.log('🚀 Starting Firebase initialization for admin...');

// Initialize Firebase
let db, auth;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully in admin');
    } else {
        firebase.app(); // Use existing app
        console.log('✅ Firebase already initialized in admin');
    }
    
    // Initialize Firebase services
    db = firebase.firestore();
    auth = firebase.auth();
    
    console.log('✅ Firebase services initialized in admin');
    
} catch (error) {
    console.error('❌ Firebase initialization error in admin:', error);
}

// Farm data array (fallback if Firebase fails)
window.farmData = [];

// Admin users data
window.adminUsers = [
    {
        id: "ADM001",
        name: "Admin User",
        email: "admin@farmdata.com",
        role: "Administrator",
        lastLogin: "2023-06-15",
        status: "Active"
    },
    {
        id: "MGR001",
        name: "Farm Manager",
        email: "manager@farmdata.com",
        role: "Manager",
        lastLogin: "2023-06-14",
        status: "Active"
    },
    {
        id: "USR001",
        name: "John Farmer",
        email: "john@greenvalley.com",
        role: "Farmer",
        lastLogin: "2023-06-13",
        status: "Active"
    },
    {
        id: "USR002",
        name: "Sarah Grower",
        email: "sarah@sunriseacres.com",
        role: "Farmer",
        lastLogin: "2023-06-10",
        status: "Inactive"
    }
];

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
        if (!db) return null;
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        return null;
    }
};

// Enhanced loadFarmData function with better error handling
window.loadFarmData = async function() {
    console.log('🔗 loadFarmData called from admin');
    
    try {
        console.log('📡 Attempting to connect to Firebase...');
        
        // Check if Firebase is properly initialized
        if (!db) {
            console.error('❌ Firestore database not initialized');
            throw new Error('Firestore not initialized');
        }
        
        console.log('✅ Firestore is available, making query...');
        
        // Get all data
        const snapshot = await db.collection('farmData')
            .orderBy('createdAt', 'desc')
            .get();
            
        console.log('✅ Query completed, processing results...');
            
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
        }
        
        return window.farmData;
        
    } catch (error) {
        console.error('❌ Error loading farm data in admin:');
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Fallback to sample data
        window.farmData = getSampleData();
        console.log('🔄 Using offline mode with sample data:', window.farmData.length, 'records');
        return window.farmData;
    }
};

// Save farm data to Firebase
window.saveFarmData = async function(farmData) {
    console.log('💾 saveFarmData called from admin');
    
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        
        const dataToSave = {
            farmerName: farmData.farmerName || farmData.farmName,
            locationFarm: farmData.locationFarm || farmData.farmName,
            soilType: farmData.soilType,
            cropType: farmData.cropType,
            plantingDate: farmData.plantingDate,
            weather: farmData.weather,
            disease: farmData.disease || 'None',
            yield: farmData.yield || null,
            status: farmData.status || 'Pending Review',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: auth?.currentUser ? auth.currentUser.uid : 'admin'
        };
        
        console.log('📤 Saving data to Firebase:', dataToSave);
        
        const docRef = await db.collection('farmData').add(dataToSave);
        console.log('✅ Farm data saved with ID:', docRef.id);
        
        return docRef.id;
        
    } catch (error) {
        console.error('❌ Error saving farm data in admin:', error);
        throw error;
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
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth?.currentUser ? auth.currentUser.uid : 'admin'
        });
        console.log('✅ Farm data updated:', id);
        
    } catch (error) {
        console.error('❌ Error updating farm data in admin:', error);
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
        console.error('❌ Error deleting farm data in admin:', error);
        throw error;
    }
};

// Bulk delete farm data
window.bulkDeleteFarmData = async function(ids) {
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        const batch = db.batch();
        ids.forEach(id => {
            const docRef = db.collection('farmData').doc(id);
            batch.delete(docRef);
        });
        await batch.commit();
        console.log('✅ Bulk delete completed:', ids.length, 'records');
    } catch (error) {
        console.error('❌ Error in bulk delete:', error);
        throw error;
    }
};

// Get farm data statistics
window.getFarmDataStats = async function() {
    try {
        if (!db) {
            throw new Error('Firestore not available');
        }
        const snapshot = await db.collection('farmData').get();
        const data = snapshot.docs.map(doc => doc.data());
        
        const stats = {
            totalFarms: data.length,
            uniqueCrops: [...new Set(data.map(item => item.cropType))].length,
            diseaseReports: data.filter(item => item.disease && item.disease !== 'None').length,
            avgYield: 0
        };
        
        const yields = data.filter(item => item.yield).map(item => item.yield);
        if (yields.length > 0) {
            stats.avgYield = yields.reduce((a, b) => a + b, 0) / yields.length;
        }
        
        return stats;
    } catch (error) {
        console.error('❌ Error getting farm data stats:', error);
        return null;
    }
};

// Real-time listener for farm data updates
window.setupFarmDataListener = function() {
    try {
        if (!db) {
            console.warn('⚠️ Firebase not available for real-time updates');
            return () => {};
        }
        
        console.log('👂 Setting up real-time listener for admin...');
        
        return db.collection('farmData')
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                snapshot => {
                    console.log('📡 Admin real-time update received');
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
                    console.error('❌ Admin real-time listener error:', error);
                }
            );
            
    } catch (error) {
        console.error('❌ Error setting up admin real-time listener:', error);
        return () => {};
    }
};

// Debug function to check Firebase connection
window.debugFirebase = async function() {
    console.log('🔍 Debugging Firebase connection from admin...');
    
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
            code: error.code,
            name: error.name
        };
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

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin FarmData module loaded');
    
    // Test connection
    setTimeout(async () => {
        const testResult = await window.debugFirebase();
        console.log('Admin connection test result:', testResult);
    }, 1000);
});