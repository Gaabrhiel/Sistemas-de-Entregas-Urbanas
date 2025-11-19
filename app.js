
// Configuração do Tailwind (para cores e fontes, se necessário)
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'pizza-red': '#E3342F',
                'pizza-orange': '#FF8800',
                'pizza-bg': '#F8F8F8',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    }
}

// Variáveis globais para o sistema
const math = Math;

// -------------------------
// Estruturas de Dados do Backend
// -------------------------

// --- 1. Grafo e Dijkstra (Routing) ---

class Graph {
    constructor() {
        this.nodes = new Map(); // id -> display name
        this.edges = new Map(); // id -> Map(neighbor_id, weight)
    }

    addNode(nodeId, displayName) {
        this.nodes.set(nodeId, displayName);
        if (!this.edges.has(nodeId)) {
            this.edges.set(nodeId, new Map());
        }
    }

    addEdge(a, b, dist, bidir = true) {
        if (!this.nodes.has(a) || !this.nodes.has(b)) {
            console.error(`Nó ${a} ou ${b} não existe.`);
            return;
        }
        this.edges.get(a).set(b, parseFloat(dist));
        if (bidir) {
            this.edges.get(b).set(a, parseFloat(dist));
        }
    }

    _DijkstraPriorityQueue() {
        const queue = [];
        return {
            push: (d, u) => {
                queue.push({ d, u });
                queue.sort((a, b) => a.d - b.d);
            },
            pop: () => queue.shift(),
            isEmpty: () => queue.length === 0,
        };
    }

    dijkstra(start) {
        if (!this.nodes.has(start)) {
            console.error(`Nó inicial ${start} não existe`);
            return { dist: new Map(), prev: new Map() };
        }
        const dist = new Map();
        const prev = new Map();
        const pq = this._DijkstraPriorityQueue();

        for (const nodeId of this.nodes.keys()) {
            dist.set(nodeId, Infinity);
            prev.set(nodeId, null);
        }

        dist.set(start, 0.0);
        pq.push(0.0, start);

        while (!pq.isEmpty()) {
            const { d, u } = pq.pop();

            if (d > dist.get(u)) continue;

            const neighbors = this.edges.get(u) || new Map();
            for (const [v, w] of neighbors.entries()) {
                const newDist = d + w;
                if (newDist < dist.get(v)) {
                    dist.set(v, newDist);
                    prev.set(v, u);
                    pq.push(newDist, v);
                }
            }
        }
        return { dist, prev };
    }

    shortestPath(a, b) {
        const { dist, prev } = this.dijkstra(a);
        const distance = dist.get(b);
        
        if (distance === undefined || distance === Infinity) {
            return { distance: Infinity, path: [] };
        }

        const path = [];
        let current = b;
        while (current !== null) {
            path.push(current);
            current = prev.get(current);
        }
        path.reverse();
        return { distance, path };
    }
}

// --- 2. OrderQueue (BST Simplificado para FIFO) ---

// A classe OrderQueue é mantida do código anterior para garantir a ordem FIFO dos pedidos
class OrderNode {
    constructor(key, value) {
        this.key = key; // A sequência (seq)
        this.value = value; // Os dados do pedido
        this.left = null;
        this.right = null;
    }
}

class OrderQueue {
    constructor() {
        this.root = null;
    }

    _insert(node, key, value) {
        if (node === null) {
            return new OrderNode(key, value);
        }
        if (key < node.key) {
            node.left = this._insert(node.left, key, value);
        } else {
            node.right = this._insert(node.right, key, value);
        }
        return node;
    }

    insert(key, value) {
        this.root = this._insert(this.root, key, value);
    }

    _removeMin(node) {
        if (node.left === null) {
            const removed = node;
            return { node: node.right, removed };
        }

        const { node: newLeft, removed } = this._removeMin(node.left);
        node.left = newLeft;
        return { node, removed };
    }

    popMin() {
        if (this.root === null) {
            return null;
        }
        const { node: newRoot, removed } = this._removeMin(this.root);
        this.root = newRoot;
        return removed;
    }

    _inorder(node, out) {
        if (!node) return;
        this._inorder(node.left, out);
        out.push({ key: node.key, value: node.value });
        this._inorder(node.right, out);
    }

