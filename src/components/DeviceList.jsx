import { controlDevice } from "../api/api";
import DeviceCard from "./DeviceCard";

function DeviceList({
  devices = [],
  states = [],
  onShowExposes,
  onDelete,
  handleRenameDevice,
}) {
  const stateMap = {};

  // Build state map ONLY using IEEE
  if (Array.isArray(states)) {
    states.forEach((item) => {
      const deviceName = item?.deviceName;
      const ieeeAddr = item?.ieeeAddr || item?.ieee_address;
      if (deviceName) {
        stateMap[deviceName] = item;
      }
      if (ieeeAddr) {
        stateMap[ieeeAddr] = item;
      }
    });
  }

  const controlSiren = async ({
    action,
    reason,
    sourceDevice,
    sirenDevice,
  }) => {
    try {
      const ieee =
        sirenDevice?.ieee_address || sirenDevice?.ieeeAddr || sirenDevice?.ieee;

      if (!ieee) {
        console.error("Siren IEEE not found");
        return;
      }

      await controlDevice(ieee, {
        alarm: action,
      });
    } catch (error) {
      console.error("Siren control failed:", error);
      alert(error?.response?.data?.message || "Failed to control siren");
    }
  };

  return (
    <div className="device-list-wrapper">
      <div className="section-header">
        <h2>Joined Devices</h2>
        <span className="section-count">{devices.length}</span>
      </div>

      {devices.length === 0 ? (
        <div className="empty-card">
          <p>No devices found yet.</p>
        </div>
      ) : (
        <div className="device-grid">
          {devices.map((device, index) => {
            const ieee =
              device?.ieee_address || device?.ieeeAddr || device?.ieee;

            const state = stateMap[ieee] || null;

            return (
              <DeviceCard
                key={ieee || index}
                device={device}
                devices={devices}
                state={state}
                onShowExposes={onShowExposes}
                onDelete={onDelete}
                onRename={handleRenameDevice}
                onControlSiren={controlSiren}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DeviceList;
