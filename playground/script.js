const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },  // 解像度を高く設定
            height: { ideal: 720 }   // 解像度を高く設定
        }
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function detectHumans(model) {
    const predictions = await model.detect(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    predictions.forEach(prediction => {
        if (prediction.class === 'person') {
            ctx.beginPath();
            ctx.rect(...prediction.bbox);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.fillStyle = 'red';
            ctx.stroke();
            ctx.fillText(
                `${prediction.score.toFixed(2)}`,
                prediction.bbox[0],
                prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
            );
        }
    });
}

async function main() {
    await setupCamera();
    video.play();
    
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const model = await cocoSsd.load();
    const frameRate = 200;  // 推論の頻度を調整
    setInterval(() => {
        detectHumans(model);
    }, frameRate);
}

main();
