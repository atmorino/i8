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
        updateConnectionsList();
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

function updateConnectionsList() {
    const connectionsList = document.getElementById('connectionsList');
    connectionsList.innerHTML = '<h3>現在の接続:</h3>';
    const ul = document.createElement('ul');
    connections.forEach(([from, to]) => {
        const li = document.createElement('li');
        li.textContent = `${from} → ${to}`;
        ul.appendChild(li);
    });
    connectionsList.appendChild(ul);
}

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
        const inputCount = connections.filter(conn => conn[1] === node).length;
        boxHeights[node] = Math.max(outputCount, inputCount, 1) * baseHeight;
    });

    // ステップ2: ボックスを配置
    nodes.forEach((node, i) => {
        const boxHeight = boxHeights[node];
        const y = 0; // ボックスの上端のy座標
        ctx.strokeRect(i * (boxWidth + boxSpacing), y, boxWidth, boxHeight);
        ctx.fillText(node, i * (boxWidth + boxSpacing) + 5, y + 20);
    });

    // ステップ3: 矢印を描画
    connections.forEach(([from, to]) => {
        const fromIndex = nodes.indexOf(from);
        const toIndex = nodes.indexOf(to);
        const fromHeight = boxHeights[from];
        const toHeight = boxHeights[to];
        
        // ボックスの中央のy座標を計算
        const fromCenterY = fromHeight / 2;
        const toCenterY = toHeight / 2;
        
        ctx.beginPath();
        ctx.moveTo(fromIndex * (boxWidth + boxSpacing) + boxWidth, fromCenterY);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing), toCenterY);
        ctx.stroke();

        // 矢印の先端を描画
        ctx.beginPath();
        ctx.moveTo(toIndex * (boxWidth + boxSpacing) - 10, toCenterY - 5);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing), toCenterY);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing) - 10, toCenterY + 5);
        ctx.stroke();
    });
}

function displayFlowchartInfo() {
    const flowchartInfo = document.getElementById('flowchartInfo');
    flowchartInfo.innerHTML = '<h3>フローチャート情報:</h3>';
    
    const nodeInfo = document.createElement('p');
    nodeInfo.textContent = `ノード: ${nodes.join(', ')}`;
    flowchartInfo.appendChild(nodeInfo);

    const connectionInfo = document.createElement('p');
    connectionInfo.textContent = '接続:';
    flowchartInfo.appendChild(connectionInfo);

    const connectionList = document.createElement('ul');
    connections.forEach(([from, to]) => {
        const li = document.createElement('li');
        li.textContent = `${from} → ${to}`;
        connectionList.appendChild(li);
    });
    flowchartInfo.appendChild(connectionList);
}

// 初期化時に呼び出し
updateNodeSelects();
updateConnectionsList();