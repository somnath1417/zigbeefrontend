function SummaryCards({ summary }) {
  return (
    <div className="summary-grid">
      <div className="summary-card">
        <p className="summary-label">Devices</p>
        <h2 className="summary-value">{summary.deviceCount ?? 0}</h2>
      </div>

      <div className="summary-card">
        <p className="summary-label">States</p>
        <h2 className="summary-value">{summary.stateCount ?? 0}</h2>
      </div>

      <div className="summary-card">
        <p className="summary-label">Permit Join</p>
        <h2 className="summary-value">{summary.permitJoin ? "ON" : "OFF"}</h2>
      </div>
    </div>
  );
}

export default SummaryCards;
