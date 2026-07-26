import { useEffect, useMemo, useState } from "react";

const VALID_BASIS = ["MONTHLY", "WEEKLY", "DAILY", "HOURLY"];

const isValidDateOnly = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return false;
  }

  const [year, month, day] = normalized.split("-").map((part) => Number(part));
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(utcDate.getTime())) {
    return false;
  }

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
};

export default function SalaryDraftModal({
  mode = "create",
  isOpen,
  title,
  note,
  defaultBasis,
  defaultCurrency,
  initialValues,
  expectedUpdatedAt,
  submitting,
  submitError,
  onCancel,
  onSubmit
}) {
  const initialForm = useMemo(
    () => {
      if (mode === "edit" && initialValues) {
        return {
          salary_amount:
            initialValues.salary_amount === null || initialValues.salary_amount === undefined
              ? ""
              : String(initialValues.salary_amount),
          salary_basis: typeof initialValues.salary_basis === "string" ? initialValues.salary_basis : "MONTHLY",
          currency_code:
            typeof initialValues.currency_code === "string"
              ? initialValues.currency_code.toUpperCase()
              : "MYR",
          effective_from:
            typeof initialValues.effective_from === "string"
              ? initialValues.effective_from.slice(0, 10)
              : "",
          reason: typeof initialValues.reason === "string" ? initialValues.reason : ""
        };
      }

      return {
        salary_amount: "",
        salary_basis: defaultBasis,
        currency_code: defaultCurrency,
        effective_from: "",
        reason: ""
      };
    },
    [defaultBasis, defaultCurrency, initialValues, mode]
  );

  const [form, setForm] = useState(initialForm);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setValidationError("");
    }
  }, [initialForm, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field, value) => {
    if (field === "currency_code") {
      setForm((prev) => ({ ...prev, [field]: String(value).toUpperCase() }));
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const salaryAmountValue = Number(form.salary_amount);

    if (form.salary_amount === "" || !Number.isFinite(salaryAmountValue) || salaryAmountValue <= 0) {
      return "Salary amount must be a number greater than 0.";
    }

    if (!VALID_BASIS.includes(form.salary_basis)) {
      return "Salary basis is invalid.";
    }

    if (!/^[A-Z]{3}$/.test(form.currency_code.trim())) {
      return "Currency must be exactly 3 uppercase letters.";
    }

    if (!isValidDateOnly(form.effective_from)) {
      return "Effective From must be a valid date in YYYY-MM-DD format.";
    }

    if (typeof form.reason !== "string" || form.reason.trim() === "") {
      return "Reason is required.";
    }

    if (mode === "edit" && (typeof expectedUpdatedAt !== "string" || expectedUpdatedAt.trim() === "")) {
      return "Draft concurrency token is missing. Please refresh and try again.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const nextValidationError = validate();
    setValidationError(nextValidationError);

    if (nextValidationError) {
      return;
    }

    const payload = {
      salary_amount: String(form.salary_amount).trim(),
      salary_basis: form.salary_basis,
      currency_code: form.currency_code.trim(),
      effective_from: form.effective_from.trim(),
      reason: form.reason.trim()
    };

    if (mode === "edit") {
      payload.expected_updated_at = expectedUpdatedAt.trim();
    }

    await onSubmit(payload);
  };

  const primaryButtonLabel =
    mode === "edit"
      ? submitting
        ? "Saving Draft..."
        : "Save Draft"
      : submitting
        ? "Creating Draft..."
        : "Create Draft";

  return (
    <div className="salary-modal-backdrop" role="presentation">
      <div className="salary-modal" role="dialog" aria-modal="true" aria-labelledby="salary-modal-title">
        <h4 id="salary-modal-title">{title}</h4>
        <p className="salary-modal-note">{note}</p>

        <form className="salary-modal-form" onSubmit={handleSubmit}>
          <div className="profile-field">
            <span>New Salary Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="profile-input"
              value={form.salary_amount}
              onChange={(event) => handleChange("salary_amount", event.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="profile-field">
            <span>Salary Basis</span>
            <select
              className="profile-input"
              value={form.salary_basis}
              onChange={(event) => handleChange("salary_basis", event.target.value)}
              disabled={submitting}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="DAILY">Daily</option>
              <option value="HOURLY">Hourly</option>
            </select>
          </div>

          <div className="profile-field">
            <span>Currency</span>
            <input
              className="profile-input"
              value={form.currency_code}
              maxLength={3}
              onChange={(event) => handleChange("currency_code", event.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="profile-field">
            <span>Effective From</span>
            <input
              type="date"
              className="profile-input"
              value={form.effective_from}
              onChange={(event) => handleChange("effective_from", event.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="profile-field">
            <span>Reason</span>
            <textarea
              className="profile-input salary-modal-textarea"
              value={form.reason}
              onChange={(event) => handleChange("reason", event.target.value)}
              disabled={submitting}
            />
          </div>

          {validationError && <p className="profile-error">{validationError}</p>}
          {submitError && <p className="profile-error">{submitError}</p>}

          <div className="profile-form-actions salary-modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {primaryButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