    inorder() {
        const res = [];
        this._inorder(this.root, res);
        return res;
    }
}

// --- 3. Sistema de Entrega (Adaptação ao novo mapa) ---

class SistemaEntrega {
    constructor() {
        this.g = new Graph();
        this.avl = new OrderQueue(); 
        this._seq = 1;
        this.origemNode = 'CENTRO_DEPOSITO'; // Depósito Central
        this._createCity();
    }

    _createCity() {
        // NÓS INTERMEDIÁRIOS (Junctions)
        this.g.addNode('CENTRO_DEPOSITO', 'Centro (Depósito Principal)');
        this.g.addNode('JUNCAO_CENTRO_OESTE', 'Junc. Centro-Oeste');
        this.g.addNode('JUNCAO_CENTRO_LESTE', 'Junc. Centro-Leste');
        this.g.addNode('JUNCAO_SM_RUA_NOVA', 'Junc. SM/R. Nova');
        this.g.addNode('JUNCAO_SPD_R_CAMPOS', 'Junc. SPD/R. Campos');

        // NÓS DE ENTREGA (Delivery Points)
        this.g.addNode('CENTRO_R_ESPERANCA', 'Centro - R. Esperança');
        this.g.addNode('CENTRO_R_AGUAS', 'Centro - R. Águas');
        
        this.g.addNode('SM_R_NOVA_VITORIA', 'SM - R. Nova da Vitória');
        this.g.addNode('SM_R_VITORIA', 'SM - R. da Vitória');
        
        this.g.addNode('SP_R_AZUL', 'SP - R. Azul');
        this.g.addNode('SP_R_IPE', 'SP - R. da Ipê');
        
        this.g.addNode('SJ_R_FLORES', 'SJ - R. das Flores');
        this.g.addNode('SJ_R_SOL', 'SJ - R. dos Sol');
        
        this.g.addNode('SPD_R_PALMEIRAS', 'SPD - R. das Palmeiras');
        this.g.addNode('SPD_R_CEDRO', 'SPD - Rua Cedro');

        // ARESTAS (Baseado no mapa do usuário)

        // Centro e Entradas
        this.g.addEdge('CENTRO_DEPOSITO', 'CENTRO_R_ESPERANCA', 1);
        this.g.addEdge('CENTRO_DEPOSITO', 'CENTRO_R_AGUAS', 1);
        this.g.addEdge('CENTRO_DEPOSITO', 'JUNCAO_CENTRO_OESTE', 1); // R. Central
        this.g.addEdge('CENTRO_DEPOSITO', 'JUNCAO_CENTRO_LESTE', 1); // R. Central

        // Lado Oeste: SM e SP
        this.g.addEdge('JUNCAO_CENTRO_OESTE', 'JUNCAO_SM_RUA_NOVA', 8); // R. Nova da Vitória
        
        this.g.addEdge('JUNCAO_SM_RUA_NOVA', 'SM_R_NOVA_VITORIA', 8); 
        this.g.addEdge('JUNCAO_SM_RUA_NOVA', 'SM_R_VITORIA', 10);
        
        this.g.addEdge('JUNCAO_SM_RUA_NOVA', 'SP_R_AZUL', 10); // Conexão SM-SP via Rua Nova
        this.g.addEdge('SP_R_AZUL', 'SP_R_IPE', 10);
        
        // Lado Leste: SJ e SPD
        this.g.addEdge('JUNCAO_CENTRO_LESTE', 'SJ_R_SOL', 5); // R. Central
        this.g.addEdge('SJ_R_SOL', 'SJ_R_FLORES', 5);
        this.g.addEdge('SJ_R_FLORES', 'SJ_R_SOL', 6); // R. das Flores tem peso 6
        
        this.g.addEdge('JUNCAO_CENTRO_LESTE', 'JUNCAO_SPD_R_CAMPOS', 5); // R. Central (para baixo)
        this.g.addEdge('JUNCAO_SPD_R_CAMPOS', 'SPD_R_PALMEIRAS', 8); // R. Campos
        
        this.g.addEdge('SPD_R_PALMEIRAS', 'SPD_R_CEDRO', 10); // Dentro do bloco SPD
        this.g.addEdge('SPD_R_PALMEIRAS', 'SPD_R_CEDRO', 8); // R. das Palmeiras/R. Cedro (usando 8 e 10 conforme o desenho)
        // Para simplificar, vou usar apenas 8. O desenho parece ter 8 e 10 como distâncias internas, vou padronizar.
        this.g.addEdge('SPD_R_PALMEIRAS', 'SPD_R_CEDRO', 10); // Peso 10
        

        // Mapeamento Bairro -> Ruas (para o formulário de entrega)
        this._bairros = {
            'CENTRO': { 'Esperança': 'CENTRO_R_ESPERANCA', 'Águas': 'CENTRO_R_AGUAS' },
            'SJ': { 'Flores': 'SJ_R_FLORES', 'Sol': 'SJ_R_SOL' },
            'SM': { 'Nova da Vitória': 'SM_R_NOVA_VITORIA', 'Vitória': 'SM_R_VITORIA' },
            'SP': { 'Azul': 'SP_R_AZUL', 'Ipê': 'SP_R_IPE' },
            'SPD': { 'Palmeiras': 'SPD_R_PALMEIRAS', 'Cedro': 'SPD_R_CEDRO' }
        };

        this._ruaMap = {};
        for (const [bairroKey, ruas] of Object.entries(this._bairros)) {
            for (const [ruaName, node] of Object.entries(ruas)) {
                const key = `${bairroKey.toUpperCase()}::${ruaName.toUpperCase()}`;
                this._ruaMap[key] = node;
            }
        }
    }

