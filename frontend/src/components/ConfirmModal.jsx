export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isSubmitting = false,
  onCancel,
  onConfirm,
  variant = "danger"
}) {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClass = variant === "danger" ? "btn-danger" : "btn-primary";

  return (
    <div className="salary-modal-backdrop" role="presentation">
      <div
        className="salary-modal salary-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <h4 id="confirm-modal-title">{title}</h4>
        <p className="salary-modal-note confirm-modal-message">{message}</p>

        <div className="profile-form-actions salary-modal-actions salary-confirm-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmButtonClass}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
