import React from "react";

export default function ConfirmModal({
  open,
  title = "Confirm Action",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal-box">
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="confirm-modal-actions">
          <button
            className="confirm-cancel-btn"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            className="confirm-delete-btn"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Removing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