    bairrosDisponiveis() {
        return Object.keys(this._bairros);
    }

    ruasDoBairro(bairroKey) {
        const b = bairroKey.trim().toUpperCase();
        const ruas = this._bairros[b];
        return ruas ? Object.keys(ruas) : [];
    }

    novaEntrega(cliente, bairroChoice, ruaChoice) {
        const bairro = bairroChoice.trim().toUpperCase();
        const rua = ruaChoice.trim().toUpperCase();
        const key = `${bairro}::${rua}`;
        const destinoNode = this._ruaMap[key];

        if (!destinoNode) {
            if (!this._bairros[bairro]) {
                throw new Error(`Bairro '${bairroChoice}' inválido.`);
            }
            const ruasDisp = Object.keys(this._bairros[bairro]).join(', ');
            throw new Error(`Rua '${ruaChoice}' não encontrada em ${bairroChoice}. Ruas válidas: ${ruasDisp}`);
        }

        const seq = this._seq++;
        const pedido = {
            seq,
            cliente,
            bairro: bairroChoice,
            rua: ruaChoice,
            destinoNode,
            hora: new Date().getTime(),
        };

        this.avl.insert(seq, pedido);
        return { pedido, rota: this.rotaOtima() };
    }

    entregarProxima() {
        const node = this.avl.popMin();
        if (!node) return null;
        return { key: node.key, value: node.value };
    }

    // Algoritmo do Vizinho Mais Próximo para calcular a rota ótima
    rotaOtima() {
        const pend = this.avl.inorder();
        if (pend.length === 0) return { rotaNodes: [], pathNames: [], totalDistance: 0.0, nodeToClientMap: new Map() };

        // Mapeia DestinoNode -> [Clientes]
        const nodeToClientMap = new Map();
        pend.forEach(p => {
            if (!nodeToClientMap.has(p.value.destinoNode)) {
                nodeToClientMap.set(p.value.destinoNode, []);
            }
            nodeToClientMap.get(p.value.destinoNode).push(p.value.cliente);
        });

        const destinosNodes = Array.from(nodeToClientMap.keys());
        let current = this.origemNode;
        let rotaNodes = [current];
        let restantes = new Set(destinosNodes);
        let totalDistance = 0.0;

        // Heurística: Vizinho Mais Próximo (Nearest Neighbor)
        while (restantes.size > 0) {
            const { dist: distMap } = this.g.dijkstra(current);
            
            let proxNode = null;
            let minDist = Infinity;
            
            for (const node of restantes) {
                const dist = distMap.get(node) || Infinity;
                if (dist < minDist) {
                    minDist = dist;
                    proxNode = node;
                }
            }

            if (proxNode === null || minDist === Infinity) {
                break; 
            }

            const { distance: distanceSegmento, path: caminhoNodes } = this.g.shortestPath(current, proxNode);
            
            totalDistance += distanceSegmento;

            // Concatena o caminho, evitando duplicar o nó atual
            if (caminhoNodes.length > 0) {
                // Adiciona o caminho (excluindo o nó inicial que já está em 'current')
                rotaNodes.push(...caminhoNodes.slice(1));
            }

            current = proxNode;
            restantes.delete(proxNode);
        }

        // Converte IDs para nomes amigáveis
        const pathNames = rotaNodes.map(n => this.g.nodes.get(n) || n);
        
        return { rotaNodes, pathNames, totalDistance: totalDistance.toFixed(2), nodeToClientMap };
    }

