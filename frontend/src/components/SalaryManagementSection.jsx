import { useMemo, useState } from "react";
import api from "../services/api";
import SalaryApproveModal from "./SalaryApproveModal";
import SalaryDraftModal from "./SalaryDraftModal";

const STATUS_LABELS = {
  DRAFT: "Draft",
  CANCELLED: "Cancelled",
  PUBLISHED: "Published",
  RETIRED: "Retired"
};

const STATUS_CLASS_MAP = {
  DRAFT: "salary-status-badge-draft",
  CANCELLED: "salary-status-badge-cancelled",
  PUBLISHED: "salary-status-badge-published",
  RETIRED: "salary-status-badge-retired"
};

const formatSalaryAmount = (salaryAmount, currencyCode) => {
  if (salaryAmount === null || salaryAmount === undefined || salaryAmount === "") {
    return null;
  }

  const numericAmount = Number(salaryAmount);
  if (!Number.isFinite(numericAmount)) {
    return null;
  }

  const normalizedCurrency = typeof currencyCode === "string" ? currencyCode.toUpperCase() : "";
  const locale = normalizedCurrency === "MYR" ? "en-MY" : "en";

  try {
    if (normalizedCurrency) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: normalizedCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numericAmount);
    }
  } catch (error) {
    // Fall through to decimal-only formatting.
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount);
};

const formatSalaryBasis = (salaryBasis) => {
  if (typeof salaryBasis !== "string") {
    return "";
  }

  const normalizedBasis = salaryBasis.toUpperCase();

  if (normalizedBasis === "MONTHLY") return " / Month";
  if (normalizedBasis === "WEEKLY") return " / Week";
  if (normalizedBasis === "DAILY") return " / Day";
  if (normalizedBasis === "HOURLY") return " / Hour";

  return "";
};

const formatDateDisplay = (isoDate) => {
  if (typeof isoDate !== "string" || isoDate.trim() === "") {
    return "-";
  }

  const normalizedDate = isoDate.slice(0, 10);
  const [year, month, day] = normalizedDate.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return "-";
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(utcDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(utcDate);
};

const getComparableDate = (value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const normalized = value.slice(0, 10);
  const [year, month, day] = normalized.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(utcDate.getTime())) {
    return null;
  }

  return utcDate;
};

const formatSalaryLine = (salaryAmount, currencyCode, salaryBasis) => {
  const amountText = formatSalaryAmount(salaryAmount, currencyCode);

  if (!amountText) {
    return null;
  }

  return `${amountText}${formatSalaryBasis(salaryBasis)}`;
};

const getStatusLabel = (recordStatus) => {
  const normalized = typeof recordStatus === "string" ? recordStatus.toUpperCase() : "";
  return STATUS_LABELS[normalized] || "Unknown";
};

const getStatusBadgeClass = (recordStatus) => {
  const normalized = typeof recordStatus === "string" ? recordStatus.toUpperCase() : "";
  return STATUS_CLASS_MAP[normalized] || "salary-status-badge-unknown";
};

const formatApprovedOrCancelled = (row) => {
  if (!row || typeof row !== "object") {
    return "-";
  }

  const status = typeof row.record_status === "string" ? row.record_status.toUpperCase() : "";

  if (status === "CANCELLED") {
    if (row.cancelled_at) {
      return `Cancelled ${formatDateDisplay(String(row.cancelled_at))}`;
    }
    return "Cancelled";
  }

  if (status === "PUBLISHED" || status === "RETIRED") {
    if (row.approved_at) {
      return `Approved ${formatDateDisplay(String(row.approved_at))}`;
    }
    return "Approved";
  }

  return "-";
};

