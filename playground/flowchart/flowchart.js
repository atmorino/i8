let nodes = [];
let connections = [];

function addNode() {
    const nodeName = document.getElementById('nodeName').value;
    if (nodeName && !nodes.includes(nodeName)) {
        nodes.push(nodeName);
        updateNodeSelects();
        document.getElementById('nodeName').value = '';
    }
}

function addConnection() {
    const fromNode = document.getElementById('fromNode').value;
    const toNode = document.getElementById('toNode').value;
    if (fromNode && toNode && fromNode !== toNode) {
        connections.push([fromNode, toNode]);
    }
}

function updateNodeSelects() {
    const selects = ['fromNode', 'toNode'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        nodes.forEach(node => {
            const option = document.createElement('option');
            option.value = node;
            option.textContent = node;
            select.appendChild(option);
        });
    });
}

function generateFlowchart() {
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
        const outputIndex = connections.filter(conn => conn[0] === from).indexOf([from, to]);
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