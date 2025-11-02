// treehealth.js
// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAf-wtZpl8wVjCymdLlC-YGlv7xn0yEMMU",
    authDomain: "palmaegis-setup.firebaseapp.com",
    projectId: "palmaegis-setup",
    storageBucket: "palmaegis-setup.firebasestorage.app",
    messagingSenderId: "445887502374",
    appId: "1:445887502374:web:a5f6ecaa90b88447626ee7"
};

// Initialize Firebase with error handling
let db, auth;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
    db = null;
    auth = null;
}

// Current user state
let currentUser = null;

// DOM Elements
const manualTab = document.getElementById('manual-tab');
const aiTab = document.getElementById('ai-tab');
const manualForm = document.getElementById('manual-form');
const aiForm = document.getElementById('ai-form');
const healthForm = document.getElementById('health-form');
const uploadArea = document.getElementById('upload-area');
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const analyzeBtn = document.getElementById('analyze-btn');
const generateReportBtn = document.getElementById('generate-report');
const downloadPdfBtn = document.getElementById('download-pdf');
const downloadExcelBtn = document.getElementById('download-excel');
const viewHistoryBtn = document.getElementById('view-history');
const reportOutput = document.getElementById('report-output');
const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');

// Create status message element
const statusMessage = document.createElement('div');
statusMessage.id = 'status-message';
statusMessage.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: 600;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
`;
document.body.appendChild(statusMessage);

// Authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("User is signed in:", user.email);
        showStatus(`Welcome, ${user.email}`, 'success');
        enableFormControls(true);
        logoutBtn.style.display = 'block';
        userInfo.style.display = 'block';
        userInfo.innerHTML = `Signed in as: <strong>${user.email}</strong>`;
        updateLanguage(); // Refresh language after login
    } else {
        currentUser = null;
        console.log("User is signed out");
        showStatus('Please sign in to use the application', 'warning');
        enableFormControls(false);
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
        showLoginModal();
    }
});

// Function to enable/disable form controls based on auth state
function enableFormControls(enabled) {
    const formControls = [
        'tree-id', 'tree-species', 'location', 'health-status', 
        'disease-type', 'severity', 'notes', 'analyze-btn',
        'generate-report', 'download-pdf', 'download-excel', 'view-history'
    ];
    
    formControls.forEach(controlId => {
        const element = document.getElementById(controlId);
        if (element) {
            element.disabled = !enabled;
        }
    });
    
    // Also disable file upload
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.style.opacity = enabled ? '1' : '0.5';
        uploadArea.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    
    // Update submit button
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = !enabled;
    }
}

// Login modal and functions
function showLoginModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('login-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="login-modal" class="modal-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 10px;
                width: 90%;
                max-width: 400px;
                text-align: center;
            ">
                <h3 style="margin-bottom: 20px;" data-en="Sign In Required" data-my="Log Masuk Diperlukan">Sign In Required</h3>
                <p style="margin-bottom: 20px;" data-en="Please sign in to access tree health monitoring features." data-my="Sila log masuk untuk menggunakan sistem pemantauan kesihatan pokok.">Please sign in to access tree health monitoring features.</p>
                <div style="margin-bottom: 15px;">
                    <input type="email" id="login-email" placeholder="Email" style="
                        width: 100%;
                        padding: 10px;
                        margin-bottom: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                    ">
                </div>
                <div style="margin-bottom: 20px;">
                    <input type="password" id="login-password" placeholder="Password" style="
                        width: 100%;
                        padding: 10px;
                        margin-bottom: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                    ">
                </div>
                <button id="login-btn" style="
                    background: #4caf50;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-right: 10px;
                " data-en="Sign In" data-my="Log Masuk">Sign In</button>
                <button id="signup-btn" style="
                    background: #2196f3;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                " data-en="Sign Up" data-my="Daftar">Sign Up</button>
                <div id="login-status" style="margin-top: 15px; color: #f44336;"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('signup-btn').addEventListener('click', handleSignUp);
    
    // Enter key support
    const loginPassword = document.getElementById('login-password');
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // Update language for modal elements
    updateModalLanguage();
}

function updateModalLanguage() {
    const modalElements = document.querySelectorAll('#login-modal [data-en]');
    modalElements.forEach(element => {
        const translation = element.getAttribute(`data-${currentLanguage}`);
        if (translation) {
            if (element.tagName === 'INPUT') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        }
    });
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const statusElement = document.getElementById('login-status');
    
    if (!email || !password) {
        statusElement.textContent = currentLanguage === 'en' ? 'Please enter both email and password' : 'Sila masukkan kedua-dua email dan kata laluan';
        return;
    }
    
    statusElement.textContent = currentLanguage === 'en' ? 'Signing in...' : 'Sedang log masuk...';
    statusElement.style.color = '#2196f3';
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in successfully - modal will close automatically due to auth state change
            statusElement.textContent = currentLanguage === 'en' ? 'Success!' : 'Berjaya!';
            statusElement.style.color = '#4caf50';
        })
        .catch((error) => {
            console.error('Login error:', error);
            const errorMessage = currentLanguage === 'en' 
                ? `Error: ${error.message}` 
                : `Ralat: ${error.message}`;
            statusElement.textContent = errorMessage;
            statusElement.style.color = '#f44336';
        });
}

function handleSignUp() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const statusElement = document.getElementById('login-status');
    
    if (!email || !password) {
        statusElement.textContent = currentLanguage === 'en' ? 'Please enter both email and password' : 'Sila masukkan kedua-dua email dan kata laluan';
        return;
    }
    
    if (password.length < 6) {
        statusElement.textContent = currentLanguage === 'en' ? 'Password must be at least 6 characters' : 'Kata laluan mesti sekurang-kurangnya 6 aksara';
        return;
    }
    
    statusElement.textContent = currentLanguage === 'en' ? 'Creating account...' : 'Membuat akaun...';
    statusElement.style.color = '#2196f3';
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            statusElement.textContent = currentLanguage === 'en' ? 'Account created successfully!' : 'Akaun berjaya dibuat!';
            statusElement.style.color = '#4caf50';
        })
        .catch((error) => {
            console.error('Signup error:', error);
            const errorMessage = currentLanguage === 'en' 
                ? `Error: ${error.message}` 
                : `Ralat: ${error.message}`;
            statusElement.textContent = errorMessage;
            statusElement.style.color = '#f44336';
        });
}

// Logout functionality
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        showStatus(currentLanguage === 'en' ? 'Signed out successfully' : 'Log keluar berjaya', 'info');
    }).catch((error) => {
        console.error('Logout error:', error);
        showStatus(currentLanguage === 'en' ? 'Error signing out' : 'Ralat semasa log keluar', 'error');
    });
});

// Tab Switching
manualTab.addEventListener('click', () => {
    manualTab.classList.add('active');
    aiTab.classList.remove('active');
    manualForm.classList.add('active');
    aiForm.classList.remove('active');
});

aiTab.addEventListener('click', () => {
    aiTab.classList.add('active');
    manualTab.classList.remove('active');
    aiForm.classList.add('active');
    manualForm.classList.remove('active');
});

// Image Upload Handling
uploadArea.addEventListener('click', () => {
    if (currentUser) {
        imageUpload.click();
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (currentUser) {
        uploadArea.style.backgroundColor = '#f1f8e9';
    }
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.backgroundColor = '';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = '';
    if (currentUser) {
        const files = e.dataTransfer.files;
        handleImageFiles(files);
    }
});

imageUpload.addEventListener('change', (e) => {
    if (currentUser) {
        handleImageFiles(e.target.files);
    }
});

function handleImageFiles(files) {
    imagePreview.innerHTML = '';
    
    if (files.length > 0) {
        analyzeBtn.disabled = false;
        
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    imagePreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        }
    } else {
        analyzeBtn.disabled = true;
    }
}

// AI Analysis Simulation
analyzeBtn.addEventListener('click', () => {
    if (!currentUser) {
        showStatus('Please sign in to use AI analysis', 'warning');
        return;
    }
    
    if (imagePreview.children.length === 0) {
        showStatus('Please upload at least one image first.', 'warning');
        return;
    }
    
    // Show loading state
    analyzeBtn.textContent = currentLanguage === 'en' ? 'Analyzing...' : 'Menganalisis...';
    analyzeBtn.disabled = true;
    
    // Simulate AI processing delay
    setTimeout(() => {
        // Generate mock AI analysis results
        const mockResults = generateMockAIAnalysis();
        
        // Populate form with AI results
        document.getElementById('tree-id').value = 'AI-' + Math.floor(1000 + Math.random() * 9000);
        document.getElementById('tree-species').value = mockResults.species;
        document.getElementById('location').value = currentLanguage === 'en' ? 'AI Detected Location' : 'Lokasi Dikesan AI';
        document.getElementById('health-status').value = mockResults.healthStatus;
        document.getElementById('disease-type').value = mockResults.diseaseType;
        document.getElementById('severity').value = mockResults.severity;
        
        // Clear previous checkboxes
        document.querySelectorAll('input[name="affected-parts"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Set affected parts
        mockResults.affectedParts.forEach(part => {
            const checkbox = document.querySelector(`input[name="affected-parts"][value="${part}"]`);
            if (checkbox) checkbox.checked = true;
        });
        
        document.getElementById('notes').value = mockResults.notes;
        
        // Reset button
        analyzeBtn.textContent = currentLanguage === 'en' ? 'Analyze Images' : 'Analisis Imej';
        analyzeBtn.disabled = false;
        
        // Switch to manual tab to show results
        manualTab.click();
        
        showStatus('AI analysis complete! Form populated with detected health issues.', 'success');
    }, 2000);
});

function generateMockAIAnalysis() {
    const speciesOptions = ['ganoderma', 'basal-stem-rot', 'black-spot', 'marasmius', 'fusarium'];
    const diseaseOptions = ['none', 'fungal', 'bacterial', 'pest', 'nutrient'];
    const severityOptions = ['none', 'low', 'medium', 'high', 'critical'];
    const healthOptions = ['excellent', 'good', 'fair', 'poor', 'critical'];
    const partOptions = ['leaves', 'branches', 'trunk', 'roots', 'flowers'];
    
    const species = speciesOptions[Math.floor(Math.random() * speciesOptions.length)];
    const hasDisease = Math.random() > 0.3; // 70% chance of disease
    
    let diseaseType = 'none';
    let severity = 'none';
    let healthStatus = healthOptions[Math.floor(Math.random() * 3)]; // Mostly good health
    
    if (hasDisease) {
        diseaseType = diseaseOptions[Math.floor(Math.random() * (diseaseOptions.length - 1)) + 1];
        severity = severityOptions[Math.floor(Math.random() * 3) + 1]; // low to high
        healthStatus = healthOptions[Math.floor(Math.random() * 2) + 3]; // poor or critical
    }
    
    // Select 1-3 random affected parts if disease exists
    const affectedParts = [];
    if (hasDisease) {
        const numParts = Math.floor(Math.random() * 3) + 1;
        const shuffledParts = [...partOptions].sort(() => 0.5 - Math.random());
        affectedParts.push(...shuffledParts.slice(0, numParts));
    }
    
    const notes = hasDisease 
        ? `AI detected ${diseaseType} infection with ${severity} severity. Recommended treatment protocol initiated.` 
        : 'No significant health issues detected. Tree appears healthy.';
    
    return {
        species,
        healthStatus,
        diseaseType,
        severity,
        affectedParts,
        notes
    };
}

// Form Submission and Report Generation
healthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateHealthReport();
});

generateReportBtn.addEventListener('click', generateHealthReport);

function generateHealthReport() {
    if (!currentUser) {
        showStatus('Please sign in to generate reports', 'warning');
        return;
    }
    
    // Get form values
    const treeId = document.getElementById('tree-id').value;
    const species = document.getElementById('tree-species').value;
    const location = document.getElementById('location').value;
    const healthStatus = document.getElementById('health-status').value;
    const diseaseType = document.getElementById('disease-type').value;
    const severity = document.getElementById('severity').value;
    
    // Get checked affected parts
    const affectedParts = [];
    document.querySelectorAll('input[name="affected-parts"]:checked').forEach(cb => {
        affectedParts.push(cb.value);
    });
    
    const notes = document.getElementById('notes').value;
    
    // Validate required fields
    if (!treeId || !species || !location || !healthStatus) {
        showStatus('Please fill in all required fields (Tree ID, Species, Location, Health Status).', 'warning');
        return;
    }
    
    // Create report object
    const report = {
        treeId,
        species,
        location,
        healthStatus,
        diseaseType,
        severity,
        affectedParts,
        notes,
        timestamp: new Date().toISOString(),
        reportId: 'RPT-' + Date.now(),
        userId: currentUser.uid,
        userEmail: currentUser.email
    };
    
    // Display report
    displayReport(report);
    
    // Save to Firebase with fallback to localStorage
    saveReportToFirebase(report);
}

function displayReport(report) {
    const severityClass = `severity-${report.severity}`;
    
    const reportHTML = `
        <div class="health-report">
            <div class="report-header">
                <h3 data-en="Tree Health Report" data-my="Laporan Kesihatan Pokok">Tree Health Report</h3>
                <p>Generated on: ${new Date(report.timestamp).toLocaleString()}</p>
                <p><small>User: ${report.userEmail}</small></p>
            </div>
            <div class="report-details">
                <div class="detail-item">
                    <span class="detail-label" data-en="Tree ID:" data-my="ID Pokok:">Tree ID:</span> ${report.treeId}
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-en="Species:" data-my="Spesies:">Species:</span> ${report.species}
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-en="Location:" data-my="Lokasi:">Location:</span> ${report.location}
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-en="Health Status:" data-my="Status Kesihatan:">Health Status:</span> ${report.healthStatus}
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-en="Disease Type:" data-my="Jenis Penyakit:">Disease Type:</span> ${report.diseaseType}
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-en="Severity:" data-my="Keterukan:">Severity:</span> 
                    <span class="severity-indicator ${severityClass}">${report.severity}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label" data-en="Affected Parts:" data-my="Bahagian Terjejas:">Affected Parts:</span> ${report.affectedParts.join(', ') || 'None'}
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label" data-en="Notes:" data-my="Nota:">Notes:</span> ${report.notes || 'No additional notes.'}
            </div>
            <div class="save-status" id="save-status" style="margin-top: 15px; padding: 10px; border-radius: 5px; display: none;">
                <span class="detail-label" data-en="Save Status:" data-my="Status Simpan:">Save Status:</span> <span id="save-status-text"></span>
            </div>
        </div>
    `;
    
    reportOutput.innerHTML = reportHTML;
    updateLanguage(); // Update language for the newly generated report
}

// Status message function
function showStatus(message, type = 'info') {
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };
    
    // Language-specific messages
    const messages = {
        'Welcome, ${user.email}': {
            en: `Welcome, ${currentUser?.email || 'User'}`,
            my: `Selamat datang, ${currentUser?.email || 'Pengguna'}`
        },
        'Please sign in to use the application': {
            en: 'Please sign in to use the application',
            my: 'Sila log masuk untuk menggunakan aplikasi'
        },
        'Please sign in to use AI analysis': {
            en: 'Please sign in to use AI analysis',
            my: 'Sila log masuk untuk menggunakan analisis AI'
        },
        'Please upload at least one image first.': {
            en: 'Please upload at least one image first.',
            my: 'Sila muat naik sekurang-kurangnya satu imej dahulu.'
        },
        'AI analysis complete! Form populated with detected health issues.': {
            en: 'AI analysis complete! Form populated with detected health issues.',
            my: 'Analisis AI selesai! Borang diisi dengan isu kesihatan yang dikesan.'
        },
        'Please fill in all required fields (Tree ID, Species, Location, Health Status).': {
            en: 'Please fill in all required fields (Tree ID, Species, Location, Health Status).',
            my: 'Sila isi semua medan wajib (ID Pokok, Spesies, Lokasi, Status Kesihatan).'
        },
        'Please sign in to generate reports': {
            en: 'Please sign in to generate reports',
            my: 'Sila log masuk untuk menjana laporan'
        },
        'Report saved successfully to cloud database!': {
            en: 'Report saved successfully to cloud database!',
            my: 'Laporan berjaya disimpan ke pangkalan data awan!'
        },
        'Database permission denied. Report saved locally.': {
            en: 'Database permission denied. Report saved locally.',
            my: 'Kebenaran pangkalan data ditolak. Laporan disimpan secara tempatan.'
        },
        'Error connecting to database. Report saved locally instead.': {
            en: 'Error connecting to database. Report saved locally instead.',
            my: 'Ralat menyambung ke pangkalan data. Laporan disimpan secara tempatan.'
        },
        'Please sign in to view history': {
            en: 'Please sign in to view history',
            my: 'Sila log masuk untuk melihat sejarah'
        },
        'Historical reports loaded from cloud database.': {
            en: 'Historical reports loaded from cloud database.',
            my: 'Laporan sejarah dimuatkan dari pangkalan data awan.'
        },
        'No historical reports found.': {
            en: 'No historical reports found.',
            my: 'Tiada laporan sejarah ditemui.'
        },
        'Historical reports loaded from local storage.': {
            en: 'Historical reports loaded from local storage.',
            my: 'Laporan sejarah dimuatkan dari storan tempatan.'
        },
        'Error loading historical reports.': {
            en: 'Error loading historical reports.',
            my: 'Ralat memuatkan laporan sejarah.'
        },
        'Please generate a report first.': {
            en: 'Please generate a report first.',
            my: 'Sila hasilkan laporan dahulu.'
        },
        'PDF report downloaded successfully!': {
            en: 'PDF report downloaded successfully!',
            my: 'Laporan PDF berjaya dimuat turun!'
        },
        'Excel report downloaded successfully!': {
            en: 'Excel report downloaded successfully!',
            my: 'Laporan Excel berjaya dimuat turun!'
        },
        'Signed out successfully': {
            en: 'Signed out successfully',
            my: 'Log keluar berjaya'
        },
        'Error signing out': {
            en: 'Error signing out',
            my: 'Ralat semasa log keluar'
        },
        'Report saved successfully to local storage!': {
            en: 'Report saved successfully to local storage!',
            my: 'Laporan berjaya disimpan ke storan tempatan!'
        },
        'Error saving report locally. Please try again.': {
            en: 'Error saving report locally. Please try again.',
            my: 'Ralat menyimpan laporan secara tempatan. Sila cuba lagi.'
        }
    };
    
    // Get the translated message
    let translatedMessage = message;
    if (messages[message]) {
        translatedMessage = messages[message][currentLanguage] || message;
    } else {
        // Handle dynamic messages with placeholders
        Object.keys(messages).forEach(key => {
            if (message.includes(key.replace('${user.email}', ''))) {
                translatedMessage = messages[key][currentLanguage] || message;
            }
        });
    }
    
    statusMessage.textContent = translatedMessage;
    statusMessage.style.backgroundColor = colors[type] || colors.info;
    statusMessage.style.opacity = '1';
    
    setTimeout(() => {
        statusMessage.style.opacity = '0';
    }, 4000);
}

// Firebase Operations with fallback to localStorage
function saveReportToFirebase(report) {
    if (!currentUser) {
        showStatus('Please sign in to save reports', 'warning');
        saveReportToLocalStorage(report);
        return;
    }
    
    // Show saving status in report
    const saveStatusElement = document.getElementById('save-status');
    const saveStatusText = document.getElementById('save-status-text');
    
    if (saveStatusElement && saveStatusText) {
        saveStatusElement.style.display = 'block';
        saveStatusElement.style.backgroundColor = '#fff3cd';
        saveStatusElement.style.border = '1px solid #ffeaa7';
        saveStatusText.textContent = currentLanguage === 'en' ? 'Saving to database...' : 'Menyimpan ke pangkalan data...';
        saveStatusText.style.color = '#856404';
    }
    
    if (!db) {
        console.warn("Firebase not available, using localStorage fallback");
        saveReportToLocalStorage(report);
        return;
    }
    
    db.collection('treeHealthReports').add(report)
        .then((docRef) => {
            console.log('Report saved to Firebase with ID: ', docRef.id);
            
            // Update save status
            if (saveStatusElement && saveStatusText) {
                saveStatusElement.style.backgroundColor = '#d4edda';
                saveStatusElement.style.border = '1px solid #c3e6cb';
                saveStatusText.textContent = currentLanguage === 'en' ? '✓ Successfully saved to cloud database' : '✓ Berjaya disimpan ke pangkalan data awan';
                saveStatusText.style.color = '#155724';
            }
            
            showStatus('Report saved successfully to cloud database!', 'success');
            
            // Also save to localStorage as backup
            saveReportToLocalStorage(report);
        })
        .catch((error) => {
            console.error('Error saving report to Firebase: ', error);
            
            // Update save status for error
            if (saveStatusElement && saveStatusText) {
                saveStatusElement.style.backgroundColor = '#f8d7da';
                saveStatusElement.style.border = '1px solid #f5c6cb';
                saveStatusText.textContent = currentLanguage === 'en' ? '⚠ Saved locally (cloud sync failed)' : '⚠ Disimpan secara tempatan (sync awan gagal)';
                saveStatusText.style.color = '#721c24';
            }
            
            // Fallback to localStorage
            saveReportToLocalStorage(report);
            
            if (error.code === 'permission-denied') {
                showStatus('Database permission denied. Report saved locally.', 'warning');
            } else {
                showStatus('Error connecting to database. Report saved locally instead.', 'warning');
            }
        });
}

// LocalStorage fallback
function saveReportToLocalStorage(report) {
    try {
        // Get existing reports from localStorage
        const existingReports = JSON.parse(localStorage.getItem('treeHealthReports') || '[]');
        
        // Add new report
        existingReports.push(report);
        
        // Save back to localStorage
        localStorage.setItem('treeHealthReports', JSON.stringify(existingReports));
        
        console.log('Report saved to localStorage successfully');
        
        const saveStatusElement = document.getElementById('save-status');
        if (saveStatusElement && saveStatusElement.style.display !== 'block') {
            showStatus('Report saved successfully to local storage!', 'success');
        }
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showStatus('Error saving report locally. Please try again.', 'error');
    }
}

// View History - checks both Firebase and localStorage
viewHistoryBtn.addEventListener('click', () => {
    if (!currentUser) {
        showStatus('Please sign in to view history', 'warning');
        return;
    }
    
    if (historySection.style.display === 'none') {
        loadHistory();
        historySection.style.display = 'block';
        viewHistoryBtn.textContent = currentLanguage === 'en' ? 'Hide History' : 'Sembunyi Sejarah';
        showStatus('Loading historical reports...', 'info');
    } else {
        historySection.style.display = 'none';
        viewHistoryBtn.textContent = currentLanguage === 'en' ? 'View History' : 'Lihat Sejarah';
    }
});

function loadHistory() {
    historyList.innerHTML = '<p>' + (currentLanguage === 'en' ? 'Loading history...' : 'Memuatkan sejarah...') + '</p>';
    
    // Try Firebase first, then fallback to localStorage
    if (db) {
        loadHistoryFromFirebase();
    } else {
        loadHistoryFromLocalStorage();
    }
}

function loadHistoryFromFirebase() {
    if (!currentUser) {
        showStatus('Please sign in to view history', 'warning');
        return;
    }
    
    db.collection('treeHealthReports')
        .where('userId', '==', currentUser.uid) // Only get current user's reports
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                // If no data in Firebase, try localStorage
                loadHistoryFromLocalStorage();
                return;
            }
            
            displayHistory(querySnapshot);
            showStatus('Historical reports loaded from cloud database.', 'success');
        })
        .catch((error) => {
            console.error('Error loading history from Firebase: ', error);
            // Fallback to localStorage
            loadHistoryFromLocalStorage();
        });
}

function loadHistoryFromLocalStorage() {
    try {
        const allReports = JSON.parse(localStorage.getItem('treeHealthReports') || '[]');
        
        // Filter reports by current user
        const userReports = currentUser 
            ? allReports.filter(report => report.userId === currentUser.uid)
            : [];
        
        if (userReports.length === 0) {
            historyList.innerHTML = '<p>' + (currentLanguage === 'en' ? 'No historical reports found.' : 'Tiada laporan sejarah ditemui.') + '</p>';
            showStatus('No historical reports found.', 'info');
            return;
        }
        
        // Sort by timestamp (newest first) and take latest 10
        const sortedReports = userReports
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
            
        displayHistoryLocal(sortedReports);
        showStatus('Historical reports loaded from local storage.', 'info');
    } catch (error) {
        console.error('Error loading history from localStorage:', error);
        historyList.innerHTML = '<p>' + (currentLanguage === 'en' ? 'Error loading history.' : 'Ralat memuatkan sejarah.') + '</p>';
        showStatus('Error loading historical reports.', 'error');
    }
}

function displayHistory(querySnapshot) {
    historyList.innerHTML = '';
    
    querySnapshot.forEach((doc) => {
        const report = doc.data();
        addHistoryItemToDOM(report);
    });
}

function displayHistoryLocal(reports) {
    historyList.innerHTML = '';
    
    reports.forEach(report => {
        addHistoryItemToDOM(report);
    });
}

function addHistoryItemToDOM(report) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    historyItem.innerHTML = `
        <div class="history-item-header">
            <span class="history-item-id">${report.treeId}</span>
            <span class="history-item-date">${new Date(report.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="history-item-details">
            <div><span data-en="Species:" data-my="Spesies:">Species:</span> ${report.species}</div>
            <div><span data-en="Health:" data-my="Kesihatan:">Health:</span> ${report.healthStatus}</div>
            <div><span data-en="Disease:" data-my="Penyakit:">Disease:</span> ${report.diseaseType}</div>
            <div><span data-en="Severity:" data-my="Keterukan:">Severity:</span> <span class="severity-indicator severity-${report.severity}">${report.severity}</span></div>
        </div>
    `;
    
    historyList.appendChild(historyItem);
    updateLanguage(); // Update language for history items
}

// Export Functions
downloadPdfBtn.addEventListener('click', downloadPDF);
downloadExcelBtn.addEventListener('click', downloadExcel);

function downloadPDF() {
    if (!currentUser) {
        showStatus('Please sign in to download reports', 'warning');
        return;
    }
    
    const reportElement = document.querySelector('.health-report');
    
    if (!reportElement) {
        showStatus('Please generate a report first.', 'warning');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Simple PDF generation
    doc.setFontSize(16);
    doc.text(currentLanguage === 'en' ? 'Tree Health Report' : 'Laporan Kesihatan Pokok', 20, 20);
    
    doc.setFontSize(12);
    let yPosition = 40;
    
    const details = [
        `${currentLanguage === 'en' ? 'Tree ID' : 'ID Pokok'}: ${document.getElementById('tree-id').value}`,
        `${currentLanguage === 'en' ? 'Species' : 'Spesies'}: ${document.getElementById('tree-species').value}`,
        `${currentLanguage === 'en' ? 'Location' : 'Lokasi'}: ${document.getElementById('location').value}`,
        `${currentLanguage === 'en' ? 'Health Status' : 'Status Kesihatan'}: ${document.getElementById('health-status').value}`,
        `${currentLanguage === 'en' ? 'Disease Type' : 'Jenis Penyakit'}: ${document.getElementById('disease-type').value}`,
        `${currentLanguage === 'en' ? 'Severity' : 'Keterukan'}: ${document.getElementById('severity').value}`,
        `${currentLanguage === 'en' ? 'Affected Parts' : 'Bahagian Terjejas'}: ${Array.from(document.querySelectorAll('input[name="affected-parts"]:checked'))
            .map(cb => cb.value).join(', ') || (currentLanguage === 'en' ? 'None' : 'Tiada')}`,
        `${currentLanguage === 'en' ? 'Notes' : 'Nota'}: ${document.getElementById('notes').value || (currentLanguage === 'en' ? 'None' : 'Tiada')}`,
        `${currentLanguage === 'en' ? 'User' : 'Pengguna'}: ${currentUser.email}`
    ];
    
    details.forEach(detail => {
        // Check if we need a new page
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }
        doc.text(detail, 20, yPosition);
        yPosition += 10;
    });
    
    doc.text(`${currentLanguage === 'en' ? 'Generated on' : 'Dijana pada'}: ${new Date().toLocaleString()}`, 20, yPosition + 10);
    
    doc.save(`tree-health-report-${document.getElementById('tree-id').value}.pdf`);
    showStatus('PDF report downloaded successfully!', 'success');
}

function downloadExcel() {
    if (!currentUser) {
        showStatus('Please sign in to download reports', 'warning');
        return;
    }
    
    const reportElement = document.querySelector('.health-report');
    
    if (!reportElement) {
        showStatus('Please generate a report first.', 'warning');
        return;
    }
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([
        [currentLanguage === 'en' ? 'Tree Health Report' : 'Laporan Kesihatan Pokok'],
        [''],
        [currentLanguage === 'en' ? 'Tree ID' : 'ID Pokok', document.getElementById('tree-id').value],
        [currentLanguage === 'en' ? 'Species' : 'Spesies', document.getElementById('tree-species').value],
        [currentLanguage === 'en' ? 'Location' : 'Lokasi', document.getElementById('location').value],
        [currentLanguage === 'en' ? 'Health Status' : 'Status Kesihatan', document.getElementById('health-status').value],
        [currentLanguage === 'en' ? 'Disease Type' : 'Jenis Penyakit', document.getElementById('disease-type').value],
        [currentLanguage === 'en' ? 'Severity' : 'Keterukan', document.getElementById('severity').value],
        [currentLanguage === 'en' ? 'Affected Parts' : 'Bahagian Terjejas', Array.from(document.querySelectorAll('input[name="affected-parts"]:checked'))
            .map(cb => cb.value).join(', ') || (currentLanguage === 'en' ? 'None' : 'Tiada')],
        [currentLanguage === 'en' ? 'Notes' : 'Nota', document.getElementById('notes').value || (currentLanguage === 'en' ? 'None' : 'Tiada')],
        [currentLanguage === 'en' ? 'User' : 'Pengguna', currentUser.email],
        [''],
        [currentLanguage === 'en' ? 'Generated on' : 'Dijana pada', new Date().toLocaleString()]
    ]);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentLanguage === 'en' ? 'Health Report' : 'Laporan Kesihatan');
    
    // Generate and download file
    XLSX.writeFile(workbook, `tree-health-report-${document.getElementById('tree-id').value}.xlsx`);
    showStatus('Excel report downloaded successfully!', 'success');
}

// Language Management
let currentLanguage = 'en'; // Default language is English

// Language switching functionality
const languageSwitcher = document.getElementById('language-switcher');
languageSwitcher.addEventListener('click', toggleLanguage);

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'my' : 'en';
    updateLanguage();
    saveLanguagePreference();
}

function updateLanguage() {
    // Update all elements with data attributes
    const elementsToTranslate = document.querySelectorAll('[data-en]');
    
    elementsToTranslate.forEach(element => {
        const translation = element.getAttribute(`data-${currentLanguage}`);
        if (translation) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        }
    });
    
    // Update language button text
    languageSwitcher.textContent = currentLanguage === 'en' ? 'BM / Malay' : 'English';
    
    // Update page title
    document.title = currentLanguage === 'en' 
        ? 'Tree Health Monitoring System' 
        : 'Sistem Pemantauan Kesihatan Pokok';
    
    // Update header text
    const headerTitle = document.querySelector('header h1');
    const headerSubtitle = document.querySelector('header p');
    
    if (currentLanguage === 'en') {
        headerTitle.textContent = 'Tree Health Monitoring System';
        headerSubtitle.textContent = 'Track, analyze, and report on tree health conditions';
    } else {
        headerTitle.textContent = 'Sistem Pemantauan Kesihatan Pokok';
        headerSubtitle.textContent = 'Jejak, analisis, dan laporkan keadaan kesihatan pokok';
    }
    
    // Update report placeholder
    const placeholder = document.querySelector('.placeholder');
    if (placeholder) {
        placeholder.textContent = currentLanguage === 'en' 
            ? 'No report generated yet. Fill out the form and click "Generate Report".'
            : 'Tiada laporan dihasilkan lagi. Isi borang dan klik "Hasilkan Laporan".';
    }
    
    // Update logout button
    if (logoutBtn) {
        logoutBtn.textContent = currentLanguage === 'en' ? 'Logout' : 'Log Keluar';
    }
    
    // Update view history button text if it's expanded
    if (historySection.style.display !== 'none') {
        viewHistoryBtn.textContent = currentLanguage === 'en' ? 'Hide History' : 'Sembunyi Sejarah';
    } else {
        viewHistoryBtn.textContent = currentLanguage === 'en' ? 'View History' : 'Lihat Sejarah';
    }
    
    // Update analyze button if it's in loading state
    if (analyzeBtn.textContent.includes('Analyzing') || analyzeBtn.textContent.includes('Menganalisis')) {
        analyzeBtn.textContent = currentLanguage === 'en' ? 'Analyzing...' : 'Menganalisis...';
    }
    
    // Update modal language if it's open
    updateModalLanguage();
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved language preference
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
        currentLanguage = savedLanguage;
    }
    updateLanguage();
});

// Save language preference
function saveLanguagePreference() {
    localStorage.setItem('preferredLanguage', currentLanguage);
}

// Initialize the application
console.log('Tree Health Monitoring System initialized');
// Don't show initial status until auth state is determined

// Wait for auth state to be determined before showing initial status
setTimeout(() => {
    if (currentUser) {
        showStatus(`Welcome, ${currentUser.email}`, 'success');
    }
}, 1000);