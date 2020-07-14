
function triangularArray(len, fn) {
    for (let i = 0; i < len - 1; ++i) {
        for (let j = i + 1; j < len; ++j) {
            fn(i, j);
        }
    }
}
//
// function deepCopy(arr) {
//     let out = new Array(arr.length);
//     for (let i = 0; i < arr.length; ++i) {
//         out[i] = Array.isArray(arr[i]) ? arr[i].slice() : arr[i];
//     }
//     return out;
// }

function iterateNested(arr, cb) {
    let iter = 0;
    for (let i = 0; i < arr.length; ++i) {
        let el = arr[i];
        if (Array.isArray(el)) {
            for (let j = 0; j < el.length; ++j) {
                cb(el[j], iter);
                ++iter
            }
        } else {
            cb(el, iter);
            ++iter
        }
    }
}

function chainifyNodes(nextNodes, graph) {
    if (nextNodes.length === 1) {
        return nextNodes.slice();
    }

    let outNodes = [];
    let theseNodes = nextNodes.slice();

    // Pick all nodes that don't have links
    for (let i = theseNodes.length - 1; i >= 0; --i) {
        // Check for links
        let node = theseNodes[i];
        let isAlone = true;

        let subArr = theseNodes.slice()
        subArr.splice(i, 1);

        // works if theseNodes.length is 0
        for (let j = 0; j < subArr.length; ++j) {
            if (graph[node][subArr[j]] > 0) {
                isAlone = false;
                break;
            }
        }

        if (isAlone) {
            // Remove the node from the list
            theseNodes.splice(i, 1);

            outNodes.push(node);
        }
    }

    // outnodes should be all the non-chained nodes now.
    // theseNodes should be all the chained nodes

    while (theseNodes.length) {
        // Nodes we actually traversed
        let walked = {};

        // Nodes we observed connections to within theseNodes, connected to walked
        let seen = {};

        let lastChainedNodes = [theseNodes[0]];
        let chainedNodes;
        let breakLoop = false;
        let node;

        // find end of chain
        do {
            chainedNodes = [];

            // pick an end of the chain to walk.
            node = null;

            // Find a node in the chain which is not walked yet
            for (let i = 0; i < lastChainedNodes.length; ++i) {
                let maybeNode = lastChainedNodes[i];
                if (typeof walked[maybeNode] !== 'number') {
                    node = maybeNode;
                    break;
                }
            }

            // We've walked around a loop. Bail
            if (node === null) {
                // Put all seen nodes in array and remove from theseNodes.
                // Seen nodes are all related nodes that we may have not visited.
                let values = Object.values(seen);
                outNodes.push(values);
                values.forEach(walker => theseNodes.splice(theseNodes.indexOf(walker), 1));
                breakLoop = true;
                break;
            }

            // otherwise node is a valid walking direction

            walked[node] = node;
            seen[node] = node;

            for (let i = 0; i < theseNodes.length; ++i) {
                let otherNode = theseNodes[i];

                // If the otherNode === node and graph[node][otherNode] > 0 then
                // node has a loop to itself, but this shouldn't happen.
                if (otherNode !== node && graph[node][otherNode] > 0) {
                    chainedNodes.push(otherNode);
                    seen[otherNode] = otherNode;
                }
            }

            lastChainedNodes = chainedNodes.slice();
        } while (chainedNodes.length > 1);

        if (!breakLoop) {
            // walk back chain to the beginning
            // 'node' should be one end of the chain.
            let chain = [node];
            theseNodes.splice(theseNodes.indexOf(node), 1);
            do {
                // Add to chain

                // Find next chain
                node = lastChainedNodes[0];
                chain.push(node);

                theseNodes.splice(theseNodes.indexOf(node), 1);

                chainedNodes = [];
                for (let i = 0; i < theseNodes.length; ++i) {
                    let otherNode = theseNodes[i];
                    if (graph[node][otherNode] > 0) {
                        chainedNodes.push(theseNodes[i]);
                    }
                }

                lastChainedNodes = chainedNodes.slice();
                // chainedNodes should be 1 or 0
            } while (chainedNodes.length)

            outNodes.push(chain);
        }
    }

    return outNodes;
}

