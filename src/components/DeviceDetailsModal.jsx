import React, { useMemo, useState } from "react";
import { controlDevice } from "../api/api";
import "../styles/DeviceDetailsModal.css";

function formatLabel(value = "") {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// function getExposeList(device) {
//   const exposes = device?.definition?.exposes || device?.exposes || [];
//   return Array.isArray(exposes) ? exposes : [];
// }
function getExposeList(device) {
  const rawExposes = device?.definition?.exposes || device?.exposes || [];

  if (!Array.isArray(rawExposes)) return [];

  // 🔥 flatten nested exposes like "switch"
  const normalized = [];

  rawExposes.forEach((exp) => {
    // case: normal expose
    if (exp.type !== "switch" && exp.type !== "light") {
      normalized.push(exp);
      return;
    }

    // case: nested expose
    if (exp?.features && Array.isArray(exp.features)) {
      normalized.push(...exp.features);
      return;
    }

    // case: weird structure (your case)
    if (exp?.expose?.features) {
      normalized.push(...exp.expose.features);
      return;
    }

    normalized.push(exp);
  });

  return normalized;
}

function getStateValue(statePayload, key) {
  if (!statePayload || !key) return undefined;
  return statePayload[key];
}

function renderAccessText(access) {
  if (access === 1) return "Read";
  if (access === 2) return "Write";
  if (access === 3) return "Read / Write";
  if (access === 4) return "State";
  if (access === 5) return "State / Read";
  if (access === 7) return "State / Read / Write";
  return "-";
}

function isWritable(access) {
  return access === 2 || access === 3 || access === 7;
}

function ExposeField({ expose, statePayload, ieee }) {
  const type = expose?.type;
  const property = expose?.property;
  const name = expose?.name;
  const key = property || name;
  const value = getStateValue(statePayload, key);

  const [loading, setLoading] = useState(false);
  const [draftValue, setDraftValue] = useState(
    value ?? expose?.value_min ?? "",
  );

  const writable = isWritable(expose?.access);

  const handleWrite = async (newValue) => {
    try {
      setLoading(true);
      await controlDevice(ieee, {
        [key]: newValue,
      });
    } catch (error) {
      console.error("Device control error:", error);
      alert(error?.response?.data?.message || "Failed to control device");
    } finally {
      setLoading(false);
    }
  };

  if (type === "binary") {
    return (
      <div className="expose-card" key={key}>
        <div className="expose-header">
          <h4>{formatLabel(expose?.label || key)}</h4>
          <span>{renderAccessText(expose?.access)}</span>
        </div>

        <div className="expose-value-row">
          <span className="expose-value">
            {String(value ?? expose?.value_off ?? "N/A")}
          </span>
          <span className="expose-meta">
            {expose?.value_on ? `ON: ${expose.value_on}` : ""}
            {expose?.value_off ? ` / OFF: ${expose.value_off}` : ""}
          </span>
        </div>

        {writable && (
          <div className="control-row">
            <button
              className="control-btn"
              disabled={loading}
              onClick={() => handleWrite(expose?.value_off ?? "OFF")}
            >
              OFF
            </button>
            <button
              className="control-btn primary"
              disabled={loading}
              onClick={() => handleWrite(expose?.value_on ?? "ON")}
            >
              ON
            </button>
          </div>
        )}

        {expose?.description ? (
          <p className="expose-description">{expose.description}</p>
        ) : null}
      </div>
    );
  }

  if (type === "enum") {
    return (
      <div className="expose-card" key={key}>
        <div className="expose-header">
          <h4>{formatLabel(expose?.label || key)}</h4>
          <span>{renderAccessText(expose?.access)}</span>
        </div>

        <div className="expose-value-row">
          <span className="expose-value">{String(value ?? "N/A")}</span>
        </div>

        {Array.isArray(expose?.values) && expose.values.length > 0 ? (
          <div className="expose-tags">
            {expose.values.map((item) => (
              <button
                type="button"
                className={`expose-tag-btn ${value === item ? "active" : ""}`}
                key={item}
                disabled={!writable || loading}
                onClick={() => handleWrite(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        {expose?.description ? (
          <p className="expose-description">{expose.description}</p>
        ) : null}
      </div>
    );
  }

  if (type === "numeric") {
    return (
      <div className="expose-card" key={key}>
        <div className="expose-header">
          <h4>{formatLabel(expose?.label || key)}</h4>
          <span>{renderAccessText(expose?.access)}</span>
        </div>

        <div className="expose-value-row">
          <span className="expose-value">
            {value !== undefined && value !== null ? value : "N/A"}{" "}
            {expose?.unit || ""}
          </span>
        </div>

        <div className="expose-meta-grid">
          <span>Min: {expose?.value_min ?? "-"}</span>
          <span>Max: {expose?.value_max ?? "-"}</span>
          <span>Step: {expose?.value_step ?? "-"}</span>
        </div>

        {writable && (
          <div className="control-stack">
            <input
              type="range"
              min={expose?.value_min ?? 0}
              max={expose?.value_max ?? 100}
              step={expose?.value_step ?? 1}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              disabled={loading}
            />

            <div className="numeric-control-row">
              <input
                type="number"
                className="control-input"
                value={draftValue}
                min={expose?.value_min ?? 0}
                max={expose?.value_max ?? 100}
                step={expose?.value_step ?? 1}
                onChange={(e) => setDraftValue(e.target.value)}
                disabled={loading}
              />

              <button
                className="control-btn primary"
                disabled={loading}
                onClick={() => handleWrite(Number(draftValue))}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {expose?.description ? (
          <p className="expose-description">{expose.description}</p>
        ) : null}
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className="expose-card" key={key}>
        <div className="expose-header">
          <h4>{formatLabel(expose?.label || key)}</h4>
          <span>{renderAccessText(expose?.access)}</span>
        </div>

        <div className="expose-value-row">
          <span className="expose-value">{String(value ?? "N/A")}</span>
        </div>

        {writable && (
          <div className="control-stack">
            <input
              type="text"
              className="control-input"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              disabled={loading}
            />

            <button
              className="control-btn primary"
              disabled={loading}
              onClick={() => handleWrite(draftValue)}
            >
              Save
            </button>
          </div>
        )}

        {expose?.description ? (
          <p className="expose-description">{expose.description}</p>
        ) : null}
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="expose-card" key={key}>
        <div className="expose-header">
          <h4>{formatLabel(expose?.label || key)}</h4>
          <span>{renderAccessText(expose?.access)}</span>
        </div>

        <pre className="expose-json">
          {JSON.stringify(value ?? [], null, 2)}
        </pre>
      </div>
    );
  }

  if (type === "composite") {
    return (
      <div className="expose-card" key={key}>
        <div className="expose-header">
          <h4>{formatLabel(expose?.label || key)}</h4>
          <span>{renderAccessText(expose?.access)}</span>
        </div>

        {Array.isArray(expose?.features) && expose.features.length > 0 ? (
          <div className="composite-features">
            {expose.features.map((feature, index) => (
              <div className="composite-item" key={`${key}-${index}`}>
                <ExposeField
                  expose={feature}
                  statePayload={statePayload}
                  ieee={ieee}
                />
              </div>
            ))}
          </div>
        ) : (
          <pre className="expose-json">
            {JSON.stringify(value ?? {}, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="expose-card" key={key || Math.random()}>
      <div className="expose-header">
        <h4>{formatLabel(expose?.label || key || "Unknown")}</h4>
        <span>{type || "Unknown"}</span>
      </div>

      <pre className="expose-json">
        {JSON.stringify(
          {
            expose,
            value,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}

export default function DeviceDetailsModal({ open, device, state, onClose }) {
  const payload = state?.payload || {};
  const exposes = useMemo(() => getExposeList(device), [device]);

  if (!open || !device) return null;

  const friendlyName =
    device?.friendly_name || device?.friendlyName || "Unknown Device";

  const ieeeAddress =
    device?.ieee_address || device?.ieeeAddr || device?.ieee || "-";

  const updatedAt = state?.updatedAt
    ? new Date(state.updatedAt).toLocaleString()
    : "No live data yet";

  return (
    <div className="device-modal-overlay" onClick={onClose}>
      <div className="device-modal" onClick={(e) => e.stopPropagation()}>
        <button className="device-modal-close" onClick={onClose}>
          ×
        </button>

        <div className="device-modal-top">
          <div>
            <h2>{friendlyName}</h2>
            <p className="device-modal-subtitle">
              {device?.definition?.description ||
                device?.type ||
                "Zigbee Device"}
            </p>

            <div className="device-modal-tags">
              <span>{ieeeAddress}</span>
              <span>{device?.model_id || device?.modelID || "-"}</span>
              <span>
                {device?.manufacturer || device?.manufacturerName || "-"}
              </span>
              <span>
                {device?.network_address || device?.networkAddress || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="device-modal-body">
          <div className="device-modal-section">
            <h3>Device Info</h3>

            <div className="device-info-grid">
              <div className="info-box">
                <span>Interview</span>
                <strong>
                  {device?.interview_completed ? "Ready" : "Pending"}
                </strong>
              </div>

              <div className="info-box">
                <span>Battery</span>
                <strong>{payload?.battery ?? state?.battery ?? "-"}</strong>
              </div>

              <div className="info-box">
                <span>Linkquality</span>
                <strong>
                  {payload?.linkquality ?? state?.linkquality ?? "-"}
                </strong>
              </div>

              <div className="info-box">
                <span>Updated</span>
                <strong>{updatedAt}</strong>
              </div>
            </div>
          </div>

          <div className="device-modal-section">
            <h3>Exposes</h3>

            {exposes.length === 0 ? (
              <div className="empty-exposes">
                No exposes found for this device.
              </div>
            ) : (
              <div className="exposes-grid">
                {exposes.map((expose, index) => (
                  <React.Fragment
                    key={`${expose?.property || expose?.name || "expose"}-${index}`}
                  >
                    <ExposeField
                      expose={expose}
                      statePayload={payload}
                      ieee={ieeeAddress}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
