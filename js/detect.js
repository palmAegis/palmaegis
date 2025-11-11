// Plant Disease Detection using TensorFlow.js
let model;
let classes = [];
let datasetCategories = [];
let modelMetadata = null;

// Valid oil palm disease classes based on dataset
// Only these classes are considered valid for oil palm tree disease detection
const validOilPalmClasses = [
    'Genoderma',
    'Ganoderma',
    'Ganoderma Fungus',
    'oil-palm-tree'
];

// Minimum confidence threshold for oil palm detection (default)
const MIN_OIL_PALM_CONFIDENCE = 65; // stricter: 65% minimum confidence for valid detection

// Class-specific confidence overrides (allows Ganoderma Fungus images to pass at slightly lower confidence)
const CLASS_MIN_CONFIDENCE = {
    'Genoderma': 55,        // accept at 55%
    'Ganoderma': 55,        // accept at 55%
    'Ganoderma Fungus': 50, // accept at 50%
    'oil-palm-tree': 65     // keep strict for tree presence
};

// Enhanced disease information with symptoms - updated based on dataset
const diseaseInfo = {
    'Genoderma': {
        description: 'Ganoderma is a serious fungal disease that affects oil palm trees, causing basal stem rot. It is one of the most destructive diseases in oil palm plantations.',
        symptoms: 'Yellowing and wilting of leaves, mushroom-like growth (conks) at the base of the tree, rotting of the stem base, tree collapse',
        treatment: 'Remove infected trees immediately, improve drainage, apply fungicides like thiophanate-methyl or propiconazole, and practice proper sanitation.',
        prevention: 'Maintain tree health, avoid wounding trees, practice good sanitation, use disease-free planting material, ensure proper drainage, and monitor regularly for early signs.',
        confidenceThreshold: 75,
        datasetInfo: 'This disease is the primary focus of the dataset, with extensive training data available.'
    },
    'Ganoderma': {
        description: 'Ganoderma is a serious fungal disease that affects oil palm trees, causing basal stem rot. It is one of the most destructive diseases in oil palm plantations.',
        symptoms: 'Yellowing and wilting of leaves, mushroom-like growth (conks) at the base of the tree, rotting of the stem base, tree collapse',
        treatment: 'Remove infected trees immediately, improve drainage, apply fungicides like thiophanate-methyl or propiconazole, and practice proper sanitation.',
        prevention: 'Maintain tree health, avoid wounding trees, practice good sanitation, use disease-free planting material, ensure proper drainage, and monitor regularly for early signs.',
        confidenceThreshold: 75,
        datasetInfo: 'This disease is the primary focus of the dataset, with extensive training data available.'
    },
    'Ganoderma Fungus': {
        description: 'Ganoderma Fungus refers to the visible fungal growth (conks or basidiocarps) of Ganoderma disease on oil palm trees. This is a clear indicator of advanced infection.',
        symptoms: 'Mushroom-like structures (conks) growing at the base of the tree, brown to reddish-brown fungal bodies, woody texture',
        treatment: 'Remove conks manually if possible, but tree removal is usually necessary as the disease is advanced. Apply fungicides and improve drainage.',
        prevention: 'Early detection is critical. Regular monitoring and removal of infected trees before conks form can prevent spread.',
        confidenceThreshold: 80,
        datasetInfo: 'Dataset contains specific annotations for Ganoderma Fungus detection.'
    },
    'oil-palm-tree': {
        description: 'Healthy oil palm tree or tree showing early signs that need monitoring.',
        symptoms: 'Healthy green leaves, proper growth, or early signs of stress',
        treatment: 'Monitor regularly, maintain proper nutrition and watering, and consult experts if symptoms appear.',
        prevention: 'Practice good plantation management, regular monitoring, proper spacing, and maintain tree health.',
        confidenceThreshold: 70,
        datasetInfo: 'Dataset includes healthy oil palm tree images for comparison.'
    },
    'Black Spot Leaf': {
        description: 'Black spot is a common fungal disease that affects palm leaves with circular black spots.',
        symptoms: 'Circular black spots with yellow halos on leaves, premature leaf drop, leaf discoloration',
        treatment: 'Apply fungicides (chlorothalonil, mancozeb) and remove infected leaves. Prune affected areas.',
        prevention: 'Ensure good air circulation, water at the base, clean up fallen leaves, and avoid overhead watering.',
        confidenceThreshold: 70
    },
    'Fruit Rod': {
        description: 'Fruit rot is caused by various fungi and bacteria affecting oil palm fruits.',
        symptoms: 'Soft, watery spots on fruits, mold growth, fruit decay, premature fruit drop',
        treatment: 'Remove infected fruits and apply appropriate fungicides (copper-based). Improve harvesting practices.',
        prevention: 'Practice crop rotation, ensure proper spacing, avoid overhead watering, and harvest carefully.',
        confidenceThreshold: 70
    },
    'Fusarium Wilt': {
        description: 'Fusarium wilt is a soil-borne fungal disease causing vascular wilting in oil palm trees.',
        symptoms: 'Yellowing and wilting of lower leaves, brown vascular tissue, stunted growth, one-sided leaf death',
        treatment: 'Use resistant varieties, soil solarization, and biological controls. Remove infected trees.',
        prevention: 'Practice crop rotation, use disease-free planting material, maintain soil health, and avoid waterlogging.',
        confidenceThreshold: 80
    }
};

