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
let lastDetections = []; // 直近の検出結果を保持
const DETECTION_HISTORY = 3; // 保持する検出結果の数

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
        if (length > 50) {
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

function drawDetections(detections) {
    detections.forEach(detection => {
        ctx.beginPath();
        ctx.rect(
            detection.bbox[0],
            detection.bbox[1],
            detection.bbox[2],
            detection.bbox[3]
        );
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.stroke();
        ctx.fillText(
            `Person (${Math.round(detection.score * 100)}%)`,
            detection.bbox[0],
            detection.bbox[1] > 10 ? detection.bbox[1] - 5 : 10
        );
    });
}

function mergeDetections(detections) {
    // 重複する検出結果をマージ
    let mergedDetections = [];
    detections.forEach(detection => {
        let matchFound = false;
        for (let i = 0; i < mergedDetections.length; i++) {
            if (isSameDetection(mergedDetections[i], detection)) {
                mergedDetections[i].score = Math.max(mergedDetections[i].score, detection.score);
                matchFound = true;
                break;
            }
        }
        if (!matchFound) {
            mergedDetections.push(detection);
        }
    });
    return mergedDetections;
}

function isSameDetection(d1, d2) {
    const iouThreshold = 0.5;
    const intersection = (
        Math.max(0, Math.min(d1.bbox[0] + d1.bbox[2], d2.bbox[0] + d2.bbox[2]) - Math.max(d1.bbox[0], d2.bbox[0])) *
        Math.max(0, Math.min(d1.bbox[1] + d1.bbox[3], d2.bbox[1] + d2.bbox[3]) - Math.max(d1.bbox[1], d2.bbox[1]))
    );
    const union = d1.bbox[2] * d1.bbox[3] + d2.bbox[2] * d2.bbox[3] - intersection;
    return intersection / union > iouThreshold;
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
        const personDetections = predictions.filter(p => p.class === 'person' && p.score > 0.5);

        lastDetections.push(personDetections);
        if (lastDetections.length > DETECTION_HISTORY) {
            lastDetections.shift();
        }
    }

    // 直近の検出結果をすべて結合し、重複を除去
    const allDetections = [].concat(...lastDetections);
    const mergedDetections = mergeDetections(allDetections);

    drawDetections(mergedDetections);

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