    listarPendentes() {
        return this.avl.inorder().map(item => item.value);
    }
}


// -------------------------
// Lógica da Interface (UI) e Canvas (Adaptado ao novo mapa)
// -------------------------

const sistema = new SistemaEntrega();
let currentRouteData = { rotaNodes: [], pathNames: [], totalDistance: 0.0, nodeToClientMap: new Map() };

const elements = {
    form: document.getElementById('delivery-form'),
    cliente: document.getElementById('cliente'),
    bairroSelect: document.getElementById('bairro'),
    ruaSelect: document.getElementById('rua'),
    messageBox: document.getElementById('message-box'),
    deliverBtn: document.getElementById('deliver-next-btn'),
    showRouteBtn: document.getElementById('show-route-btn'),
    pendingList: document.getElementById('pending-orders-list'),
    noOrdersMsg: document.getElementById('no-orders'),
    pendingCount: document.getElementById('pending-count'),
    routePath: document.getElementById('route-path'),
    totalDistance: document.getElementById('total-distance'),
    canvas: document.getElementById('delivery-map'),
};
const ctx = elements.canvas.getContext('2d');

// Mapeamento de Posições no Canvas (baseado no desenho do usuário)
const nodePositions = {
    // Centro (300-400, 200-300)
    'CENTRO_DEPOSITO': { x: 350, y: 250, label: 'Depósito' }, 
    'JUNCAO_CENTRO_OESTE': { x: 250, y: 250, label: 'Junc. O.' },
    'JUNCAO_CENTRO_LESTE': { x: 450, y: 250, label: 'Junc. L.' },
    'CENTRO_R_ESPERANCA': { x: 450, y: 200, label: 'R. Esperança' },
    'CENTRO_R_AGUAS': { x: 450, y: 300, label: 'R. Águas' },

    // SM (200-300, 50-150)
    'JUNCAO_SM_RUA_NOVA': { x: 250, y: 150, label: 'Junc. SM' },
    'SM_R_NOVA_VITORIA': { x: 200, y: 100, label: 'R. Nova da Vitória' }, 
    'SM_R_VITORIA': { x: 300, y: 100, label: 'R. da Vitória' },

    // SP (200-300, 400-500)
    'SP_R_AZUL': { x: 250, y: 400, label: 'R. Azul' }, 
    'SP_R_IPE': { x: 200, y: 450, label: 'R. da Ipê' }, 

    // Conexão SM-SP
    'SM_SP_PATH': { x: 250, y: 300, label: 'Conexão SM-SP' },

    // SJ (500-600, 50-150)
    'SJ_R_FLORES': { x: 550, y: 50, label: 'R. das Flores' },
    'SJ_R_SOL': { x: 600, y: 100, label: 'R. dos Sol' },
    
    // SPD (500-600, 400-500)
    'JUNCAO_SPD_R_CAMPOS': { x: 550, y: 350, label: 'R. Campos' },
    'SPD_R_PALMEIRAS': { x: 550, y: 450, label: 'R. das Palmeiras' },
    'SPD_R_CEDRO': { x: 600, y: 500, label: 'R. Cedro' },
};

// --- Lógica de Desenho e Animação do Mapa ---

let animationFrameId;
let motoboy = { x: 0, y: 0, pathIndex: 0, segmentProgress: 0, isMoving: false, path: [] };

