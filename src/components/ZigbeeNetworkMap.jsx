import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";

import { getNetworkMap } from "../api/api";
import ZigbeeNodeCard from "./ZigbeeNodeCard";
import "../styles/zigbee-network-map.css";

const nodeTypes = {
  zigbeeNode: ZigbeeNodeCard,
};

function getNetworkValue(apiResponse) {
  return apiResponse?.data?.data?.value || { nodes: [], links: [] };
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function getLqiColor(lqi) {
  if (lqi >= 200) return "#22c55e";
  if (lqi >= 150) return "#84cc16";
  if (lqi >= 100) return "#f59e0b";
  if (lqi >= 50) return "#ef4444";
  return "#7f1d1d";
}

function getLqiStrokeWidth(lqi) {
  if (lqi >= 200) return 3.2;
  if (lqi >= 150) return 2.8;
  if (lqi >= 100) return 2.4;
  if (lqi >= 50) return 2;
  return 1.8;
}

function createNodeData(device, fallbackLabel = "") {
  return {
    label:
      device?.friendlyName ||
      device?.friendly_name ||
      fallbackLabel ||
      device?.ieeeAddr ||
      "Unknown",
    deviceType: device?.type || "Unknown",
    ieeeAddr: device?.ieeeAddr || "-",
    networkAddress: device?.networkAddress ?? "-",
    manufacturerName: device?.manufacturerName || "-",
    modelID: device?.modelID || "-",
    vendor: device?.definition?.vendor || "-",
    description: device?.definition?.description || "-",
    supports: device?.definition?.supports || "-",
    lastSeen: formatDateTime(device?.lastSeen),
    failed: Array.isArray(device?.failed) ? device.failed : [],
    raw: device || null,
  };
}

function getNodeKind(node) {
  const type = (node?.type || "").toLowerCase();

  if (type.includes("coordinator")) return "coordinator";
  if (type.includes("router")) return "router";
  if (type.includes("end")) return "enddevice";

  return "unknown";
}

function getNodePriority(node) {
  const type = (node?.type || "").toLowerCase();

  if (type.includes("coordinator")) return 0;
  if (type.includes("router")) return 1;
  if (type.includes("end")) return 2;

  return 3;
}

function getLinkSourceId(link) {
  return (
    link?.source?.ieeeAddr ||
    link?.sourceIeeeAddr ||
    link?.source?.id ||
    link?.from ||
    null
  );
}

function getLinkTargetId(link) {
  return (
    link?.target?.ieeeAddr ||
    link?.targetIeeeAddr ||
    link?.target?.id ||
    link?.to ||
    null
  );
}

function inferNodeType(existingNode, inferredType = "EndDevice") {
  if (existingNode?.type) return existingNode.type;
  return inferredType;
}

function buildGraph(networkValue) {
  const rawNodes = Array.isArray(networkValue?.nodes) ? networkValue.nodes : [];
  const rawLinks = Array.isArray(networkValue?.links) ? networkValue.links : [];

  const nodeMap = new Map();

  rawNodes.forEach((node) => {
    if (node?.ieeeAddr) {
      nodeMap.set(node.ieeeAddr, node);
    }
  });

  rawLinks.forEach((link) => {
    const sourceId = getLinkSourceId(link);
    const targetId = getLinkTargetId(link);

    if (sourceId && !nodeMap.has(sourceId)) {
      nodeMap.set(sourceId, {
        ieeeAddr: sourceId,
        friendlyName: sourceId,
        type: "Unknown",
      });
    }

    if (targetId && !nodeMap.has(targetId)) {
      nodeMap.set(targetId, {
        ieeeAddr: targetId,
        friendlyName: targetId,
        type: "EndDevice",
      });
    }
  });

  const allNodes = Array.from(nodeMap.values());

  const coordinator = allNodes.find((n) =>
    (n.type || "").toLowerCase().includes("coordinator"),
  );

  if (!coordinator?.ieeeAddr) {
    return {
      nodes: [],
      edges: [],
      rawNodes: allNodes,
      rawLinks,
    };
  }

  const adjacency = new Map();

  allNodes.forEach((node) => {
    if (node?.ieeeAddr) {
      adjacency.set(node.ieeeAddr, []);
    }
  });

  rawLinks.forEach((link) => {
    const sourceId = getLinkSourceId(link);
    const targetId = getLinkTargetId(link);
    const lqi = link?.lqi ?? 0;

    if (!sourceId || !targetId) return;

    if (!adjacency.has(sourceId)) adjacency.set(sourceId, []);
    if (!adjacency.has(targetId)) adjacency.set(targetId, []);

    adjacency.get(sourceId).push({
      to: targetId,
      lqi,
      link,
    });

    adjacency.get(targetId).push({
      to: sourceId,
      lqi,
      link,
    });
  });

  const visited = new Set();
  const parentMap = new Map();
  const edgeByChildMap = new Map();
  const levelMap = new Map();
  const queue = [];

  visited.add(coordinator.ieeeAddr);
  levelMap.set(coordinator.ieeeAddr, 0);
  queue.push(coordinator.ieeeAddr);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentLevel = levelMap.get(currentId) || 0;
    const neighbors = adjacency.get(currentId) || [];

    neighbors.sort((a, b) => {
      if ((b.lqi ?? 0) !== (a.lqi ?? 0)) {
        return (b.lqi ?? 0) - (a.lqi ?? 0);
      }

      const nodeA = nodeMap.get(a.to);
      const nodeB = nodeMap.get(b.to);
      const priorityDiff = getNodePriority(nodeA) - getNodePriority(nodeB);
      if (priorityDiff !== 0) return priorityDiff;

      const nameA =
        nodeA?.friendlyName || nodeA?.friendly_name || nodeA?.ieeeAddr || "";
      const nameB =
        nodeB?.friendlyName || nodeB?.friendly_name || nodeB?.ieeeAddr || "";

      return nameA.localeCompare(nameB);
    });

    neighbors.forEach((item) => {
      if (!visited.has(item.to)) {
        visited.add(item.to);
        parentMap.set(item.to, currentId);
        edgeByChildMap.set(item.to, item);
        levelMap.set(item.to, currentLevel + 1);
        queue.push(item.to);
      }
    });
  }

  // Fallback: if some node exists but was not visited, try to attach it
  // using the strongest linked already-visited neighbor.
  allNodes.forEach((node) => {
    const nodeId = node?.ieeeAddr;
    if (!nodeId || visited.has(nodeId)) return;

    const neighbors = adjacency.get(nodeId) || [];
    const candidate = neighbors
      .filter((item) => visited.has(item.to))
      .sort((a, b) => (b.lqi ?? 0) - (a.lqi ?? 0))[0];

    if (candidate) {
      visited.add(nodeId);
      parentMap.set(nodeId, candidate.to);
      edgeByChildMap.set(nodeId, {
        to: candidate.to,
        lqi: candidate.lqi ?? 0,
        link: candidate.link,
      });
      levelMap.set(nodeId, (levelMap.get(candidate.to) || 0) + 1);
    }
  });

  const childrenMap = new Map();

  allNodes.forEach((node) => {
    if (node?.ieeeAddr) {
      childrenMap.set(node.ieeeAddr, []);
    }
  });

  parentMap.forEach((parentId, childId) => {
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId).push(childId);
  });

  childrenMap.forEach((children, parentId) => {
    children.sort((a, b) => {
      const edgeA = edgeByChildMap.get(a);
      const edgeB = edgeByChildMap.get(b);

      const lqiA = edgeA?.lqi ?? 0;
      const lqiB = edgeB?.lqi ?? 0;

      if (lqiB !== lqiA) return lqiB - lqiA;

      const nodeA = nodeMap.get(a);
      const nodeB = nodeMap.get(b);

      const priorityDiff = getNodePriority(nodeA) - getNodePriority(nodeB);
      if (priorityDiff !== 0) return priorityDiff;

      const nameA =
        nodeA?.friendlyName || nodeA?.friendly_name || nodeA?.ieeeAddr || "";
      const nameB =
        nodeB?.friendlyName || nodeB?.friendly_name || nodeB?.ieeeAddr || "";

      return nameA.localeCompare(nameB);
    });
  });

  const startX = 120;
  const levelGapX = 280;
  const nodeGapY = 110;
  let nextLeafY = 120;

  const positioned = new Map();

  function layoutSubtree(nodeId, level = 0) {
    const node = nodeMap.get(nodeId);
    if (!node) return nextLeafY;

    const children = childrenMap.get(nodeId) || [];

    if (children.length === 0) {
      const y = nextLeafY;
      nextLeafY += nodeGapY;

      positioned.set(nodeId, {
        x: startX + level * levelGapX,
        y,
      });

      return y;
    }

    const childYPositions = children.map((childId) =>
      layoutSubtree(childId, level + 1),
    );

    const y =
      (childYPositions[0] + childYPositions[childYPositions.length - 1]) / 2;

    positioned.set(nodeId, {
      x: startX + level * levelGapX,
      y,
    });

    return y;
  }

  layoutSubtree(coordinator.ieeeAddr, 0);

  // Place any remaining totally disconnected nodes on the far right.
  allNodes.forEach((node, index) => {
    const nodeId = node?.ieeeAddr;
    if (!nodeId) return;

    if (!positioned.has(nodeId)) {
      positioned.set(nodeId, {
        x: startX + 5 * levelGapX,
        y: 120 + index * 90,
      });
    }
  });

  const graphNodes = [];

  positioned.forEach((position, nodeId) => {
    const device = nodeMap.get(nodeId);

    graphNodes.push({
      id: nodeId,
      type: "zigbeeNode",
      position,
      data: createNodeData(device, nodeId),
    });
  });

  const graphEdges = [];

  parentMap.forEach((parentId, childId) => {
    const parentNode = nodeMap.get(parentId);
    const childNode = nodeMap.get(childId);
    const edgeInfo = edgeByChildMap.get(childId);

    let link = edgeInfo?.link || null;
    let lqi = edgeInfo?.lqi ?? 0;

    if (!link) {
      const fallbackLink = rawLinks.find((item) => {
        const s = getLinkSourceId(item);
        const t = getLinkTargetId(item);
        return (
          (s === parentId && t === childId) || (s === childId && t === parentId)
        );
      });

      if (fallbackLink) {
        link = fallbackLink;
        lqi = fallbackLink?.lqi ?? lqi;
      }
    }

    const sourceKind = getNodeKind(parentNode);
    const targetKind = getNodeKind(childNode);

    const edgeColor = getLqiColor(lqi);
    const strokeWidth = getLqiStrokeWidth(lqi);

    let sourceHandle = "right-source";
    let targetHandle = "left-target";

    if (sourceKind === "coordinator") {
      sourceHandle = "coord-right-source";
    } else if (sourceKind === "router") {
      sourceHandle = "router-right-source";
    } else if (sourceKind === "enddevice") {
      sourceHandle = "end-right-source";
    }

    if (targetKind === "coordinator") {
      targetHandle = "coord-left-target";
    } else if (targetKind === "router") {
      targetHandle = "router-left-target";
    } else if (targetKind === "enddevice") {
      targetHandle = "end-left-target";
    }

    graphEdges.push({
      id: `edge-${parentId}-${childId}`,
      source: parentId,
      target: childId,
      sourceHandle,
      targetHandle,
      type: "default",
      label: `LQI ${lqi}`,
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: edgeColor,
      },
      style: {
        stroke: edgeColor,
        strokeWidth,
      },
      labelStyle: {
        fill: "#ffffff",
        fontSize: 12,
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: "rgba(15, 23, 34, 0.82)",
        fillOpacity: 1,
      },
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 6,
      data: {
        lqi,
        depth: link?.depth ?? "-",
        relationship: link?.relationship ?? "-",
        routes: Array.isArray(link?.routes) ? link.routes : [],
      },
    });
  });

  return {
    nodes: graphNodes,
    edges: graphEdges,
    rawNodes: allNodes,
    rawLinks,
  };
}

