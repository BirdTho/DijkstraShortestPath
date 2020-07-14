const graph = [
    [ 0, 4, 0, 0, 0, 0, 0, 8, 0 ],
    [ 4, 0, 8, 0, 0, 0, 0, 11, 0 ],
    [ 0, 8, 0, 7, 0, 4, 0, 0, 2 ],
    [ 0, 0, 7, 0, 9, 14, 0, 0, 0 ],
    [ 0, 0, 0, 9, 0, 10, 0, 0, 0 ],
    [ 0, 0, 4, 14, 10, 0, 2, 0, 0 ],
    [ 0, 0, 0, 0, 0, 2, 0, 1, 6 ],
    [ 8, 11, 0, 0, 0, 0, 1, 0, 7 ],
    [ 0, 0, 2, 0, 0, 0, 6, 7, 0 ]
];

class MSTNode {
    vertex = null;

    /**
     * @type {MSTNode | null}
     */
    parent = null;

    cost = Number.MAX_VALUE;
    constructor(vertex) {
        this.vertex = vertex;
    }

    toString() {
        let roundedCost = this.cost;
        roundedCost = Math.round(roundedCost * 100.0) / 100.0;
        return `v: ${this.vertex} p: ${this.parent || this.parent.vertex} c: ${roundedCost}`;
    }
}

class MST {
    /**
     * @type {MSTNode[]}
     */
    lookup = [];

    constructor(length, startNode) {
        for (let i = 0; i < length; ++i) {
            this.addNode(i);
        }

        this.lookup[startNode].cost = 0;
    }

    addNode(vertex) {
        if (this.lookup[vertex]) {
            throw new Error(`MSTNode at vertex [${vertex}] already exists`)
        }

        this.lookup[vertex] = new MSTNode(vertex);
    }
}

function timeout(delay) {
    return new Promise((res) => {setTimeout(res, delay);});
}

/**
 * @param lookup {Array<MSTNode>}
 * @param visited {Array<number>}
 * @return {number}
 */
function findShortestPathNode(lookup, visited) {
    let cheapestDest = -1;
    let cheapestCost = Number.MAX_VALUE;

    for (let i = 0; i < visited.length; ++i) {
        if (!visited[i]) {
            let thisCost = lookup[i].cost;
            if (thisCost < cheapestCost) {
                cheapestCost = thisCost;
                cheapestDest = i;
            }
        }
    }

    return cheapestDest;
}

/**
 * @param lookup {Array<MSTNode>}
 */
function printSolution(lookup) {
    console.log("Vertex \t\t Distance from Source\n");
    for (let i = 0; i < lookup.length; i++)
        console.log(i + " \t\t " + lookup[i].cost + "\n");
}

/**
 *
 * @param graph {Array<Array<number>>}
 * @param startNode {number}
 * @param svgGraph {D3Graph}
 * @return {Promise<void>}
 */
async function dijkstra(graph, startNode, svgGraph) {
    const length = graph.length;
    const mst = new MST(length, startNode);
    // Mark start node and costs

    const lookup = mst.lookup;

    svgGraph.setNodeCost(startNode, lookup[startNode].cost);

    let remaining = length;

    const visited = (new Array(length)).fill(false);

    let currCost;
    let index;

    while (remaining) {
        index = findShortestPathNode(lookup, visited);
        currCost = lookup[index].cost;
        visited[index] = true;

        // Mark visited
        await timeout(1000);
        svgGraph.setNodeFillColor(index, 'pink');

        // Solidify edge to parent
        if (lookup[index].parent) {
            let b = lookup[index].parent.vertex;

            await timeout(500);
            svgGraph.setEdgeStrokeColor(index, b, 'darkgreen');
        }

        for (let i = 0; i < length; ++i) {
            let hopCost = graph[index][i];
            // Set evaluating node color
            if (index !== i && hopCost > 0 && hopCost + currCost < lookup[i].cost) {
                // set evaluation circle on vertex
                svgGraph.setNodeFillColor(i, 'green');


                lookup[i].cost = currCost + graph[index][i];
                svgGraph.setNodeCost(i, lookup[i].cost);

                // set graph cost
                lookup[i].parent = lookup[index];

                // Set speculative parent edge
                await timeout(500);
                svgGraph.setEdgeStrokeColor(index, i, 'lightblue');

                // unset evaluation circle on vertex
                svgGraph.setNodeFillColor(i, 'lightblue');

            }
        }

        --remaining;
    }
}

const svgGraph = new D3Graph(graph, document.getElementById('container'));


dijkstra(graph, 0, svgGraph).then(() => {});