export default function SalaryManagementSection({
  employeeId,
  employment,
  salaryHistory,
  salaryHistoryLoading,
  salaryHistoryError,
  onRefresh
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDraftSubmitting, setCreateDraftSubmitting] = useState(false);
  const [createDraftError, setCreateDraftError] = useState("");
  const [createDraftNotice, setCreateDraftNotice] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDraftSubmitting, setEditDraftSubmitting] = useState(false);
  const [editDraftError, setEditDraftError] = useState("");
  const [editDraftNotice, setEditDraftNotice] = useState("");
  const [editDraftSnapshot, setEditDraftSnapshot] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelDraftSubmitting, setCancelDraftSubmitting] = useState(false);
  const [cancelDraftError, setCancelDraftError] = useState("");
  const [cancelDraftNotice, setCancelDraftNotice] = useState("");
  const [cancelDraftSnapshot, setCancelDraftSnapshot] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveDraftSubmitting, setApproveDraftSubmitting] = useState(false);
  const [approveDraftError, setApproveDraftError] = useState("");
  const [approveDraftNotice, setApproveDraftNotice] = useState("");
  const [approveDraftSnapshot, setApproveDraftSnapshot] = useState(null);

  const isSalaryConfigured = employment?.salary_configured === true;

  const currentSalaryAnchorDate = useMemo(() => {
    if (!isSalaryConfigured) {
      return null;
    }

    return getComparableDate(employment?.salary_effective_from);
  }, [employment?.salary_effective_from, isSalaryConfigured]);

  const currentSalaryLine = useMemo(() => {
    if (!isSalaryConfigured) {
      return null;
    }

    return formatSalaryLine(
      employment?.salary_amount,
      employment?.salary_currency_code,
      employment?.salary_basis
    );
  }, [
    employment?.salary_amount,
    employment?.salary_basis,
    employment?.salary_currency_code,
    isSalaryConfigured
  ]);

  const upcomingPublishedRow = useMemo(() => {
    if (!Array.isArray(salaryHistory) || !currentSalaryAnchorDate) {
      return null;
    }

    let nearestUpcoming = null;

    for (const row of salaryHistory) {
      const status = typeof row?.record_status === "string" ? row.record_status.toUpperCase() : "";
      if (status !== "PUBLISHED") {
        continue;
      }

      const effectiveFromDate = getComparableDate(row?.effective_from);
      if (!effectiveFromDate || effectiveFromDate.getTime() <= currentSalaryAnchorDate.getTime()) {
        continue;
      }

      if (
        !nearestUpcoming ||
        effectiveFromDate.getTime() < getComparableDate(nearestUpcoming.effective_from).getTime()
      ) {
        nearestUpcoming = row;
      }
    }

    return nearestUpcoming;
  }, [currentSalaryAnchorDate, salaryHistory]);

  const activeDraftRow = useMemo(() => {
    if (!Array.isArray(salaryHistory)) {
      return null;
    }

    return (
      salaryHistory.find(
        (row) => typeof row?.record_status === "string" && row.record_status.toUpperCase() === "DRAFT"
      ) || null
    );
  }, [salaryHistory]);

  const createActionLabel = isSalaryConfigured ? "Change Salary" : "Set Initial Salary";
  const hasActiveDraft = Boolean(activeDraftRow);
  const draftModalTitle = isSalaryConfigured ? "Change Salary" : "Set Initial Salary";

  const openCreateModal = () => {
    setCreateDraftError("");
    setEditDraftError("");
    setCancelDraftError("");
    setApproveDraftError("");
    setCreateDraftNotice("");
    setEditDraftNotice("");
    setCancelDraftNotice("");
    setApproveDraftNotice("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (createDraftSubmitting) {
      return;
    }

    setCreateDraftError("");
    setIsCreateModalOpen(false);
  };

  const openEditModal = () => {
    if (!activeDraftRow) {
      return;
    }

    setCreateDraftError("");
    setEditDraftError("");
    setCancelDraftError("");
    setApproveDraftError("");
    setCreateDraftNotice("");
    setEditDraftNotice("");
    setCancelDraftNotice("");
    setApproveDraftNotice("");
    setEditDraftSnapshot({
      id: activeDraftRow.id,
      salary_amount: activeDraftRow.salary_amount,
      salary_basis: activeDraftRow.salary_basis,
      currency_code: activeDraftRow.currency_code,
      effective_from: activeDraftRow.effective_from,
      reason: activeDraftRow.reason,
      updated_at: activeDraftRow.updated_at
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (editDraftSubmitting) {
      return;
    }

    setEditDraftError("");
    setIsEditModalOpen(false);
    setEditDraftSnapshot(null);
  };

  const openCancelModal = () => {
    if (!activeDraftRow) {
      return;
    }

    setCreateDraftError("");
    setEditDraftError("");
    setCancelDraftError("");
    setApproveDraftError("");
    setCreateDraftNotice("");
    setEditDraftNotice("");
    setCancelDraftNotice("");
    setApproveDraftNotice("");
    setCancelDraftSnapshot({
      id: activeDraftRow.id,
      updated_at: activeDraftRow.updated_at,
      reason: activeDraftRow.reason,
      effective_from: activeDraftRow.effective_from
    });
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    if (cancelDraftSubmitting) {
      return;
    }

    setCancelDraftError("");
    setIsCancelModalOpen(false);
    setCancelDraftSnapshot(null);
  };

  const openApproveModal = () => {
    if (!activeDraftRow) {
      return;
    }

    setCreateDraftError("");
    setEditDraftError("");
    setCancelDraftError("");
    setApproveDraftError("");
    setCreateDraftNotice("");
    setEditDraftNotice("");
    setCancelDraftNotice("");
    setApproveDraftNotice("");
    setApproveDraftSnapshot({
      id: activeDraftRow.id,
      salary_amount: activeDraftRow.salary_amount,
      salary_basis: activeDraftRow.salary_basis,
      currency_code: activeDraftRow.currency_code,
      effective_from: activeDraftRow.effective_from,
      reason: activeDraftRow.reason,
      updated_at: activeDraftRow.updated_at
    });
    setIsApproveModalOpen(true);
  };

  const closeApproveModal = () => {
    if (approveDraftSubmitting) {
      return;
    }

    setApproveDraftError("");
    setIsApproveModalOpen(false);
    setApproveDraftSnapshot(null);
  };

  const handleCreateDraftSubmit = async (payload) => {
    if (createDraftSubmitting || !employeeId) {
      return;
    }

    setCreateDraftSubmitting(true);
    setCreateDraftError("");
    setCreateDraftNotice("");

    try {
      await api.post(`/employees/${employeeId}/salary-history/drafts`, payload);
      setIsCreateModalOpen(false);
      setCreateDraftNotice("Salary draft created successfully.");

      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 400) {
        setCreateDraftError(backendMessage || "Invalid salary draft input.");
      } else if (status === 403) {
        setCreateDraftError("You do not have permission to manage salary.");
      } else if (status === 409) {
        setCreateDraftError(
          "An active salary draft already exists. Refreshing the latest salary information."
        );
        setIsCreateModalOpen(false);

        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      } else if (status === 401) {
        setCreateDraftError("Session expired. Redirecting to login...");
      } else {
        setCreateDraftError("Failed to create salary draft. Please try again.");
      }
    } finally {
      setCreateDraftSubmitting(false);
    }
  };

  const handleEditDraftSubmit = async (payload) => {
    if (editDraftSubmitting || !employeeId || !editDraftSnapshot?.id) {
      return;
    }

    setEditDraftSubmitting(true);
    setEditDraftError("");
    setEditDraftNotice("");

    try {
      await api.put(
        `/employees/${employeeId}/salary-history/drafts/${editDraftSnapshot.id}`,
        payload
      );

      setIsEditModalOpen(false);
      setEditDraftSnapshot(null);
      setEditDraftNotice("Salary draft updated successfully.");

      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 400) {
        setEditDraftError(backendMessage || "Invalid salary draft input.");
      } else if (status === 403) {
        setEditDraftError("You do not have permission to manage salary.");
      } else if (status === 404) {
        setEditDraftError("Salary draft was not found. Refreshing the latest salary information.");
        setIsEditModalOpen(false);
        setEditDraftSnapshot(null);

        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      } else if (status === 409) {
        const conflictMessage =
          backendMessage === "Salary draft is no longer editable"
            ? "This salary draft is no longer editable. Refreshing the latest salary information."
            : "This salary draft was changed by another session. Refreshing the latest version.";

        setEditDraftError(conflictMessage);
        setIsEditModalOpen(false);
        setEditDraftSnapshot(null);

        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      } else if (status === 401) {
        setEditDraftError("Session expired. Redirecting to login...");
      } else {
        setEditDraftError("Failed to update salary draft. Please try again.");
      }
    } finally {
      setEditDraftSubmitting(false);
    }
  };

  const handleCancelDraftSubmit = async () => {
    if (cancelDraftSubmitting || !employeeId || !cancelDraftSnapshot?.id) {
      return;
    }

    setCancelDraftSubmitting(true);
    setCancelDraftError("");
    setCancelDraftNotice("");

    try {
      await api.post(
        `/employees/${employeeId}/salary-history/drafts/${cancelDraftSnapshot.id}/cancel`,
        {
          expected_updated_at: cancelDraftSnapshot.updated_at
        }
      );

      setIsCancelModalOpen(false);
      setCancelDraftSnapshot(null);
      setCancelDraftNotice("Salary change cancelled successfully.");

      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 400) {
        setCancelDraftError(backendMessage || "Invalid salary draft input.");
      } else if (status === 403) {
        setCancelDraftError("You do not have permission to cancel salary changes.");
      } else if (status === 404) {
        setCancelDraftError("Salary draft was not found. Refreshing the latest salary information.");
        setIsCancelModalOpen(false);
        setCancelDraftSnapshot(null);

        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      } else if (status === 409) {
        const conflictMessage =
          backendMessage === "Salary draft is no longer cancellable"
            ? "This salary draft is no longer available for cancellation."
            : "This salary draft was changed by another session. Salary information has been refreshed.";

        setCancelDraftError(conflictMessage);
        setIsCancelModalOpen(false);
        setCancelDraftSnapshot(null);

        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      } else if (status === 401) {
        setCancelDraftError("Session expired. Redirecting to login...");
      } else {
        setCancelDraftError("Failed to cancel salary change.");
      }
    } finally {
      setCancelDraftSubmitting(false);
    }
  };

  const handleApproveDraftSubmit = async () => {
    if (approveDraftSubmitting || !employeeId || !approveDraftSnapshot?.id) {
      return;
    }

    setApproveDraftSubmitting(true);
    setApproveDraftError("");
    setApproveDraftNotice("");

    try {
      await api.post(
        `/employees/${employeeId}/salary-history/drafts/${approveDraftSnapshot.id}/approve`,
        {
          expected_updated_at: approveDraftSnapshot.updated_at
        }
      );

      setIsApproveModalOpen(false);
      setApproveDraftSnapshot(null);
      setApproveDraftNotice("Salary change approved successfully.");

      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 400) {
        setApproveDraftError(backendMessage || "Invalid salary draft input.");
      } else if (status === 403) {
        setApproveDraftError("You do not have permission to approve salary changes.");
      } else if (status === 404) {
        setApproveDraftError("Salary draft was not found. Salary information has been refreshed.");
        setIsApproveModalOpen(false);
        setApproveDraftSnapshot(null);

        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      } else if (status === 409) {
        const conflictMessage =
          backendMessage === "Salary draft is no longer approvable"
            ? "This salary draft changed in another session. Salary information has been refreshed."
            : backendMessage === "Salary timeline conflict" ||
              backendMessage === "Salary publication would rewrite historical salary"
              ? "This salary change cannot be approved because its effective date conflicts with the existing salary timeline."
              : "This salary draft changed in another session. Salary information has been refreshed.";

        setApproveDraftError(conflictMessage);
        setIsApproveModalOpen(false);
        setApproveDraftSnapshot(null);

        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      } else if (status === 401) {
        setApproveDraftError("Session expired. Redirecting to login...");
      } else {
        setApproveDraftError("Failed to approve salary change.");
      }
    } finally {
      setApproveDraftSubmitting(false);
    }
  };

  const employmentCurrentEffectiveFrom = useMemo(() => {
    if (!isSalaryConfigured) {
      return "";
    }

    return typeof employment?.salary_effective_from === "string"
      ? employment.salary_effective_from.slice(0, 10)
      : "";
  }, [employment?.salary_effective_from, isSalaryConfigured]);

  const renderEffectivePeriod = (row) => {
    const fromLabel = formatDateDisplay(typeof row?.effective_from === "string" ? row.effective_from : "");

    if (typeof row?.effective_to === "string" && row.effective_to.trim() !== "") {
      const toLabel = formatDateDisplay(row.effective_to);
      return `${fromLabel} - ${toLabel}`;
    }

    const status = typeof row?.record_status === "string" ? row.record_status.toUpperCase() : "";
    const rowEffectiveFrom = typeof row?.effective_from === "string" ? row.effective_from.slice(0, 10) : "";

    if (
      status === "PUBLISHED" &&
      isSalaryConfigured &&
      employmentCurrentEffectiveFrom &&
      rowEffectiveFrom === employmentCurrentEffectiveFrom
    ) {
      return `${fromLabel} - Current`;
    }

    return `Starts ${fromLabel}`;
  };

  if (salaryHistoryLoading) {
    return (
      <div className="salary-management-section">
        <h3>Salary Management</h3>
        <p className="profile-muted">Loading salary information...</p>
      </div>
    );
  }

  if (salaryHistoryError) {
    return (
      <div className="salary-management-section">
        <h3>Salary Management</h3>
        <p className="profile-error profile-inline-error">{salaryHistoryError}</p>
      </div>
    );
  }

  return (
    <div className="salary-management-section">
      <div className="profile-section-head salary-management-head">
        <h3>Salary Management</h3>
        <button
          type="button"
          className="btn-primary"
          onClick={openCreateModal}
          disabled={hasActiveDraft || createDraftSubmitting}
        >
          {createActionLabel}
        </button>
      </div>

      {hasActiveDraft && (
        <p className="profile-muted salary-inline-helper">
          Active salary draft already exists.
        </p>
      )}

      {createDraftNotice && <p className="profile-success">{createDraftNotice}</p>}
      {createDraftError && !isCreateModalOpen && <p className="profile-error">{createDraftError}</p>}
      {editDraftNotice && <p className="profile-success">{editDraftNotice}</p>}
      {editDraftError && !isEditModalOpen && <p className="profile-error">{editDraftError}</p>}
      {cancelDraftNotice && <p className="profile-success">{cancelDraftNotice}</p>}
      {cancelDraftError && !isCancelModalOpen && <p className="profile-error">{cancelDraftError}</p>}
      {approveDraftNotice && <p className="profile-success">{approveDraftNotice}</p>}
      {approveDraftError && !isApproveModalOpen && <p className="profile-error">{approveDraftError}</p>}

      <div className="salary-summary-grid">
        <article className="salary-summary-card">
          <p className="salary-card-label">Current Salary</p>
          <p className="salary-card-amount">{currentSalaryLine || "Salary not configured"}</p>
          <p className="salary-card-meta">
            Effective From {isSalaryConfigured ? formatDateDisplay(employment?.salary_effective_from || "") : "-"}
          </p>
        </article>

        {upcomingPublishedRow && (
          <article className="salary-summary-card salary-summary-card-upcoming">
            <p className="salary-card-label">Upcoming Salary</p>
            <p className="salary-card-amount">
              {formatSalaryLine(
                upcomingPublishedRow.salary_amount,
                upcomingPublishedRow.currency_code,
                upcomingPublishedRow.salary_basis
              ) || "-"}
            </p>
            <p className="salary-card-meta">
              Effective {formatDateDisplay(upcomingPublishedRow.effective_from || "")}
            </p>
            <span className="salary-status-badge salary-status-badge-published">Published</span>
          </article>
        )}
      </div>

      {activeDraftRow && (
        <article className="salary-draft-card">
          <div className="salary-draft-head">
            <div className="salary-draft-head-left">
              <h4>Pending Salary Change</h4>
              <span className={`salary-status-badge ${getStatusBadgeClass(activeDraftRow.record_status)}`}>
                {getStatusLabel(activeDraftRow.record_status)}
              </span>
            </div>
            <div className="salary-draft-actions">
              <button
                type="button"
                className="btn-secondary salary-draft-edit-btn"
                onClick={openEditModal}
                disabled={editDraftSubmitting || cancelDraftSubmitting || approveDraftSubmitting}
              >
                Edit Draft
              </button>
              <button
                type="button"
                className="btn-danger salary-draft-cancel-btn"
                onClick={openCancelModal}
                disabled={editDraftSubmitting || cancelDraftSubmitting || approveDraftSubmitting}
              >
                Cancel Draft
              </button>
              <button
                type="button"
                className="btn-primary salary-draft-approve-btn"
                onClick={openApproveModal}
                disabled={editDraftSubmitting || cancelDraftSubmitting || approveDraftSubmitting}
              >
                Approve Draft
              </button>
            </div>
          </div>

          <div className="profile-fields profile-fields-three salary-draft-fields">
            <div className="profile-field">
              <span>Proposed Salary</span>
              <strong>
                {formatSalaryLine(
                  activeDraftRow.salary_amount,
                  activeDraftRow.currency_code,
                  activeDraftRow.salary_basis
                ) || "-"}
              </strong>
            </div>
            <div className="profile-field">
              <span>Effective From</span>
              <strong>{formatDateDisplay(activeDraftRow.effective_from || "")}</strong>
            </div>
            <div className="profile-field">
              <span>Reason</span>
              <strong>{activeDraftRow.reason || "-"}</strong>
            </div>
            <div className="profile-field">
              <span>Created</span>
              <strong>{formatDateDisplay(activeDraftRow.created_at || "")}</strong>
            </div>
            <div className="profile-field">
              <span>Last Updated</span>
              <strong>{formatDateDisplay(activeDraftRow.updated_at || "")}</strong>
            </div>
            <div className="profile-field">
              <span>Status</span>
              <strong>{getStatusLabel(activeDraftRow.record_status)}</strong>
            </div>
          </div>
        </article>
      )}

      <div className="salary-history-wrap">
        <div className="profile-section-head salary-history-head">
          <h4>Salary History</h4>
        </div>

        {!Array.isArray(salaryHistory) || salaryHistory.length === 0 ? (
          <p className="profile-muted">No salary history yet</p>
        ) : (
          <div className="salary-history-table-wrap">
            <table className="salary-history-table">
              <thead>
                <tr>
                  <th>Effective Period</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Source</th>
                  <th>Approved / Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {salaryHistory.map((row) => (
                  <tr key={row.id}>
                    <td>{renderEffectivePeriod(row)}</td>
                    <td>
                      {formatSalaryLine(row.salary_amount, row.currency_code, row.salary_basis) || "-"}
                    </td>
                    <td>
                      <span className={`salary-status-badge ${getStatusBadgeClass(row.record_status)}`}>
                        {getStatusLabel(row.record_status)}
                      </span>
                    </td>
                    <td>{row.reason || "-"}</td>
                    <td>
                      <div className="salary-source-cell">
                        <span>{row.source_type || "-"}</span>
                        {row.source_reference ? (
                          <small>{String(row.source_reference)}</small>
                        ) : null}
                      </div>
                    </td>
                    <td>{formatApprovedOrCancelled(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SalaryDraftModal
        mode="create"
        isOpen={isCreateModalOpen}
        title={draftModalTitle}
        note="This creates a draft only. The employee's official salary will not change until the draft is approved."
        defaultBasis={
          isSalaryConfigured && typeof employment?.salary_basis === "string"
            ? employment.salary_basis.toUpperCase()
            : "MONTHLY"
        }
        defaultCurrency={
          isSalaryConfigured && typeof employment?.salary_currency_code === "string"
            ? employment.salary_currency_code.toUpperCase()
            : "MYR"
        }
        submitting={createDraftSubmitting}
        submitError={createDraftError}
        onCancel={closeCreateModal}
        onSubmit={handleCreateDraftSubmit}
      />

      <SalaryDraftModal
        mode="edit"
        isOpen={isEditModalOpen}
        title="Edit Salary Draft"
        note="This updates the existing draft only. The employee's official salary will not change until the draft is approved."
        defaultBasis="MONTHLY"
        defaultCurrency="MYR"
        initialValues={editDraftSnapshot}
        expectedUpdatedAt={editDraftSnapshot?.updated_at}
        submitting={editDraftSubmitting}
        submitError={editDraftError}
        onCancel={closeEditModal}
        onSubmit={handleEditDraftSubmit}
      />

      {isCancelModalOpen && (
        <div className="salary-modal-backdrop" role="presentation">
          <div
            className="salary-modal salary-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="salary-cancel-modal-title"
          >
            <h4 id="salary-cancel-modal-title">Cancel Salary Change?</h4>
            <p className="salary-modal-note">
              This salary proposal will be cancelled and kept in Salary History for audit purposes.
              It will never become the active salary.
            </p>

            <div className="profile-fields">
              <div className="profile-field">
                <span>Proposed Salary</span>
                <strong>
                  {formatSalaryLine(
                    cancelDraftSnapshot?.salary_amount,
                    cancelDraftSnapshot?.currency_code || activeDraftRow?.currency_code,
                    cancelDraftSnapshot?.salary_basis || activeDraftRow?.salary_basis
                  ) || "-"}
                </strong>
              </div>
              <div className="profile-field">
                <span>Effective From</span>
                <strong>{formatDateDisplay(cancelDraftSnapshot?.effective_from || activeDraftRow?.effective_from || "")}</strong>
              </div>
              <div className="profile-field">
                <span>Reason</span>
                <strong>{cancelDraftSnapshot?.reason || activeDraftRow?.reason || "-"}</strong>
              </div>
            </div>

            {cancelDraftError && <p className="profile-error">{cancelDraftError}</p>}

            <div className="profile-form-actions salary-modal-actions salary-confirm-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeCancelModal}
                disabled={cancelDraftSubmitting}
              >
                Keep Draft
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleCancelDraftSubmit}
                disabled={cancelDraftSubmitting}
              >
                {cancelDraftSubmitting ? "Cancelling..." : "Cancel Salary Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SalaryApproveModal
        isOpen={isApproveModalOpen}
        title="Approve Salary Change?"
        note="This will update the employee's official salary history."
        currentSalaryLabel={
          isSalaryConfigured
            ? formatSalaryLine(employment?.salary_amount, employment?.salary_currency_code, employment?.salary_basis) || "-"
            : "Not configured"
        }
        newSalaryLabel={
          formatSalaryLine(
            approveDraftSnapshot?.salary_amount,
            approveDraftSnapshot?.currency_code,
            approveDraftSnapshot?.salary_basis
          ) || "-"
        }
        effectiveFromLabel={formatDateDisplay(approveDraftSnapshot?.effective_from || "")}
        reason={approveDraftSnapshot?.reason || "-"}
        futureNotice={
          (() => {
            const effectiveDate = getComparableDate(approveDraftSnapshot?.effective_from || "");
            if (!effectiveDate) {
              return "";
            }

            const today = new Date();
            const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            if (effectiveDate.getTime() > todayUtc.getTime()) {
              return `This salary will become effective on ${formatDateDisplay(approveDraftSnapshot.effective_from || "")}.`;
            }

            return "";
          })()
        }
        submitting={approveDraftSubmitting}
        submitError={approveDraftError}
        onCancel={closeApproveModal}
        onSubmit={handleApproveDraftSubmit}
      />
    </div>
  );
}
