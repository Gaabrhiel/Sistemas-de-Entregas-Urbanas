// app.js
// Versão atualizada: Ruas mais distanciadas para evitar sobreposição de nomes.

// ---------- UTILIDADES E ESTRUTURAS (Graph + Dijkstra + OrderQueue) ----------
class Graph {
    constructor() {
        this.nodes = new Map(); // id -> display name
        this.edges = new Map(); // id -> Map(neighbor_id, weight)
    }
    addNode(id, name) {
        this.nodes.set(id, name);
        if (!this.edges.has(id)) this.edges.set(id, new Map());
    }
    addEdge(a, b, w, bidir = true) {
        if (!this.nodes.has(a) || !this.nodes.has(b)) {
            console.warn(`Nodes missing for edge ${a} - ${b}`);
            return;
        }
        this.edges.get(a).set(b, parseFloat(w));
        if (bidir) this.edges.get(b).set(a, parseFloat(w));
    }
    _pq() {
        const q = [];
        return {
            push: (d,u) => { q.push({d,u}); q.sort((x,y)=>x.d-y.d); },
            pop: () => q.shift(),
            isEmpty: () => q.length===0
        };
    }
    dijkstra(start) {
        const dist = new Map(), prev = new Map();
        if (!this.nodes.has(start)) return { dist, prev };
        for (const k of this.nodes.keys()) { dist.set(k, Infinity); prev.set(k, null); }
        dist.set(start, 0);
        const pq = this._pq(); pq.push(0,start);
        while (!pq.isEmpty()) {
            const {d,u} = pq.pop();
            if (d > dist.get(u)) continue;
            const neigh = this.edges.get(u) || new Map();
            for (const [v,w] of neigh.entries()) {
                const nd = d + w;
                if (nd < dist.get(v)) { dist.set(v, nd); prev.set(v, u); pq.push(nd, v); }
            }
        }
        return { dist, prev };
    }
    shortestPath(a,b) {
        const {dist, prev} = this.dijkstra(a);
        const distance = dist.get(b);
        if (distance===undefined || distance===Infinity) return { distance: Infinity, path: [] };
        const path = []; let cur = b;
        while (cur !== null) { path.push(cur); cur = prev.get(cur); }
        path.reverse();
        return { distance, path };
    }
}

// Fila de Ordem Simples (FIFO) usando Array
class OrderQueue {
    constructor() {
        this.items = []; 
    }
    insert(key, value) {
        this.items.push({ key, value });
    }
    popMin() {
        if (this.items.length === 0) return null;
        return this.items.shift();
    }
    inorder() {
        return this.items;
    }
}