function getNumberOfIntersections(nodes, edges) {
    let count = 0;
    const len = edges.length;
    triangularArray((i, j) => {
        if (doIntersect(nodes, edges[i][0], edges[i][1], edges[j][0], edges[j][1])) count++;
    });

    return count;
}

function getNextNodes(graph, visited) {
    let newList = {};

    triangularArray(visited.length, (i, j) => {
        if (visited[i]) return;
        if (graph[i][j] !== 0 && !visited[j]) newList[j] = j;
    });

    return Object.values(newList);
}

/**
 * @param {Array<Array<number>>} graph
 * @param {Array<number>} colA - Nodes in the previous column
 * @param {Array<number>} colB - nodes in the new column
 * @return {Array<[{x: number, y: number}, {x: number, y: number}]>}
 */
function getEdges(graph, colA, colB) {
    let edges = [];
    for (let i = 0; i < colA.length; ++i) {
        for (let j = 0; j < colB.length; ++j) {
            if (graph[colA[i]][colB[j]] > 0) {
                edges.push([colA[i], colB[j]]);
            }
        }
    }

    return edges;
}

class D3Graph {
    links = [];
    nodes = [];
    simulation = null;
    height = 600;
    width = 600;

    /**
     * @type {Selection}
     */
    node;

    /**
     * @type {Selection}
     */
    link;

    /**
     * @type {Selection}
     */
    linkText;

    /**
     * @type {Selection}
     */
    text;

    svg;

