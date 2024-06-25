// ... 前の部分は同じ ...

let fieldCorners = null;

function detectFieldCorners(fieldLines) {
    // フィールドの四隅を推定
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
    // プレイヤーの足元の位置を推定
    const footX = player.bbox[0] + player.bbox[2] / 2;
    const footY = player.bbox[1] + player.bbox[3];

    // フィールドの幅と高さを計算
    const fieldWidth = fieldCorners.topRight.x - fieldCorners.topLeft.x;
    const fieldHeight = fieldCorners.bottomLeft.y - fieldCorners.topLeft.y;

    // 選手の相対位置を計算 (0-1の範囲)
    const relativeX = (footX - fieldCorners.topLeft.x) / fieldWidth;
    const relativeY = (footY - fieldCorners.topLeft.y) / fieldHeight;

    // 実際のフィールドサイズに基づいて位置を計算 (メートル単位)
    const REAL_FIELD_WIDTH = 105; // メートル
    const REAL_FIELD_HEIGHT = 68; // メートル
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

// ... main関数は同じ ...