// ---------- SISTEMA DE ENTREGA (cria grafo e lógica) ----------
class SistemaEntrega {
    constructor() {
        // O depósito agora é o próprio BAIRRO DIVINO
        this.depotNode = 'BAIRRO_DIVINO'; 
        this.g = new Graph();
        this.queue = new OrderQueue();
        this.seq = 1;
        this._createCity();
    }
    _createCity() {
        // NÓS - Bairros
        const bairros = {
            'DIVINO': 'BAIRRO_DIVINO', 
            'CENTRO': 'BAIRRO_CENTRO',
            'SAO_PAULO': 'BAIRRO_SAO_PAULO',
            'SAO_PEDRO': 'BAIRRO_SAO_PEDRO',
            'APARECIDA': 'BAIRRO_APARECIDA',
            'SAO_JORGE': 'BAIRRO_SAO_JORGE',
            'PAZ': 'BAIRRO_PAZ'
        };
        for (const [k,id] of Object.entries(bairros)) this.g.addNode(id, k.replace('_',' '));

        // Ruas (pontos vermelhos) - cada rua é um nó de entrega
        const ruas = {
            'RUA_SP_NOVA_VITORIA': 'R. Nova Vitória',
            'RUA_SP_VITORIA': 'R. Vitória',
            'RUA_SPD_SANTA_DA_BAIA': 'R. Santa da Baia',
            'RUA_SPD_SANTA_RITA': 'R. Santa Rita',
            'RUA_SPD_SAO_FRANCISCO': 'R. São Francisco',
            'RUA_CENTRO_PASTOS': 'R. Pastos',
            'RUA_CENTRO_ESPERANCA': 'R. Esperança',
            'RUA_CENTRO_AGUAS': 'R. Águas',
            'RUA_PAZ_CEDRO': 'R. Cedro', 
            'RUA_SJ_DAS_FLORES': 'R. Das Flores',
            'RUA_SJ_DOS_SOIS': 'R. Dos Sóis',
            'RUA_AP_DA_IPE': 'R. Ipê' 
        };
        for (const [id,label] of Object.entries(ruas)) this.g.addNode(id, label);

        // ---------- ARESTAS: LIGAÇÕES DIRETAS E PESOS ATUALIZADOS ----------
        
        // 1. LIGAÇÕES DEPÓSITO (BAIRRO DIVINO)
        this.g.addEdge(this.depotNode, 'BAIRRO_SAO_PEDRO', 7); 
        this.g.addEdge(this.depotNode, 'BAIRRO_CENTRO', 3);    

        // 2. LIGAÇÕES BAIRRO-BAIRRO
        this.g.addEdge('BAIRRO_CENTRO', 'BAIRRO_SAO_JORGE', 6);    
        this.g.addEdge('BAIRRO_CENTRO', 'BAIRRO_PAZ', 11);         
        this.g.addEdge('BAIRRO_SAO_PEDRO', 'BAIRRO_SAO_PAULO', 8); 
        this.g.addEdge('BAIRRO_SAO_PEDRO', 'BAIRRO_APARECIDA', 7); 
        
        // 3. LIGAÇÕES BAIRRO-RUA (Pesos internos)
        // São Paulo
        this.g.addEdge('BAIRRO_SAO_PAULO', 'RUA_SP_NOVA_VITORIA', 8);
        this.g.addEdge('BAIRRO_SAO_PAULO', 'RUA_SP_VITORIA', 10);
        // São Pedro
        this.g.addEdge('BAIRRO_SAO_PEDRO', 'RUA_SPD_SANTA_DA_BAIA', 6);
        this.g.addEdge('BAIRRO_SAO_PEDRO', 'RUA_SPD_SANTA_RITA', 5);
        this.g.addEdge('BAIRRO_SAO_PEDRO', 'RUA_SPD_SAO_FRANCISCO', 7);
        // Centro
        this.g.addEdge('BAIRRO_CENTRO', 'RUA_CENTRO_PASTOS', 2);
        this.g.addEdge('BAIRRO_CENTRO', 'RUA_CENTRO_ESPERANCA', 2);
        this.g.addEdge('BAIRRO_CENTRO', 'RUA_CENTRO_AGUAS', 2);
        // Paz
        this.g.addEdge('BAIRRO_PAZ', 'RUA_PAZ_CEDRO', 10);
        // São Jorge
        this.g.addEdge('BAIRRO_SAO_JORGE', 'RUA_SJ_DAS_FLORES', 6);
        this.g.addEdge('BAIRRO_SAO_JORGE', 'RUA_SJ_DOS_SOIS', 7);
        // Aparecida
        this.g.addEdge('BAIRRO_APARECIDA', 'RUA_AP_DA_IPE', 4);
        
        // Mapeamento para o formulário (apenas bairros com ruas)
        this._bairros = {
            'CENTRO': { 'Pastos': 'RUA_CENTRO_PASTOS', 'Esperança': 'RUA_CENTRO_ESPERANCA', 'Águas': 'RUA_CENTRO_AGUAS' },
            'SAO_PAULO': { 'Nova Vitória': 'RUA_SP_NOVA_VITORIA', 'Vitória': 'RUA_SP_VITORIA' },
            'SAO_PEDRO': { 'Santa da Baia': 'RUA_SPD_SANTA_DA_BAIA', 'Santa Rita': 'RUA_SPD_SANTA_RITA', 'São Francisco': 'RUA_SPD_SAO_FRANCISCO' },
            'SAO_JORGE': { 'Das Flores': 'RUA_SJ_DAS_FLORES', 'Dos Sóis': 'RUA_SJ_DOS_SOIS' },
            'PAZ': { 'Cedro': 'RUA_PAZ_CEDRO' },
            'APARECIDA': { 'Ipê': 'RUA_AP_DA_IPE' }
        };

        // Build reverse lookup for rua selection
        this._ruaMap = {};
        for (const [bairro, ruasObj] of Object.entries(this._bairros)) {
            for (const [ruaName, nodeId] of Object.entries(ruasObj)) {
                const key = `${bairro.toUpperCase()}::${ruaName.toUpperCase()}`;
                this._ruaMap[key] = nodeId;
            }
        }
    }

