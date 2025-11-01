// treatment.js
// Firebase configuration
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
const database = firebase.database();

// DOM elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const filterBtns = document.querySelectorAll('.filter-btn');
const treatmentContainer = document.getElementById('treatmentContainer');
const treatmentModal = document.getElementById('treatmentModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.querySelector('.close-modal');

// Global variables
let treatments = [];
let currentFilter = 'all';
let currentSearchTerm = '';

// Event listeners
document.addEventListener('DOMContentLoaded', loadTreatments);
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        // Update active filter button
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Set current filter and refresh display
        currentFilter = this.getAttribute('data-filter');
        displayTreatments();
    });
});

// Close modal when clicking X or outside modal
closeModal.addEventListener('click', function() {
    treatmentModal.style.display = 'none';
});

window.addEventListener('click', function(event) {
    if (event.target === treatmentModal) {
        treatmentModal.style.display = 'none';
    }
});

// Load treatments from Firebase
function loadTreatments() {
    const treatmentsRef = database.ref('treatments');
    
    treatmentsRef.on('value', (snapshot) => {
        treatments = [];
        snapshot.forEach((childSnapshot) => {
            const treatment = childSnapshot.val();
            treatment.id = childSnapshot.key;
            treatments.push(treatment);
        });
        displayTreatments();
    }, (error) => {
        console.error('Error loading treatments:', error);
        showMessage('Error loading treatments. Please try again.', 'error');
    });
}

// Display treatments based on current filter and search
function displayTreatments() {
    treatmentContainer.innerHTML = '';
    
    if (treatments.length === 0) {
        treatmentContainer.innerHTML = '<p>No treatments found. Please check back later.</p>';
        return;
    }
    
    let filteredTreatments = treatments;
    
    // Apply filter
    if (currentFilter !== 'all') {
        filteredTreatments = filteredTreatments.filter(treatment => 
            treatment.plantPart === currentFilter
        );
    }
    
    // Apply search
    if (currentSearchTerm) {
        const searchTerm = currentSearchTerm.toLowerCase();
        filteredTreatments = filteredTreatments.filter(treatment => 
            treatment.diseaseName.toLowerCase().includes(searchTerm) ||
            treatment.symptoms.toLowerCase().includes(searchTerm) ||
            treatment.recommendedPesticides.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filteredTreatments.length === 0) {
        treatmentContainer.innerHTML = '<p>No treatments match your search criteria.</p>';
        return;
    }
    
    // Create treatment cards
    filteredTreatments.forEach(treatment => {
        const treatmentCard = createTreatmentCard(treatment);
        treatmentContainer.appendChild(treatmentCard);
    });
}

// Create a treatment card element
function createTreatmentCard(treatment) {
    const card = document.createElement('div');
    card.className = 'treatment-card';
    
    const imageUrl = treatment.diseaseImage || 'https://via.placeholder.com/300x200?text=No+Image+Available';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${treatment.diseaseName}" class="treatment-image">
        <div class="treatment-content">
            <h3 class="treatment-title">${treatment.diseaseName}</h3>
            <span class="treatment-part">${getPlantPartName(treatment.plantPart)}</span>
            <p class="treatment-symptoms">${truncateText(treatment.symptoms, 100)}</p>
            <button class="treatment-details-btn" data-id="${treatment.id}">View Treatment Details</button>
        </div>
    `;
    
    // Add event listener to details button
    const detailsBtn = card.querySelector('.treatment-details-btn');
    detailsBtn.addEventListener('click', function() {
        showTreatmentDetails(treatment.id);
    });
    
    return card;
}

// Show treatment details in a modal
function showTreatmentDetails(treatmentId) {
    const treatment = treatments.find(t => t.id === treatmentId);
    if (!treatment) return;
    
    const imageUrl = treatment.diseaseImage || 'https://via.placeholder.com/800x400?text=No+Image+Available';
    let videoHtml = '';
    
    if (treatment.videoUrl) {
        // Extract YouTube video ID
        const videoId = extractYouTubeId(treatment.videoUrl);
        if (videoId) {
            videoHtml = `
                <div class="treatment-info-section">
                    <h3>Tutorial Video</h3>
                    <div class="video-container">
                        <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
            `;
        }
    }
    
    // Create dosage table if dosage information exists
    let dosageHtml = '';
    if (treatment.dosage && treatment.dosage.length > 0) {
        let dosageRows = '';
        treatment.dosage.forEach(dose => {
            dosageRows += `
                <tr>
                    <td>${dose.product || 'N/A'}</td>
                    <td>${dose.amount || 'N/A'}</td>
                    <td>${dose.frequency || 'N/A'}</td>
                    <td>${dose.notes || 'N/A'}</td>
                </tr>
            `;
        });
        
        dosageHtml = `
            <div class="treatment-info-section">
                <h3>Recommended Dosage</h3>
                <table class="dosage-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Amount</th>
                            <th>Frequency</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dosageRows}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    modalContent.innerHTML = `
        <h2>${treatment.diseaseName}</h2>
        <span class="treatment-part">${getPlantPartName(treatment.plantPart)}</span>
        
        <div class="treatment-info-section">
            <h3>Disease Image</h3>
            <img src="${imageUrl}" alt="${treatment.diseaseName}" class="treatment-detail-image">
        </div>
        
        <div class="treatment-info-section">
            <h3>Symptoms</h3>
            <p>${treatment.symptoms}</p>
        </div>
        
        <div class="treatment-info-section">
            <h3>Recommended Treatment</h3>
            <p><strong>Pesticides/Medicines:</strong> ${treatment.recommendedPesticides}</p>
            <p><strong>Application Method:</strong> ${treatment.usageInstructions}</p>
            <p><strong>Optimal Timing:</strong> ${treatment.treatmentTiming}</p>
        </div>
        
        ${dosageHtml}
        
        ${videoHtml}
        
        <div class="treatment-info-section">
            <h3>Additional Notes</h3>
            <p>${treatment.additionalNotes || 'No additional notes provided.'}</p>
        </div>
    `;
    
    // Show modal
    treatmentModal.style.display = 'block';
}

// Perform search
function performSearch() {
    currentSearchTerm = searchInput.value.trim();
    displayTreatments();
}

// Helper functions
function getPlantPartName(part) {
    const parts = {
        'leaf': 'Leaves',
        'fruit': 'Fruits',
        'stem': 'Stems',
        'root': 'Roots'
    };
    return parts[part] || part;
}

function truncateText(text, maxLength) {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function extractYouTubeId(url) {
    if (!url) return null;
    
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

function showMessage(message, type) {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        color: white;
        z-index: 1001;
        font-weight: bold;
        background-color: ${type === 'success' ? 'var(--success-color)' : 'var(--error-color)'};
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(messageEl);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        if (document.body.contains(messageEl)) {
            document.body.removeChild(messageEl);
        }
    }, 3000);
}
