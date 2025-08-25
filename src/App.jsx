import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Delaunator from "delaunator";
import { dataset } from "./data";

const useDataset = false;

const totalCoords = 64;

const xPosition = -180; // change to shift left/right
const yPosition = -180; // change to shift up/down
const useRoundNodes = true; // Set to false for square nodes
const nodeSizeScale = 9; // Set scale from 1 to 10
// const colors = ["#000", "#000", "#000"];
const colors = ["#920C00", "#000", "#000792"];

const colWidth = 900 / 3;
const rowHeight = 1200 / 4;

function generateData(totalCoords) {
  const coords = [];
  while (coords.length < totalCoords * 2) {
    const x = Math.floor(Math.random() * 900); // now spans 3 columns
    const y = Math.floor(Math.random() * 1200);

    const inMiddleLeftQuadrants =
      x < colWidth &&
      ((y >= rowHeight && y < rowHeight * 2) ||
        (y >= rowHeight * 2 && y < rowHeight * 3));

    if (!inMiddleLeftQuadrants) {
      coords.push(x, y);
    }
  }

  const delaunay = new Delaunator(coords);

  const nodes = coords.reduce((acc, _, i) => {
    if (i % 2 === 0) acc.push({ id: i / 2, x: coords[i], y: coords[i + 1] });
    return acc;
  }, []);

  return { nodes, delaunay };
}

function generateLinks(nodes, delaunay) {
  const edgeSet = new Set();

  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    const a = delaunay.triangles[i];
    const b = delaunay.triangles[i + 1];
    const c = delaunay.triangles[i + 2];

    [
      [a, b],
      [b, c],
      [c, a],
    ].forEach(([u, v]) => {
      const p1 = nodes[u];
      const p2 = nodes[v];

      // Skip edge if either node lies within the excluded middle-left quadrant
      const topLeft = (x, y) => x < colWidth && y < rowHeight;
      const midTopLeft = (x, y) =>
        x < colWidth && y >= rowHeight && y < rowHeight * 2;
      const midBottomLeft = (x, y) =>
        x < colWidth && y >= rowHeight * 2 && y < rowHeight * 3;
      const bottomLeft = (x, y) => x < colWidth && y >= rowHeight * 3;

      if (
        midTopLeft(p1.x, p1.y) ||
        midTopLeft(p2.x, p2.y) ||
        midBottomLeft(p1.x, p1.y) ||
        midBottomLeft(p2.x, p2.y) ||
        (topLeft(p1.x, p1.y) && bottomLeft(p2.x, p2.y)) ||
        (bottomLeft(p1.x, p1.y) && topLeft(p2.x, p2.y))
      ) {
        return;
      }

      const key = u < v ? `${u}-${v}` : `${v}-${u}`;
      edgeSet.add(key);
    });
  }

  const links = Array.from(edgeSet).map((key) => {
    const [source, target] = key.split("-").map(Number);
    return { source, target };
  });

  return links;
}

let nodes, links;

if (useDataset) {
  nodes = dataset.nodes;
  links = dataset.links;
} else {
  const generated = generateData(totalCoords);
  nodes = generated.nodes;
  links = generateLinks(nodes, generated.delaunay);
}

// Compute connection count for each node
const connectionMap = new Map();
links.forEach(({ source, target }) => {
  connectionMap.set(source, (connectionMap.get(source) || 0) + 1);
  connectionMap.set(target, (connectionMap.get(target) || 0) + 1);
});
nodes.forEach((node) => {
  node.connections = connectionMap.get(node.id) || 0;
});

// Identify top connected nodes and assign them a color
const topNodes = [...nodes]
  .sort((a, b) => b.connections - a.connections)
  .slice(0, 10);
const topNodeIds = new Set(topNodes.map((n) => n.id));
topNodes.forEach((node, i) => {
  node.color = colors[i % colors.length];
});

