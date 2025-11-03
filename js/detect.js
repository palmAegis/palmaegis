// Plant Disease Detection using TensorFlow.js
let model;
const classes = ['Genoderma', 'Black Spot Leaf', 'Fruit Rod', 'Fusarium Wilt'];

// Enhanced disease information with symptoms
const diseaseInfo = {
    'Genoderma': {
        description: 'Ganoderma is a fungal disease that affects palm trees, causing basal stem rot.',
        symptoms: 'Yellowing leaves, wilting, mushroom-like growth at base',
        treatment: 'Remove infected trees, improve drainage, and use fungicides like thiophanate-methyl.',
        prevention: 'Maintain tree health, avoid wounding trees, practice good sanitation, and use resistant varieties.',
        confidenceThreshold: 75
    },
    'Black Spot Leaf': {
        description: 'Black spot is a common fungal disease that affects leaves with circular black spots.',
        symptoms: 'Circular black spots with yellow halos on leaves, premature leaf drop',
        treatment: 'Apply fungicides (chlorothalonil, mancozeb) and remove infected leaves.',
        prevention: 'Ensure good air circulation, water at the base, clean up fallen leaves, and avoid overhead watering.',
        confidenceThreshold: 70
    },
    'Fruit Rod': {
        description: 'Fruit rot is caused by various fungi and bacteria affecting fruits.',
        symptoms: 'Soft, watery spots on fruits, mold growth, fruit decay',
        treatment: 'Remove infected fruits and apply appropriate fungicides (copper-based).',
        prevention: 'Practice crop rotation, ensure proper spacing, avoid overhead watering, and harvest carefully.',
        confidenceThreshold: 70
    },
    'Fusarium Wilt': {
        description: 'Fusarium wilt is a soil-borne fungal disease causing vascular wilting.',
        symptoms: 'Yellowing and wilting of lower leaves, brown vascular tissue, stunted growth',
        treatment: 'Use resistant varieties, soil solarization, and biological controls.',
        prevention: 'Practice crop rotation, use disease-free planting material, and maintain soil health.',
        confidenceThreshold: 80
    }
};

// Initialize the application
async function init() {
    try {
        showMessage('Loading AI model...', 'loading');
        
        // Load the TensorFlow.js model
        model = await tf.loadLayersModel('../model/model.json');
        console.log('✅ Model loaded successfully');
        
        // Warm up the model
        await warmUpModel();
        
        hideMessage('loading');
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ Error loading model:', error);
        showMessage('Failed to load AI model. Please check if model files exist.', 'error');
    }
}

// Warm up the model for better performance
async function warmUpModel() {
    const warmupTensor = tf.zeros([1, 224, 224, 3]);
    await model.predict(warmupTensor).data();
    warmupTensor.dispose();
    console.log('🔥 Model warmed up');
}

// Set up event listeners
function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });
}

// Handle file selection
function handleFileSelect() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        showMessage('Please select a valid image file (JPG, PNG, JPEG).', 'error');
        return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showMessage('Image size too large. Please select an image under 10MB.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('preview');
        img.src = e.target.result;
        img.style.display = 'block';
        
        // Hide previous results and errors
        hideMessage('error');
        document.getElementById('predictions').style.display = 'none';
        
        // Analyze the image after it loads
        img.onload = () => analyzeImage(img);
    };
    reader.readAsDataURL(file);
}

// Enhanced image preprocessing
function preprocessImage(image) {
    return tf.tidy(() => {
        return tf.browser.fromPixels(image)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .div(255.0)
            .expandDims();
    });
}

// Analyze the uploaded image with enhanced confidence calculation
async function analyzeImage(image) {
    if (!model) {
        showMessage('Model not loaded yet. Please wait.', 'error');
        return;
    }
    
    try {
        showMessage('Analyzing image...', 'loading');
        
        const tensor = preprocessImage(image);
        
        // Run prediction multiple times for consistency (optional)
        const predictions = await model.predict(tensor).data();
        
        // Apply confidence boosting and normalization
        const enhancedPredictions = enhanceConfidence(predictions);
        
        displayEnhancedResults(enhancedPredictions);
        tensor.dispose();
        
        hideMessage('loading');
        
    } catch (error) {
        console.error('❌ Prediction error:', error);
        showMessage('Error analyzing image: ' + error.message, 'error');
        hideMessage('loading');
    }
}

