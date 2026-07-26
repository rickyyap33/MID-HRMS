import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ConfirmModal from "../components/ConfirmModal";

export default function Attendance(){
  const initialFormData = {
    employeeId: "",
    attendance_date: "",
    check_in_time: "",
    check_out_time: "",
    status: "Present",
    remarks: ""
  };

  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState(null);

  const fetchAttendance = async () => {
    try {
      const response = await api.get("/attendance");
      setAttendance(response.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees");
      setEmployees(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load employees");
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, []);

  const employeeNameMap = useMemo(() => {
    const map = new Map();

    employees.forEach((employee) => {
      const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
      const displayName = employee.name || fullName || `Employee #${employee.id}`;
      map.set(String(employee.id), displayName);
    });

    return map;
  }, [employees]);

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(date);
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "-";
    return employeeNameMap.get(String(employeeId)) || `Employee #${employeeId}`;
  };

  const formatDateTimeLocal = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingRecordId(null);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.employeeId || !formData.attendance_date) {
      setError("Employee ID and Attendance Date are required");
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      if (editingRecordId) {
        await api.put(`/attendance/${editingRecordId}`, {
          attendance_date: formData.attendance_date,
          check_in_time: formData.check_in_time || null,
          check_out_time: formData.check_out_time || null,
          status: formData.status,
          remarks: formData.remarks || null
        });

        setSuccessMessage("Attendance record updated successfully");
        resetForm();

        setLoading(true);
        await fetchAttendance();
        return;
      }

      await api.post(`/employees/${formData.employeeId}/attendance`, {
        attendance_date: formData.attendance_date,
        check_in_time: formData.check_in_time || null,
        check_out_time: formData.check_out_time || null,
        status: formData.status,
        remarks: formData.remarks || null
      });

      setSuccessMessage("Attendance record added successfully");
      resetForm();

      setLoading(true);
      await fetchAttendance();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record) => {
    setError("");
    setSuccessMessage("");
    setEditingRecordId(record.id);

    setFormData({
      employeeId: String(record.employee_id || ""),
      attendance_date: record.attendance_date
        ? new Date(record.attendance_date).toISOString().slice(0, 10)
        : "",
      check_in_time: formatDateTimeLocal(record.check_in_time),
      check_out_time: formatDateTimeLocal(record.check_out_time),
      status: record.status || "Present",
      remarks: record.remarks || ""
    });
  };

  const handleCancelEdit = () => {
    setError("");
    setSuccessMessage("");
    resetForm();
  };

  const handleDelete = (record) => {
    setPendingDeleteRecord(record);
  };

  const closeDeleteModal = () => {
    if (submitting) return;
    setPendingDeleteRecord(null);
  };

  const confirmDelete = () => {
    if (!pendingDeleteRecord) return;

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    api.delete(`/attendance/${pendingDeleteRecord.id}`)
      .then(async () => {
        if (editingRecordId === pendingDeleteRecord.id) {
          resetForm();
        }

        setSuccessMessage("Attendance record deleted successfully");
        setPendingDeleteRecord(null);
        setLoading(true);
        await fetchAttendance();
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to delete attendance");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <div>
          <h1 className="page-title attendance-title">Attendance Management</h1>
          <p className="attendance-subtitle">Attendance Table</p>
        </div>
      </div>

      <section className="profile-card">
        <h2 className="attendance-section-title">{editingRecordId ? "Edit Attendance Record" : "Add Attendance Record"}</h2>

        <form className="document-form" onSubmit={handleSubmit}>
          <div className="profile-fields profile-fields-three">
            <select
              name="employeeId"
              className="profile-input"
              value={formData.employeeId}
              onChange={handleFieldChange}
            >
              <option value="">Select Employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={String(employee.id)}>
                  {getEmployeeName(employee.id)}
                </option>
              ))}
            </select>

            <input
              type="date"
              name="attendance_date"
              className="profile-input"
              value={formData.attendance_date}
              onChange={handleFieldChange}
            />

            <select
              name="status"
              className="profile-input"
              value={formData.status}
              onChange={handleFieldChange}
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="On Leave">On Leave</option>
              <option value="Holiday">Holiday</option>
            </select>

            <input
              type="datetime-local"
              name="check_in_time"
              className="profile-input"
              value={formData.check_in_time}
              onChange={handleFieldChange}
            />

            <input
              type="datetime-local"
              name="check_out_time"
              className="profile-input"
              value={formData.check_out_time}
              onChange={handleFieldChange}
            />

            <textarea
              name="remarks"
              className="profile-input"
              placeholder="Remarks"
              value={formData.remarks}
              onChange={handleFieldChange}
              rows={3}
            />
          </div>

          {successMessage ? <p className="profile-success">{successMessage}</p> : null}
          {error ? <p className="profile-error">{error}</p> : null}

          <div className="profile-form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : editingRecordId ? "Update Attendance" : "Add Attendance"}
            </button>

            {editingRecordId ? (
              <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section>
        <h2 className="attendance-section-title">Attendance Records</h2>
        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee Name</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    Loading attendance...
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No attendance records yet
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.attendance_date)}</td>
                    <td>{getEmployeeName(record.employee_id)}</td>
                    <td>{formatDateTime(record.check_in_time)}</td>
                    <td>{formatDateTime(record.check_out_time)}</td>
                    <td>{record.status || "-"}</td>
                    <td>{record.remarks || "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleEdit(record)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDelete(record)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteRecord)}
        title="Delete Attendance Record?"
        message={`This will delete attendance record #${pendingDeleteRecord?.id || ""}.`}
        confirmLabel="Delete Record"
        cancelLabel="Cancel"
        isSubmitting={submitting}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
        variant="danger"
      />
    </div>
  );
}