    bairrosDisponiveis() { return Object.keys(this._bairros); }
    ruasDoBairro(bairro) {
        const b = (bairro||'').trim().toUpperCase();
        const r = this._bairros[b];
        return r ? Object.keys(r) : [];
    }
    novaEntrega(cliente, bairroChoice, ruaChoice) {
        const bairro = bairroChoice.trim().toUpperCase();
        const rua = ruaChoice.trim().toUpperCase();
        const key = `${bairro}::${rua}`;
        const destino = this._ruaMap[key];
        if (!destino) {
            const ruasDisp = this._bairros[bairro] ? Object.keys(this._bairros[bairro]).join(', ') : 'nenhuma';
            throw new Error(`Rua '${ruaChoice}' não encontrada em ${bairroChoice}. Ruas válidas: ${ruasDisp}`);
        }
        const seq = this.seq++;
        const pedido = { seq, cliente, bairro: bairroChoice, rua: ruaChoice, destinoNode: destino, hora: new Date().getTime() };
        this.queue.insert(seq, pedido);
        return { pedido, rota: this.rotaOtima() };
    }
    entregarProxima() {
        const node = this.queue.popMin();
        if (!node) return null;
        return { key: node.key, value: node.value };
    }
    // Vizinho Mais Próximo heurística com Dijkstra para obter rota sequencial
    rotaOtima() {
        const pend = this.queue.inorder();
        if (pend.length === 0) return { rotaNodes: [], pathNames: [], totalDistance: 0.0, nodeToClientMap: new Map() };
        const nodeToClientMap = new Map();
        pend.forEach(p => {
            if (!nodeToClientMap.has(p.value.destinoNode)) nodeToClientMap.set(p.value.destinoNode, []);
            nodeToClientMap.get(p.value.destinoNode).push(p.value.cliente);
        });
        const destinos = Array.from(nodeToClientMap.keys());
        let current = this.depotNode;
        let rotaNodes=[current];
        let restantes = new Set(destinos);
        let totalDistance = 0.0;
        while (restantes.size>0) {
            const { dist: distMap } = this.g.dijkstra(current);
            let prox = null, minDist = Infinity;
            for (const node of restantes) {
                const dist = distMap.get(node) || Infinity;
                if (dist < minDist) { minDist = dist; prox = node; }
            }
            if (!prox || minDist === Infinity) break;
            const { distance: distSeg, path } = this.g.shortestPath(current, prox);
            totalDistance += distSeg;
            if (path.length>0) rotaNodes.push(...path.slice(1));
            current = prox;
            restantes.delete(prox);
        }
        const pathNames = rotaNodes.map(n => this.g.nodes.get(n) || n);
        return { rotaNodes, pathNames, totalDistance: totalDistance.toFixed(2), nodeToClientMap };
    }
    listarPendentes() { return this.queue.inorder().map(i=>i.value); }
}

// ---------- UI / Canvas / Integração (Posições ajustadas e Espaçadas) ----------
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
    canvas: document.getElementById('delivery-map')
};
const ctx = elements.canvas.getContext('2d');