function drawMotoboy(x, y) {
    ctx.save();
    ctx.beginPath();
    // Desenha um círculo para a motoboy
    ctx.arc(x, y, 10, 0, Math.PI * 2, true);
    ctx.fillStyle = '#FF8800'; // Laranja
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    
    // Texto/Icone: Motoboy 🛵
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('🛵', x, y + 4); 
    ctx.restore();
}

function drawMapStatic(routeData) {
    const { rotaNodes, nodeToClientMap } = routeData;
    const currentRouteNodeIds = new Set(rotaNodes);
    
    // 1. Limpa o Canvas
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

    // 2. Desenha Todas as Arestas (Grafo Completo)
    ctx.strokeStyle = '#4a90e2'; // Cor azul para as ruas
    ctx.lineWidth = 3;
    for (const [nodeA, edges] of sistema.g.edges.entries()) {
        const posA = nodePositions[nodeA];
        if (!posA) continue;
        for (const [nodeB, weight] of edges.entries()) {
            const posB = nodePositions[nodeB];
            if (!posB) continue;
            
            // Desenha a aresta (linha)
            ctx.beginPath();
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posB.x, posB.y);
            ctx.stroke();

            // Desenha o peso (distância) no meio
            const midX = (posA.x + posB.x) / 2;
            const midY = (posA.y + posB.y) / 2;
            
            ctx.save();
            ctx.font = '14px Arial';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Adiciona um fundo branco para o texto do peso
            ctx.fillStyle = 'rgba(247, 243, 232, 0.8)'; 
            ctx.fillRect(midX - 15, midY - 10, 30, 20); 

            ctx.fillStyle = 'black';
            ctx.fillText(weight.toFixed(0), midX, midY);
            ctx.restore();
        }
    }

    // 3. Desenha a Rota Ótima (Arestas com destaque)
    ctx.strokeStyle = '#E3342F'; // Vermelho da Rota
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 5]); 
    
    for (let i = 0; i < rotaNodes.length - 1; i++) {
        const nodeA = rotaNodes[i];
        const nodeB = rotaNodes[i + 1];
        const posA = nodePositions[nodeA];
        const posB = nodePositions[nodeB];
        
        if (posA && posB) {
            ctx.beginPath();
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posB.x, posB.y);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]); // Volta para linha sólida

    // 4. Desenha Todos os Nós (Pontos de Entrega e Junções)
    for (const [nodeId, pos] of Object.entries(nodePositions)) {
        const isDestination = nodeToClientMap.has(nodeId);
        const isDepot = nodeId === sistema.origemNode;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2, true);
        
        // Cor do nó
        if (isDepot) {
            ctx.fillStyle = '#059669'; // Verde para Depósito
        } else if (isDestination) {
            ctx.fillStyle = '#E3342F'; // Vermelho para Entrega
        } else if (currentRouteNodeIds.has(nodeId)) {
            ctx.fillStyle = '#4f46e5'; // Azul para Nó da Rota (Junção)
        } else {
            ctx.fillStyle = '#9ca3af'; // Cinza para Outros Nós
        }
        
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label do nó
        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText(pos.label, pos.x, pos.y - 12);
    }
}

// Função de Animação
function animateMotoboy() {
    drawMapStatic(currentRouteData);

    if (!motoboy.isMoving || motoboy.pathIndex >= motoboy.path.length - 1) {
        // Desenha o motoboy no ponto final
        const lastNodeId = motoboy.path.length > 0 ? motoboy.path.slice(-1)[0] : sistema.origemNode;
        const finalPos = nodePositions[lastNodeId] || nodePositions[sistema.origemNode];
        drawMotoboy(finalPos.x, finalPos.y);
        return;
    }

    const currentNodeId = motoboy.path[motoboy.pathIndex];
    const nextNodeId = motoboy.path[motoboy.pathIndex + 1];

    const posA = nodePositions[currentNodeId];
    const posB = nodePositions[nextNodeId];

    // Calcula a posição do motoboy no segmento (interpolação linear)
    motoboy.x = posA.x + (posB.x - posA.x) * motoboy.segmentProgress;
    motoboy.y = posA.y + (posB.y - posA.y) * motoboy.segmentProgress;
    
    drawMotoboy(motoboy.x, motoboy.y);

    // Atualiza o progresso (velocidade constante)
    const speed = 0.02; // Velocidade da simulação
    motoboy.segmentProgress += speed;

    if (motoboy.segmentProgress >= 1) {
        // Mudar para o próximo segmento
        motoboy.pathIndex++;
        motoboy.segmentProgress = 0;

        if (motoboy.pathIndex >= motoboy.path.length - 1) {
            // Fim da rota, para a animação
            motoboy.isMoving = false;
        }
    }

    animationFrameId = requestAnimationFrame(animateMotoboy);
}

