import React from "react";
import { Handle, Position } from "reactflow";

function getNodeClass(type) {
  const value = (type || "").toLowerCase();

  if (value.includes("coordinator")) return "zigbee-map-node coordinator";
  if (value.includes("router")) return "zigbee-map-node router";
  if (value.includes("end")) return "zigbee-map-node enddevice";

  return "zigbee-map-node unknown";
}

function isCoordinator(type) {
  return (type || "").toLowerCase().includes("coordinator");
}

function isRouter(type) {
  return (type || "").toLowerCase().includes("router");
}

function isEndDevice(type) {
  return (type || "").toLowerCase().includes("end");
}

export default function ZigbeeNodeCard({ data }) {
  const type = data.deviceType || "Unknown";

  return (
    <div className="zigbee-map-node-wrapper">
      {isCoordinator(type) && (
        <>
          <Handle
            id="coord-left-target"
            type="target"
            position={Position.Left}
            className="hidden-handle"
          />
          <Handle
            id="coord-left-source"
            type="source"
            position={Position.Left}
            className="hidden-handle"
          />
          <Handle
            id="coord-right-target"
            type="target"
            position={Position.Right}
            className="hidden-handle"
          />
          <Handle
            id="coord-right-source"
            type="source"
            position={Position.Right}
            className="hidden-handle"
          />
        </>
      )}

      {isRouter(type) && (
        <>
          <Handle
            id="router-top-target"
            type="target"
            position={Position.Top}
            className="hidden-handle"
          />
          <Handle
            id="router-bottom-source"
            type="source"
            position={Position.Bottom}
            className="hidden-handle"
          />
          <Handle
            id="router-left-target"
            type="target"
            position={Position.Left}
            className="hidden-handle"
          />
          <Handle
            id="router-right-source"
            type="source"
            position={Position.Right}
            className="hidden-handle"
          />
        </>
      )}

      {isEndDevice(type) && (
        <>
          <Handle
            id="end-left-target"
            type="target"
            position={Position.Left}
            className="hidden-handle"
          />
          <Handle
            id="end-right-source"
            type="source"
            position={Position.Right}
            className="hidden-handle"
          />
        </>
      )}

      {!isCoordinator(type) && !isRouter(type) && !isEndDevice(type) && (
        <>
          <Handle
            id="unknown-left-target"
            type="target"
            position={Position.Left}
            className="hidden-handle"
          />
          <Handle
            id="unknown-right-source"
            type="source"
            position={Position.Right}
            className="hidden-handle"
          />
        </>
      )}

      <div className={getNodeClass(type)} />

      <div className="zigbee-map-node-label">
        <div className="zigbee-map-node-title">{data.label}</div>
        <div className="zigbee-map-node-type">{type}</div>
      </div>
    </div>
  );
}
