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
    totalDevices: 0,
    totalStates: 0,
    permitJoin: false,
    brokerConnected: false,
    onlineLikeDevices: 0,
    batteryDevices: 0,
    lowBattery: 0,
  });

  const fetchInitialData = async () => {
    try {
      const [devicesRes, statesRes, summaryRes] = await Promise.all([
        getDevices(),
        getStates(),
        getSummary(),
      ]);

      const devicesData = devicesRes.data?.data || [];
      const statesData = statesRes.data?.data || [];
      const summaryData = summaryRes.data?.data || {};

      setDevices(devicesData);
      setStates(statesData);
      setSummary((prev) => ({
        ...prev,
        ...summaryData,
        totalDevices: summaryData.totalDevices ?? devicesData.length,
        totalStates: summaryData.totalStates ?? statesData.length,
      }));
    } catch (error) {
      console.error("Initial fetch error:", error);
    }
  };

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
            ? { ...d, friendly_name: newName, friendlyName: newName }
            : d,
        ),
      );

      setStates((prev) =>
        prev.map((s) =>
          (s.ieee_address || s.ieeeAddr || s.ieee) === ieee
            ? { ...s, deviceName: newName }
            : s,
        ),
      );
    } catch (error) {
      console.error(error);
      alert("Rename failed");
    }
  };

  useEffect(() => {
    fetchInitialData();

    const onConnect = () => {
      setSocketConnected(true);
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onSocketStatus = (data) => {
      setSocketConnected(!!data.connected);
    };

    const onDevicesUpdate = (data) => {
      const nextDevices = data || [];
      setDevices(nextDevices);
      setSummary((prev) => ({
        ...prev,
        totalDevices: nextDevices.length,
      }));
    };

    const onStatesUpdate = (data) => {
      const nextStates = data || [];
      setStates(nextStates);
      setSummary((prev) => ({
        ...prev,
        totalStates: nextStates.length,
      }));
    };

    const onSummaryUpdate = (data) => {
      setSummary((prev) => ({
        ...prev,
        ...(data || {}),
      }));
    };

    const onPermitJoinUpdate = (data) => {
      setSummary((prev) => ({
        ...prev,
        permitJoin: !!data.permitJoin,
      }));
    };

    const onBrokerStatus = (data) => {
      setSummary((prev) => ({
        ...prev,
        brokerConnected: !!data.connected,
      }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("socket_status", onSocketStatus);
    socket.on("devices_update", onDevicesUpdate);
    socket.on("states_update", onStatesUpdate);
    socket.on("summary_update", onSummaryUpdate);
    socket.on("permit_join_update", onPermitJoinUpdate);
    socket.on("broker_status", onBrokerStatus);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("socket_status", onSocketStatus);
      socket.off("devices_update", onDevicesUpdate);
      socket.off("states_update", onStatesUpdate);
      socket.off("summary_update", onSummaryUpdate);
      socket.off("permit_join_update", onPermitJoinUpdate);
      socket.off("broker_status", onBrokerStatus);
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