function startRouteAnimation(rotaNodes) {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    if (rotaNodes.length <= 1) {
        motoboy.isMoving = false;
        drawMapStatic(currentRouteData);
        return;
    }
    
    motoboy.path = rotaNodes;
    motoboy.pathIndex = 0;
    motoboy.segmentProgress = 0;
    motoboy.isMoving = true;

    // Inicia a animação
    animateMotoboy();
}


/** Exibe uma mensagem de status. */
function displayMessage(msg, type) {
    elements.messageBox.textContent = msg;
    elements.messageBox.className = 'mt-4 p-3 rounded-lg text-sm';
    elements.messageBox.classList.remove('hidden');

    if (type === 'success') {
        elements.messageBox.classList.add('bg-green-100', 'text-green-800', 'border', 'border-green-400');
    } else if (type === 'error') {
        elements.messageBox.classList.add('bg-red-100', 'text-red-800', 'border', 'border-red-400');
    }
}

/** Preenche o dropdown de bairros ao carregar. */
function populateBairros() {
    const bairros = sistema.bairrosDisponiveis();
    bairros.forEach(b => {
        const option = document.createElement('option');
        option.value = b;
        option.textContent = b;
        elements.bairroSelect.appendChild(option);
    });
}

/** Atualiza o dropdown de ruas com base no bairro selecionado. */
elements.bairroSelect.addEventListener('change', (e) => {
    const bairro = e.target.value;
    const ruas = sistema.ruasDoBairro(bairro);

    elements.ruaSelect.innerHTML = '<option value="" disabled selected>Selecione a Rua</option>';
    elements.ruaSelect.disabled = ruas.length === 0;

    ruas.forEach(r => {
        const option = document.createElement('option');
        option.value = r;
        option.textContent = r;
        elements.ruaSelect.appendChild(option);
    });

    if (ruas.length > 0) {
        elements.ruaSelect.focus();
    }
});

/** Renderiza a lista de pedidos pendentes. */
function renderPendingOrders() {
    const pending = sistema.listarPendentes();
    elements.pendingList.innerHTML = '';
    elements.pendingCount.textContent = pending.length;

    if (pending.length === 0) {
        elements.pendingList.appendChild(elements.noOrdersMsg);
        elements.noOrdersMsg.classList.remove('hidden');
        // Limpa a rota e o mapa
        renderRoute({ rotaNodes: [], pathNames: [], totalDistance: 0.0, nodeToClientMap: new Map() });
        return;
    }

    elements.noOrdersMsg.classList.add('hidden');

    pending.forEach(p => {
        const timeStr = new Date(p.hora).toLocaleTimeString('pt-BR');
        const item = document.createElement('div');
        item.className = 'p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-yellow-50 transition';
        item.innerHTML = `
            <div class="font-bold text-gray-800">#${p.seq} - ${p.cliente}</div>
            <div class="text-sm text-gray-600">
                <span class="font-medium">${p.bairro}</span>: ${p.rua}
                <span class="text-xs text-gray-400 ml-2">(${timeStr})</span>
            </div>
        `;
        elements.pendingList.appendChild(item);
    });
}

