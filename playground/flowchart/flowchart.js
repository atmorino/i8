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
        ctx.strokeRect(i * (boxWidth + boxSpacing), 0, boxWidth, boxHeights[node]);
        ctx.fillText(node, i * (boxWidth + boxSpacing) + 5, 20);
    });

    // ステップ3: 矢印を描画
    connections.forEach(([from, to]) => {
        const fromIndex = nodes.indexOf(from);
        const toIndex = nodes.indexOf(to);
        const fromHeight = boxHeights[from];
        const toHeight = boxHeights[to];
        const outputIndex = connections.filter(conn => conn[0] === from).indexOf([from, to]);
        const inputIndex = connections.filter(conn => conn[1] === to).indexOf([from, to]);
        
        const startY = (outputIndex + 1) * (fromHeight / (connections.filter(conn => conn[0] === from).length + 1));
        const endY = (inputIndex + 1) * (toHeight / (connections.filter(conn => conn[1] === to).length + 1));
        
        ctx.beginPath();
        ctx.moveTo(fromIndex * (boxWidth + boxSpacing) + boxWidth, startY);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing), endY);
        ctx.stroke();

        // 矢印の先端を描画
        ctx.beginPath();
        ctx.moveTo(toIndex * (boxWidth + boxSpacing) - 10, endY - 5);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing), endY);
        ctx.lineTo(toIndex * (boxWidth + boxSpacing) - 10, endY + 5);
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