const nodePositions = {
    // BAIRROS PRINCIPAIS (Divino no centro)
    'BAIRRO_DIVINO':  { x: 350, y: 300, label: 'Divino / Pizzaria' }, 
    'BAIRRO_CENTRO': { x: 350, y: 200, label: 'Centro' },

    'BAIRRO_SAO_JORGE': { x: 350, y: 80, label: 'São Jorge' }, 
    'BAIRRO_PAZ': { x: 550, y: 250, label: 'Paz' }, 

    'BAIRRO_SAO_PEDRO': { x: 150, y: 300, label: 'São Pedro' }, 
    'BAIRRO_APARECIDA': { x: 150, y: 450, label: 'Aparecida' }, 
    'BAIRRO_SAO_PAULO': { x: 550, y: 450, label: 'São Paulo' }, 

    // RUAS CENTRO - (Radial e distanciadas do nó)
    'RUA_CENTRO_ESPERANCA':   { x: 350, y: 110, label: 'R. Esperança' }, // Bem acima
    'RUA_CENTRO_PASTOS':      { x: 230, y: 200, label: 'R. Pastos' }, // Bem a esquerda
    'RUA_CENTRO_AGUAS':       { x: 470, y: 200, label: 'R. Águas' },  // Bem a direita

    // RUAS SÃO JORGE - (Em V para cima)
    'RUA_SJ_DAS_FLORES': { x: 280, y: 30, label: 'R. Das Flores' },
    'RUA_SJ_DOS_SOIS':   { x: 420, y: 30, label: 'R. Dos Sóis' },

    // RUAS PAZ - (Para a direita)
    'RUA_PAZ_CEDRO': { x: 670, y: 250, label: 'R. Cedro' },

    // RUAS SÃO PEDRO - (Verticalmente espalhadas a esquerda)
    'RUA_SPD_SANTA_DA_BAIA': { x: 50, y: 230, label: 'R. Santa da Baia' },
    'RUA_SPD_SANTA_RITA':     { x: 30, y: 300, label: 'R. Santa Rita' },
    'RUA_SPD_SAO_FRANCISCO':  { x: 50, y: 370, label: 'R. São Francisco' },

    // RUAS APARECIDA - (Deslocada para esquerda-baixo)
    'RUA_AP_DA_IPE': { x: 80, y: 520, label: 'R. Ipê' },

    // RUAS SÃO PAULO - (Bem abertas em baixo)
    'RUA_SP_NOVA_VITORIA': { x: 480, y: 550, label: 'R. Nova Vitória' },
    'RUA_SP_VITORIA':      { x: 620, y: 550, label: 'R. Vitória' },
};


// Animação do motoboy
let animationFrameId;
let motoboy = { x: 0, y: 0, pathIndex: 0, segmentProgress: 0, isMoving: false, path: [] };

function drawMotoboy(x,y) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x,y,10,0,Math.PI*2);
    ctx.fillStyle = '#FF8800';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText('🛵', x, y+4);
    ctx.restore();
}

