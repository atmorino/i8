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
        fieldLines.push({startPoint, endPoint});
    }

    dst.delete(); lines.delete();
    return fieldLines;
}

function drawFieldLines(fieldLines) {
    fieldLines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.startPoint.x, line.startPoint.y);
        ctx.lineTo(line.endPoint.x, line.endPoint.y);
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

async function detectObjects(model) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let src = cv.imread(canvas);
    let fieldLines = detectFieldLines(src);
    drawFieldLines(fieldLines);
    src.delete();

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
            ctx.fillText(
                `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
                prediction.bbox[0],
                prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
            );
        }
    });

    requestAnimationFrame(() => detectObjects(model));
}

async function main() {
    await startCamera();

    // OpenCVの準備ができるまで待機
    await new Promise(resolve => {
        if (cv.Mat) resolve();
        else cv['onRuntimeInitialized'] = resolve;
    });

    const model = await loadModel();
    detectObjects(model);
}

main();