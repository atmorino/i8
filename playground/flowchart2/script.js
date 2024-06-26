function drawChart() {
    const nodesInput = document.getElementById('nodes').value;
    const connectionsInput = document.getElementById('connections').value;

    const nodes = nodesInput.split(',').map(node => node.trim());
    const connections = connectionsInput.split(',').map(connection => connection.trim());

    const chartContainer = document.getElementById('chart');
    chartContainer.innerHTML = '';

    const nodeElements = {};
    const nodeSpacing = 100;
    const nodeHeight = 50;
    const nodeWidth = 50;

    nodes.forEach((node, index) => {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'node';
        nodeElement.textContent = node;
        nodeElement.style.left = `${index * (nodeWidth + nodeSpacing)}px`;
        nodeElement.style.top = '50px';
        nodeElements[node] = nodeElement;
        chartContainer.appendChild(nodeElement);
    });

    connections.forEach(connection => {
        const [from, to] = connection.split('->').map(node => node.trim());
        if (nodeElements[from] && nodeElements[to]) {
            const fromElement = nodeElements[from];
            const toElement = nodeElements[to];

            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();
            const containerRect = chartContainer.getBoundingClientRect();

            const line = document.createElement('div');
            line.className = 'line';
            line.style.left = `${fromRect.right - containerRect.left}px`;
            line.style.top = `${fromRect.top + fromRect.height / 2 - containerRect.top}px`;
            line.style.width = `${toRect.left - fromRect.right}px`;
            chartContainer.appendChild(line);

            const arrow = document.createElement('div');
            arrow.className = 'arrow right';
            arrow.style.left = `${toRect.left - containerRect.left - 8}px`;
            arrow.style.top = `${fromRect.top + fromRect.height / 2 - containerRect.top - 8}px`;
            chartContainer.appendChild(arrow);
        }
    });
}