function drawMapStatic(routeData) {
    const { rotaNodes, nodeToClientMap } = routeData;

    ctx.clearRect(0,0,elements.canvas.width, elements.canvas.height);

    // 1. Desenha arestas (linhas) - todas as arestas do grafo
    ctx.lineWidth = 3;
    for (const [from, edges] of sistema.g.edges.entries()) {
        const posA = nodePositions[from];
        if (!posA) continue;
        for (const [to, weight] of edges.entries()) {
            const posB = nodePositions[to];
            if (!posB) continue;

            // cor das ruas / conexões
            let strokeCol = '#4a90e2'; // azul default para bairros/ruas
            if (from === sistema.depotNode || to === sistema.depotNode) strokeCol = '#059669'; // verde para ligação visual ao depósito

            ctx.beginPath();
            ctx.strokeStyle = strokeCol;
            ctx.moveTo(posA.x, posA.y);
            ctx.lineTo(posB.x, posB.y);
            ctx.stroke();

            // peso no meio
            const midX = (posA.x + posB.x)/2, midY = (posA.y + posB.y)/2;
            ctx.save();
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(midX-14, midY-10, 28, 20);
            ctx.fillStyle = 'black';
            ctx.fillText(parseFloat(weight).toFixed(0), midX, midY); // Exibe peso como inteiro
            ctx.restore();
        }
    }

    // 2. Desenha rota ótima (quando houver)
    ctx.strokeStyle = '#E3342F';
    ctx.lineWidth = 5;
    ctx.setLineDash([10,5]);
    for (let i=0;i<rotaNodes.length-1;i++) {
        const a = rotaNodes[i], b = rotaNodes[i+1];
        const pa = nodePositions[a], pb = nodePositions[b];
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. Desenha nós (pontos)
    for (const [id,pos] of Object.entries(nodePositions)) {
        const isDepot = id === sistema.depotNode;
        const isBairro = id.startsWith('BAIRRO');
        const isRua = id.startsWith('RUA');
        const isDestination = nodeToClientMap.has(id);

        ctx.beginPath();

        // tamanho por tipo
        const r = isBairro ? 12 : 8;
        ctx.arc(pos.x, pos.y, r, 0, Math.PI*2);

        // cor por tipo
        if (isDepot) ctx.fillStyle = '#059669'; // verde
        else if (isBairro) ctx.fillStyle = '#2563EB'; // azul
        else if (isRua && isDestination) ctx.fillStyle = '#fe0800ff'; // rua com entrega = vermelho
        else if (isRua) ctx.fillStyle = '#ff0800ff'; // ruas - vermelho (pontos de rua)
        else ctx.fillStyle = '#9CA3AF'; // fallback

        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.font = (isBairro ? '13px bold Arial' : '12px Arial');
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(pos.label, pos.x, pos.y - (r + 10));
    }
}

// animação do motoboy (interpolação linear)
function animateMotoboy() {
    drawMapStatic(currentRouteData);

    if (!motoboy.isMoving || motoboy.pathIndex >= motoboy.path.length - 1) {
        const last = motoboy.path.length>0 ? motoboy.path.slice(-1)[0] : sistema.depotNode;
        const p = nodePositions[last] || nodePositions[sistema.depotNode];
        drawMotoboy(p.x, p.y);
        return;
    }

    const curId = motoboy.path[motoboy.pathIndex];
    const nextId = motoboy.path[motoboy.pathIndex+1];
    const pA = nodePositions[curId], pB = nodePositions[nextId];
    if (!pA || !pB) { motoboy.isMoving = false; drawMapStatic(currentRouteData); return; }

    motoboy.x = pA.x + (pB.x - pA.x) * motoboy.segmentProgress;
    motoboy.y = pA.y + (pB.y - pA.y) * motoboy.segmentProgress;

    drawMotoboy(motoboy.x, motoboy.y);

    const speed = 0.02;
    motoboy.segmentProgress += speed;
    if (motoboy.segmentProgress >= 1) {
        motoboy.segmentProgress = 0;
        motoboy.pathIndex++;
        if (motoboy.pathIndex >= motoboy.path.length - 1) motoboy.isMoving = false;
    }
    animationFrameId = requestAnimationFrame(animateMotoboy);
}

function startRouteAnimation(rotaNodes) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (!rotaNodes || rotaNodes.length <= 1) {
        motoboy.isMoving = false;
        drawMapStatic(currentRouteData);
        return;
    }
    motoboy.path = rotaNodes;
    motoboy.pathIndex = 0;
    motoboy.segmentProgress = 0;
    motoboy.isMoving = true;
    animateMotoboy();
}

function displayMessage(msg, type) {
    elements.messageBox.textContent = msg;
    elements.messageBox.className = 'mt-4 p-3 rounded-lg text-sm';
    elements.messageBox.classList.remove('hidden');
    if (type==='success') elements.messageBox.classList.add('bg-green-100','text-green-800','border','border-green-400');
    else elements.messageBox.classList.add('bg-red-100','text-red-800','border','border-red-400');
}

// Preenche dropdown de bairros
function populateBairros() {
    const bairros = sistema.bairrosDisponiveis();
    bairros.forEach(b => {
        const option = document.createElement('option');
        option.value = b;
        option.textContent = b.replace('_',' ');
        elements.bairroSelect.appendChild(option);
    });
}

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
    if (ruas.length>0) elements.ruaSelect.focus();
});

