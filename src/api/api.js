import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const getHealth = () => API.get("/health");
export const getDevices = () => API.get("/devices");
export const getStates = () => API.get("/states");
export const getSummary = () => API.get("/summary");
export const getNetworkMap = () => API.get("/network-map");

export const startPairing = (seconds = 120) =>
  API.post("/pairing/start", { seconds });

export const removeDevice = (ieee) =>
  API.delete(`/devices/${encodeURIComponent(ieee)}`);

export const renameDevice = (ieee, name) =>
  API.post("/devices/rename", { ieee, name });

export const controlDevice = (ieee, payload) =>
  API.post("/devices/control", { ieee, payload });

export const stopPairing = () => API.post("/pairing/stop");

export default API;
