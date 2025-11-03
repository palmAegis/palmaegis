// Plant Disease Detection using TensorFlow.js
let model;
const classes = ['Genoderma', 'Black Spot Leaf', 'Fruit Rod', 'Fusarium Wilt'];

// Disease information for each class
const diseaseInfo = {
    'Genoderma': {
        description: 'Ganoderma is a fungal disease that affects palm trees.',
        treatment: 'Remove infected trees, improve drainage, and use fungicides.',
        prevention: 'Maintain tree health, avoid wounding trees, and practice good sanitation.'
    },
    'Black Spot Leaf': {
        description: 'Black spot is a common fungal disease that affects many plants.',
        treatment: 'Apply fungicides and remove infected leaves.',
        prevention: 'Ensure good air circulation, water at the base, and clean up fallen leaves.'
    },
    'Fruit Rod': {
        description: 'Fruit rot is caused by various fungi and bacteria.',
        treatment: 'Remove infected fruits and apply appropriate fungicides.',
        prevention: 'Practice crop rotation, ensure proper spacing, and avoid overhead watering.'
    },
    'Fusarium Wilt': {
        description: 'Fusarium wilt is a soil-borne fungal disease.',
        treatment: 'Use resistant varieties and soil fumigation.',
        prevention: 'Practice crop rotation and use disease-free planting material.'
    }
};

// Initialize the application
async function init() {
    try {
        showMessage('Loading AI model...', 'loading');
        
        // Load the TensorFlow.js model
        model = await tf.loadLayersModel('../model/model.json');
        console.log('✅ Model loaded successfully');
        
        hideMessage('loading');
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ Error loading model:', error);
        showMessage('Failed to load AI model. Please check if model files exist.', 'error');
    }
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
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('preview');
        img.src = e.target.result;
        img.style.display = 'block';
        
        // Hide previous results and errors
        hideMessage('error');
        document.getElementById('predictions').style.display = 'none';
        
        // Analyze the image
        analyzeImage(img);
    };
    reader.readAsDataURL(file);
}

// Preprocess image for the model
function preprocessImage(image) {
    return tf.tidy(() => {
        const tensor = tf.browser.fromPixels(image)
            .resizeNearestNeighbor([224, 224])  // Adjust based on your model's input size
            .toFloat()
            .div(255.0)
            .expandDims();
        return tensor;
    });
}
function displayResults(predictions) {
    const resultsContainer = document.getElementById('predictionResults');
    const predictionsContainer = document.getElementById('predictions');
    
    const results = classes.map((className, index) => {
        return {
            class: className,
            probability: predictions[index],
            info: diseaseInfo[className] || {}
        };
    }).sort((a, b) => b.probability - a.probability);

    // Filter out low confidence predictions (below 15%)
    const filteredResults = results.filter(result => result.probability * 100 > 15);
    
    let html = '';
    if (filteredResults.length === 0) {
        html = `<div class="prediction-item">
            <strong>⚠️ No confident prediction</strong>
            <div>The model is not confident about any specific disease.</div>
            <div>Please try a clearer image or consult an expert.</div>
        </div>`;
    } else {
        filteredResults.forEach((result, index) => {
            const confidence = result.probability * 100;
            html += `
                <div class="prediction-item ${confidence > 70 ? 'high-confidence' : ''}">
                    <strong>${index + 1}. ${result.class}</strong>
                    <div>Confidence: <strong>${confidence.toFixed(2)}%</strong></div>
                    ${result.info.description ? `
                        <div style="margin-top: 8px; font-size: 14px;">
                            <div><strong>Description:</strong> ${result.info.description}</div>
                            <div><strong>Treatment:</strong> ${result.info.treatment}</div>
                            <div><strong>Prevention:</strong> ${result.info.prevention}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }
    
    resultsContainer.innerHTML = html;
    predictionsContainer.style.display = 'block';
}

// Analyze the uploaded image
async function analyzeImage(image) {
    if (!model) {
        showMessage('Model not loaded yet. Please wait.', 'error');
        return;
    }
    
    try {
        showMessage('Analyzing image...', 'loading');
        
        const tensor = preprocessImage(image);
        const predictions = await model.predict(tensor).data();
        
        displayResults(predictions);
        tensor.dispose();
        
        hideMessage('loading');
        
    } catch (error) {
        console.error('❌ Prediction error:', error);
        showMessage('Error analyzing image. Please try another image.', 'error');
        hideMessage('loading');
    }
}

function displayResults(predictions) {
    const resultsContainer = document.getElementById('predictionResults');
    const predictionsContainer = document.getElementById('predictions');
    
    const results = classes.map((className, index) => {
        return {
            class: className,
            probability: predictions[index],
            info: diseaseInfo[className] || {}
        };
    }).sort((a, b) => b.probability - a.probability);

    const topConfidence = results[0].probability * 100;
    
    let html = '';
    
    // If low confidence, show warning
    if (topConfidence < 60) {
        html += `
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                <strong>⚠️ Low Confidence Prediction</strong>
                <div>The AI is not very confident. Consider consulting an agriculture expert.</div>
            </div>
        `;
    }

    results.forEach((result, index) => {
        const confidence = result.probability * 100;
        
        // Only show detailed info for predictions above 10%
        if (confidence > 10) {
            const isHighConfidence = confidence > 70;
            
            html += `
                <div class="prediction-item ${isHighConfidence ? 'high-confidence' : ''}">
                    <strong>${index + 1}. ${result.class}</strong>
                    <div>Confidence: <strong>${confidence.toFixed(2)}%</strong></div>
                    ${isHighConfidence && result.info.description ? `
                        <div style="margin-top: 8px; font-size: 14px;">
                            <div><strong>Description:</strong> ${result.info.description}</div>
                            <div><strong>Treatment:</strong> ${result.info.treatment}</div>
                            <div><strong>Prevention:</strong> ${result.info.prevention}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    });

    resultsContainer.innerHTML = html;
    predictionsContainer.style.display = 'block';
    
    // Add manual override for low confidence cases
    if (topConfidence < 70) {
        addManualVerification();
    }
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