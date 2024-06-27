// フローチャート描画のための関数群
class FlowchartDrawer {
    constructor(canvas, nodeFontSize, nodeWidth, nodeHeight, nodeMargin) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodeFontSize = nodeFontSize;
        this.nodeWidth = nodeWidth;
        this.nodeHeight = nodeHeight;
        this.nodeMargin = nodeMargin;
        this.nodes = [];
    }

    parseInput(input) {
        const lines = input.split('\n').filter(line => line.trim() !== '');
        const nodes = new Set();
        const connections = [];

        lines.forEach(line => {
            const [from, to] = line.split('-->').map(s => s.trim());
            nodes.add(from);
            nodes.add(to);
            connections.push({ from, to });
        });

        this.nodes = Array.from(nodes).map(name => ({
            name,
            x: 0,
            y: 0,
            inputs: [],
            outputs: []
        }));

        connections.forEach(({ from, to }) => {
            const fromNode = this.nodes.find(n => n.name === from);
            const toNode = this.nodes.find(n => n.name === to);
            fromNode.outputs.push(to);
            toNode.inputs.push(from);
        });
    }

    calculateNodePositions() {
        this.nodes.forEach((node, index) => {
            node.x = index * (this.nodeWidth + this.nodeMargin);
            node.y = 0;
        });
    }

    calculateArrowLevels() {
        const arrows = [];
        this.nodes.forEach(node => {
            node.outputs.forEach(output => {
                arrows.push({
                    from: node.name,
                    to: output,
                    level: 0
                });
            });
        });

        arrows.sort((a, b) => {
            const distA = this.nodes.findIndex(n => n.name === a.to) - this.nodes.findIndex(n => n.name === a.from);
            const distB = this.nodes.findIndex(n => n.name === b.to) - this.nodes.findIndex(n => n.name === b.from);
            return distA - distB;
        });

        arrows.forEach((arrow, index) => {
            for (let i = 0; i < index; i++) {
                if (this.doArrowsOverlap(arrow, arrows[i])) {
                    arrow.level = Math.max(arrow.level, arrows[i].level + 1);
                }
            }
        });

        this.nodes.forEach(node => {
            const inputArrows = arrows.filter(arrow => arrow.to === node.name);
            const outputArrows = arrows.filter(arrow => arrow.from === node.name);
            const allArrows = [...inputArrows, ...outputArrows];
            node.maxArrowLevel = Math.max(...allArrows.map(arrow => arrow.level), 0);
        });

        return arrows;
    }

    doArrowsOverlap(a, b) {
        const aFrom = this.nodes.findIndex(n => n.name === a.from);
        const aTo = this.nodes.findIndex(n => n.name === a.to);
        const bFrom = this.nodes.findIndex(n => n.name === b.from);
        const bTo = this.nodes.findIndex(n => n.name === b.to);

        return (aFrom < bFrom && aTo > bFrom) || (bFrom < aFrom && bTo > aFrom);
    }

    drawNode(node) {
        const nodeHeight = this.nodeHeight * (node.maxArrowLevel + 1) + 4 * (node.maxArrowLevel + 1);

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

    drawArrow(from, to, level) {
        const fromNode = this.nodes.find(n => n.name === from);
        const toNode = this.nodes.find(n => n.name === to);
        const fromX = fromNode.x + this.nodeWidth;
        const toX = toNode.x;
        const y = this.nodeHeight / 2 + 24 * level;

        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromNode.y + y);
        this.ctx.lineTo(toX, toNode.y + y);
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 矢印の先端を描画
        this.ctx.beginPath();
        this.ctx.moveTo(toX - 5, toNode.y + y - 5);
        this.ctx.lineTo(toX, toNode.y + y);
        this.ctx.lineTo(toX - 5, toNode.y + y + 5);
        this.ctx.stroke();
    }

    drawFlowchart() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.calculateNodePositions();
        const arrows = this.calculateArrowLevels();

        this.nodes.forEach(node => this.drawNode(node));
        arrows.forEach(arrow => this.drawArrow(arrow.from, arrow.to, arrow.level));
    }
}