/** Renderiza o caminho da rota e atualiza o mapa. */
function renderRoute(routeData) {
    currentRouteData = routeData;
    const { rotaNodes, pathNames, totalDistance, nodeToClientMap } = routeData;

    elements.totalDistance.textContent = `${totalDistance} km`;
    elements.routePath.innerHTML = '';
    
    if (pathNames.length <= 1) {
        elements.routePath.innerHTML = '<p class="text-gray-500">Nenhuma rota a ser percorrida além do depósito.</p>';
        drawMapStatic(routeData); // Desenha o mapa estático sem rota
        startRouteAnimation(rotaNodes); // Para animação
        return;
    }

    // 1. Renderização Textual da Rota
    pathNames.forEach((name, index) => {
        const nodeId = rotaNodes[index];
        const clients = nodeToClientMap.get(nodeId);
        
        const item = document.createElement('div');
        item.className = 'flex items-start py-1';

        let iconHtml = '';
        let textClass = 'text-gray-800';
        
        if (index === 0) {
            iconHtml = '<span class="text-green-700 font-extrabold mr-2">🏠</span>'; // Depósito
            textClass = 'font-bold text-green-700';
        } else if (clients) {
            iconHtml = '<span class="text-red-600 font-extrabold mr-2">📍</span>'; // Entrega
            textClass = 'font-bold text-red-600';
        } else if (index === pathNames.length - 1) {
            iconHtml = '<span class="text-blue-500 font-extrabold mr-2">🏁</span>'; // Último ponto
        } else {
                iconHtml = '<span class="text-gray-400 font-extrabold mr-2">→</span>'; // Via
        }

        item.innerHTML = `
            ${iconHtml}
            <div class="flex flex-col">
                <span class="${textClass}">${name}</span>
                ${clients ? `<span class="text-xs italic text-gray-500">Entregar para: ${clients.join(', ')}</span>` : ''}
            </div>
        `;
        elements.routePath.appendChild(item);
    });
    
    // 2. Inicia Animação no Mapa
    startRouteAnimation(rotaNodes);
}

/** Ação de Adicionar Nova Entrega. */
elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const cliente = elements.cliente.value.trim();
    const bairro = elements.bairroSelect.value;
    const rua = elements.ruaSelect.value;
    
    if (!cliente || !bairro || !rua) {
        displayMessage("Por favor, preencha todos os campos.", 'error');
        return;
    }

    try {
        const { pedido, rota } = sistema.novaEntrega(cliente, bairro, rua);
        displayMessage(`✅ Entrega #${pedido.seq} para ${pedido.cliente} adicionada! Rota Recalculada.`, 'success');
        
        elements.cliente.value = '';
        
        renderPendingOrders();
        renderRoute(rota);

    } catch (error) {
        console.error(error);
        displayMessage(`❌ Erro: ${error.message}`, 'error');
    }
});

/** Ação de Entregar Próxima (FIFO). */
elements.deliverBtn.addEventListener('click', () => {
    const result = sistema.entregarProxima();
    if (result) {
        displayMessage(`🍕 ENTREGUE! Pedido #${result.key} para ${result.value.cliente} em ${result.value.rua}.`, 'success');
        renderPendingOrders();
        // Recalcula a rota após a entrega
        renderRoute(sistema.rotaOtima());
    } else {
        displayMessage("📦 Nenhuma entrega pendente para realizar.", 'error');
    }
});

/** Ação de Mostrar Rota Ótima (Recalcular). */
elements.showRouteBtn.addEventListener('click', () => {
    const rota = sistema.rotaOtima();
    if (rota.pathNames.length <= 1) {
        displayMessage("⚠️ Sem entregas pendentes para calcular a rota.", 'error');
    } else {
        displayMessage(`🗺️ Rota ótima recalculada. Distância total: ${rota.totalDistance} km.`, 'success');
    }
    renderRoute(rota);
});

// Adapta o tamanho do Canvas
function resizeCanvas() {
    // Redimensiona para ser responsivo, mantendo um aspect ratio para o mapa personalizado
    const parentWidth = elements.canvas.parentElement.offsetWidth;
    elements.canvas.width = parentWidth;
    elements.canvas.height = parentWidth * (600 / 700); // Mantém a proporção do mapa (700x600)
    
    // Redesenha o mapa estático após redimensionamento
    drawMapStatic(currentRouteData);
}

// Inicialização
window.onload = () => {
    populateBairros();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    renderPendingOrders(); 
    
    // Desenha o mapa inicial (Depósito)
    drawMapStatic(currentRouteData);
};

