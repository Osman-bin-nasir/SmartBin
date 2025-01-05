const URL = "https://teachablemachine.withgoogle.com/models/rJapjDmoQ/";
let model, labelContainer, maxPredictions;
let webcamStream, canvas;
let videoDeviceId = null;

// Leaderboard Data
const leaderboard = {};

// Correct class for the test
const correctClass = "Correct Trash Photo";

async function init() {
    const modelURL = `${URL}model.json`;
    const metadataURL = `${URL}metadata.json`;

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = '';
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
        alert("Model loaded successfully!");
    } catch (error) {
        console.error("Error loading model:", error);
        alert("Failed to load model. Please check your internet connection or model URL.");
    }

    await populateCameraOptions();
}

async function populateCameraOptions() {
    const cameraSelect = document.getElementById("camera-select");
    cameraSelect.innerHTML = "";

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === "videoinput");

        videoDevices.forEach((device, index) => {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.text = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });

        if (videoDevices.length > 0) {
            videoDeviceId = videoDevices[0].deviceId;
        }

        cameraSelect.addEventListener("change", (event) => {
            videoDeviceId = event.target.value;
            startWebcam();
        });
    } catch (error) {
        console.error("Error accessing camera devices:", error);
        alert("Failed to access camera devices.");
    }
}

async function startWebcam() {
    const video = document.getElementById("webcam");
    if (!videoDeviceId) {
        alert("Please select a camera.");
        return;
    }

    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
    }

    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined }
        });
        video.srcObject = webcamStream;
    } catch (err) {
        console.error("Error accessing webcam:", err);
        alert("Error accessing webcam. Please ensure camera permissions are granted.");
    }
}

function captureImage() {
    const video = document.getElementById("webcam");
    if (!video.srcObject) {
        alert("Please start the webcam first!");
        return;
    }

    canvas = document.createElement("canvas");
    canvas.width = 321.33;
    canvas.height = 241.33;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageContainer = document.getElementById("image-container");
    imageContainer.innerHTML = '';
    const capturedImage = new Image();
    capturedImage.src = canvas.toDataURL();
    imageContainer.appendChild(capturedImage);

    predictImage(canvas);
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const image = new Image();
        image.src = e.target.result;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 321.33;
            canvas.height = 241.33;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            const imageContainer = document.getElementById("image-container");
            imageContainer.innerHTML = '';
            const resizedImage = new Image();
            resizedImage.src = canvas.toDataURL();
            imageContainer.appendChild(resizedImage);

            predictImage(canvas);
        };
    };
    reader.readAsDataURL(file);
}

async function predictImage(image) {
    if (!model) {
        alert("Please load the model first by clicking 'Start'!");
        return;
    }

    try {
        const prediction = await model.predict(image);
        labelContainer.innerHTML = '';
        let maxConfidence = 0;
        let maxClass = '';

        prediction.forEach((pred, i) => {
            const div = document.createElement("div");
            const classPrediction = `${pred.className}: ${(pred.probability * 100).toFixed(2)}%`;
            div.innerHTML = classPrediction;
            labelContainer.appendChild(div);

            if (pred.probability > maxConfidence) {
                maxConfidence = pred.probability;
                maxClass = pred.className;
            }
        });

        // Log the values for debugging
        console.log("Detected Class:", maxClass);
        console.log("Confidence Level:", maxConfidence);

        const feedback = document.getElementById("feedback");
        const confidenceThreshold = 0.40; // Minimum confidence threshold

        // Adjusted condition to check for a minimum confidence threshold
        if (maxClass === "Correct Tras..." && maxConfidence >= confidenceThreshold) {
            feedback.innerHTML = `Detected: ${maxClass} (${(maxConfidence * 100).toFixed(2)}%)`;
            feedback.style.color = "white";

            const name = prompt("Enter your name for the leaderboard:");
            if (name) {
                leaderboard[name] = (leaderboard[name] || 0) + 1;
                updateLeaderboard();
            }
        } else {
            feedback.innerHTML = `Take another photo and try again. Detected: ${maxClass} (${(maxConfidence * 100).toFixed(2)}%)`;
            feedback.style.color = "red";
        }
    } catch (error) {
        console.error("Error during prediction:", error);
        alert("Failed to make predictions. Please try again.");
    }
}

function updateLeaderboard() {
    const leaderboardElement = document.getElementById("leaderboard");
    leaderboardElement.innerHTML = ''; // Clear existing leaderboard

    const sortedLeaderboard = Object.entries(leaderboard)
        .sort(([, pointsA], [, pointsB]) => pointsB - pointsA);

    sortedLeaderboard.forEach(([name, points]) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${name}: ${points} points`;
        leaderboardElement.appendChild(listItem);
    });
}
