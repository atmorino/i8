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
        video.play();
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        };
    } catch (err) {
        console.error('カメラの起動に失敗しました:', err);
    }
}

async function loadModels() {
    const cocoSsdModel = await cocoSsd.load();
    const bodyPixModel = await bodyPix.load();
    return { cocoSsdModel, bodyPixModel };
}

function detectFieldLines(src) {
    let dst = new cv.Mat();
    let lines = new cv.Mat();
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    cv.Canny(dst, dst, 50, 200, 3);
    cv.HoughLines(dst, lines, 1, Math.PI / 180, 150, 0, 0, 0, Math.PI);

    // ここで検出された線からフィールドの境界を推定します
    // 実際の実装では、より複雑なロジックが必要になります

    dst.delete(); lines.delete();
    return { topLeft: {x: 0, y: 0}, topRight: {x: src.cols, y: 0},
             bottomLeft: {x: 0, y: src.rows}, bottomRight: {x: src.cols, y: src.rows} };
}

function estimateFieldSize(fieldCorners) {
    // フィールドの実際のサイズを推定します
    // この例では簡略化のため、標準的なサッカーフィールドのサイズを使用します
    return { width: 105, height: 68 }; // メートル単位
}

function calculatePerspectiveTransform(fieldCorners, fieldSize) {
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        fieldCorners.topLeft.x, fieldCorners.topLeft.y,
        fieldCorners.topRight.x, fieldCorners.topRight.y,
        fieldCorners.bottomRight.x, fieldCorners.bottomRight.y,
        fieldCorners.bottomLeft.x, fieldCorners.bottomLeft.y
    ]);
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        fieldSize.width, 0,
        fieldSize.width, fieldSize.height,
        0, fieldSize.height
    ]);
    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    srcTri.delete(); dstTri.delete();
    return M;
}

function transformPoint(point, M) {
    let src = cv.matFromArray(1, 1, cv.CV_32FC2, [point.x, point.y]);
    let dst = new cv.Mat();
    cv.perspectiveTransform(src, dst, M);
    let result = { x: dst.data32F[0], y: dst.data32F[1] };
    src.delete(); dst.delete();
    return result;
}

async function detectPlayersAndPositions(cocoSsdModel, bodyPixModel, M, fieldSize) {
    const predictions = await cocoSsdModel.detect(video);
    const segmentation = await bodyPixModel.segmentPerson(video);

    let players = [];
    predictions.forEach(prediction => {
        if (prediction.class === 'person') {
            let centerX = prediction.bbox[0] + prediction.bbox[2] / 2;
            let bottomY = prediction.bbox[1] + prediction.bbox[3];
            let fieldPosition = transformPoint({x: centerX, y: bottomY}, M);

            // フィールド内の選手のみを対象とする
            if (fieldPosition.x >= 0 && fieldPosition.x <= fieldSize.width &&
                fieldPosition.y >= 0 && fieldPosition.y <= fieldSize.height) {
                players.push({
                    bbox: prediction.bbox,
                    fieldPosition: fieldPosition
                });
            }
        }
    });

    return players;
}

function drawResults(players, fieldSize) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // フィールドの枠を描画
    ctx.strokeStyle = 'white';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    players.forEach(player => {
        // バウンディングボックスを描画
        ctx.beginPath();
        ctx.rect(...player.bbox);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'red';
        ctx.stroke();

        // フィールド上の位置を描画
        let screenX = (player.fieldPosition.x / fieldSize.width) * canvas.width;
        let screenY = (player.fieldPosition.y / fieldSize.height) * canvas.height;
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 5, 0, 2 * Math.PI);
        ctx.fill();

        // 座標を表示
        ctx.fillStyle = 'white';
        ctx.fillText(`(${player.fieldPosition.x.toFixed(1)}, ${player.fieldPosition.y.toFixed(1)})`,
                     player.bbox[0], player.bbox[1] > 10 ? player.bbox[1] - 5 : 10);
    });
}

async function processFrame(models, M, fieldSize) {
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    cv.imshow('canvas', src);
    src.data.set(ctx.getImageData(0, 0, video.width, video.height).data);

    const players = await detectPlayersAndPositions(models.cocoSsdModel, models.bodyPixModel, M, fieldSize);
    drawResults(players, fieldSize);

    src.delete();
    requestAnimationFrame(() => processFrame(models, M, fieldSize));
}

async function main() {
    await startCamera();
    const models = await loadModels();

    // OpenCVの準備ができるまで待機
    await new Promise(resolve => {
        if (cv.Mat) resolve();
        else cv['onRuntimeInitialized'] = resolve;
    });

    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    cv.imshow('canvas', src);
    src.data.set(ctx.getImageData(0, 0, video.width, video.height).data);

    const fieldCorners = detectFieldLines(src);
    const fieldSize = estimateFieldSize(fieldCorners);
    const M = calculatePerspectiveTransform(fieldCorners, fieldSize);

    src.delete();

    processFrame(models, M, fieldSize);
}

main();