// Assign the same color to nodes directly connected to the top nodes
links.forEach(({ source, target }) => {
  if (topNodeIds.has(source)) {
    const color = nodes.find((n) => n.id === source).color;
    nodes.find((n) => n.id === target).color ||= color;
  }
  if (topNodeIds.has(target)) {
    const color = nodes.find((n) => n.id === target).color;
    nodes.find((n) => n.id === source).color ||= color;
  }
});

function App() {
  const svgRef = useRef(null);
  const allowGraphOverflow = true;
  const canvasBackgroundColor = "white";

  const [importData, setImportData] = useState("");
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const currentNodes = graphData?.nodes || nodes;
    const currentLinks = graphData?.links || links;

    const g = svg
      .append("g")
      .attr("transform", `translate(${xPosition}, ${yPosition})`);

    const link = g
      .selectAll("line")
      .data(currentLinks)
      .enter()
      .append("line")
      .attr("x1", (d) => currentNodes[d.source].x)
      .attr("y1", (d) => currentNodes[d.source].y)
      .attr("x2", (d) => currentNodes[d.target].x)
      .attr("y2", (d) => currentNodes[d.target].y)
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", () => {
        return Math.random() < 0.5 ? 0.1 : 0.04;
      });

    // Outer stroke rectangles or circles
    g.selectAll("outerStroke")
      .data(currentNodes)
      .enter()
      .append(useRoundNodes ? "circle" : "rect")
      .attr("r", (d) =>
        useRoundNodes ? Math.max(2, (d.connections / 2) * (nodeSizeScale / 5)) + 3 : null
      )
      .attr("cx", (d) => (useRoundNodes ? d.x : null))
      .attr("cy", (d) => (useRoundNodes ? d.y : null))
      .attr("width", (d) =>
        useRoundNodes ? null : Math.max(4, d.connections * (nodeSizeScale / 5)) + 6
      )
      .attr("height", (d) =>
        useRoundNodes ? null : Math.max(4, d.connections * (nodeSizeScale / 5)) + 6
      )
      .attr("x", (d) =>
        useRoundNodes ? null : d.x - Math.max(2, d.connections / 2) - 3
      )
      .attr("y", (d) =>
        useRoundNodes ? null : d.y - Math.max(2, d.connections / 2) - 3
      )
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const hasStroke = colors.includes(d.color) && Math.random() < 0.2;
        d.hasStroke = hasStroke;
        return hasStroke ? d.color : "none";
      })
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 1);

    // White inner stroke rectangles or circles
    g.selectAll("whiteStroke")
      .data(currentNodes)
      .enter()
      .append(useRoundNodes ? "circle" : "rect")
      .attr("r", (d) =>
        useRoundNodes ? Math.max(2, (d.connections / 2) * (nodeSizeScale / 5)) + 1 : null
      )
      .attr("cx", (d) => (useRoundNodes ? d.x : null))
      .attr("cy", (d) => (useRoundNodes ? d.y : null))
      .attr("width", (d) =>
        useRoundNodes ? null : Math.max(4, d.connections * (nodeSizeScale / 5)) + 2
      )
      .attr("height", (d) =>
        useRoundNodes ? null : Math.max(4, d.connections * (nodeSizeScale / 5)) + 2
      )
      .attr("x", (d) =>
        useRoundNodes ? null : d.x - Math.max(2, d.connections / 2) - 1
      )
      .attr("y", (d) =>
        useRoundNodes ? null : d.y - Math.max(2, d.connections / 2) - 1
      )
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.5);

    const node = g
      .selectAll("fillRect")
      .data(currentNodes)
      .enter()
      .append(useRoundNodes ? "circle" : "rect")
      .attr("r", (d) => (useRoundNodes ? Math.max(2, (d.connections / 2) * (nodeSizeScale / 5)) : null))
      .attr("cx", (d) => (useRoundNodes ? d.x : null))
      .attr("cy", (d) => (useRoundNodes ? d.y : null))
      .attr("width", (d) => (useRoundNodes ? null : Math.max(4, d.connections * (nodeSizeScale / 5))))
      .attr("height", (d) => (useRoundNodes ? null : Math.max(4, d.connections * (nodeSizeScale / 5))))
      .attr("x", (d) => (useRoundNodes ? null : d.x - Math.max(2, d.connections / 2)))
      .attr("y", (d) => (useRoundNodes ? null : d.y - Math.max(2, d.connections / 2)))
      .attr("fill", (d) => (colors.includes(d.color) ? d.color : "#000"))
      .attr("fill-opacity", (d) => Math.min(1, 0.2 + d.connections / 5));

    const exportData = {
      nodes: currentNodes.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        connections: n.connections,
        color: n.color || "#000",
        fillOpacity: Math.min(1, 0.2 + n.connections / 5),
        hasStroke: n.hasStroke || false,
      })),
      links: d3.select(svgRef.current)
        .selectAll("line")
        .nodes()
        .map((lineEl, i) => ({
          source: currentLinks[i].source,
          target: currentLinks[i].target,
          opacity: parseFloat(d3.select(lineEl).attr("stroke-opacity")),
        })),
    };

    if (!graphData) {
      window.__graphData__ = exportData;
      setGraphData(exportData);
    }
  }, [graphData]);

  return (
    <>
      <style>
        {`
        @media (max-width: 768px) {
          .hero-grid {
            display: flex !important;
            flex-direction: column !important;
            overflow: visible !important;
          }
        }
        `}
      </style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          width: "100%",
          minHeight: "80vh",
          gap: "1rem",
          padding: "0 2rem",
          boxSizing: "border-box",
        }}
        className="hero-grid"
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: "100%",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <h1
            style={{
              fontSize: "3.8rem",
              lineHeight: "1.2",
              fontWeight: "normal",
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: "#000" }}>Access All Legal Data</span>
            <br />
            <span style={{ color: "rgba(0, 0, 0, 0.3)" }}>
              in One Unified Platform
            </span>
          </h1>
          <p style={{ marginTop: "0", fontSize: "1.25rem", color: "#444" }}>
            Access all legal data in one unified platform.{" "}
            <span style={{ color: "rgba(0, 0, 0, 0.5)" }}>
              Qura covers 1000+ data sources including case law, legislation,
              regulations, news, books, journals and connects your firm’s
              internal knowledge.
            </span>
          </p>
          <button
            onClick={() => {
              const text = JSON.stringify(window.__graphData__, null, 2);
              navigator.clipboard.writeText(text).then(() => {
                alert("Graph data copied to clipboard!");
              });
            }}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontFamily: "Helvetica, Arial, sans-serif",
              color: "#000",
              background: "transparent",
              border: "1px solid #000",
              borderRadius: "9999px",
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            Copy Node Positions
          </button>
          {/* <textarea
            placeholder="Paste graph JSON here"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            style={{
              marginTop: "1rem",
              width: "14ch",
              height: "30px",
              fontFamily: "monospace",
              fontSize: "0.8rem",
              padding: "0.25rem",
              border: "1px solid #ccc",
              backgroundColor: "white",
            }}
          /> */}
          {/* <button
            onClick={() => {
              try {
                const parsed = JSON.parse(importData);
                setGraphData(parsed);
                alert("Graph imported successfully!");
              } catch (e) {
                alert("Invalid JSON");
              }
            }}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontFamily: "Helvetica, Arial, sans-serif",
              color: "#000",
              background: "transparent",
              border: "1px solid #000",
              borderRadius: "9999px",
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            Import Graph
          </button> */}
        </div>
        <div
          style={{
            flex: 1,
            padding: "0rem 0",
            borderRadius: "0px",
            overflow: allowGraphOverflow ? "visible" : "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: canvasBackgroundColor,
            // backgroundColor: "red",
            height: "100%",
            alignSelf: "stretch",
          }}
        >
          <svg
            ref={svgRef}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              overflow: "visible",
              // backgroundColor: "red",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          />
        </div>
      </div>
    </>
  );
}

export default App;
