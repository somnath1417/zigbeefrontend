import { useState } from "react";
import { startPairing, stopPairing } from "../api/api";

function PairingControls({ onRefreshSummary }) {
  const [loading, setLoading] = useState(false);

  const handleStartPairing = async () => {
    try {
      setLoading(true);
      await startPairing(240);
      if (onRefreshSummary) {
        onRefreshSummary();
      }
    } catch (error) {
      console.error("Start pairing error:", error);
      alert("Failed to start pairing");
    } finally {
      setLoading(false);
    }
  };

  const handleStopPairing = async () => {
    try {
      setLoading(true);
      await stopPairing();
      if (onRefreshSummary) {
        onRefreshSummary();
      }
    } catch (error) {
      console.error("Stop pairing error:", error);
      alert("Failed to stop pairing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pairing-card">
      <button
        className="primary-btn"
        onClick={handleStartPairing}
        disabled={loading}
      >
        {loading ? "Please wait..." : "Add Device"}
      </button>

      <button
        className="secondary-btn"
        onClick={handleStopPairing}
        disabled={loading}
      >
        {loading ? "Please wait..." : "Stop Pairing"}
      </button>
    </div>
  );
}

export default PairingControls;