    constructor(graph, rootEl) {
        this.rootEl = rootEl;

        const nodes = (new Array(graph.length)).fill(0).map((val, index) => { return { id: index, cost: '∞' }; });

        let links = [];
        triangularArray(graph.length, (i, j) => {
            if (graph[i][j] > 0) links.push({ source: i, target: j, value: graph[i][j] });
        });

        let step = 30;
        let snap = 5;
        let x = this.width / 2 - Math.sqrt(step * nodes.length);
        let y = this.height / 2 - Math.sqrt(step * nodes.length);

        let visited = (new Array(nodes.length)).fill(false);

        let lastNodes = [];
        let currentEdges = [];

        let nextNodes = [0];

        while (nextNodes.length) {
            lastNodes = nextNodes.slice();
            
            // Organize nodes into chain
            let permutableNodes = chainifyNodes(nextNodes, graph);

            for (let i = 0; i < nextNodes.length; ++i) {
                let thisNode = nodes[nextNodes[i]];
                thisNode.x = x;
                visited[nextNodes[i]] = true;
            }


            if (lastNodes.length > 1) {
                currentEdges = getEdges(graph, lastNodes, nextNodes);

                let minIntersections = Number.MAX_SAFE_INTEGER;

                // Permutate the arrays to find minimum intersections
                let permutations = doPermute(permutableNodes);

                let bestPermutation = null;

                for (let i = 0; i < permutations.length && minIntersections !== 0; ++i) {
                    let permutation = permutations[i];
                    iterateNested(permutation, (node, i) => { nodes[node].y = y + i * step; });

                    // Calculate current intersections
                    let theseIntersections = getNumberOfIntersections(nodes, currentEdges);
                    if (theseIntersections < minIntersections) {
                        minIntersections = theseIntersections;
                        bestPermutation = permutation;
                    }
                }

                // flatten permutations back to nextNodes
                // Write out final Y-values
                iterateNested(bestPermutation, (val, i) => { nextNodes[i] = val; nodes[val].y = y + i * step; });
            }

            x += step;

            lastNodes = nextNodes;
            nextNodes = getNextNodes(graph, visited);
        }

        this.nodes = nodes;
        this.links = links;

        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(function(d) {return d.id;}))
            .force('collide', d3.forceCollide())
            .force('charge', d3.forceManyBody())
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));

        this.simulation.force('link')
            .id(function(d) {return d.id;})
            .distance(d => 60)
            .iterations(2)
            .links(links);

        this.simulation.force('collide')
            .strength(0.5)
            .radius(60)
            .iterations(2);

        this.simulation.force('charge')
            .strength(-100)
            .distanceMin(120)
            .distanceMax(300);

        this.svg = d3.create('svg')
            .attr('viewBox', [0, 0, this.width, this.height]);

        this.link = this.svg.append('g')
            .attr('stroke-width', '4')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', 'lightgrey');

        this.linkText = this.svg.append('g');

        this.linkText.selectAll('text')
            .data(links)
            .join('text')
            .attr('width', '0')
            .attr('font-family', 'monospace')
            .attr('font-size', '22px')
            .attr('fill', 'black')
            .attr('dy', '6')
            .attr('text-anchor', 'middle')
            .text((d) => {
                return `${d.value}`
            });

        this.node = this.svg.append('g')
            .attr('stroke', '#000')
            .attr('stroke-width', 1)
            .attr('fill', 'white')

        this.node.selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('r', 30)
            .append('title')
            .text(d => 'n' + d.id);

        this.text = this.svg.append('g');

        this.text.selectAll('text')
            .data(nodes)
            .join('text')
            .attr('width', '0')
            .attr('font-family', 'monospace')
            .attr('font-size', '22px')
            .attr('fill', 'black')
            .attr('text-anchor', 'middle');

        this.text.selectAll('text')
            .append('tspan')
            .text((d) => {
                return `n${d.id}`
            })
            .attr('dx', '0')
            .attr('dy', '-4');

        this.text.selectAll('text')
            .append('tspan')
            .attr('dx', (d) => {
                let idStringLen = 1 +  d.id.toString().length
                return ((idStringLen - d.cost.length) * 0.5 - idStringLen) * 12.11
            })
            .attr('dy', '22')
            .text((d) => {
                return d.cost;
            });

        this.simulation.on('tick', () => {
            this.link
                .attr('x1', d => Math.round(d.source.x / snap) * snap)
                .attr('y1', d => Math.round(d.source.y / snap) * snap)
                .attr('x2', d => Math.round(d.target.x / snap) * snap)
                .attr('y2', d => Math.round(d.target.y / snap) * snap);

            this.linkText.selectAll('text').attr('x', d => (Math.round(d.source.x / snap) + Math.round(d.target.x / snap)) * snap / 2)
                .attr('y', d => (Math.round(d.source.y / snap) + Math.round(d.target.y / snap)) * snap / 2);

            this.node.selectAll('circle').attr('cx', d => Math.round(d.x / snap) * snap)
                .attr('cy', d => Math.round(d.y / snap) * snap);

            this.text.selectAll('text').attr('x', d => Math.round(d.x / snap) * snap)
                .attr('y', d => Math.round(d.y / snap) * snap);
        });

        this.svgElement = this.svg.node();

        this.rootEl.style.width = this.width + 'px';
        this.rootEl.style.height = this.height + 'px';

        this.rootEl.appendChild(this.svgElement);
    }

    /**
     * @param {number} index
     * @param {string} color
     */
    setNodeFillColor(index, color) {
        this.node
            .selectAll('circle')
            .filter(t => t.id === index)
            .attr('fill', color)
    }

    /**
     * @param {number} index
     * @param {number} cost
     */
    setNodeCost(index, cost) {
        this.nodes[index].cost = cost.toFixed();
        this.text
            .selectAll('text').selectAll('tspan:nth-child(2)')
            .filter(function (d) {
                return d.id === index;
            })
            .attr('dx', (d) => {
                let idStringLen = 1 +  d.id.toString().length
                return ((idStringLen - d.cost.length) * 0.5 - idStringLen) * 12.11;
            })
            .text((d) => {
                return d.cost;
            });

        this.text
            .selectAll('text').selectAll('tspan:nth-child(1)')
            .filter(function (d) {
                return d.id === index;
            })
            .attr('dx', (d) => {
                const idLength = 1 + d.id.toString().length;
                const maxLength = Math.max(idLength, d.cost.length);
                return ((maxLength - idLength) * 0.25) * 12.11;
            });
    }

    /**
     *
     * @param {number} a
     * @param {number} b
     * @param {string} color
     */
    setEdgeStrokeColor(a, b, color) {
        this.link
            .filter(l => {
                return ((l.source.id === a && l.target.id === b) ||
                    (l.source.id === b && l.target.id === a));
            })
            .attr('stroke', color)
            .attr('stroke-width', '8');
    }

    enableClicks
}