// Load dataset categories from JSON files
async function loadDatasetCategories() {
    try {
        // Try to load from train dataset first
        // Use a timeout to avoid hanging on large files
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('dataset/train/_annotations.coco.json', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            // For large JSON files, we only need the categories part
            // Read as text first to parse more efficiently if needed
            const text = await response.text();
            const data = JSON.parse(text);
            
            if (data.categories && Array.isArray(data.categories)) {
                datasetCategories = data.categories.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    supercategory: cat.supercategory || 'none'
                }));
                console.log('✅ Dataset categories loaded:', datasetCategories);
                return datasetCategories;
            }
        } else {
            console.warn('⚠️ Dataset JSON file not accessible (might need a local server)');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('⚠️ Dataset loading timeout - file might be too large');
        } else {
            console.warn('⚠️ Could not load dataset categories:', error.message);
        }
    }
    
    // Fallback to default categories from dataset structure (known from dataset structure)
    if (datasetCategories.length === 0) {
        datasetCategories = [
            { id: 0, name: 'oil-palm-tree', supercategory: 'none' },
            { id: 1, name: 'Ganoderma', supercategory: 'oil-palm-tree' },
            { id: 2, name: 'Ganoderma Fungus', supercategory: 'oil-palm-tree' }
        ];
        console.log('✅ Using default dataset categories:', datasetCategories);
    }
    
    return datasetCategories;
}

