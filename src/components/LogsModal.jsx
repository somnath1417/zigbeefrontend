import { useEffect, useRef } from "react";
import "../styles/LogsModal.css";
import socket from "../socket/socket";

// 🎯 Detect log type and assign class
function getLogClass(log) {
  const text = typeof log === "string" ? log : JSON.stringify(log);

  if (text.includes("error") || text.includes("Failed")) return "log-error";

  if (text.includes("publish") || text.includes("MQTT")) return "log-info";

  if (text.includes("interview") || text.includes("joined"))
    return "log-success";

  if (text.includes("warn") || text.includes("retry")) return "log-warning";

  return "log-default";
}

// 🎯 Highlight timestamp
function formatLog(log) {
  const text = typeof log === "string" ? log : JSON.stringify(log);

  const match = text.match(/^\[(.*?)\]\s*(.*)$/);

  if (!match) return { time: "", message: text };

  return {
    time: match[1],
    message: match[2],
  };
}


export default function LogsModal({ open, onClose, logs, setLogs }) {
  const endRef = useRef(null);

  // ✅ keep latest logs reference
  const logsRef = useRef(logs);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const handleClearLogs = () => {
    logsRef.current = []; // ✅ reset ref
    setLogs([]);
  };

  useEffect(() => {
    if (!open) return;

    const handleLogs = (log) => {
      const updated = [...logsRef.current, log].slice(-300);

      logsRef.current = updated; // ✅ update ref
      setLogs(updated); // ✅ update state
    };

    socket.on("zigbee_logs", handleLogs);

    return () => {
      socket.off("zigbee_logs", handleLogs);
    };
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!open) return null;

  return (
    <div className="logs-overlay" onClick={onClose}>
      <div className="logs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logs-header">
          <h3>Live Logs</h3>

          <div className="logs-actions">
            <button className="clear-btn" onClick={handleClearLogs}>
              Clear
            </button>
            <button onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="logs-body">
          {logs.length === 0 ? (
            <div className="logs-empty">No logs</div>
          ) : (
            // logs.map((log, index) => (
            //   <div className="log-line" key={index}>
            //     {typeof log === "string" ? log : JSON.stringify(log)}
            //   </div>
            // ))
            logs.map((log, index) => {
              const { time, message } = formatLog(log);
              const logClass = getLogClass(log);

              return (
                <div className={`log-line ${logClass}`} key={index}>
                  {time && <span className="log-time">[{time}]</span>}{" "}
                  <span className="log-message">{message}</span>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
