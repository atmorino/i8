async function setupCamera() {
    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function run() {
    const video = await setupCamera();
    video.play();
    const model = await cocoSsd.load();
    detectFrame(video, model);
}

function detectFrame(video, model) {
    model.detect(video).then(predictions => {
        renderPredictions(predictions);
        requestAnimationFrame(() => {
            detectFrame(video, model);
        });
    });
}

function renderPredictions(predictions) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    predictions.forEach(prediction => {
        if (prediction.class === 'person') {
            ctx.beginPath();
            ctx.rect(...prediction.bbox);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.fillStyle = 'red';
            ctx.stroke();
            ctx.fillText(
                `${prediction.class} ${Math.round(prediction.score * 100)}%`,
                prediction.bbox[0],
                prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
            );
        }
    });
}

run();
