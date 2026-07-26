export default function SalaryApproveModal({
  isOpen,
  title,
  note,
  currentSalaryLabel,
  newSalaryLabel,
  effectiveFromLabel,
  reason,
  futureNotice,
  submitting,
  submitError,
  onCancel,
  onSubmit
}) {
  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    await onSubmit();
  };

  return (
    <div className="salary-modal-backdrop" role="presentation">
      <div className="salary-modal salary-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="salary-approve-modal-title">
        <h4 id="salary-approve-modal-title">{title}</h4>
        <p className="salary-modal-note">{note}</p>

        <form className="salary-modal-form salary-approve-form" onSubmit={handleSubmit}>
          <div className="profile-fields profile-fields-three salary-approval-summary-grid">
            <div className="profile-field">
              <span>Current Salary</span>
              <strong>{currentSalaryLabel}</strong>
            </div>
            <div className="profile-field">
              <span>New Salary</span>
              <strong>{newSalaryLabel}</strong>
            </div>
            <div className="profile-field">
              <span>Effective From</span>
              <strong>{effectiveFromLabel}</strong>
            </div>
            <div className="profile-field salary-approval-reason-field">
              <span>Reason</span>
              <strong>{reason || "-"}</strong>
            </div>
          </div>

          {futureNotice && <p className="profile-muted salary-future-notice">{futureNotice}</p>}
          {submitError && <p className="profile-error">{submitError}</p>}

          <div className="profile-form-actions salary-modal-actions salary-confirm-actions">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
              Back
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Approving..." : "Approve Salary Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
