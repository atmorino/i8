class FlowchartDrawer {
    constructor(canvas, nodeFontSize, nodeWidth, nodeHeight, nodeMargin) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodeFontSize = nodeFontSize;
        this.nodeWidth = nodeWidth;
        this.nodeHeight = nodeHeight;
        this.nodeMargin = nodeMargin;
        this.nodes = [];
        this.arrows = [];
    }

    parseInput(input) {
        const lines = input.split('\n').filter(line => line.trim() !== '');
        const nodes = new Set();
        const connections = [];

        lines.forEach(line => {
            const [from, to] = line.split('-->').map(s => s.trim());
            if (!from || !to) {
                throw new Error(`Invalid input format: ${line}`);
            }
            nodes.add(from);
            nodes.add(to);
            connections.push({ from, to });
        });

        this.nodes = Array.from(nodes).map((name, index) => ({
            name,
            x: index * (this.nodeWidth + this.nodeMargin),
            y: 0,
            inputs: [],
            outputs: [],
            maxArrowLevel: 0
        }));

        connections.forEach(({ from, to }) => {
            const fromNode = this.findNode(from);
            const toNode = this.findNode(to);
            fromNode.outputs.push(to);
            toNode.inputs.push(from);
        });

        this.calculateArrowLevels();
    }

    findNode(name) {
        const node = this.nodes.find(n => n.name === name);
        if (!node) {
            throw new Error(`Node not found: ${name}`);
        }
        return node;
    }

    calculateArrowLevels() {
        this.arrows = this.nodes.flatMap(node => 
            node.outputs.map(output => ({
                from: node.name,
                to: output,
                level: 0
            }))
        );

        this.arrows.sort((a, b) => this.calculateNodeDistance(a) - this.calculateNodeDistance(b));

        this.arrows.forEach((arrow, index) => {
            for (let i = 0; i < index; i++) {
                if (this.doArrowsOverlap(arrow, this.arrows[i])) {
                    arrow.level = Math.max(arrow.level, this.arrows[i].level + 1);
                }
            }
        });

        this.nodes.forEach(node => {
            const relevantArrows = this.arrows.filter(arrow => arrow.from === node.name || arrow.to === node.name);
            node.maxArrowLevel = Math.max(...relevantArrows.map(arrow => arrow.level), 0);
        });
    }

    calculateNodeDistance(arrow) {
        const fromIndex = this.nodes.findIndex(n => n.name === arrow.from);
        const toIndex = this.nodes.findIndex(n => n.name === arrow.to);
        return Math.abs(toIndex - fromIndex);
    }

    doArrowsOverlap(a, b) {
        const aFrom = this.nodes.findIndex(n => n.name === a.from);
        const aTo = this.nodes.findIndex(n => n.name === a.to);
        const bFrom = this.nodes.findIndex(n => n.name === b.from);
        const bTo = this.nodes.findIndex(n => n.name === b.to);

        return (Math.min(aFrom, aTo) < Math.max(bFrom, bTo)) && (Math.max(aFrom, aTo) > Math.min(bFrom, bTo));
    }

    drawNode(node) {
        const nodeHeight = this.calculateNodeHeight(node);

        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(node.x, node.y, this.nodeWidth, nodeHeight);
        this.ctx.strokeRect(node.x, node.y, this.nodeWidth, nodeHeight);

        this.ctx.fillStyle = 'black';
        this.ctx.font = `${this.nodeFontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.name, node.x + this.nodeWidth / 2, node.y + nodeHeight / 2);
    }

    calculateNodeHeight(node) {
        return this.nodeHeight * (node.maxArrowLevel + 1) + 4 * (node.maxArrowLevel + 1);
    }

    drawArrow(arrow) {
        const fromNode = this.findNode(arrow.from);
        const toNode = this.findNode(arrow.to);
        const fromX = fromNode.x + this.nodeWidth;
        const toX = toNode.x;
        const y = this.calculateArrowY(arrow);

        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromNode.y + y);
        this.ctx.lineTo(toX, toNode.y + y);
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.drawArrowhead(toX, toNode.y + y);
    }

    calculateArrowY(arrow) {
        return this.nodeHeight / 2 + 24 * arrow.level;
    }

    drawArrowhead(x, y) {
        const arrowSize = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(x - arrowSize, y - arrowSize);
        this.ctx.lineTo(x, y);
        this.ctx.lineTo(x - arrowSize, y + arrowSize);
        this.ctx.stroke();
    }

    drawFlowchart() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.nodes.forEach(node => this.drawNode(node));
        this.arrows.forEach(arrow => this.drawArrow(arrow));
    }
}