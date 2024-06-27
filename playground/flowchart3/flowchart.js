/**
 * フローチャートを描画するためのクラス
 */
class FlowchartDrawer {
    /**
     * FlowchartDrawer のコンストラクタ
     * @param {HTMLCanvasElement} canvas - 描画するキャンバス要素
     * @param {number} nodeFontSize - ノードのフォントサイズ
     * @param {number} nodeWidth - ノードの幅
     * @param {number} nodeHeight - ノードの高さ
     * @param {number} nodeMargin - ノード間のマージン
     */
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

    /**
     * 入力文字列を解析してノードと矢印の情報を生成する
     * @param {string} input - Mermaid記法のフローチャート定義
     */
    parseInput(input) {
        const lines = input.split('\n').filter(line => line.trim() !== '');
        const nodes = new Set();
        const connections = [];

        // 入力を解析してノードと接続情報を抽出
        lines.forEach(line => {
            const [from, to] = line.split('-->').map(s => s.trim());
            if (!from || !to) {
                throw new Error(`Invalid input format: ${line}`);
            }
            nodes.add(from);
            nodes.add(to);
            connections.push({ from, to });
        });

        // ノード情報を生成
        this.nodes = Array.from(nodes).map((name, index) => ({
            name,
            x: index * (this.nodeWidth + this.nodeMargin),
            y: 0,
            inputs: [],
            outputs: [],
            maxArrowLevel: 0
        }));

        // 接続情報を設定
        connections.forEach(({ from, to }) => {
            const fromNode = this.findNode(from);
            const toNode = this.findNode(to);
            fromNode.outputs.push(to);
            toNode.inputs.push(from);
        });

        this.calculateArrowLevels();
    }

    /**
     * 指定された名前のノードを見つける
     * @param {string} name - ノードの名前
     * @returns {Object} 見つかったノード
     */
    findNode(name) {
        const node = this.nodes.find(n => n.name === name);
        if (!node) {
            throw new Error(`Node not found: ${name}`);
        }
        return node;
    }

    /**
     * 矢印のレベルを計算する
     */
    calculateArrowLevels() {
        // 全ての矢印情報を生成
        this.arrows = this.nodes.flatMap(node => 
            node.outputs.map(output => ({
                from: node.name,
                to: output,
                level: 0
            }))
        );

        // ノード間の距離に基づいて矢印をソート
        this.arrows.sort((a, b) => this.calculateNodeDistance(a) - this.calculateNodeDistance(b));

        // 矢印のレベルを決定
        this.arrows.forEach((arrow, index) => {
            for (let i = 0; i < index; i++) {
                if (this.doArrowsOverlap(arrow, this.arrows[i])) {
                    arrow.level = Math.max(arrow.level, this.arrows[i].level + 1);
                }
            }
        });

        // 各ノードの最大矢印レベルを更新
        this.nodes.forEach(node => {
            const relevantArrows = this.arrows.filter(arrow => arrow.from === node.name || arrow.to === node.name);
            node.maxArrowLevel = Math.max(...relevantArrows.map(arrow => arrow.level), 0);
        });
    }

    /**
     * 矢印のノード間距離を計算する
     * @param {Object} arrow - 矢印オブジェクト
     * @returns {number} ノード間の距離
     */
    calculateNodeDistance(arrow) {
        const fromIndex = this.nodes.findIndex(n => n.name === arrow.from);
        const toIndex = this.nodes.findIndex(n => n.name === arrow.to);
        return Math.abs(toIndex - fromIndex);
    }

    /**
     * 2つの矢印が重なっているかを判定する
     * @param {Object} a - 矢印オブジェクト1
     * @param {Object} b - 矢印オブジェクト2
     * @returns {boolean} 重なっている場合はtrue
     */
    doArrowsOverlap(a, b) {
        const aFrom = this.nodes.findIndex(n => n.name === a.from);
        const aTo = this.nodes.findIndex(n => n.name === a.to);
        const bFrom = this.nodes.findIndex(n => n.name === b.from);
        const bTo = this.nodes.findIndex(n => n.name === b.to);

        return (Math.min(aFrom, aTo) < Math.max(bFrom, bTo)) && (Math.max(aFrom, aTo) > Math.min(bFrom, bTo));
    }

    /**
     * ノードを描画する
     * @param {Object} node - ノードオブジェクト
     */
    drawNode(node) {
        const nodeHeight = this.calculateNodeHeight(node);

        // ノードの背景と枠を描画
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(node.x, node.y, this.nodeWidth, nodeHeight);
        this.ctx.strokeRect(node.x, node.y, this.nodeWidth, nodeHeight);

        // ノードの名前を描画
        this.ctx.fillStyle = 'black';
        this.ctx.font = `${this.nodeFontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(node.name, node.x + this.nodeWidth / 2, node.y + nodeHeight / 2);
    }

    /**
     * ノードの高さを計算する
     * @param {Object} node - ノードオブジェクト
     * @returns {number} ノードの高さ
     */
    calculateNodeHeight(node) {
        return this.nodeHeight * (node.maxArrowLevel + 1) + 4 * (node.maxArrowLevel + 1);
    }

    /**
     * 矢印を描画する
     * @param {Object} arrow - 矢印オブジェクト
     */
    drawArrow(arrow) {
        const fromNode = this.findNode(arrow.from);
        const toNode = this.findNode(arrow.to);
        const fromX = fromNode.x + this.nodeWidth;
        const toX = toNode.x;
        const y = this.calculateArrowY(arrow);

        // 矢印の線を描画
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromNode.y + y);
        this.ctx.lineTo(toX, toNode.y + y);
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // 矢印の先端を描画
        this.drawArrowhead(toX, toNode.y + y);
    }

    /**
     * 矢印のY座標を計算する
     * @param {Object} arrow - 矢印オブジェクト
     * @returns {number} 矢印のY座標
     */
    calculateArrowY(arrow) {
        return this.nodeHeight / 2 + 24 * arrow.level;
    }

    /**
     * 矢印の先端を描画する
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    drawArrowhead(x, y) {
        const arrowSize = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(x - arrowSize, y - arrowSize);
        this.ctx.lineTo(x, y);
        this.ctx.lineTo(x - arrowSize, y + arrowSize);
        this.ctx.stroke();
    }

    /**
     * フローチャート全体を描画する
     */
    drawFlowchart() {
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // すべてのノードを描画
        this.nodes.forEach(node => this.drawNode(node));
        // すべての矢印を描画
        this.arrows.forEach(arrow => this.drawArrow(arrow));
    }
}