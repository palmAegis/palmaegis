const modelURL = "model/";
let model;

async function init() {
  model = await tmImage.load(modelURL + "model.json", modelURL + "metadata.json");
  console.log("✅ Model loaded successfully!");
}

init();

const fileInput = document.getElementById("imageUpload");
const preview = document.getElementById("preview");
const result = document.getElementById("result");
const confidence = document.getElementById("confidence");

fileInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    preview.src = e.target.result;

    // Wait until model is loaded
    if (!model) {
      result.textContent = "Loading model...";
      await init();
    }

    // Make prediction
    const prediction = await model.predict(preview);
    prediction.sort((a, b) => b.probability - a.probability);

    result.textContent = `Prediction: ${prediction[0].className}`;
    confidence.textContent = `Confidence: ${(prediction[0].probability * 100).toFixed(2)}%`;
  };

  reader.readAsDataURL(file);
});
