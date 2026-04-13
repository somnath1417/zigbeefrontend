import { useEffect, useState } from "react";
import Header from "../components/Header";
import SummaryCards from "../components/SummaryCards";
import PairingControls from "../components/PairingControls";
import DeviceList from "../components/DeviceList";
import {
  getDevices,
  getStates,
  getSummary,
  removeDevice,
  renameDevice,
} from "../api/api";
import socket from "../socket/socket";

function Dashboard() {
  const [socketConnected, setSocketConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    deviceCount: 0,
    stateCount: 0,
    permitJoin: false,
    brokerConnected: false,
  });

  const fetchInitialData = async () => {
    try {
      const [devicesRes, statesRes, summaryRes] = await Promise.all([
        getDevices(),
        getStates(),
        getSummary(),
      ]);

      setDevices(devicesRes.data?.data || []);
      setStates(statesRes.data?.data || []);
      setSummary(summaryRes.data?.data || {});
    } catch (error) {
      console.error("Initial fetch error:", error);
    }
  };

  // const handleDeleteDevice = async (device) => {
  //   try {
  //     setLoading(true);

  //     const ieee = device?.ieee_address || device?.ieeeAddr || device?.ieee;

  //     const name = device?.friendly_name || device?.friendlyName || "Device";

  //     await removeDevice(ieee);

  //     setDevices((prev) =>
  //       prev.filter(
  //         (d) => (d?.ieee_address || d?.ieeeAddr || d?.ieee) !== ieee,
  //       ),
  //     );

  //     setStates((prev) =>
  //       prev.filter(
  //         (s) => (s?.ieeeAddr || s?.ieee_address || s?.ieee) !== ieee,
  //       ),
  //     );

  //     if (fetchInitialData) {
  //       fetchInitialData();
  //     }
  //   } catch (error) {
  //     console.error("Delete device error:", error);
  //     alert("Failed to remove device");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleDeleteDevice = async (device) => {
    try {
      setLoading(true);

      const ieee = device?.ieee_address || device?.ieeeAddr || device?.ieee;

      await removeDevice(ieee);

      await fetchInitialData();
    } catch (error) {
      console.error("Delete device error:", error);
      alert(error?.response?.data?.message || "Failed to remove device");
    } finally {
      setLoading(false);
    }
  };
  const handleRenameDevice = async (device, newName) => {
    try {
      const ieee = device?.ieee_address || device?.ieeeAddr || device?.ieee;

      await renameDevice(ieee, newName);

      setDevices((prev) =>
        prev.map((d) =>
          (d.ieee_address || d.ieeeAddr || d.ieee) === ieee
            ? { ...d, friendly_name: newName }
            : d,
        ),
      );
    } catch (error) {
      console.error(error);

      alert("Rename failed");
    }
  };

  useEffect(() => {
    fetchInitialData();

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("socket_status", (data) => {
      setSocketConnected(!!data.connected);
    });

    socket.on("devices_update", (data) => {
      setDevices(data || []);
    });

    socket.on("states_update", (data) => {
      setStates(data || []);
    });

    socket.on("summary_update", (data) => {
      setSummary(data || {});
    });

    socket.on("permit_join_update", (data) => {
      setSummary((prev) => ({
        ...prev,
        permitJoin: !!data.permitJoin,
      }));
    });

    socket.on("broker_status", (data) => {
      setSummary((prev) => ({
        ...prev,
        brokerConnected: !!data.connected,
      }));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("socket_status");
      socket.off("devices_update");
      socket.off("states_update");
      socket.off("summary_update");
      socket.off("permit_join_update");
      socket.off("broker_status");
    };
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <Header socketConnected={socketConnected} />

        <div className="top-grid">
          <div className="top-left">
            <SummaryCards summary={summary} />
          </div>

          <div className="top-right">
            <PairingControls onRefreshSummary={fetchInitialData} />
          </div>
        </div>

        <DeviceList
          devices={devices}
          states={states}
          onDelete={handleDeleteDevice}
          handleRenameDevice={handleRenameDevice}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default Dashboard;
