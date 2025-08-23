
function generateDataset() {
  const nodeCount = 120;
  const nodes = [];
  const links = [];

  // Generate random nodes with id and connection count
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `Node ${i}`,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
      connections: 0,
    });
  }

  // Connect each node to its 3 nearest neighbors to form a cohesive mesh
  for (let i = 0; i < nodes.length; i++) {
    const source = nodes[i];
    const distances = nodes
      .map((target, j) => {
        if (i === j) return null;
        const dx = source.x - target.x;
        const dy = source.y - target.y;
        return {
          index: j,
          dist: Math.sqrt(dx * dx + dy * dy),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    for (const { index } of distances) {
      const target = nodes[index];
      // Avoid duplicate links
      if (
        !links.find(
          (l) =>
            (l.source === source.id && l.target === target.id) ||
            (l.source === target.id && l.target === source.id)
        )
      ) {
        links.push({ source: source.id, target: target.id });
        source.connections += 1;
        target.connections += 1;
      }
    }
  }

  return { nodes, links };
}

export const dataset = generateDataset();