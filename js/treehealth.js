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
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
    db = null;
}

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
    imageUpload.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = '#f1f8e9';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.backgroundColor = '';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = '';
    const files = e.dataTransfer.files;
    handleImageFiles(files);
});

imageUpload.addEventListener('change', (e) => {
    handleImageFiles(e.target.files);
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
    if (imagePreview.children.length === 0) {
        showStatus('Please upload at least one image first.', 'warning');
        return;
    }
    
    // Show loading state
    analyzeBtn.textContent = 'Analyzing...';
    analyzeBtn.disabled = true;
    
    // Simulate AI processing delay
    setTimeout(() => {
        // Generate mock AI analysis results
        const mockResults = generateMockAIAnalysis();
        
        // Populate form with AI results
        document.getElementById('tree-id').value = 'AI-' + Math.floor(1000 + Math.random() * 9000);
        document.getElementById('tree-species').value = mockResults.species;
        document.getElementById('location').value = 'AI Detected Location';
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
        analyzeBtn.textContent = 'Analyze Images';
        analyzeBtn.disabled = false;
        
        // Switch to manual tab to show results
        manualTab.click();
        
        showStatus('AI analysis complete! Form populated with detected health issues.', 'success');
    }, 2000);
});

function generateMockAIAnalysis() {
    const speciesOptions = ['oak', 'maple', 'pine', 'palm', 'birch'];
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
        reportId: 'RPT-' + Date.now()
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
                <h3>Tree Health Report</h3>
                <p>Generated on: ${new Date(report.timestamp).toLocaleString()}</p>
            </div>
            <div class="report-details">
                <div class="detail-item">
                    <span class="detail-label">Tree ID:</span> ${report.treeId}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Species:</span> ${report.species}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Location:</span> ${report.location}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Health Status:</span> ${report.healthStatus}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Disease Type:</span> ${report.diseaseType}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Severity:</span> 
                    <span class="severity-indicator ${severityClass}">${report.severity}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Affected Parts:</span> ${report.affectedParts.join(', ') || 'None'}
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label">Notes:</span> ${report.notes || 'No additional notes.'}
            </div>
            <div class="save-status" id="save-status" style="margin-top: 15px; padding: 10px; border-radius: 5px; display: none;">
                <span class="detail-label">Save Status:</span> <span id="save-status-text"></span>
            </div>
        </div>
    `;
    
    reportOutput.innerHTML = reportHTML;
}

// Status message function
function showStatus(message, type = 'info') {
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };
    
    statusMessage.textContent = message;
    statusMessage.style.backgroundColor = colors[type] || colors.info;
    statusMessage.style.opacity = '1';
    
    setTimeout(() => {
        statusMessage.style.opacity = '0';
    }, 4000);
}

// Firebase Operations with fallback to localStorage
function saveReportToFirebase(report) {
    // Show saving status in report
    const saveStatusElement = document.getElementById('save-status');
    const saveStatusText = document.getElementById('save-status-text');
    
    if (saveStatusElement && saveStatusText) {
        saveStatusElement.style.display = 'block';
        saveStatusElement.style.backgroundColor = '#fff3cd';
        saveStatusElement.style.border = '1px solid #ffeaa7';
        saveStatusText.textContent = 'Saving to database...';
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
                saveStatusText.textContent = '✓ Successfully saved to cloud database';
                saveStatusText.style.color = '#155724';
            }
            
            showStatus('Report saved successfully to cloud database!', 'success');
            
            // Also save to localStorage as backup
            saveReportToLocalStorage(report);
        })
        .catch((error) => {
            console.error('Error saving report to Firebase: ', error);
            console.error('Error details:', error.code, error.message);
            
            // Update save status for error
            if (saveStatusElement && saveStatusText) {
                saveStatusElement.style.backgroundColor = '#f8d7da';
                saveStatusElement.style.border = '1px solid #f5c6cb';
                saveStatusText.textContent = '⚠ Saved locally (cloud sync failed)';
                saveStatusText.style.color = '#721c24';
            }
            
            // Fallback to localStorage
            console.warn('Falling back to localStorage');
            saveReportToLocalStorage(report);
            
            // Show user-friendly error message
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
        
        // Only show success message if not already shown from Firebase
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
    if (historySection.style.display === 'none') {
        loadHistory();
        historySection.style.display = 'block';
        viewHistoryBtn.textContent = 'Hide History';
        showStatus('Loading historical reports...', 'info');
    } else {
        historySection.style.display = 'none';
        viewHistoryBtn.textContent = 'View History';
    }
});

function loadHistory() {
    historyList.innerHTML = '<p>Loading history...</p>';
    
    // Try Firebase first, then fallback to localStorage
    if (db) {
        loadHistoryFromFirebase();
    } else {
        loadHistoryFromLocalStorage();
    }
}

function loadHistoryFromFirebase() {
    db.collection('treeHealthReports')
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
        const reports = JSON.parse(localStorage.getItem('treeHealthReports') || '[]');
        
        if (reports.length === 0) {
            historyList.innerHTML = '<p>No historical reports found.</p>';
            showStatus('No historical reports found.', 'info');
            return;
        }
        
        // Sort by timestamp (newest first) and take latest 10
        const sortedReports = reports
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
            
        displayHistoryLocal(sortedReports);
        showStatus('Historical reports loaded from local storage.', 'info');
    } catch (error) {
        console.error('Error loading history from localStorage:', error);
        historyList.innerHTML = '<p>Error loading history.</p>';
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
            <div>Species: ${report.species}</div>
            <div>Health: ${report.healthStatus}</div>
            <div>Disease: ${report.diseaseType}</div>
            <div>Severity: <span class="severity-indicator severity-${report.severity}">${report.severity}</span></div>
        </div>
    `;
    
    historyList.appendChild(historyItem);
}

