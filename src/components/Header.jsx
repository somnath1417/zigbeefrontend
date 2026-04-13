function Header({ socketConnected }) {
  return (
    <div className="header-card">
      <div>
        <h1 className="header-title">Zigbee Dashboard</h1>
        <p className="header-subtitle">
          Realtime add device and sensor monitoring
        </p>
      </div>

      <div className="header-status-area">
        <span
          className={`status-badge ${socketConnected ? "connected" : "disconnected"}`}
        >
          {socketConnected ? "Socket Connected" : "Socket Disconnected"}
        </span>
        <p className="status-text">
          {socketConnected ? "WebSocket connected" : "WebSocket disconnected"}
        </p>
      </div>
    </div>
  );
}

export default Header;
