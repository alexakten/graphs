import { useEffect, useRef } from "react";
import * as d3 from "d3";
import Delaunator from "delaunator";

const coords = [
  ...Array.from({ length: 80 }, () => [
    Math.floor(Math.random() * 500) + 10,
    Math.floor(Math.random() * 500) + 100,
  ]),
  ...Array.from({ length: 20 }, () => [
    Math.floor(Math.random() * 620) + 10,
    Math.floor(Math.random() * 620) + 100,
  ]),
].flat();

const delaunay = new Delaunator(coords);

const nodes = coords.reduce((acc, _, i) => {
  if (i % 2 === 0) acc.push({ id: i / 2, x: coords[i], y: coords[i + 1] });
  return acc;
}, []);

const edgeSet = new Set();
for (let i = 0; i < delaunay.triangles.length; i += 3) {
  const a = delaunay.triangles[i];
  const b = delaunay.triangles[i + 1];
  const c = delaunay.triangles[i + 2];
  [[a, b], [b, c], [c, a]].forEach(([u, v]) => {
    const key = u < v ? `${u}-${v}` : `${v}-${u}`;
    edgeSet.add(key);
  });
}

const links = Array.from(edgeSet).map((key) => {
  const [source, target] = key.split("-").map(Number);
  return { source, target };
});

// Color palette for top nodes
const colors = ["#920C00", "#7977FF", "#000792"];

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
const topNodes = [...nodes].sort((a, b) => b.connections - a.connections).slice(0, 10);
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

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const link = svg
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("x1", (d) => nodes[d.source].x)
      .attr("y1", (d) => nodes[d.source].y)
      .attr("x2", (d) => nodes[d.target].x)
      .attr("y2", (d) => nodes[d.target].y)
      .attr("stroke", "#e7e7e7")
      .attr("stroke-width", 1);

    const node = svg
      .selectAll("rect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("width", (d) => Math.max(4, d.connections)) // Size based on connections
      .attr("height", (d) => Math.max(4, d.connections))
      .attr("x", (d) => d.x - Math.max(2, d.connections / 2))
      .attr("y", (d) => d.y - Math.max(2, d.connections / 2))
      .attr("fill", (d) => (colors.includes(d.color) ? d.color : "#000"))
      .attr("stroke", "white")
      .attr("stroke-width", 1);
  }, []);

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
            Book Demo
          </button>
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