// Export Functions
downloadPdfBtn.addEventListener('click', downloadPDF);
downloadExcelBtn.addEventListener('click', downloadExcel);

function downloadPDF() {
    const reportElement = document.querySelector('.health-report');
    
    if (!reportElement) {
        showStatus('Please generate a report first.', 'warning');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Simple PDF generation
    doc.setFontSize(16);
    doc.text('Tree Health Report', 20, 20);
    
    doc.setFontSize(12);
    let yPosition = 40;
    
    const details = [
        `Tree ID: ${document.getElementById('tree-id').value}`,
        `Species: ${document.getElementById('tree-species').value}`,
        `Location: ${document.getElementById('location').value}`,
        `Health Status: ${document.getElementById('health-status').value}`,
        `Disease Type: ${document.getElementById('disease-type').value}`,
        `Severity: ${document.getElementById('severity').value}`,
        `Affected Parts: ${Array.from(document.querySelectorAll('input[name="affected-parts"]:checked'))
            .map(cb => cb.value).join(', ') || 'None'}`,
        `Notes: ${document.getElementById('notes').value || 'None'}`
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
    
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPosition + 10);
    
    doc.save(`tree-health-report-${document.getElementById('tree-id').value}.pdf`);
    showStatus('PDF report downloaded successfully!', 'success');
}

function downloadExcel() {
    const reportElement = document.querySelector('.health-report');
    
    if (!reportElement) {
        showStatus('Please generate a report first.', 'warning');
        return;
    }
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([
        ['Tree Health Report'],
        [''],
        ['Tree ID', document.getElementById('tree-id').value],
        ['Species', document.getElementById('tree-species').value],
        ['Location', document.getElementById('location').value],
        ['Health Status', document.getElementById('health-status').value],
        ['Disease Type', document.getElementById('disease-type').value],
        ['Severity', document.getElementById('severity').value],
        ['Affected Parts', Array.from(document.querySelectorAll('input[name="affected-parts"]:checked'))
            .map(cb => cb.value).join(', ') || 'None'],
        ['Notes', document.getElementById('notes').value || 'None'],
        [''],
        ['Generated on', new Date().toLocaleString()]
    ]);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Health Report');
    
    // Generate and download file
    XLSX.writeFile(workbook, `tree-health-report-${document.getElementById('tree-id').value}.xlsx`);
    showStatus('Excel report downloaded successfully!', 'success');
}

// Initialize the application
console.log('Tree Health Monitoring System initialized');
showStatus('Tree Health Monitoring System ready!', 'success');
// Add this to your treehealth.js file

// Language Management
let currentLanguage = 'en'; // Default language is English

// DOM Elements for language
const languageSwitcher = document.getElementById('language-switcher');

// Language switching functionality
languageSwitcher.addEventListener('click', toggleLanguage);

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'my' : 'en';
    updateLanguage();
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
    
    // Update status messages if any are active
    updateStatusMessagesLanguage();
}

function updateStatusMessagesLanguage() {
    // This function would update any active status messages
    // You can implement this based on your status message system
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

// Modify the toggleLanguage function to save preference
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'my' : 'en';
    updateLanguage();
    saveLanguagePreference();
}

// Update your existing status message function to support multiple languages
function showStatus(message, type = 'info') {
    // You can create language-specific messages here
    const messages = {
        // Success messages
        'Report saved successfully to cloud database!': {
            en: 'Report saved successfully to cloud database!',
            my: 'Laporan berjaya disimpan ke pangkalan data awan!'
        },
        'Oil palm analysis complete! Form populated with detected issues.': {
            en: 'Oil palm analysis complete! Form populated with detected issues.',
            my: 'Analisis kelapa sawit selesai! Borang diisi dengan isu yang dikesan.'
        },
        'PDF report downloaded successfully!': {
            en: 'PDF report downloaded successfully!',
            my: 'Laporan PDF berjaya dimuat turun!'
        },
        // Warning messages
        'Please upload at least one image first.': {
            en: 'Please upload at least one image first.',
            my: 'Sila muat naik sekurang-kurangnya satu imej dahulu.'
        },
        'Please generate a report first.': {
            en: 'Please generate a report first.',
            my: 'Sila hasilkan laporan dahulu.'
        },
        // Error messages
        'Error connecting to database. Report saved locally instead.': {
            en: 'Error connecting to database. Report saved locally instead.',
            my: 'Ralat menyambung ke pangkalan data. Laporan disimpan secara tempatan.'
        }
    };
    
    // Get the translated message or use the original
    const translatedMessage = messages[message] ? messages[message][currentLanguage] : message;
    
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };
    
    statusMessage.textContent = translatedMessage;
    statusMessage.style.backgroundColor = colors[type] || colors.info;
    statusMessage.style.opacity = '1';
    
    setTimeout(() => {
        statusMessage.style.opacity = '0';
    }, 4000);
}