# sistema_pizzaria_grafo_por_rua.py
# Grafo + AVL + Rota recalculada automaticamente (com pesos do mapa)
# Versão: bairro -> rua -> recalcula rota

import math
import heapq
import time
import sys
sys.setrecursionlimit(2000)

# -------------------------
# GRAFO (lista de adjacência, pesos reais)
# -------------------------
class Graph:
    def __init__(self):
        self.nodes = {}    # id -> nome para exibição
        self.edges = {}    # id -> list of (neighbor, weight)

    def add_node(self, node_id, display_name):
        self.nodes[node_id] = display_name
        self.edges.setdefault(node_id, [])

    def add_edge(self, a, b, dist, bidir=True):
        if a not in self.nodes or b not in self.nodes:
            raise ValueError(f"Node {a} or {b} não existe.")
        # evita duplicatas
        if not any(nb == b for nb, _ in self.edges[a]):
            self.edges[a].append((b, float(dist)))
        if bidir:
            if not any(nb == a for nb, _ in self.edges[b]):
                self.edges[b].append((a, float(dist)))

    def dijkstra(self, start):
        if start not in self.nodes:
            raise ValueError(f'Nó inicial {start} não existe')
        dist = {n: math.inf for n in self.nodes}
        prev = {n: None for n in self.nodes}
        dist[start] = 0.0
        pq = [(0.0, start)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, w in self.edges.get(u, []):
                nd = d + w
                if nd < dist[v]:
                    dist[v] = nd
                    prev[v] = u
                    heapq.heappush(pq, (nd, v))
        return dist, prev

    def shortest_path(self, a, b):
        dist, prev = self.dijkstra(a)
        if dist[b] == math.inf:
            return math.inf, []
        path = []
        cur = b
        while cur is not None:
            path.append(cur)
            cur = prev[cur]
        path.reverse()
        return dist[b], path

# -------------------------
# AVL simples (usada como fila por seq: pop_min retorna menor key)
# -------------------------
class AVLNode:
    def __init__(self, key, value):
        self.key = int(key)
        self.value = value
        self.left = None
        self.right = None
        self.height = 1

class AVL:
    def __init__(self):
        self.root = None

    def _height(self, n):
        return n.height if n else 0

    def _balance(self, n):
        return self._height(n.left) - self._height(n.right)

    def _rotate_right(self, y):
        x = y.left
        T2 = x.right
        x.right = y
        y.left = T2
        y.height = 1 + max(self._height(y.left), self._height(y.right))
        x.height = 1 + max(self._height(x.left), self._height(x.right))
        return x

    def _rotate_left(self, x):
        y = x.right
        T2 = y.left
        y.left = x
        x.right = T2
        x.height = 1 + max(self._height(x.left), self._height(x.right))
        y.height = 1 + max(self._height(y.left), self._height(y.right))
        return y

    def _insert(self, node, key, value):
        if node is None:
            return AVLNode(key, value)
        if key < node.key:
            node.left = self._insert(node.left, key, value)
        else:
            node.right = self._insert(node.right, key, value)

        node.height = 1 + max(self._height(node.left), self._height(node.right))
        bf = self._balance(node)

        if bf > 1 and key < node.left.key:
            return self._rotate_right(node)
        if bf < -1 and key > node.right.key:
            return self._rotate_left(node)
        if bf > 1 and key > node.left.key:
            node.left = self._rotate_left(node.left)
            return self._rotate_right(node)
        if bf < -1 and key < node.right.key:
            node.right = self._rotate_right(node.right)
            return self._rotate_left(node)
        return node

    def insert(self, key, value):
        self.root = self._insert(self.root, int(key), value)

    def _remove_min(self, node):
        if node.left is None:
            return node.right, node
        node.left, removed = self._remove_min(node.left)
        # update height (não fazemos rotações para simplificar - ainda é aceitável para esta aplicação)
        node.height = 1 + max(self._height(node.left), self._height(node.right))
        return node, removed

    def pop_min(self):
        if self.root is None:
            return None
        self.root, removed = self._remove_min(self.root)
        return removed

    def _inorder(self, node, out):
        if not node:
            return
        self._inorder(node.left, out)
        out.append((node.key, node.value))
        self._inorder(node.right, out)

    def inorder(self):
        res = []
        self._inorder(self.root, res)
        return res

# -------------------------
# Sistema de Entrega: cria grafo com estrutura pedida e gerencia AVL
# -------------------------
class SistemaEntrega:
    def __init__(self):
        self.g = Graph()
        self.avl = AVL()
        self._seq = 1
        # Origem será a Rua Central do Centro
        self.origem_node = 'CENTRO_CENTRAL'
        # cria grafo com bairros/ruas/pesos conforme sua especificação
        self._create_city()

    def _create_city(self):
        # NÓS: Centro (3 ruas), SM (2), SP (2), SJ (2), SPD (2)
        # Centro
        self.g.add_node('CENTRO_ESPERANCA', 'Centro - Rua Esperança')
        self.g.add_node('CENTRO_AGUAS', 'Centro - Rua Águas')
        self.g.add_node('CENTRO_CENTRAL', 'Centro - Rua Central (Depósito)')

        # SM (São Mateus)
        self.g.add_node('SM_NOVA', 'SM - Rua Nova')
        self.g.add_node('SM_VITORIA', 'SM - Rua da Vitória')

        # SP (São Pedro)
        self.g.add_node('SP_AZUL', 'SP - Rua Azul')
        self.g.add_node('SP_IPE', 'SP - Rua Ipê')

        # SJ (São Jorge)
        self.g.add_node('SJ_FLORES', 'SJ - Rua das Flores')
        self.g.add_node('SJ_SOL', 'SJ - Rua Sol')

        # SPD (São Pedro Del Rei)
        self.g.add_node('SPD_PALMEIRAS', 'SPD - Rua Palmeiras')
        self.g.add_node('SPD_CEDRO', 'SPD - Rua Cedro')

        # ARESTAS internas (ruas internas do bairro)
        # Centro internas (ligando a rua central às outras ruas do centro)
        self.g.add_edge('CENTRO_CENTRAL', 'CENTRO_ESPERANCA', 1)
        self.g.add_edge('CENTRO_CENTRAL', 'CENTRO_AGUAS', 1)

        # SM: rua interna entre SM_NOVA e SM_VITORIA (usar peso de Vitória = 10)
        self.g.add_edge('SM_NOVA', 'SM_VITORIA', 10)

        # SP: rua interna entre SP_AZUL e SP_IPE (usar peso Ipê = 10)
        self.g.add_edge('SP_AZUL', 'SP_IPE', 10)

        # SJ: rua interna entre SJ_SOL e SJ_FLORES (usar peso Flores = 6)
        self.g.add_edge('SJ_SOL', 'SJ_FLORES', 6)

        # SPD: entre Palmeiras e Cedro (usar peso Cedro = 10)
        self.g.add_edge('SPD_PALMEIRAS', 'SPD_CEDRO', 10)

        # Conexões principais entre bairros conforme sua descrição:
        # Rua Nova conecta SM <-> SP com peso 8
        self.g.add_edge('SM_NOVA', 'SP_AZUL', 8)

        # Rua Campos conecta SJ <-> SPD com peso 1 (você disse peso 1 para Campos)
        self.g.add_edge('SJ_SOL', 'SPD_PALMEIRAS', 1)

        # A Rua Central (no Centro) tem ligação para permitir acesso aos bairros:
        # Ela se liga aos bairros próximos com peso 1 (centro -> pontos de entrada)
        self.g.add_edge('CENTRO_CENTRAL', 'SM_NOVA', 1)   # centro -> SM via Central -> Nova
        self.g.add_edge('CENTRO_CENTRAL', 'SP_AZUL', 1)   # centro -> SP via Central -> Azul (acesso ao SP)
        self.g.add_edge('CENTRO_CENTRAL', 'SJ_SOL', 1)    # centro -> SJ via Central -> Campos
        self.g.add_edge('CENTRO_CENTRAL', 'SPD_PALMEIRAS', 1)  # centro -> SPD via Central -> Campos

        # Observação: com isso tem caminhos como:
        # CENTRO_CENTRAL -> SM_NOVA -> SP_AZUL  (via rua nova)
        # CENTRO_CENTRAL -> SJ_SOL -> SPD_PALMEIRAS (via rua campos)
        # e as ruas internas/ligacoes refletem os pesos que você pediu.

        # Mapeamento bairro -> ruas (para o menu)
        self._bairros = {
            'CENTRO': {
                'Esperanca': 'CENTRO_ESPERANCA',
                'Aguas': 'CENTRO_AGUAS',
                'Central': 'CENTRO_CENTRAL'
            },
            'SM': {
                'Nova': 'SM_NOVA',
                'Vitoria': 'SM_VITORIA'
            },
            'SP': {
                'Azul': 'SP_AZUL',
                'Ipe': 'SP_IPE'
            },
            'SJ': {
                'Flores': 'SJ_FLORES',
                'Sol': 'SJ_SOL'
            },
            'SPD': {
                'Palmeiras': 'SPD_PALMEIRAS',
                'Cedro': 'SPD_CEDRO'
            }
        }

        # Para validações rápidas (chaves em maiúsculo)
        self._rua_map = {}
        for bairro, ruas in self._bairros.items():
            for rua_name, node in ruas.items():
                key = f"{bairro.upper()}::{rua_name.upper()}"
                self._rua_map[key] = node

    def nova_entrega(self, cliente, bairro_choice, rua_choice):
        bairro = bairro_choice.strip().upper()
        rua = rua_choice.strip().upper()
        key = f"{bairro}::{rua}"
        destino_node = self._rua_map.get(key)
        if not destino_node:
            # lista ruas válidas para o bairro
            if bairro not in self._bairros:
                raise ValueError(f"Bairro '{bairro_choice}' inválido. Bairros válidos: {', '.join(self._bairros.keys())}")
            ruas_disp = ', '.join(self._bairros[bairro].keys())
            raise ValueError(f"Rua '{rua_choice}' não encontrada em {bairro_choice}. Ruas válidas: {ruas_disp}")
        seq = self._seq
        self._seq += 1
        pedido = {
            'seq': seq,
            'cliente': cliente,
            'bairro': bairro_choice,
            'rua': rua_choice,
            'destino_node': destino_node,
            'hora': time.time()
        }
        self.avl.insert(seq, pedido)
        rota = self.rota_otima()
        return pedido, rota

    def entregar_proxima(self):
        node = self.avl.pop_min()
        if not node:
            return None
        return node.key, node.value

    def rota_otima(self):
        pend = self.avl.inorder()
        if not pend:
            return [], 0.0
        destinos_nodes = [p[1]['destino_node'] for p in pend]

        atual = self.origem_node
        rota_nodes = [atual]  # nodes sequence (ids)
        restantes = set(destinos_nodes)
        total_distancia = 0.0

        # heurística: nearest neighbor, recalculando Dijkstra a cada passo
        while restantes:
            dist_map, _ = self.g.dijkstra(atual)
            # escolhe destino minimo entre os restantes
            prox_node = min(restantes, key=lambda n: dist_map.get(n, math.inf))
            if dist_map.get(prox_node, math.inf) == math.inf:
                # destino inacessível -> marca e sai
                break
            distancia_segmento, caminho_nodes = self.g.shortest_path(atual, prox_node)
            total_distancia += distancia_segmento
            # concatena caminho sem repetir o nó atual
            if caminho_nodes:
                if len(rota_nodes) > 0 and rota_nodes[-1] == caminho_nodes[0]:
                    rota_nodes.extend(caminho_nodes[1:])
                else:
                    rota_nodes.extend(caminho_nodes)
            atual = prox_node
            restantes.remove(prox_node)

        # converte ids para nomes amigáveis para exibição
        rota_nomes = [self.g.nodes.get(n, n) for n in rota_nodes]
        return rota_nomes, total_distancia

    def listar_pendentes(self):
        return self.avl.inorder()

    def bairros_disponiveis(self):
        return list(self._bairros.keys())

    def ruas_do_bairro(self, bairro_key):
        b = bairro_key.strip().upper()
        if b not in self._bairros:
            return []
        return list(self._bairros[b].keys())

# -------------------------
# INTERFACE (menu)
# -------------------------
def menu():
    s = SistemaEntrega()
    while True:
        print("\n=== SISTEMA DE ENTREGAS — PIZZARIA (origem: Centro - Rua Central) ===")
        print("1) Nova entrega")
        print("2) Entregar próxima (FIFO)")
        print("3) Mostrar rota ótima (Vizinho Mais Próximo)")
        print("4) Listar entregas pendentes")
        print("5) Mostrar grafo (nós e conexões)")
        print("0) Sair")
        op = input("Escolha: ").strip()
        if op == '1':
            cliente = input("Nome do cliente: ").strip()
            # mostra bairros
            bairros = s.bairros_disponiveis()
            print("Bairros disponíveis:")
            for i, b in enumerate(bairros, 1):
                print(f" {i}) {b}")
            bidx = input("Escolha o bairro (número ou nome): ").strip()
            if bidx.isdigit():
                bidx_i = int(bidx) - 1
                if bidx_i < 0 or bidx_i >= len(bairros):
                    print("Bairro inválido.")
                    continue
                bairro_choice = bairros[bidx_i]
            else:
                bairro_choice = bidx.upper()
            ruas = s.ruas_do_bairro(bairro_choice)
            if not ruas:
                print(f"Bairro '{bairro_choice}' inválido.")
                continue
            print("Ruas do bairro:")
            for i, r in enumerate(ruas, 1):
                print(f" {i}) {r}")
            ridx = input("Escolha a rua (número ou nome): ").strip()
            if ridx.isdigit():
                ridx_i = int(ridx) - 1
                if ridx_i < 0 or ridx_i >= len(ruas):
                    print("Rua inválida.")
                    continue
                rua_choice = ruas[ridx_i]
            else:
                rua_choice = ridx
            try:
                pedido, (rota, dist) = s.nova_entrega(cliente, bairro_choice, rua_choice)
                print(f"✅ Entrega adicionada: seq={pedido['seq']} para {pedido['bairro']} - {pedido['rua']}")
                if rota:
                    print(f"📍 Rota recalculada ({dist:.2f} total):")
                    print("   " + "  ->  ".join(rota))
                else:
                    print("📍 Rota vazia (destinos inacessíveis ou não definidos).")
            except Exception as e:
                print(f"❌ Erro: {e}")

        elif op == '2':
            res = s.entregar_proxima()
            if not res:
                print("📦 Nenhuma entrega pendente.")
            else:
                key, pedido = res
                print(f"🍕 ENTREGUE! seq={key} cliente={pedido['cliente']} bairro={pedido['bairro']} rua={pedido['rua']}")

        elif op == '3':
            rota, dist = s.rota_otima()
            if not rota:
                print("📦 Nenhuma entrega pendente.")
            else:
                print(f"🗺️ Rota ótima ({dist:.2f} total):")
                print("   " + "  ->  ".join(rota))

        elif op == '4':
            pend = s.listar_pendentes()
            if not pend:
                print("📦 Sem entregas pendentes.")
            else:
                print("\n--- PEDIDOS PENDENTES (FIFO por seq) ---")
                for k, v in pend:
                    t = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(v['hora']))
                    destino_nome = s.g.nodes.get(v['destino_node'], v['destino_node'])
                    print(f"seq={k} | cliente={v['cliente']} | bairro={v['bairro']} | rua={v['rua']} | destino={destino_nome} | hora={t}")

        elif op == '5':
            print("\nNÓS do grafo:")
            for nid, name in s.g.nodes.items():
                print(f" - {nid}: {name}")
            print("\nARESTAS (adjacências):")
            for nid, adjs in s.g.edges.items():
                for nb, w in adjs:
                    print(f" {nid} -> {nb} (peso {w})")

        elif op == '0':
            print("Saindo...")
            break
        else:
            print("Opção inválida. Tente novamente.")

if __name__ == '__main__':
    menu()
