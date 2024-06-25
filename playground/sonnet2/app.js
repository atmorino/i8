const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const constraints = {
    video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
    }
};

let lastProcessingTime = 0;
const PROCESSING_INTERVAL = 500; // 0.5秒ごとに処理

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    } catch (err) {
        console.error('カメラの起動に失敗しました:', err);
    }
}

async function loadModel() {
    const model = await cocoSsd.load();
    return model;
}

function detectFieldLines(src) {
    let dst = new cv.Mat();
    let lines = new cv.Mat();
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0);
    cv.Canny(dst, dst, 50, 150, 3);
    cv.HoughLinesP(dst, lines, 1, Math.PI / 180, 50, 50, 10);

    let fieldLines = [];
    for (let i = 0; i < lines.rows; ++i) {
        let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
        let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);
        let length = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
        if (length > 50) { // フィルタリング: 短すぎる線は除外
            fieldLines.push({startPoint, endPoint});
        }
    }

    dst.delete(); lines.delete();
    return fieldLines;
}

function drawFieldLines(fieldLines) {
    fieldLines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.startPoint.x, line.startPoint.y);
        ctx.lineTo(line.endPoint.x, line.endPoint.y);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

async function detectObjects(model) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const currentTime = Date.now();
    if (currentTime - lastProcessingTime > PROCESSING_INTERVAL) {
        lastProcessingTime = currentTime;

        let src = cv.imread(canvas);
        let fieldLines = detectFieldLines(src);
        drawFieldLines(fieldLines);
        src.delete();

        const predictions = await model.detect(canvas);

        predictions.forEach(prediction => {
            if (prediction.class === 'person' && prediction.score > 0.5) {
                ctx.beginPath();
                ctx.rect(
                    prediction.bbox[0],
                    prediction.bbox[1],
                    prediction.bbox[2],
                    prediction.bbox[3]
                );
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
                ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                ctx.stroke();
                ctx.fillText(
                    `Person (${Math.round(prediction.score * 100)}%)`,
                    prediction.bbox[0],
                    prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
                );
            }
        });
    }

    requestAnimationFrame(() => detectObjects(model));
}

async function main() {
    await startCamera();

    await new Promise(resolve => {
        if (cv.Mat) resolve();
        else cv['onRuntimeInitialized'] = resolve;
    });

    const model = await loadModel();
    detectObjects(model);
}

main();