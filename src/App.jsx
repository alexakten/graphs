import { useEffect, useRef } from "react";
import { dataset } from "./data";
import * as d3 from "d3";
import * as cola from "webcola";

const zoomLevel = 100; // Percentage between 0 and 100
const spacing = 240;
const useSquares = true;
const colorConnectedNodes = true;
const colors = ["#920C00", "#7977FF", "#000792"];

const allowGraphOverflow = true;

// const canvasBackgroundColor = "#f5f5f5";
const canvasBackgroundColor = "#fff";

function App() {
  const svgRef = useRef();

  useEffect(() => {
    const { nodes, links: originalLinks } = dataset;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    // Map links to use node objects instead of ids
    let links = originalLinks.map((l) => ({
      source: nodes.find((n) => n.id === l.source),
      target: nodes.find((n) => n.id === l.target),
    }));

    // --- Ensure each node has at least 2 connections ---
    // Build a map of node id to node object for fast lookup
    const nodeMap = {};
    nodes.forEach((n) => {
      nodeMap[n.id] = n;
    });
    // Build a map of node id to set of connected node ids
    const connectionMap = {};
    nodes.forEach((n) => {
      connectionMap[n.id] = new Set();
    });
    links.forEach((l) => {
      connectionMap[l.source.id].add(l.target.id);
      connectionMap[l.target.id].add(l.source.id);
    });
    // For each node, if it has < 2 connections, add links to random other nodes (no self, no dup)
    nodes.forEach((n) => {
      while (connectionMap[n.id].size < 2) {
        // Get possible targets: not self, not already connected
        const possibleTargets = nodes.filter(
          (other) => other.id !== n.id && !connectionMap[n.id].has(other.id)
        );
        if (possibleTargets.length === 0) break; // fully connected
        // Pick a random target
        const target =
          possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        // Add a new link
        links.push({ source: n, target: target });
        connectionMap[n.id].add(target.id);
        connectionMap[target.id].add(n.id);
      }
    });

    nodes.forEach((n) => {
      if (typeof n.x !== "number" || Number.isNaN(n.x))
        n.x = Math.random() * width;
      if (typeof n.y !== "number" || Number.isNaN(n.y))
        n.y = Math.random() * height;
      // Update connections count for node
      n.connections = connectionMap[n.id].size || 1;
    });

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("max-width", "100%")
      .style("height", "auto");

    const container = svg.append("g");
    container.style("opacity", 0);

    // Auto-fit & center the graph inside the SVG
    const pad = 20; // inner padding inside the column
    function fitToCenter() {
      const xs = nodes.map((n) => n.x);
      const ys = nodes.map((n) => n.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const gW = maxX - minX || 1;
      const gH = maxY - minY || 1;

      const scale =
        Math.min((width * 0.95) / gW, (height * 0.95) / gH) * (zoomLevel / 100);

      const graphCenterX = (minX + maxX) / 2;
      const graphCenterY = (minY + maxY) / 2;

      const canvasCenterX = width / 2;
      const canvasCenterY = height / 2;

      const tx = canvasCenterX - scale * graphCenterX;
      const ty = canvasCenterY - scale * graphCenterY;

      container.attr("transform", `translate(${tx},${ty}) scale(${scale})`);
    }
    fitToCenter();
    container.transition().duration(0).style("opacity", 1);

    // Initialize WebCoLa layout
    const d3cola = cola
      .d3adaptor(d3)
      .size([width, height])
      .nodes(nodes)
      .links(links)
      .linkDistance(spacing)
      .avoidOverlaps(true)
      .symmetricDiffLinkLengths(5)
      .start(1, 1, 1);

    const link = container
      .append("g")
      .attr("stroke", "rgba(0, 0, 0, 0.2)")
      .attr("stroke-opacity", 1)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 0.5);

    const topNodes = [...nodes]
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 12);

    topNodes.forEach((node, i) => {
      node.color = colors[i % colors.length];
    });

    if (colorConnectedNodes) {
      const topNodeIds = new Set(topNodes.map((n) => n.id));

      const connectedToTop = new Set();
      links.forEach(({ source, target }) => {
        if (topNodeIds.has(source.id)) connectedToTop.add(target.id);
        if (topNodeIds.has(target.id)) connectedToTop.add(source.id);
      });

      nodes.forEach((n) => {
        if (!topNodeIds.has(n.id) && connectedToTop.has(n.id)) {
          for (const top of topNodes) {
            if (
              links.find(
                (l) =>
                  (l.source.id === n.id && l.target.id === top.id) ||
                  (l.target.id === n.id && l.source.id === top.id)
              )
            ) {
              n.color = top.color;
              break;
            }
          }
        }
      });
    }

    const node = container
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .selectAll(useSquares ? "rect" : "circle")
      .data(nodes)
      .join(useSquares ? "rect" : "circle")
      .style("pointer-events", "all")
      .attr(
        "r",
        useSquares ? null : (d) => Math.min(12, Math.pow(d.connections, 0.7))
      )
      .attr(
        "width",
        useSquares
          ? (d) => Math.min(12, Math.pow(d.connections, 0.7)) * 2
          : null
      )
      .attr(
        "height",
        useSquares
          ? (d) => Math.min(12, Math.pow(d.connections, 0.7)) * 2
          : null
      )
      .attr(
        "x",
        useSquares ? (d) => -Math.min(12, Math.pow(d.connections, 0.7)) : null
      )
      .attr(
        "y",
        useSquares ? (d) => -Math.min(12, Math.pow(d.connections, 0.7)) : null
      )
      .attr("fill", (d) => d.color || "#000")
      .style("opacity", 1);

    d3cola.on("tick", () => {
      if (useSquares) {
        node
          .attr("x", (d) => d.x - Math.min(12, Math.pow(d.connections, 0.7)))
          .attr("y", (d) => d.y - Math.min(12, Math.pow(d.connections, 0.7)));
      } else {
        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      }
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      // logos.attr("x", (d) => d.x - 20).attr("y", (d) => d.y - 40);
      // persistentLogos
      //   .attr("x", (d) => d.x - logoSize / 2)
      //   .attr("y", (d) => d.y - logoSize - 12);
    });

    /*
    svg.call(
      d3
        .zoom()
        .filter((event) => {
          // Disable zoom on drag or when clicking a node
          return !event.target.closest("circle");
        })
        .scaleExtent([0.1, 5])
        .on("zoom", (event) => {
          container.attr("transform", event.transform);
        })
    );
    */

    return () => d3cola.stop();
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
            }}
          />
        </div>
      </div>
    </>
  );
}

export default App;
