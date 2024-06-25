const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const constraints = {
    video: {
        facingMode: 'environment'
    }
};

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
    cv.Canny(dst, dst, 50, 200, 3);
    cv.HoughLines(dst, lines, 1, Math.PI / 180, 150, 0, 0, 0, Math.PI);

    let fieldLines = [];
    for (let i = 0; i < lines.rows; ++i) {
        let rho = lines.data32F[i * 2];
        let theta = lines.data32F[i * 2 + 1];
        let a = Math.cos(theta);
        let b = Math.sin(theta);
        let x0 = a * rho;
        let y0 = b * rho;
        let startPoint = {x: x0 - 1000 * b, y: y0 + 1000 * a};
        let endPoint = {x: x0 + 1000 * b, y: y0 - 1000 * a};
        fieldLines.push({startPoint, endPoint, rho, theta});
    }

    dst.delete(); lines.delete();
    return fieldLines;
}

function estimateFieldBoundary(fieldLines, width, height) {
    let horizontalLines = fieldLines.filter(line => Math.abs(Math.sin(line.theta)) > 0.7);
    let verticalLines = fieldLines.filter(line => Math.abs(Math.cos(line.theta)) > 0.7);

    horizontalLines.sort((a, b) => a.rho - b.rho);
    verticalLines.sort((a, b) => a.rho - b.rho);

    let topLine = horizontalLines[0] || {rho: 0, theta: 0};
    let bottomLine = horizontalLines[horizontalLines.length - 1] || {rho: height, theta: 0};
    let leftLine = verticalLines[0] || {rho: 0, theta: Math.PI / 2};
    let rightLine = verticalLines[verticalLines.length - 1] || {rho: width, theta: Math.PI / 2};

    return {
        topLeft: intersectLines(topLine, leftLine),
        topRight: intersectLines(topLine, rightLine),
        bottomLeft: intersectLines(bottomLine, leftLine),
        bottomRight: intersectLines(bottomLine, rightLine)
    };
}

function intersectLines(line1, line2) {
    let rho1 = line1.rho, theta1 = line1.theta;
    let rho2 = line2.rho, theta2 = line2.theta;
    let a = [[Math.cos(theta1), Math.sin(theta1)], [Math.cos(theta2), Math.sin(theta2)]];
    let b = [rho1, rho2];
    let det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
    if (Math.abs(det) < 1e-5) {
        return null;
    }
    let x = (a[1][1] * b[0] - a[0][1] * b[1]) / det;
    let y = (-a[1][0] * b[0] + a[0][0] * b[1]) / det;
    return {x, y};
}

function estimateFieldSize(boundary) {
    // 実際のサッカーフィールドの標準サイズ（メートル）
    const REAL_FIELD_WIDTH = 105;
    const REAL_FIELD_HEIGHT = 68;

    let pixelWidth = Math.hypot(boundary.topRight.x - boundary.topLeft.x, boundary.topRight.y - boundary.topLeft.y);
    let pixelHeight = Math.hypot(boundary.bottomLeft.x - boundary.topLeft.x, boundary.bottomLeft.y - boundary.topLeft.y);

    let pixelsPerMeterWidth = pixelWidth / REAL_FIELD_WIDTH;
    let pixelsPerMeterHeight = pixelHeight / REAL_FIELD_HEIGHT;

    return {
        pixelsPerMeterWidth,
        pixelsPerMeterHeight,
        realWidth: REAL_FIELD_WIDTH,
        realHeight: REAL_FIELD_HEIGHT
    };
}

function drawFieldBoundary(boundary) {
    ctx.beginPath();
    ctx.moveTo(boundary.topLeft.x, boundary.topLeft.y);
    ctx.lineTo(boundary.topRight.x, boundary.topRight.y);
    ctx.lineTo(boundary.bottomRight.x, boundary.bottomRight.y);
    ctx.lineTo(boundary.bottomLeft.x, boundary.bottomLeft.y);
    ctx.closePath();
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.stroke();
}

async function detectObjects(model) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let src = cv.imread(canvas);
    let fieldLines = detectFieldLines(src);
    let boundary = estimateFieldBoundary(fieldLines, canvas.width, canvas.height);
    let fieldSize = estimateFieldSize(boundary);

    drawFieldBoundary(boundary);

    const predictions = await model.detect(canvas);

    predictions.forEach(prediction => {
        if (prediction.class === 'person') {
            ctx.beginPath();
            ctx.rect(
                prediction.bbox[0],
                prediction.bbox[1],
                prediction.bbox[2],
                prediction.bbox[3]
            );
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.fillStyle = 'red';
            ctx.stroke();

            // 選手の位置をフィールド座標に変換
            let playerX = (prediction.bbox[0] - boundary.topLeft.x) / fieldSize.pixelsPerMeterWidth;
            let playerY = (prediction.bbox[1] - boundary.topLeft.y) / fieldSize.pixelsPerMeterHeight;

            ctx.fillText(
                `${prediction.class} (${playerX.toFixed(1)}m, ${playerY.toFixed(1)}m)`,
                prediction.bbox[0],
                prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
            );
        }
    });

    src.delete();
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