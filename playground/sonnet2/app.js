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
let fieldCorners = null;

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

function detectFieldCorners(fieldLines) {
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    fieldLines.forEach(line => {
        left = Math.min(left, line.startPoint.x, line.endPoint.x);
        right = Math.max(right, line.startPoint.x, line.endPoint.x);
        top = Math.min(top, line.startPoint.y, line.endPoint.y);
        bottom = Math.max(bottom, line.startPoint.y, line.endPoint.y);
    });
    return {
        topLeft: {x: left, y: top},
        topRight: {x: right, y: top},
        bottomLeft: {x: left, y: bottom},
        bottomRight: {x: right, y: bottom}
    };
}

function estimatePlayerPosition(player, fieldCorners) {
    const footX = player.bbox[0] + player.bbox[2] / 2;
    const footY = player.bbox[1] + player.bbox[3];

    const fieldWidth = fieldCorners.topRight.x - fieldCorners.topLeft.x;
    const fieldHeight = fieldCorners.bottomLeft.y - fieldCorners.topLeft.y;

    const relativeX = (footX - fieldCorners.topLeft.x) / fieldWidth;
    const relativeY = (footY - fieldCorners.topLeft.y) / fieldHeight;

    const REAL_FIELD_WIDTH = 105;
    const REAL_FIELD_HEIGHT = 68;
    const positionX = relativeX * REAL_FIELD_WIDTH;
    const positionY = relativeY * REAL_FIELD_HEIGHT;

    return {x: positionX, y: positionY};
}

function drawFieldOverlay(fieldCorners) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fieldCorners.topLeft.x, fieldCorners.topLeft.y);
    ctx.lineTo(fieldCorners.topRight.x, fieldCorners.topRight.y);
    ctx.lineTo(fieldCorners.bottomRight.x, fieldCorners.bottomRight.y);
    ctx.lineTo(fieldCorners.bottomLeft.x, fieldCorners.bottomLeft.y);
    ctx.closePath();
    ctx.stroke();
}

function drawDetections(detections, fieldCorners) {
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

        const position = estimatePlayerPosition(detection, fieldCorners);
        ctx.fillText(
            `Person (${Math.round(detection.score * 100)}%) - (${position.x.toFixed(1)}m, ${position.y.toFixed(1)}m)`,
            detection.bbox[0],
            detection.bbox[1] > 10 ? detection.bbox[1] - 5 : 10
        );
    });
}

function mergeDetections(detections) {
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
        fieldCorners = detectFieldCorners(fieldLines);
        drawFieldLines(fieldLines);
        drawFieldOverlay(fieldCorners);
        src.delete();

        const predictions = await model.detect(canvas);
        const personDetections = predictions.filter(p => p.class === 'person' && p.score > 0.5);

        lastDetections.push(personDetections);
        if (lastDetections.length > DETECTION_HISTORY) {
            lastDetections.shift();
        }
    }

    const allDetections = [].concat(...lastDetections);
    const mergedDetections = mergeDetections(allDetections);

    if (fieldCorners) {
        drawDetections(mergedDetections, fieldCorners);
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