
function generateDataset() {
  const mainNodes = [
    { id: "Court of Justice", connections: 0 },
    { id: "EUR-Lex", connections: 0 },
    { id: "Swedish Parliament", connections: 0 },
    { id: "Skatteverket", connections: 0 },
    { id: "ESMA", connections: 0 },
    { id: "Domstolsverket", connections: 0 },
    { id: "IMY", connections: 0 },
    { id: "Finansinspektionen", connections: 0 },
    { id: "IUSTUS", connections: 0 },
    { id: "EBA", connections: 0 },
    { id: "Legal Knowledge Base", connections: 0 },
    { id: "Internal Memos", connections: 0 },
    { id: "OneDrive", connections: 0 },
  ];

  const childNodes = [];
  const links = [];

  let nodeId = 1;
  const childPerMain = 5;

  for (const main of mainNodes) {
    for (let i = 0; i < childPerMain; i++) {
      const childId = `Node ${nodeId++}`;
      childNodes.push({ id: childId, connections: 1 });
      links.push({ source: main.id, target: childId });
      main.connections += 1;
    }
  }

  // Random connections between child nodes (not involving main nodes)
  const allChildIds = childNodes.map((n) => n.id);
  for (let i = 0; i < 40; i++) {
    const a = allChildIds[Math.floor(Math.random() * allChildIds.length)];
    let b = allChildIds[Math.floor(Math.random() * allChildIds.length)];
    while (
      a === b ||
      links.find(
        (l) =>
          (l.source === a && l.target === b) ||
          (l.source === b && l.target === a)
      )
    ) {
      b = allChildIds[Math.floor(Math.random() * allChildIds.length)];
    }
    links.push({ source: a, target: b });

    const aNode = childNodes.find((n) => n.id === a);
    const bNode = childNodes.find((n) => n.id === b);
    if (aNode) aNode.connections += 1;
    if (bNode) bNode.connections += 1;
  }

  return {
    nodes: [...mainNodes, ...childNodes],
    links,
  };
}

export const dataset = generateDataset();