function renderPendingOrders() {
    const pending = sistema.listarPendentes();
    elements.pendingList.innerHTML = '';
    elements.pendingCount.textContent = pending.length;
    if (pending.length === 0) {
        elements.pendingList.appendChild(elements.noOrdersMsg);
        elements.noOrdersMsg.classList.remove('hidden');
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

function renderRoute(routeData) {
    currentRouteData = routeData;
    const { rotaNodes, pathNames, totalDistance, nodeToClientMap } = routeData;
    elements.totalDistance.textContent = `${totalDistance} km`;
    elements.routePath.innerHTML = '';
    if (pathNames.length <= 1) {
        elements.routePath.innerHTML = '<p class="text-gray-500">Nenhuma rota a ser percorrida além do depósito.</p>';
        drawMapStatic(routeData);
        startRouteAnimation(rotaNodes);
        return;
    }
    pathNames.forEach((name, index) => {
        const nodeId = rotaNodes[index];
        const clients = nodeToClientMap.get(nodeId);
        const item = document.createElement('div');
        item.className = 'flex items-start py-1';
        let iconHtml = '';
        let textClass = 'text-gray-800';
        if (index === 0) { iconHtml = '<span class="text-green-700 font-extrabold mr-2">🏠</span>'; textClass = 'font-bold text-green-700'; }
        else if (clients) { iconHtml = '<span class="text-red-600 font-extrabold mr-2">📍</span>'; textClass = 'font-bold text-red-600'; }
        else if (index === pathNames.length - 1) { iconHtml = '<span class="text-blue-500 font-extrabold mr-2">🏁</span>'; }
        else { iconHtml = '<span class="text-gray-400 font-extrabold mr-2">→</span>'; }
        item.innerHTML = `
            ${iconHtml}
            <div class="flex flex-col">
                <span class="${textClass}">${name}</span>
                ${clients ? `<span class="text-xs italic text-gray-500">Entregar para: ${clients.join(', ')}</span>` : ''}
            </div>
        `;
        elements.routePath.appendChild(item);
    });
    startRouteAnimation(routeData.rotaNodes || routeData.rotaNodes);
}

// Eventos do formulário e botões
elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cliente = elements.cliente.value.trim();
    const bairro = elements.bairroSelect.value;
    const rua = elements.ruaSelect.value;
    if (!cliente || !bairro || !rua) { displayMessage("Por favor, preencha todos os campos.", 'error'); return; }
    try {
        const { pedido, rota } = sistema.novaEntrega(cliente, bairro, rua);
        displayMessage(`✅ Entrega #${pedido.seq} para ${pedido.cliente} adicionada! Rota Recalculada.`, 'success');
        elements.cliente.value = '';
        renderPendingOrders();
        renderRoute(rota);
    } catch(err) {
        displayMessage(`❌ Erro: ${err.message}`, 'error');
    }
});

elements.deliverBtn.addEventListener('click', () => {
    const result = sistema.entregarProxima();
    if (result) {
        displayMessage(`🍕 ENTREGUE! Pedido #${result.key} para ${result.value.cliente} em ${result.value.rua}.`, 'success');
        renderPendingOrders();
        renderRoute(sistema.rotaOtima());
    } else displayMessage("📦 Nenhuma entrega pendente para realizar.", 'error');
});

elements.showRouteBtn.addEventListener('click', () => {
    const rota = sistema.rotaOtima();
    if (rota.pathNames.length <= 1) displayMessage("⚠️ Sem entregas pendentes para calcular a rota.", 'error');
    else displayMessage(`🗺️ Rota ótima recalculada. Distância total: ${rota.totalDistance} km.`, 'success');
    renderRoute(rota);
});

// Responsividade do canvas
function resizeCanvas() {
    const parentWidth = elements.canvas.parentElement.offsetWidth;
    elements.canvas.width = parentWidth;
    elements.canvas.height = Math.round(parentWidth * (650/700));
    drawMapStatic(currentRouteData);
}

window.onload = () => {
    populateBairros();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    renderPendingOrders();
    drawMapStatic(currentRouteData);
};