import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Delaunay } from "d3-delaunay";

const nodeCount = 120;
const zoomLevel = 80; // Percentage between 0 and 100
const spacing = 240;
const useSquares = true;
const colorConnectedNodes = true;
const logoSize = 0;
const showLogosOnHover = false;
const enableHoverEffect = false;
const enableMouseGravity = true;

const allowGraphOverflow = true;

// const canvasBackgroundColor = "#f5f5f5";
const canvasBackgroundColor = "#fff";

function generateData(nodeCount) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `Node ${i}`,
    x: Math.random() * 800 - 400,
    y: Math.random() * 600 - 300,
  }));

  const links = [];
  const maxConnections = 4;

  nodes.forEach((source, i) => {
    const numConnections = Math.floor(Math.random() * (maxConnections + 1));
    const potentialTargets = nodes.filter((_, j) => j !== i);
    const shuffled = potentialTargets.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numConnections);
    selected.forEach((target) => {
      links.push({ source: source.id, target: target.id });
    });
  });

  // Count connections per node
  const connectionCount = {};
  links.forEach(({ source, target }) => {
    connectionCount[source] = (connectionCount[source] || 0) + 1;
    connectionCount[target] = (connectionCount[target] || 0) + 1;
  });

  nodes.forEach((node) => {
    node.connections = connectionCount[node.id] || 1;
  });

  return { nodes, links };
}

function App() {
  const svgRef = useRef();

  useEffect(() => {
    const { nodes, links } = generateData(nodeCount);

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [
        (-width * (zoomLevel / 100)) / 2,
        (-height * (zoomLevel / 100)) / 2,
        width * (zoomLevel / 100),
        height * (zoomLevel / 100),
      ])
      .attr("width", width)
      .attr("height", height)
      .style("max-width", "100%")
      .style("height", "auto");

    const container = svg.append("g");

    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-spacing))
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(spacing)
          .strength(1) // increase to group connected nodes more tightly
      )
      .force("x", d3.forceX())
      .force("y", d3.forceY())
      .force(
        "collision",
        d3.forceCollide().radius((d) => d.connections + 4)
      )
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(0.05)
      .restart();

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

    const colors = ["#920C00", "#7977FF", "#000792"];
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
      .style("opacity", (d) => Math.min(1, (d.connections + 1) / 10));

    const logoFiles = [
      "cvria.png",
      "domstolar.png",
      "eba.png",
      "esma.png",
      "eurlex.png",
      "finans.png",
      "imanage.png",
      "imy.png",
      "iustus.png",
      "onedrive.png",
      "riksdag.png",
      "skatte.png",
    ];

    const logos = container
      .append("g")
      .selectAll("image")
      .data(nodes, (d) => d.id)
      .join("image")
      .attr("xlink:href", "")
      .attr("width", 40)
      .attr("height", 40)
      .attr("x", (d) => d.x - 20)
      .attr("y", (d) => d.y - 40)
      .style("opacity", 0);

    const persistentLogos = container
      .append("g")
      .selectAll("foreignObject")
      .data(showLogosOnHover ? [] : topNodes)
      .join("foreignObject")
      .attr("width", logoSize)
      .attr("height", logoSize)
      .attr("x", (d) => d.x - logoSize / 2)
      .attr("y", (d) => d.y - logoSize - 12)
      .style("overflow", "visible")
      .style("opacity", 1)
      .html(
        (d, i) => `
  <div xmlns="http://www.w3.org/1999/xhtml" style="
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  ">
    <div style="
      background: white;
      border-radius: 6px;
      width: ${logoSize}px;
      height: ${logoSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    ">
      <img src="/logos/${logoFiles[i % logoFiles.length]}" style="max-width: ${
          logoSize - 8
        }px; max-height: ${logoSize - 8}px; object-fit: contain;" />
    </div>
    <div style="
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid white;
      margin-top: -1px;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,0.15));
    "></div>
  </div>
`
      );

    // --- Hover interaction ---
    if (enableHoverEffect) {
      // Helper to find connected nodes
      const linkedByIndex = {};
      links.forEach((d) => {
        linkedByIndex[`${d.source.id},${d.target.id}`] = true;
        linkedByIndex[`${d.target.id},${d.source.id}`] = true;
      });
      function isConnected(a, b) {
        return linkedByIndex[`${a.id},${b.id}`] || a.id === b.id;
      }

      // Hover behavior with smooth transitions and stronger fade
      node.on("mouseover", function (event, d) {
        const highlightColor = d.color || "#000";

        node
          .transition()
          .duration(100)
          .style("opacity", (o) => (isConnected(d, o) ? 1 : 0.2))
          .attr("fill", (o) =>
            isConnected(d, o) ? highlightColor : o.color || "#000"
          );

        link
          .transition()
          .duration(100)
          .style("opacity", (l) =>
            l.source.id === d.id || l.target.id === d.id ? 1 : 0.2
          )
          .attr("stroke", (l) =>
            l.source.id === d.id || l.target.id === d.id
              ? highlightColor
              : "rgba(0, 0, 0, 0.2)"
          );
      });
      node.on("mouseout", function () {
        node
          .transition()
          .duration(100)
          .style("opacity", (d) => Math.min(1, (d.connections + 1) / 10))
          .attr("fill", (d) => d.color || "#000");

        link
          .transition()
          .duration(100)
          .style("opacity", 1)
          .attr("stroke", "rgba(0, 0, 0, 0.2)")
          .attr("stroke-width", 0.5);
      });
    }

    const mouse = { x: 0, y: 0 };
    svg.on("mousemove", (event) => {
      const [x, y] = d3.pointer(event);
      mouse.x = x;
      mouse.y = y;
    });

    simulation.on("tick", () => {
      nodes.forEach((d) => {
        if (d.homeX === undefined) d.homeX = d.x;
        if (d.homeY === undefined) d.homeY = d.y;
        if (!d.phaseX) d.phaseX = Math.random() * Math.PI * 2;
        if (!d.phaseY) d.phaseY = Math.random() * Math.PI * 2;

        d.phaseX += 0.02 + Math.random() * 0.005;
        d.phaseY += 0.02 + Math.random() * 0.005;

        d.x = d.homeX + Math.sin(d.phaseX) * 10;
        d.y = d.homeY + Math.sin(d.phaseY) * 10;
      });

      if (enableMouseGravity) {
        const gravityStrength = 0.01;
        nodes.forEach((d) => {
          const dx = mouse.x - d.x;
          const dy = mouse.y - d.y;
          d.x += dx * gravityStrength;
          d.y += dy * gravityStrength;
        });
      }

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

      logos.attr("x", (d) => d.x - 20).attr("y", (d) => d.y - 40);

      persistentLogos
        .attr("x", (d) => d.x - logoSize / 2)
        .attr("y", (d) => d.y - logoSize - 12);
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

    return () => simulation.stop();
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