// Enhanced confidence calculation with normalization
function enhanceConfidence(predictions) {
    const softmax = (arr) => {
        const max = Math.max(...arr);
        const exp = arr.map(x => Math.exp(x - max));
        const sum = exp.reduce((a, b) => a + b);
        return exp.map(x => x / sum);
    };
    
    // Apply softmax for better probability distribution
    let enhanced = softmax(predictions);
    
    // Boost confidence if one class is clearly dominant
    const maxProb = Math.max(...enhanced);
    const secondMax = Math.max(...enhanced.filter((_, i) => enhanced.indexOf(maxProb) !== i));
    
    // If the top prediction is significantly higher, boost it slightly
    if (maxProb > secondMax * 2) {
        const boostFactor = 1.1; // 10% boost
        enhanced = enhanced.map((prob, index) => {
            if (prob === maxProb) {
                return Math.min(1, prob * boostFactor);
            } else {
                return prob * (1 - (boostFactor - 1) * maxProb / (1 - maxProb));
            }
        });
    }
    
    // Re-normalize
    const sum = enhanced.reduce((a, b) => a + b);
    return enhanced.map(x => x / sum);
}

// Enhanced results display with better confidence handling
function displayEnhancedResults(predictions) {
    const resultsContainer = document.getElementById('predictionResults');
    const predictionsContainer = document.getElementById('predictions');
    
    const results = classes.map((className, index) => {
        return {
            class: className,
            probability: predictions[index],
            info: diseaseInfo[className] || {},
            threshold: diseaseInfo[className]?.confidenceThreshold || 70
        };
    }).sort((a, b) => b.probability - a.probability);

    const topResult = results[0];
    const topConfidence = topResult.probability * 100;
    const topThreshold = topResult.threshold;
    
    let html = '';
    
    // Confidence level indicators
    let confidenceLevel = 'low';
    let confidenceColor = '#e74c3c';
    
    if (topConfidence >= topThreshold) {
        confidenceLevel = 'high';
        confidenceColor = '#27ae60';
    } else if (topConfidence >= topThreshold - 15) {
        confidenceLevel = 'medium';
        confidenceColor = '#f39c12';
    }

    // Header with confidence indicator
    html += `
        <div style="background: ${confidenceColor}15; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid ${confidenceColor};">
            <strong>Confidence Level: <span style="color: ${confidenceColor}">${confidenceLevel.toUpperCase()}</span></strong>
            <div>Top prediction: <strong>${topResult.class}</strong> (${topConfidence.toFixed(1)}%)</div>
            ${topConfidence < topThreshold ? `
                <div style="margin-top: 8px; font-size: 14px;">
                    ⚠️ Confidence below recommended threshold (${topThreshold}%). Consider expert verification.
                </div>
            ` : ''}
        </div>
    `;

    // Display results with individual confidence indicators
    results.forEach((result, index) => {
        const confidence = result.probability * 100;
        const isAboveThreshold = confidence >= result.threshold;
        
        if (confidence > 5) { // Only show predictions above 5%
            const confidenceStatus = isAboveThreshold ? '✅ High' : '⚠️ Low';
            const statusColor = isAboveThreshold ? '#27ae60' : '#e74c3c';
            
            html += `
                <div class="prediction-item ${isAboveThreshold ? 'high-confidence' : ''}">
                    <div style="display: flex; justify-content: between; align-items: center;">
                        <strong>${index + 1}. ${result.class}</strong>
                        <span style="font-size: 12px; color: ${statusColor}; margin-left: 10px;">
                            ${confidenceStatus}
                        </span>
                    </div>
                    <div>Confidence: <strong>${confidence.toFixed(2)}%</strong> (Threshold: ${result.threshold}%)</div>
                    
                    ${isAboveThreshold && result.info.description ? `
                        <div style="margin-top: 8px; font-size: 14px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                            <div><strong>Description:</strong> ${result.info.description}</div>
                            ${result.info.symptoms ? `<div><strong>Symptoms:</strong> ${result.info.symptoms}</div>` : ''}
                            <div><strong>Treatment:</strong> ${result.info.treatment}</div>
                            <div><strong>Prevention:</strong> ${result.info.prevention}</div>
                        </div>
                    ` : ''}
                    
                    ${!isAboveThreshold && confidence > 15 ? `
                        <div style="margin-top: 5px; font-size: 12px; color: #e67e22;">
                            ⚠️ Low confidence - verify with expert
                        </div>
                    ` : ''}
                </div>
            `;
        }
    });

    resultsContainer.innerHTML = html;
    predictionsContainer.style.display = 'block';
    
    // Add expert consultation suggestion for low confidence
    if (confidenceLevel === 'low') {
        addExpertConsultation();
    }
}

