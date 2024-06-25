const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// カメラの設定
const constraints = {
    video: {
        facingMode: 'environment'
    }
};

// カメラストリームの開始
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

// 物体検出モデルの読み込み
async function loadModel() {
    const model = await cocoSsd.load();
    return model;
}

// 検出の実行
async function detectObjects(model) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

// メイン関数
async function main() {
    await startCamera();
    const model = await loadModel();
    detectObjects(model);
}

main();