function RightPanel({
  stats,
  selectedNode,
  selectedEdge,
  loading,
  error,
  lastUpdated,
}) {
  return (
    <div className="network-sidebar">
      <div className="sidebar-card">
        <h3>Summary</h3>
        <div className="summary-grid">
          <div className="summary-box">
            <span>Total Nodes</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="summary-box">
            <span>Coordinator</span>
            <strong>{stats.coordinator}</strong>
          </div>
          <div className="summary-box">
            <span>Routers</span>
            <strong>{stats.router}</strong>
          </div>
          <div className="summary-box">
            <span>End Devices</span>
            <strong>{stats.endDevice}</strong>
          </div>
          <div className="summary-box">
            <span>Links</span>
            <strong>{stats.links}</strong>
          </div>
        </div>
      </div>

      <div className="sidebar-card">
        <h3>Legend</h3>
        <div className="legend-row">
          <span className="legend-dot coordinator" />
          <span>Coordinator</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot router" />
          <span>Router</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot enddevice" />
          <span>End Device</span>
        </div>
        <div className="legend-row">
          <span className="legend-line strong" />
          <span>High LQI</span>
        </div>
        <div className="legend-row">
          <span className="legend-line medium" />
          <span>Medium LQI</span>
        </div>
        <div className="legend-row">
          <span className="legend-line low" />
          <span>Low LQI</span>
        </div>
      </div>

      <div className="sidebar-card">
        <h3>Status</h3>
        <p>
          <strong>Updated:</strong> {lastUpdated || "-"}
        </p>
        <p>
          <strong>Loading:</strong> {loading ? "Yes" : "No"}
        </p>
        <p>
          <strong>Error:</strong> {error || "None"}
        </p>
      </div>

      <div className="sidebar-card">
        <h3>Selected Details</h3>

        {!selectedNode && !selectedEdge && (
          <p>Click a node or edge to view details.</p>
        )}

        {selectedNode && (
          <div className="details-block">
            <p>
              <strong>Name:</strong> {selectedNode.data.label}
            </p>
            <p>
              <strong>Type:</strong> {selectedNode.data.deviceType}
            </p>
            <p>
              <strong>IEEE:</strong> {selectedNode.data.ieeeAddr}
            </p>
            <p>
              <strong>Network Address:</strong>{" "}
              {selectedNode.data.networkAddress}
            </p>
            <p>
              <strong>Vendor:</strong> {selectedNode.data.vendor}
            </p>
            <p>
              <strong>Model:</strong> {selectedNode.data.modelID}
            </p>
            <p>
              <strong>Manufacturer:</strong>{" "}
              {selectedNode.data.manufacturerName}
            </p>
            <p>
              <strong>Last Seen:</strong> {selectedNode.data.lastSeen}
            </p>
            <p>
              <strong>Description:</strong> {selectedNode.data.description}
            </p>
            <p>
              <strong>Supports:</strong> {selectedNode.data.supports}
            </p>
            {selectedNode.data.failed?.length > 0 && (
              <p>
                <strong>Failed:</strong> {selectedNode.data.failed.join(", ")}
              </p>
            )}
          </div>
        )}

        {!selectedNode && selectedEdge && (
          <div className="details-block">
            <p>
              <strong>Parent:</strong> {selectedEdge.source}
            </p>
            <p>
              <strong>Child:</strong> {selectedEdge.target}
            </p>
            <p>
              <strong>LQI:</strong> {selectedEdge.data?.lqi ?? "-"}
            </p>
            <p>
              <strong>Depth:</strong> {selectedEdge.data?.depth ?? "-"}
            </p>
            <p>
              <strong>Relationship:</strong>{" "}
              {selectedEdge.data?.relationship ?? "-"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MapInner() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    coordinator: 0,
    router: 0,
    endDevice: 0,
    links: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);

  const loadingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const lastGoodGraphRef = useRef(null);

  const fetchNetworkMap = useCallback(async (force = false) => {
    try {
      if (loadingRef.current) return;
      if (hasLoadedOnceRef.current && !force) return;

      loadingRef.current = true;
      setLoading(true);
      setError("");

      const response = await getNetworkMap();
      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load network map");
      }

      const networkValue = getNetworkValue(result);
      const graph = buildGraph(networkValue);

      setNodes(graph.nodes);
      setEdges(graph.edges);
      lastGoodGraphRef.current = graph;

      setLastUpdated(new Date().toLocaleString());
      hasLoadedOnceRef.current = true;

      setStats({
        total: graph.rawNodes.length,
        coordinator: graph.rawNodes.filter((n) =>
          (n.type || "").toLowerCase().includes("coordinator"),
        ).length,
        router: graph.rawNodes.filter((n) =>
          (n.type || "").toLowerCase().includes("router"),
        ).length,
        endDevice: graph.rawNodes.filter((n) =>
          (n.type || "").toLowerCase().includes("end"),
        ).length,
        links: graph.edges.length,
      });

      if (graph.nodes.length > 0) {
        setSelectedNode(graph.nodes[0]);
        setSelectedEdge(null);
      }
    } catch (err) {
      console.error("Network map error:", err);

      if (lastGoodGraphRef.current) {
        setNodes(lastGoodGraphRef.current.nodes);
        setEdges(lastGoodGraphRef.current.edges);
        setError(
          `Live refresh failed: ${err.message}. Showing last successful map.`,
        );
      } else {
        setError(err.message || "Failed to load network map");
        setNodes([]);
        setEdges([]);
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworkMap(false);
  }, [fetchNetworkMap]);

  return (
    <div className="zigbee-page">
      <div className="zigbee-topbar">
        <div>
          <h2>Zigbee Network Map</h2>
          <p>One clean colored arrow per device with LQI-based ordering.</p>
        </div>

        <button onClick={() => fetchNetworkMap(true)} disabled={loading}>
          {loading ? "Loading..." : "Refresh Map"}
        </button>
      </div>

      <div className="zigbee-layout">
        <div className="zigbee-map-card">
          {error && nodes.length === 0 ? (
            <div className="zigbee-empty">{error}</div>
          ) : (
            <div className="zigbee-map-wrap">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                onNodeClick={(_, node) => {
                  setSelectedNode(node);
                  setSelectedEdge(null);
                }}
                onEdgeClick={(_, edge) => {
                  setSelectedEdge(edge);
                  setSelectedNode(null);
                }}
              >
                <MiniMap />
                <Controls />
                <Background color="#26303d" gap={28} size={1} />
              </ReactFlow>

              {error && nodes.length > 0 && (
                <div className="map-warning-banner">{error}</div>
              )}
            </div>
          )}
        </div>

        <RightPanel
          stats={stats}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
        />
      </div>
    </div>
  );
}

export default function ZigbeeNetworkMap() {
  return (
    <ReactFlowProvider>
      <MapInner />
    </ReactFlowProvider>
  );
}