// Load model metadata to get actual classes
async function loadModelMetadata() {
    try {
        const response = await fetch('model/metadata.json');
        if (response.ok) {
            modelMetadata = await response.json();
            if (modelMetadata.labels && Array.isArray(modelMetadata.labels)) {
                classes = modelMetadata.labels;
                console.log('✅ Model classes loaded from metadata:', classes);
                return modelMetadata;
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not load model metadata, using default classes:', error);
        // Fallback to default classes
        classes = ['Genoderma', 'Black Spot Leaf', 'Fruit Rod', 'Fusarium Wilt'];
    }
    return modelMetadata;
}

// Initialize the application
async function init() {
    try {
        showMessage('Loading dataset information...', 'loading');
        
        // Load dataset categories and model metadata in parallel
        await Promise.all([
            loadDatasetCategories(),
            loadModelMetadata()
        ]);
        
        // Verify classes are loaded
        if (classes.length === 0) {
            console.warn('⚠️ No classes loaded, using default classes');
            classes = ['Genoderma', 'Black Spot Leaf', 'Fruit Rod', 'Fusarium Wilt'];
        }
        
        showMessage('Loading AI model...', 'loading');
        
        // Load the TensorFlow.js model - use relative path from HTML file location
        model = await tf.loadLayersModel('model/model.json');
        console.log('✅ Model loaded successfully');
        console.log('✅ Using classes:', classes);
        console.log('✅ Dataset categories:', datasetCategories);
        
        // Warm up the model
        await warmUpModel();
        
        hideMessage('loading');
        setupEventListeners();
        
        // Display dataset information in console
        if (datasetCategories.length > 0) {
            console.log('📊 Dataset Information:');
            console.log(`   - Total categories: ${datasetCategories.length}`);
            datasetCategories.forEach(cat => {
                console.log(`   - ${cat.name} (ID: ${cat.id}, Supercategory: ${cat.supercategory})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error initializing application:', error);
        showMessage('Failed to load AI model or dataset. Please check if files exist. Error: ' + error.message, 'error');
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

// Check if a class name is a valid oil palm disease
function isValidOilPalmClass(className) {
    if (!className) return false;
    
    // Normalize class name for comparison (case insensitive, handle variations)
    const normalizedName = className.toLowerCase().trim().replace(/\s+/g, '');
    
    // Check against valid oil palm classes
    // Handle variations: Genoderma/Ganoderma, etc.
    const oilPalmKeywords = ['genoderma', 'ganoderma', 'oilpalm', 'oil-palm'];
    
    // Check if class name contains any oil palm keywords
    const containsOilPalmKeyword = oilPalmKeywords.some(keyword => 
        normalizedName.includes(keyword)
    );
    
    // Also check exact matches with valid classes (case insensitive)
    const exactMatch = validOilPalmClasses.some(validClass => {
        const normalizedValid = validClass.toLowerCase().trim().replace(/\s+/g, '');
        return normalizedName === normalizedValid || 
               normalizedName.includes(normalizedValid) || 
               normalizedValid.includes(normalizedName);
    });
    
    return containsOilPalmKeyword || exactMatch;
}

// Validate if the prediction is for an oil palm tree disease
function validateOilPalmDetection(results) {
    if (!results || results.length === 0) {
        return {
            isValid: false,
            isOilPalmClass: false,
            hasValidConfidence: false,
            hasAnyOilPalmPrediction: false,
            topClassName: 'Unknown',
            topConfidence: 0,
            requiredThreshold: MIN_OIL_PALM_CONFIDENCE
        };
    }
    
    const topResult = results[0];
    const topConfidence = topResult.probability * 100;
    const topClassName = topResult.class;
    
    // Check if top prediction is a valid oil palm class
    const isOilPalmClass = isValidOilPalmClass(topClassName);

    // Determine required confidence threshold per class (fallback to default)
    const requiredThreshold = CLASS_MIN_CONFIDENCE[topClassName] ?? MIN_OIL_PALM_CONFIDENCE;
    
    // Check if confidence is high enough
    const hasValidConfidence = topConfidence >= requiredThreshold;
    
    // Check all predictions for oil palm related classes with decent confidence
    const oilPalmPredictions = results.filter(result => {
        const confidence = result.probability * 100;
        return isValidOilPalmClass(result.class) && confidence >= 30;
    });
    
    const hasAnyOilPalmPrediction = oilPalmPredictions.length > 0;
    
    // Strict rule: reject obviously wrong non-oil-palm with very high confidence
    if (!isOilPalmClass && topConfidence > 70) {
        return {
            isValid: false,
            isOilPalmClass: false,
            hasValidConfidence: false,
            hasAnyOilPalmPrediction: hasAnyOilPalmPrediction,
            topClassName: topClassName,
            topConfidence: topConfidence,
            topOilPalmPrediction: oilPalmPredictions[0] || null,
            topOilPalmConfidence: oilPalmPredictions[0] ? oilPalmPredictions[0].probability * 100 : 0,
            requiredThreshold: requiredThreshold,
            rejectionReason: 'High confidence non-oil palm prediction'
        };
    }

    // Final decision: TOP must be oil palm class and meet its threshold
    const isValid = isOilPalmClass && hasValidConfidence;

    return {
        isValid: isValid,
        isOilPalmClass: isOilPalmClass,
        hasValidConfidence: hasValidConfidence,
        hasAnyOilPalmPrediction: hasAnyOilPalmPrediction,
        topClassName: topClassName,
        topConfidence: topConfidence,
        topOilPalmPrediction: oilPalmPredictions[0] || null,
        topOilPalmConfidence: oilPalmPredictions[0] ? oilPalmPredictions[0].probability * 100 : 0,
        requiredThreshold: requiredThreshold,
        rejectionReason: isValid ? null : (!isOilPalmClass ? 'Top prediction is not an oil palm disease' : 'Confidence too low for oil palm detection')
    };
}

// Check if there are strong non-oil palm predictions that might indicate wrong image
function hasStrongNonOilPalmPrediction(results) {
    // Check if any non-oil palm class has very high confidence (might indicate wrong image type)
    return results.some(result => {
        const confidence = result.probability * 100;
        return !isValidOilPalmClass(result.class) && confidence >= 70;
    });
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

    // Validate if this is an oil palm tree disease detection
    const validation = validateOilPalmDetection(results);
    
    // If not a valid oil palm detection, show "Please try again" message
    // Only allow Genoderma/Ganoderma related predictions (based on dataset)
    if (!validation.isValid) {
        showNotOilPalmMessage(resultsContainer, predictionsContainer, validation);
        return;
    }

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
    
    // Add warning if top prediction is not oil palm related but there's an oil palm prediction
    if (!validation.isOilPalmClass && validation.hasAnyOilPalmPrediction) {
        html += `
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #ffc107;">
                <strong>⚠️ Detection Note:</strong> Top prediction is "${topResult.class}" but oil palm disease detected. 
                Please ensure the image shows an oil palm tree for accurate results.
            </div>
        `;
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
                            ${result.info.symptoms ? `<div style="margin-top: 5px;"><strong>Symptoms:</strong> ${result.info.symptoms}</div>` : ''}
                            <div style="margin-top: 5px;"><strong>Treatment:</strong> ${result.info.treatment}</div>
                            <div style="margin-top: 5px;"><strong>Prevention:</strong> ${result.info.prevention}</div>
                            ${result.info.datasetInfo ? `<div style="margin-top: 5px; font-size: 12px; color: #3498db;"><strong>Dataset Info:</strong> ${result.info.datasetInfo}</div>` : ''}
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

    // Add dataset information footer
    if (datasetCategories.length > 0) {
        html += `
            <div style="margin-top: 20px; padding: 10px; background: #e8f4fd; border-radius: 5px; font-size: 12px; color: #2c3e50;">
                <strong>📊 Dataset Information:</strong> This model was trained using a dataset with ${datasetCategories.length} categories: ${datasetCategories.map(cat => cat.name).join(', ')}.
            </div>
        `;
    }
    
    resultsContainer.innerHTML = html;
    predictionsContainer.style.display = 'block';
    
    // Add expert consultation suggestion for low confidence
    if (confidenceLevel === 'low') {
        addExpertConsultation();
    }
}

// Show "Please try again" message for non-oil palm images
function showNotOilPalmMessage(resultsContainer, predictionsContainer, validation) {
    hideMessage('loading');
    
    let html = `
        <div style="background: #f8d7da; padding: 20px; border-radius: 5px; border-left: 4px solid #dc3545; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #721c24; margin-top: 0;">Please Try Again</h3>
            <p style="color: #721c24; font-size: 16px; margin: 15px 0;">
                The uploaded image does not appear to be an oil palm tree or an oil palm tree disease.
            </p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                <strong>Detection Details:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Top prediction: <strong>${validation.topClassName}</strong> (${validation.topConfidence.toFixed(1)}%)</li>
                    <li>Oil palm disease detected: <strong>${validation.isOilPalmClass ? 'Yes' : 'No'}</strong></li>
                    <li>Confidence level: <strong>${validation.hasValidConfidence ? 'Sufficient' : 'Too Low'}</strong> ${!validation.hasValidConfidence && validation.requiredThreshold ? `(needs ≥ ${validation.requiredThreshold}%)` : ''}</li>
                    ${validation.rejectionReason ? `<li>Reason: <strong style="color: #e74c3c;">${validation.rejectionReason}</strong></li>` : ''}
                    ${validation.topOilPalmConfidence > 0 ? `<li>Best oil palm prediction: <strong>${validation.topOilPalmPrediction?.class || 'N/A'}</strong> (${validation.topOilPalmConfidence.toFixed(1)}%)</li>` : ''}
                </ul>
            </div>
            <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin-top: 15px; text-align: left;">
                <strong>📋 Please ensure your image:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Shows an oil palm tree (Elaeis guineensis)</li>
                    <li>Is clear and well-lit</li>
                    <li>Focuses on the tree trunk, base, or leaves</li>
                    <li>Shows visible signs of disease (if detecting disease)</li>
                </ul>
            </div>
            <button onclick="clearImage(); document.getElementById('fileInput').click();" 
                    style="background: #3498db; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-top: 15px;">
                📷 Try Another Image
            </button>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
    predictionsContainer.style.display = 'block';
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