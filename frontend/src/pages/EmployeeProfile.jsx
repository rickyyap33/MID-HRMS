import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import SalaryManagementSection from "../components/SalaryManagementSection";
import ConfirmModal from "../components/ConfirmModal";

export default function EmployeeProfile() {
  const { id } = useParams();

  const emptyProfileForm = {
    phone: "",
    address: "",
    date_of_birth: "",
    emergency_contact_name: "",
    emergency_contact_phone: ""
  };

  const emptyEmploymentForm = {
    join_date: "",
    employment_type: "",
    manager_id: "",
    employment_status: ""
  };

  const emptyDocumentForm = {
    document_type: "",
    file: null
  };

  const [employee, setEmployee] = useState(null);
  const [profile, setProfile] = useState(null);
  const [employment, setEmployment] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [employmentForm, setEmploymentForm] = useState(emptyEmploymentForm);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingEmployment, setIsEditingEmployment] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmployment, setSavingEmployment] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState("");
  const [employmentUpdateError, setEmploymentUpdateError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [documentSuccessMessage, setDocumentSuccessMessage] = useState("");
  const [documentErrorMessage, setDocumentErrorMessage] = useState("");
  const [documentUploadKey, setDocumentUploadKey] = useState(0);
  const [openDocumentMenuId, setOpenDocumentMenuId] = useState(null);
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [salaryHistoryLoading, setSalaryHistoryLoading] = useState(true);
  const [salaryHistoryError, setSalaryHistoryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      try {
        const [employeesRes, profileRes, employmentRes] = await Promise.all([
          api.get("/employees"),
          api
            .get(`/employees/${id}/profile`)
            .then((res) => res)
            .catch((err) => {
              if (err.response?.status === 404) {
                return { data: null };
              }
              throw err;
            }),
          api
            .get(`/employees/${id}/employment`)
            .then((res) => res)
            .catch((err) => {
              if (err.response?.status === 404) {
                return { data: null };
              }
              throw err;
            })
        ]);

        const allEmployees = employeesRes.data || [];
        const currentEmployee = allEmployees.find((item) => String(item.id) === String(id));

        if (!currentEmployee) {
          setError("Employee not found.");
          setEmployee(null);
        } else {
          setEmployee(currentEmployee);
        }

        const nextProfile = profileRes.data || null;
        const nextEmployment = employmentRes.data || null;

        setProfile(nextProfile);
        setEmployment(nextEmployment);

        setProfileForm({
          phone: nextProfile?.phone || "",
          address: nextProfile?.address || "",
          date_of_birth: nextProfile?.date_of_birth || "",
          emergency_contact_name: nextProfile?.emergency_contact_name || "",
          emergency_contact_phone: nextProfile?.emergency_contact_phone || ""
        });

        setEmploymentForm({
          join_date: nextEmployment?.join_date || "",
          employment_type: nextEmployment?.employment_type || "",
          manager_id:
            nextEmployment?.manager_id === null || nextEmployment?.manager_id === undefined
              ? ""
              : String(nextEmployment.manager_id),
          employment_status: nextEmployment?.employment_status || ""
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load employee profile data.");
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [id]
  );

  useEffect(() => {
    const handleDocumentMenuOutsideClick = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (!event.target.closest(".document-dropdown")) {
        setOpenDocumentMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentMenuOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMenuOutsideClick);
    };
  }, []);

  const loadDocuments = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setDocumentsLoading(true);
      }

      setDocumentErrorMessage("");

      try {
        const response = await api.get(`/employees/${id}/documents`);
        setDocuments(response.data || []);
      } catch (err) {
        setDocumentErrorMessage(err.response?.data?.message || "Failed to load documents.");
      } finally {
        if (showLoading) {
          setDocumentsLoading(false);
        }
      }
    },
    [id]
  );

  const loadSalaryHistory = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setSalaryHistoryLoading(true);
      }

      setSalaryHistoryError("");

      try {
        const response = await api.get(`/employees/${id}/salary-history`);
        const rows = Array.isArray(response.data?.salary_history) ? response.data.salary_history : [];
        setSalaryHistory(rows);
      } catch (err) {
        if (err.response?.status === 403) {
          setSalaryHistoryError("You do not have permission to view salary information.");
        } else {
          setSalaryHistoryError("Failed to load salary information.");
        }
        setSalaryHistory([]);
      } finally {
        if (showLoading) {
          setSalaryHistoryLoading(false);
        }
      }
    },
    [id]
  );

  const refreshSalaryData = useCallback(async () => {
    await Promise.all([loadData(false), loadSalaryHistory(false)]);
  }, [loadData, loadSalaryHistory]);

  useEffect(() => {
    loadData(true);
    loadDocuments(true);
    loadSalaryHistory(true);
  }, [loadData, loadDocuments, loadSalaryHistory]);

  const handleDocumentSubmit = async (event) => {
    event.preventDefault();
    setDocumentSaving(true);
    setDocumentErrorMessage("");
    setDocumentSuccessMessage("");

    if (!documentForm.document_type || !documentForm.file) {
      setDocumentSaving(false);
      setDocumentErrorMessage("Please select a document type and file.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", documentForm.file);
      formData.append("document_type", documentForm.document_type);

      await api.post(`/employees/${id}/documents`, formData);

      await loadDocuments(false);
      setDocumentForm(emptyDocumentForm);
      setDocumentUploadKey((prev) => prev + 1);
      setDocumentSuccessMessage("Document added successfully.");
    } catch (err) {
      setDocumentErrorMessage(err.response?.data?.message || "Failed to add document.");
    } finally {
      setDocumentSaving(false);
    }
  };

  const handleDeleteDocument = (document) => {
    setPendingDeleteDocument(document);
  };

  const closeDeleteDocumentModal = () => {
    if (deletingDocumentId !== null) {
      return;
    }

    setPendingDeleteDocument(null);
  };

  const confirmDeleteDocument = async () => {
    const documentId = pendingDeleteDocument?.id;
    if (!documentId) {
      return;
    }

    setDeletingDocumentId(documentId);
    setDocumentErrorMessage("");
    setDocumentSuccessMessage("");

    try {
      await api.delete(`/documents/${documentId}`);
      await loadDocuments(false);
      setPendingDeleteDocument(null);
      setDocumentSuccessMessage("Document deleted successfully.");
    } catch (err) {
      setDocumentErrorMessage(err.response?.data?.message || "Failed to delete document.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleViewDocument = (documentId) => {
    window.open(`${api.defaults.baseURL}/documents/${documentId}/view`, "_blank", "noopener,noreferrer");
  };

  const handleDownloadDocument = (documentId) => {
    window.open(`${api.defaults.baseURL}/documents/${documentId}/download`, "_blank", "noopener,noreferrer");
  };

  const toggleDocumentMenu = (documentId) => {
    setOpenDocumentMenuId((prev) => (prev === documentId ? null : documentId));
  };

  const normalizeValue = (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  const formatDocumentDisplayName = (fileName) => {
    if (!fileName) return "-";

    const fileExtensionMatch = fileName.match(/\.[^.]+$/);
    const fileExtension = fileExtensionMatch ? fileExtensionMatch[0] : "";
    const baseName = fileExtension
      ? fileName.slice(0, -fileExtension.length)
      : fileName;

    const cleanedBaseName = baseName
      .replace(/-[0-9]{10,}-[0-9]+$/, "")
      .replace(/_/g, " ");

    return `${cleanedBaseName}${fileExtension}`;
  };

  const handleCancelProfile = () => {
    setProfileUpdateError("");
    setIsEditingProfile(false);
    setProfileForm({
      phone: profile?.phone || "",
      address: profile?.address || "",
      date_of_birth: profile?.date_of_birth || "",
      emergency_contact_name: profile?.emergency_contact_name || "",
      emergency_contact_phone: profile?.emergency_contact_phone || ""
    });
  };

  const handleCancelEmployment = () => {
    setEmploymentUpdateError("");
    setIsEditingEmployment(false);
    setEmploymentForm({
      join_date: employment?.join_date || "",
      employment_type: employment?.employment_type || "",
      manager_id:
        employment?.manager_id === null || employment?.manager_id === undefined
          ? ""
          : String(employment.manager_id),
      employment_status: employment?.employment_status || ""
    });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileUpdateError("");

    const payload = {
      phone: normalizeValue(profileForm.phone),
      address: normalizeValue(profileForm.address),
      date_of_birth: normalizeValue(profileForm.date_of_birth),
      emergency_contact_name: normalizeValue(profileForm.emergency_contact_name),
      emergency_contact_phone: normalizeValue(profileForm.emergency_contact_phone)
    };

    try {
      if (profile) {
        await api.put(`/employees/${id}/profile`, payload);
      } else {
        await api.post(`/employees/${id}/profile`, payload);
      }

      await loadData(false);
      setIsEditingProfile(false);
    } catch (err) {
      setProfileUpdateError(err.response?.data?.message || "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmployment = async () => {
    setSavingEmployment(true);
    setEmploymentUpdateError("");

    const payload = {
      join_date: normalizeValue(employmentForm.join_date),
      employment_type: normalizeValue(employmentForm.employment_type),
      manager_id: normalizeValue(employmentForm.manager_id),
      employment_status: normalizeValue(employmentForm.employment_status)
    };

    try {
      if (employment) {
        await api.put(`/employees/${id}/employment`, payload);
      } else {
        await api.post(`/employees/${id}/employment`, payload);
      }

      await loadData(false);
      setIsEditingEmployment(false);
    } catch (err) {
      setEmploymentUpdateError(err.response?.data?.message || "Failed to save employment details.");
    } finally {
      setSavingEmployment(false);
    }
  };

  const hasAnyDetails = useMemo(() => {
    return Boolean(profile || employment);
  }, [profile, employment]);

  if (loading) {
    return (
      <div className="profile-page">
        <h1 className="page-title">Employee Profile</h1>
        <p className="profile-muted">Loading profile information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-topbar">
          <h1 className="page-title">Employee Profile</h1>
          <Link className="btn-secondary profile-back-btn" to="/employees">
            Back to Employees
          </Link>
        </div>
        <div className="profile-card">
          <p className="profile-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-topbar">
        <div>
          <h1 className="page-title">Employee Profile</h1>
          <p className="employees-subtitle">Employee ID: {id}</p>
        </div>

        <Link className="btn-secondary profile-back-btn" to="/employees">
          Back to Employees
        </Link>
      </div>

      <div className="profile-grid">
        <section className="profile-card">
          <h2>Basic Information</h2>
          <div className="profile-fields">
            <div className="profile-field">
              <span>Name</span>
              <strong>{employee?.name || "-"}</strong>
            </div>
            <div className="profile-field">
              <span>Email</span>
              <strong>{employee?.email || "-"}</strong>
            </div>
            <div className="profile-field">
              <span>Position</span>
              <strong>{employee?.position || "-"}</strong>
            </div>
            <div className="profile-field">
              <span>Department</span>
              <strong>{employee?.department || "-"}</strong>
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-section-head">
            <h2>Personal Information</h2>
            <button
              className="btn-secondary profile-edit-btn"
              onClick={() => {
                setProfileUpdateError("");
                setIsEditingProfile(true);
              }}
              disabled={savingProfile}
            >
              {profile ? "Edit Profile" : "Add Personal Information"}
            </button>
          </div>

          {isEditingProfile ? (
            <div className="profile-fields">
              <div className="profile-field">
                <span>Phone</span>
                <input
                  className="profile-input"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      phone: e.target.value
                    }))
                  }
                />
              </div>
              <div className="profile-field">
                <span>Address</span>
                <input
                  className="profile-input"
                  value={profileForm.address}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      address: e.target.value
                    }))
                  }
                />
              </div>
              <div className="profile-field">
                <span>Date of Birth</span>
                <input
                  type="date"
                  className="profile-input"
                  value={profileForm.date_of_birth}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      date_of_birth: e.target.value
                    }))
                  }
                />
              </div>
              <div className="profile-field">
                <span>Emergency Contact Name</span>
                <input
                  className="profile-input"
                  value={profileForm.emergency_contact_name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      emergency_contact_name: e.target.value
                    }))
                  }
                />
              </div>
              <div className="profile-field">
                <span>Emergency Contact Phone</span>
                <input
                  className="profile-input"
                  value={profileForm.emergency_contact_phone}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      emergency_contact_phone: e.target.value
                    }))
                  }
                />
              </div>
            </div>
          ) : profile ? (
            <div className="profile-fields">
              <div className="profile-field">
                <span>Phone</span>
                <strong>{profile.phone || "-"}</strong>
              </div>
              <div className="profile-field">
                <span>Address</span>
                <strong>{profile.address || "-"}</strong>
              </div>
              <div className="profile-field">
                <span>Date of Birth</span>
                <strong>{profile.date_of_birth || "-"}</strong>
              </div>
              <div className="profile-field">
                <span>Emergency Contact Name</span>
                <strong>{profile.emergency_contact_name || "-"}</strong>
              </div>
              <div className="profile-field">
                <span>Emergency Contact Phone</span>
                <strong>{profile.emergency_contact_phone || "-"}</strong>
              </div>
            </div>
          ) : (
            <p className="profile-muted">No personal information yet.</p>
          )}

          {profileUpdateError && <p className="profile-error profile-inline-error">{profileUpdateError}</p>}

          {isEditingProfile && (
            <div className="profile-form-actions">
              <button
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
              <button
                className="btn-secondary"
                onClick={handleCancelProfile}
                disabled={savingProfile}
              >
                Cancel
              </button>
            </div>
          )}
        </section>

        <section className="profile-card profile-card-wide">
          <div className="profile-section-head">
            <h2>Employment Information</h2>
            <button
              className="btn-secondary profile-edit-btn"
              onClick={() => {
                setEmploymentUpdateError("");
                setIsEditingEmployment(true);
              }}
              disabled={savingEmployment}
            >
              {employment ? "Edit Employment" : "Add Employment Information"}
            </button>
          </div>

          {isEditingEmployment ? (
            <div className="profile-fields profile-fields-three">
              <div className="profile-field">
                <span>Join Date</span>
                <input
                  type="date"
                  className="profile-input"
                  value={employmentForm.join_date}
                  onChange={(e) =>
                    setEmploymentForm((prev) => ({
                      ...prev,
                      join_date: e.target.value
                    }))
                  }
                />
              </div>
              <div className="profile-field">
                <span>Employment Type</span>
                <input
                  className="profile-input"
                  value={employmentForm.employment_type}
                  onChange={(e) =>
                    setEmploymentForm((prev) => ({
                      ...prev,
                      employment_type: e.target.value
                    }))
                  }
                />
              </div>
              <div className="profile-field">
                <span>Manager ID</span>
                <input
                  className="profile-input"
                  value={employmentForm.manager_id}
                  onChange={(e) =>
                    setEmploymentForm((prev) => ({
                      ...prev,
                      manager_id: e.target.value
                    }))
                  }
                />
              </div>
              <div className="profile-field">
                <span>Status</span>
                <input
                  className="profile-input"
                  value={employmentForm.employment_status}
                  onChange={(e) =>
                    setEmploymentForm((prev) => ({
                      ...prev,
                      employment_status: e.target.value
                    }))
                  }
                />
              </div>
            </div>
          ) : employment ? (
            <div className="profile-fields profile-fields-three">
              <div className="profile-field">
                <span>Join Date</span>
                <strong>{employment.join_date || "-"}</strong>
              </div>
              <div className="profile-field">
                <span>Employment Type</span>
                <strong>{employment.employment_type || "-"}</strong>
              </div>
              <div className="profile-field">
                <span>Manager ID</span>
                <strong>{employment.manager_id || "-"}</strong>
              </div>
              <div className="profile-field">
                <span>Status</span>
                <strong>{employment.employment_status || "-"}</strong>
              </div>
            </div>
          ) : (
            <p className="profile-muted">No employment information yet.</p>
          )}

          {employmentUpdateError && <p className="profile-error profile-inline-error">{employmentUpdateError}</p>}

          {isEditingEmployment && (
            <div className="profile-form-actions">
              <button
                className="btn-primary"
                onClick={handleSaveEmployment}
                disabled={savingEmployment}
              >
                {savingEmployment ? "Saving..." : "Save Employment"}
              </button>
              <button
                className="btn-secondary"
                onClick={handleCancelEmployment}
                disabled={savingEmployment}
              >
                Cancel
              </button>
            </div>
          )}

          {!isEditingEmployment && employment && (
            <SalaryManagementSection
              employeeId={id}
              employment={employment}
              salaryHistory={salaryHistory}
              salaryHistoryLoading={salaryHistoryLoading}
              salaryHistoryError={salaryHistoryError}
              onRefresh={refreshSalaryData}
            />
          )}
        </section>

        <section className="profile-card profile-card-wide">
          <div className="profile-section-head">
            <h2>Documents</h2>
            <span className="document-count">{documents.length} records</span>
          </div>

          {documentSuccessMessage && (
            <p className="profile-success document-message document-message-success">
              {documentSuccessMessage}
            </p>
          )}

          {documentErrorMessage && (
            <p className="profile-error document-message document-message-error">
              {documentErrorMessage}
            </p>
          )}

          <form className="document-form" onSubmit={handleDocumentSubmit}>
            <div className="document-form-grid">
              <div className="profile-field">
                <span>Document Type</span>
                <select
                  className="profile-input"
                  value={documentForm.document_type}
                  onChange={(e) =>
                    setDocumentForm((prev) => ({
                      ...prev,
                      document_type: e.target.value
                    }))
                  }
                >
                  <option value="">Select document type</option>
                  <option value="Contract">Contract</option>
                  <option value="Resume">Resume</option>
                  <option value="Certificate">Certificate</option>
                  <option value="ID Proof">ID Proof</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="profile-field document-field-full">
                <span>File</span>
                <input
                  key={documentUploadKey}
                  type="file"
                  className="profile-input document-file-input"
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setDocumentForm((prev) => ({
                      ...prev,
                      file: e.target.files?.[0] || null
                    }))
                  }
                />
                <small className="document-helper-text">
                  Allowed: PDF, DOCX, JPG, PNG. Max size: 10MB.
                </small>
                {documentForm.file && (
                  <small className="document-selected-file">
                    Selected: {documentForm.file.name}
                  </small>
                )}
              </div>
            </div>

            <div className="profile-form-actions">
              <button className="btn-primary" type="submit" disabled={documentSaving}>
                {documentSaving ? "Saving..." : "Add Document"}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setDocumentForm(emptyDocumentForm);
                  setDocumentUploadKey((prev) => prev + 1);
                }}
                disabled={documentSaving}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="document-table-wrap">
            {documentsLoading ? (
              <div className="document-loading-state">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="document-empty-state">No documents found.</div>
            ) : (
              <table className="document-table employee-documents-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td>{formatDocumentDisplayName(document.file_name)}</td>
                      <td>{document.document_type || "-"}</td>
                      <td>
                        <div className="document-dropdown">
                          <button
                            type="button"
                            className="document-menu-trigger"
                            onClick={() => toggleDocumentMenu(document.id)}
                            aria-haspopup="menu"
                            aria-expanded={openDocumentMenuId === document.id}
                            aria-label="Document actions"
                          >
                            ⋮
                          </button>

                          {openDocumentMenuId === document.id && (
                            <div className="document-menu" role="menu">
                              <button
                                type="button"
                                className="document-menu-item"
                                onClick={() => {
                                  setOpenDocumentMenuId(null);
                                  handleViewDocument(document.id);
                                }}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="document-menu-item"
                                onClick={() => {
                                  setOpenDocumentMenuId(null);
                                  handleDownloadDocument(document.id);
                                }}
                              >
                                Download
                              </button>
                              <button
                                type="button"
                                className="document-menu-item document-menu-item-danger"
                                onClick={() => {
                                  setOpenDocumentMenuId(null);
                                  handleDeleteDocument(document);
                                }}
                                disabled={deletingDocumentId === document.id}
                              >
                                {deletingDocumentId === document.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {!hasAnyDetails && (
        <div className="profile-card">
          <p className="profile-muted">Profile and employment records are not created yet for this employee.</p>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDeleteDocument)}
        title="Delete Document?"
        message={`This will permanently delete ${
          pendingDeleteDocument?.file_name
            ? formatDocumentDisplayName(pendingDeleteDocument.file_name)
            : "the selected file"
        }.`}
        confirmLabel="Delete Document"
        cancelLabel="Cancel"
        isSubmitting={deletingDocumentId !== null}
        onCancel={closeDeleteDocumentModal}
        onConfirm={confirmDeleteDocument}
        variant="danger"
      />
    </div>
  );
}
