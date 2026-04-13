import React, { useEffect, useRef, useState } from "react";
import "../styles/DeviceCard.css";
import DeviceDetailsModal from "./DeviceDetailsModal";

function DeviceCard({
  device,
  devices,
  state,
  onShowExposes,
  onDelete,
  onRename,
  onControlSiren, // NEW PROP
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showSosPopup, setShowSosPopup] = useState(false);
  const [sirenLoading, setSirenLoading] = useState(false);

  const sosAudioRef = useRef(null);
  const sirenTriggeredRef = useRef(false);

  const friendlyName =
    device?.friendly_name || device?.friendlyName || "Unknown Device";

  const [newName, setNewName] = useState(friendlyName);
  const [renaming, setRenaming] = useState(false);
  const payload = state?.payload || {};
  const [showDetails, setShowDetails] = useState(false);

  const ieeeAddress =
    device?.ieee_address || device?.ieeeAddr || device?.ieee || "-";

  const battery = payload.battery ?? state?.battery ?? 100;
  const linkquality = payload.linkquality ?? state?.linkquality ?? 0;

  const updatedAt = state?.updatedAt
    ? new Date(state.updatedAt).toLocaleString()
    : "No live data yet";

  const isSosActive =
    payload?.sos === true ||
    payload?.emergency === true ||
    payload?.alarm === true ||
    payload?.action === "SOS" ||
    payload?.action === "emergency";

  useEffect(() => {
    const handleSosFlow = async () => {
      if (isSosActive) {
        setShowSosPopup(true);

        if (!sosAudioRef.current) {
          sosAudioRef.current = new Audio("/alarm.mp3");
          sosAudioRef.current.loop = true;
        }

        sosAudioRef.current.play().catch(() => {});

        if (
          !sirenTriggeredRef.current &&
          onControlSiren &&
          Array.isArray(devices)
        ) {
          try {
            sirenTriggeredRef.current = true;
            setSirenLoading(true);

            const sirenDevices = devices.filter((d) => {
              const name =
                `${d?.friendly_name || d?.friendlyName || ""}`.toLowerCase();
              const model = `${d?.model_id || ""}`.toLowerCase();
              const manufacturer = `${d?.manufacturer || ""}`.toLowerCase();

              return (
                name.includes("siren") ||
                name.includes("alarm") ||
                model.includes("siren") ||
                model.includes("alarm") ||
                manufacturer.includes("siren") ||
                manufacturer.includes("alarm")
              );
            });

            if (!sirenDevices) {
              console.error("No siren device found");
              return;
            }

            console.log("SOS source device:", device);
            console.log("Matched siren device:", sirenDevices);

            // await onControlSiren({
            //   sourceDevice: device, // SOS button
            //   sirenDevice: sirenDevices, // actual siren
            //   action: "ON",
            //   reason: "SOS",
            // });
            await Promise.all(
              sirenDevices.map((sirenDevice) =>
                onControlSiren({
                  sourceDevice: device,
                  sirenDevice,
                  action: "ON",
                  reason: "SOS_ACKNOWLEDGED",
                }),
              ),
            );
          } catch (error) {
            console.error("Failed to turn ON siren:", error);
          } finally {
            setSirenLoading(false);
          }
        }
      } else {
        if (sosAudioRef.current) {
          sosAudioRef.current.pause();
          sosAudioRef.current.currentTime = 0;
        }

        // Reset flag so next SOS can trigger again
        sirenTriggeredRef.current = false;
      }
    };

    handleSosFlow();

    return () => {
      if (sosAudioRef.current) {
        sosAudioRef.current.pause();
        sosAudioRef.current.currentTime = 0;
      }
    };
  }, [isSosActive, device, onControlSiren]);

  const closeSosPopup = async () => {
    setShowSosPopup(false);

    if (sosAudioRef.current) {
      sosAudioRef.current.pause();
      sosAudioRef.current.currentTime = 0;
    }

    if (onControlSiren && Array.isArray(devices)) {
      try {
        setSirenLoading(true);

        const sirenDevices = devices.filter((d) => {
          const name =
            `${d?.friendly_name || d?.friendlyName || ""}`.toLowerCase();
          const model = `${d?.model_id || ""}`.toLowerCase();
          const manufacturer = `${d?.manufacturer || ""}`.toLowerCase();

          return (
            name.includes("siren") ||
            name.includes("alarm") ||
            model.includes("siren") ||
            model.includes("alarm") ||
            manufacturer.includes("siren") ||
            manufacturer.includes("alarm")
          );
        });

        await Promise.all(
          sirenDevices.map((sirenDevice) =>
            onControlSiren({
              sourceDevice: device,
              sirenDevice,
              action: "OFF",
              reason: "SOS_ACKNOWLEDGED",
            }),
          ),
        );
      } catch (error) {
        console.error("Failed to turn OFF sirens:", error);
      } finally {
        setSirenLoading(false);
      }
    }
  };

  const getDeviceType = () => {
    const text =
      `${device?.model_id || ""} ${device?.manufacturer || ""} ${friendlyName}`.toLowerCase();

    if (text.includes("smoke")) return "smoke";
    if (text.includes("contact")) return "contact";
    if (text.includes("door")) return "contact";
    if (text.includes("window")) return "contact";
    if (text.includes("motion")) return "motion";
    if (text.includes("occupancy")) return "motion";
    if (text.includes("temperature")) return "temperature";
    if (text.includes("temp")) return "temperature";
    if (text.includes("humidity")) return "humidity";
    if (text.includes("siren")) return "siren";
    if (text.includes("alarm")) return "siren";
    if (text.includes("vibration")) return "vibration";
    if (text.includes("water")) return "water";
    if (text.includes("leak")) return "water";
    if (text.includes("flood")) return "water";
    if (text.includes("gas")) return "gas";
    if (text.includes("co")) return "gas";
    if (text.includes("light")) return "light";
    if (text.includes("bulb")) return "light";
    if (text.includes("switch")) return "switch";
    if (text.includes("plug")) return "switch";
    if (text.includes("button")) return "button";
    if (text.includes("sos")) return "sos";

    if ("contact" in payload) return "contact";
    if ("smoke" in payload) return "smoke";
    if ("occupancy" in payload) return "motion";
    if ("temperature" in payload) return "temperature";
    if ("humidity" in payload) return "humidity";
    if ("water_leak" in payload) return "water";
    if ("vibration" in payload) return "vibration";
    if ("gas" in payload) return "gas";
    if ("sos" in payload) return "sos";
    if ("action" in payload) return "button";
    if ("state" in payload && payload.state) return "switch";
    if ("alarm" in payload || "warning" in payload || "siren" in payload) {
      return "siren";
    }

    return "generic";
  };

  const deviceType = getDeviceType();

  const getIcon = () => {
    switch (deviceType.toLowerCase()) {
      case "contact":
        return "🚪";
      case "smoke":
        return "🚨";
      case "motion":
        return "🏃";
      case "temperature":
        return "🌡️";
      case "humidity":
        return "💧";
      case "light":
        return "💡";
      case "switch":
        return "🎛️";
      case "siren":
        return "📢";
      case "alarm":
        return "🚨";
      case "water_leak":
      case "water":
        return "🚿";
      case "vibration":
        return "📳";
      case "occupancy":
        return "👤";
      case "battery":
        return "🔋";
      case "co2":
        return "🏭";
      case "gas":
        return "⛽";
      case "door":
        return "🚪";
      case "window":
        return "🪟";
      case "lock":
        return "🔒";
      case "button":
        return "🔘";
      case "sos":
        return "🆘";
      case "presence":
        return "📡";
      case "router":
        return "📶";
      case "coordinator":
        return "🖥️";
      default:
        return "📟";
    }
  };

  const formatValue = (value) => {
    if (value === true) return "True";
    if (value === false) return "False";
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const buildStateRows = () => {
    const rows = [];

    if ("contact" in payload) {
      rows.push({
        label: "Contact",
        value: payload.contact ? "Closed" : "Open",
      });
    }

    if ("battery_low" in payload) {
      rows.push({
        label: "Battery Low",
        value: payload.battery_low ? "True" : "False",
      });
    }

    if ("smoke" in payload) {
      rows.push({
        label: "Smoke",
        value: formatValue(payload.smoke),
      });
    }

    if ("tamper" in payload) {
      rows.push({
        label: "Tamper",
        value: formatValue(payload.tamper),
      });
    }

    if ("occupancy" in payload) {
      rows.push({
        label: "Occupancy",
        value: payload.occupancy ? "Detected" : "Clear",
      });
    }

    if ("temperature" in payload) {
      rows.push({
        label: "Temperature",
        value: `${payload.temperature}°C`,
      });
    }

    if ("humidity" in payload) {
      rows.push({
        label: "Humidity",
        value: `${payload.humidity}%`,
      });
    }

    if ("water_leak" in payload) {
      rows.push({
        label: "Water Leak",
        value: payload.water_leak ? "Leak Detected" : "No Leak",
      });
    }

    if ("sos" in payload) {
      rows.push({
        label: "SOS",
        value: payload.sos ? "Emergency Active" : "Normal",
      });
    }

    if (rows.length === 0) {
      Object.entries(payload)
        .filter(
          ([key]) =>
            !["battery", "linkquality", "voltage", "last_seen"].includes(key),
        )
        .slice(0, 4)
        .forEach(([key, value]) => {
          rows.push({
            label: key
              .replaceAll("_", " ")
              .replace(/\b\w/g, (char) => char.toUpperCase()),
            value: formatValue(value),
          });
        });
    }

    return rows;
  };

  const stateRows = buildStateRows();

  const openDeletePopup = () => {
    setShowConfirm(true);
  };

  const closeDeletePopup = () => {
    setShowConfirm(false);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(device);
    }
    setShowConfirm(false);
  };

  return (
    <>
      <div
        className={`device-card-modern ${isSosActive ? "device-card-sos" : ""}`}
        onClick={() => setShowDetails(true)}
      >
        <div className="device-top">
          <div className="device-top-left">
            <div className="device-icon">{getIcon()}</div>

            <div>
              <h3
                className="device-title rename-title"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRename(true);
                }}
                title="Click to rename"
              >
                {friendlyName} ✏️
              </h3>
              <p className="device-subtitle">{ieeeAddress}</p>
            </div>
          </div>

          <span
            className={`device-status-badge ${
              device?.interview_completed ? "ready" : "pending"
            } ${isSosActive ? "danger" : ""}`}
          >
            {isSosActive
              ? "EMERGENCY"
              : device?.interview_completed
                ? "Ready"
                : "Pending"}
          </span>
        </div>

        <div className="device-info-list">
          {stateRows.length > 0 ? (
            stateRows.map((item, index) => (
              <div className="device-info-row" key={index}>
                <span className="device-info-label">{item.label}</span>
                <span className="device-info-value">{item.value}</span>
              </div>
            ))
          ) : (
            <div className="device-info-row">
              <span className="device-info-label">State</span>
              <span className="device-info-value">{updatedAt}</span>
            </div>
          )}
        </div>

        <div className="device-actions">
          {/* <button
            className="exposes-btn"
            onClick={(e) => {
              e.stopPropagation();
              onShowExposes?.(device);
            }}
            type="button"
          >
            Exposes →
          </button> */}

          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              openDeletePopup();
            }}
            type="button"
          >
            🗑
          </button>
        </div>

        <div className="device-bottom">
          <div className="bottom-pill">
            <span className="pill-icon">📶</span>
            <span>{linkquality}</span>
          </div>

          <div className="bottom-pill">
            <span className="pill-icon">🔋</span>
            <span>{battery}%</span>
          </div>
        </div>

        <p className="device-updated-time">Updated: {updatedAt}</p>
      </div>

      {showSosPopup && (
        <div className="confirm-overlay emergency-overlay">
          <div className="confirm-box emergency-box">
            <h3>🚨 Emergency SOS Alert</h3>

            <p>
              Emergency signal received from <strong>{friendlyName}</strong>
            </p>

            <div className="confirm-device-details">
              <p>
                <strong>Device Name:</strong> {friendlyName}
              </p>
              <p>
                <strong>IEEE Address:</strong> {ieeeAddress}
              </p>
              <p>
                <strong>Time:</strong> {updatedAt}
              </p>
              <p>
                <strong>Link Quality:</strong> {linkquality}
              </p>
              <p>
                <strong>Battery:</strong> {battery}%
              </p>
              <p>
                <strong>Siren Status:</strong>{" "}
                {sirenLoading ? "Processing..." : "Triggered"}
              </p>
            </div>

            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-delete-btn emergency-btn"
                onClick={closeSosPopup}
                disabled={sirenLoading}
              >
                {sirenLoading ? "Please wait..." : "Acknowledge"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h4>Remove Device</h4>

            <p>
              Are you sure you want to remove <strong>{friendlyName}</strong>?
            </p>

            <p className="confirm-subtext">
              This action will remove the selected device from the list.
            </p>

            <div className="confirm-device-details">
              <p>
                <strong>Device Name:</strong> {friendlyName}
              </p>
              <p>
                <strong>IEEE Address:</strong> {ieeeAddress}
              </p>
            </div>

            <div className="confirm-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={closeDeletePopup}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-btn"
                onClick={handleConfirmDelete}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {showRename && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <h3>Rename Device</h3>

            <p>IEEE:</p>

            <p className="ieee-text">{ieeeAddress}</p>
            <br />
            <input
              type="text"
              className="rename-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <div className="confirm-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowRename(false)}
              >
                Cancel
              </button>

              <button
                className="confirm-delete-btn"
                onClick={async () => {
                  if (!newName.trim()) return;

                  setRenaming(true);
                  await onRename?.(device, newName);
                  setRenaming(false);
                  setShowRename(false);
                }}
              >
                {renaming ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeviceDetailsModal
        open={showDetails}
        device={device}
        state={state}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
}

export default DeviceCard;