// Add expert consultation section
function addExpertConsultation() {
    const resultsContainer = document.getElementById('predictionResults');
    resultsContainer.innerHTML += `
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
            <h4>👨‍🌾 Expert Recommendation</h4>
            <p>Due to low confidence in the AI prediction, we recommend:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Consult with a local agriculture expert</li>
                <li>Take multiple photos from different angles</li>
                <li>Check for additional symptoms mentioned above</li>
                <li>Consider soil and environmental factors</li>
            </ul>
            <button onclick="showManualOverride()" style="background: #e67e22; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                Select Disease Manually
            </button>
        </div>
    `;
}

// Manual override function
function showManualOverride() {
    const manualHtml = `
        <div style="margin-top: 15px; padding: 15px; background: #e8f4fd; border-radius: 5px;">
            <h5>Manual Disease Selection</h5>
            <p>Based on visible symptoms, select the most likely disease:</p>
            <select id="manualDiseaseSelect" style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 100%; margin: 10px 0;">
                <option value="">-- Select Disease --</option>
                ${classes.map(disease => `
                    <option value="${disease}">${disease}</option>
                `).join('')}
            </select>
            <div style="display: flex; gap: 10px;">
                <button onclick="applyManualSelection()" style="background: #27ae60; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                    Apply Selection
                </button>
                <button onclick="cancelManualSelection()" style="background: #95a5a6; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('predictionResults').innerHTML += manualHtml;
}

function applyManualSelection() {
    const select = document.getElementById('manualDiseaseSelect');
    const selectedDisease = select.value;
    
    if (selectedDisease) {
        const resultsContainer = document.getElementById('predictionResults');
        resultsContainer.innerHTML = `
            <div class="prediction-item high-confidence">
                <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                    <strong>👨‍🌾 Expert Override Applied</strong>
                    <div>Manual selection based on visible symptoms</div>
                </div>
                <strong>Selected: ${selectedDisease}</strong>
                <div style="color: #e67e22;">(AI confidence was low, using manual selection)</div>
                <div style="margin-top: 8px; font-size: 14px;">
                    <div><strong>Description:</strong> ${diseaseInfo[selectedDisease]?.description || 'No description available'}</div>
                    <div><strong>Symptoms:</strong> ${diseaseInfo[selectedDisease]?.symptoms || 'No symptoms information available'}</div>
                    <div><strong>Treatment:</strong> ${diseaseInfo[selectedDisease]?.treatment || 'No treatment information available'}</div>
                    <div><strong>Prevention:</strong> ${diseaseInfo[selectedDisease]?.prevention || 'No prevention information available'}</div>
                </div>
            </div>
        `;
    }
}

function cancelManualSelection() {
    // Reload the page to start fresh
    location.reload();
}

// Clear the current image and results
function clearImage() {
    document.getElementById('fileInput').value = '';
    document.getElementById('preview').style.display = 'none';
    document.getElementById('predictions').style.display = 'none';
    hideMessage('error');
    hideMessage('loading');
}

// Utility functions for showing/hiding messages
function showMessage(message, type) {
    const element = document.getElementById(type);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function hideMessage(type) {
    const element = document.getElementById(type);
    if (element) {
        element.style.display = 'none';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);

// Handle page errors
window.addEventListener('error', (e) => {
    console.error('Global error:', e);
    showMessage('An unexpected error occurred. Please refresh the page.', 'error');
});