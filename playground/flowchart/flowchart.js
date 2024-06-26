function generateFlowchart() {
    displayFlowchartInfo();

    const canvas = document.getElementById('flowchart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const boxWidth = 60;
    const boxSpacing = 100;
    const baseHeight = 30;

    // ステップ1: 各ボックスの高さを決定
    const boxHeights = {};
    nodes.forEach(node => {
        const outputCount = connections.filter(conn => conn[0] === node).length;
        boxHeights[node] = Math.max(outputCount + 1, 2) * baseHeight;
    });

    // ステップ2: ボックスを配置
    nodes.forEach((node, i) => {
        ctx.strokeRect(i * (boxWidth + boxSpacing), 0, boxWidth, boxHeights[node]);
        ctx.fillText(node, i * (boxWidth + boxSpacing) + 5, 20);
    });

    // ステップ3: 矢印を描画
    connections.forEach(([from, to]) => {
        const fromIndex = nodes.indexOf(from);
        const toIndex = nodes.indexOf(to);
        const fromHeight = boxHeights[from];
        
        // 出力インデックスの計算を修正
        const outputIndex = connections.filter(conn => conn[0] === from).findIndex(conn => conn[0] === from && conn[1] === to);
        const startY = (outputIndex + 1) * (fromHeight / (connections.filter(conn => conn[0] === from).length + 1));
        
        ctx.beginPath();
        ctx.moveTo(fromIndex * (boxWidth + boxSpacing) + boxWidth, startY);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing), startY);
        ctx.stroke();

        // 矢印の先端を描画
        ctx.beginPath();
        ctx.moveTo(toIndex * (boxWidth + boxSpacing) - 10, startY - 5);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing), startY);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing) - 10, startY + 5);
        ctx.stroke();
    });
}