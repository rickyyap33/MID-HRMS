import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function Leave(){
  const initialFormData = {
    employeeId: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: ""
  };

  const initialHistoryFilters = {
    employeeId: "",
    status: "",
    leaveTypeId: "",
    startDate: "",
    endDate: ""
  };

  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [selectedBalanceEmployeeId, setSelectedBalanceEmployeeId] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [historyFilters, setHistoryFilters] = useState(initialHistoryFilters);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchEmployees = async () => {
    const response = await api.get("/employees");
    const employeeList = response.data || [];
    setEmployees(employeeList);
    return employeeList;
  };

  const fetchLeaveTypes = async () => {
    const response = await api.get("/leave-types");
    setLeaveTypes(response.data || []);
  };

  const fetchLeaveRequests = async () => {
    const response = await api.get("/leave-requests");
    setLeaveRequests(response.data || []);
  };

  const fetchLeaveHistory = async (filters = historyFilters) => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const endpoint = filters.employeeId
        ? `/employees/${filters.employeeId}/leave-history`
        : "/leave-history";

      const response = await api.get(endpoint);
      let historyRows = response.data || [];

      if (filters.status) {
        historyRows = historyRows.filter((row) => row.status === filters.status);
      }

      if (filters.leaveTypeId) {
        historyRows = historyRows.filter(
          (row) => Number(row.leave_type_id) === Number(filters.leaveTypeId)
        );
      }

      if (filters.startDate) {
        historyRows = historyRows.filter((row) => {
          const startDate = normalizeApiDateToLocalDate(row.start_date);
          const filterStartDate = normalizeApiDateToLocalDate(filters.startDate);

          if (!startDate || !filterStartDate) return false;
          return startDate.getTime() >= filterStartDate.getTime();
        });
      }

      if (filters.endDate) {
        historyRows = historyRows.filter((row) => {
          const endDate = normalizeApiDateToLocalDate(row.end_date);
          const filterEndDate = normalizeApiDateToLocalDate(filters.endDate);

          if (!endDate || !filterEndDate) return false;
          return endDate.getTime() <= filterEndDate.getTime();
        });
      }

      setLeaveHistory(historyRows);
    } catch (err) {
      setLeaveHistory([]);
      setHistoryError(err.response?.data?.message || "Failed to load leave history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadPageData = async () => {
    setLoading(true);
    try {
      const employeeList = await fetchEmployees();

      if (!selectedBalanceEmployeeId && employeeList.length > 0) {
        setSelectedBalanceEmployeeId(String(employeeList[0].id));
      }

      await Promise.all([
        fetchLeaveTypes(),
        fetchLeaveRequests(),
        fetchLeaveHistory(initialHistoryFilters)
      ]);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const fetchLeaveBalance = async (employeeId) => {
    if (!employeeId) {
      setLeaveBalance([]);
      setBalanceError("");
      return;
    }

    setBalanceLoading(true);
    setBalanceError("");

    try {
      const response = await api.get(`/employees/${employeeId}/leave-balance`);
      setLeaveBalance(response.data || []);
    } catch (err) {
      setLeaveBalance([]);
      setBalanceError(err.response?.data?.message || "Failed to load leave balance");
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveBalance(selectedBalanceEmployeeId);
  }, [selectedBalanceEmployeeId]);

  const employeeNameMap = useMemo(() => {
    const map = new Map();

    employees.forEach((employee) => {
      const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
      const displayName = employee.name || fullName || `Employee #${employee.id}`;
      map.set(String(employee.id), displayName);
    });

    return map;
  }, [employees]);

  const leaveTypeNameMap = useMemo(() => {
    const map = new Map();

    leaveTypes.forEach((leaveType) => {
      map.set(String(leaveType.id), leaveType.name || leaveType.type_name || `Leave #${leaveType.id}`);
    });

    return map;
  }, [leaveTypes]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHistoryFilterChange = (event) => {
    const { name, value } = event.target;
    setHistoryFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyHistoryFilters = async () => {
    await fetchLeaveHistory(historyFilters);
  };

  const handleResetHistoryFilters = async () => {
    setHistoryFilters(initialHistoryFilters);
    await fetchLeaveHistory(initialHistoryFilters);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.employeeId || !formData.leave_type_id || !formData.start_date || !formData.end_date) {
      setError("Employee, leave type, start date, and end date are required");
      setSuccessMessage("");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await api.post(`/employees/${formData.employeeId}/leave-request`, {
        leave_type_id: Number(formData.leave_type_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason || null
      });

      setSuccessMessage("Leave request submitted successfully");
      setFormData(initialFormData);
      await fetchLeaveRequests();
      await fetchLeaveHistory(historyFilters);

      if (selectedBalanceEmployeeId) {
        await fetchLeaveBalance(selectedBalanceEmployeeId);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value) => {
    const date = normalizeApiDateToLocalDate(value);
    if (!date) return "-";
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

  const getEmployeeName = (request) => {
    const fullName = `${request.first_name || ""} ${request.last_name || ""}`.trim();
    if (fullName) return fullName;
    return employeeNameMap.get(String(request.employee_id)) || `Employee #${request.employee_id}`;
  };

  const getLeaveTypeName = (request) => {
    return request.type_name || request.leave_type || leaveTypeNameMap.get(String(request.leave_type_id)) || `Leave #${request.leave_type_id}`;
  };

  const getLeaveTypeAbbreviation = (request) => {
    const leaveTypeName = getLeaveTypeName(request);

    const knownAbbreviations = {
      "Annual Leave": "AL",
      "Sick Leave": "MC",
      "Emergency Leave": "EL",
      "Unpaid Leave": "UL"
    };

    if (knownAbbreviations[leaveTypeName]) {
      return knownAbbreviations[leaveTypeName];
    }

    return leaveTypeName
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("") || "LV";
  };

  const handleBalanceEmployeeChange = (event) => {
    setSelectedBalanceEmployeeId(event.target.value);
  };

  const getStatusBadgeStyle = (status) => {
    if (status === "Approved") {
      return {
        background: "#dcfce7",
        color: "#166534"
      };
    }

    if (status === "Rejected") {
      return {
        background: "#fee2e2",
        color: "#991b1b"
      };
    }

    return {
      background: "#fef3c7",
      color: "#92400e"
    };
  };

  const renderStatusBadge = (status, label = status || "Pending") => {
    return (
      <span
        className="leave-status-badge"
        style={getStatusBadgeStyle(status || "Pending")}
      >
        {label}
      </span>
    );
  };

  const normalizeApiDateToLocalDate = (value) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const monthTitle = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(currentMonthDate);

  const calendarWeeks = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];

    for (let i = 0; i < firstDayIndex; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(year, month, day);

      const dayEvents = leaveHistory.filter((record) => {
        const startDate = normalizeApiDateToLocalDate(record.start_date);
        const endDate = normalizeApiDateToLocalDate(record.end_date);
        if (!startDate || !endDate) return false;
        return cellDate >= startDate && cellDate <= endDate;
      });

      cells.push({
        day,
        date: cellDate,
        events: dayEvents
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return weeks;
  }, [currentMonthDate, leaveHistory]);

  const handlePreviousMonth = () => {
    setCurrentMonthDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const handleLeaveAction = async (requestId, action) => {
    setProcessingRequestId(requestId);
    setError("");
    setSuccessMessage("");

    try {
      await api.put(`/leave-requests/${requestId}/${action}`, {
        approved_by: null
      });

      setSuccessMessage(
        action === "approve"
          ? "Leave request approved successfully"
          : "Leave request rejected successfully"
      );

      await fetchLeaveRequests();
      await fetchLeaveHistory(historyFilters);

      if (selectedBalanceEmployeeId) {
        await fetchLeaveBalance(selectedBalanceEmployeeId);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update leave request");
    } finally {
      setProcessingRequestId(null);
    }
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <div>
          <h1 className="leave-page-title">Leave Management</h1>
          <p className="employees-subtitle">Manage leave balances and requests</p>
        </div>
      </div>

      <section className="profile-card">
        <h2>Leave Summary</h2>

        <div className="profile-fields">
          <select
            className="profile-input"
            value={selectedBalanceEmployeeId}
            onChange={handleBalanceEmployeeChange}
          >
            <option value="">Select Employee for Balance</option>
            {employees.map((employee) => (
              <option key={employee.id} value={String(employee.id)}>
                {employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || `Employee #${employee.id}`}
              </option>
            ))}
          </select>
        </div>

        {balanceError ? <p className="profile-error">{balanceError}</p> : null}

        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Entitled</th>
                <th>Used</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {balanceLoading ? (
                <tr>
                  <td colSpan="4" className="table-empty">
                    Loading leave balance...
                  </td>
                </tr>
              ) : !selectedBalanceEmployeeId ? (
                <tr>
                  <td colSpan="4" className="table-empty">
                    Select an employee to view leave balance
                  </td>
                </tr>
              ) : leaveBalance.length === 0 ? (
                <tr>
                  <td colSpan="4" className="table-empty">
                    No leave balance data available
                  </td>
                </tr>
              ) : (
                leaveBalance.map((balance) => (
                  <tr key={balance.leave_type}>
                    <td>{balance.leave_type || "-"}</td>
                    <td>{balance.entitled ?? 0}</td>
                    <td>{balance.used ?? 0}</td>
                    <td>{balance.remaining ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="profile-card">
        <h2>Apply Leave</h2>

        <form className="document-form" onSubmit={handleSubmit}>
          <div className="profile-fields profile-fields-three">
            <select
              className="profile-input"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
            >
              <option value="">Select Employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={String(employee.id)}>
                  {employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || `Employee #${employee.id}`}
                </option>
              ))}
            </select>

            <select
              className="profile-input"
              name="leave_type_id"
              value={formData.leave_type_id}
              onChange={handleChange}
            >
              <option value="">Select Leave Type</option>
              {leaveTypes.map((leaveType) => (
                <option key={leaveType.id} value={String(leaveType.id)}>
                  {leaveType.name || leaveType.type_name || `Leave #${leaveType.id}`}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="profile-input"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
            />
            <input
              type="date"
              className="profile-input"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
            />

            <textarea
              className="profile-input"
              rows={3}
              placeholder="Reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
            />
          </div>

          {successMessage ? <p className="profile-success">{successMessage}</p> : null}
          {error ? <p className="profile-error">{error}</p> : null}

          <div className="profile-form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Leave Request"}
            </button>
          </div>
        </form>
      </section>

      <section className="profile-card">
        <h2>Leave Requests</h2>

        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    Loading leave requests...
                  </td>
                </tr>
              ) : leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No leave requests yet
                  </td>
                </tr>
              ) : (
                leaveRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{getEmployeeName(request)}</td>
                    <td>{getLeaveTypeName(request)}</td>
                    <td>{formatDate(request.start_date)}</td>
                    <td>{formatDate(request.end_date)}</td>
                    <td>{renderStatusBadge(request.status || "Pending")}</td>
                    <td>
                      <div className="table-actions">
                        {request.status === "Pending" ? (
                          <>
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={processingRequestId === request.id}
                              onClick={() => handleLeaveAction(request.id, "approve")}
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="btn-danger"
                              disabled={processingRequestId === request.id}
                              onClick={() => handleLeaveAction(request.id, "reject")}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="profile-muted">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="profile-card">
        <h2>Leave History</h2>

        <div className="profile-fields profile-fields-three">
          <select
            className="profile-input"
            name="employeeId"
            value={historyFilters.employeeId}
            onChange={handleHistoryFilterChange}
          >
            <option value="">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={String(employee.id)}>
                {employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || `Employee #${employee.id}`}
              </option>
            ))}
          </select>

          <select
            className="profile-input"
            name="status"
            value={historyFilters.status}
            onChange={handleHistoryFilterChange}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            className="profile-input"
            name="leaveTypeId"
            value={historyFilters.leaveTypeId}
            onChange={handleHistoryFilterChange}
          >
            <option value="">All Leave Types</option>
            {leaveTypes.map((leaveType) => (
              <option key={leaveType.id} value={String(leaveType.id)}>
                {leaveType.name || leaveType.type_name || `Leave #${leaveType.id}`}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="profile-input"
            name="startDate"
            value={historyFilters.startDate}
            onChange={handleHistoryFilterChange}
          />

          <input
            type="date"
            className="profile-input"
            name="endDate"
            value={historyFilters.endDate}
            onChange={handleHistoryFilterChange}
          />
        </div>

        <div className="profile-form-actions">
          <button type="button" className="btn-secondary" onClick={handleApplyHistoryFilters}>
            Apply Filters
          </button>
          <button type="button" className="btn-secondary" onClick={handleResetHistoryFilters}>
            Reset
          </button>
        </div>

        {historyError ? <p className="profile-error">{historyError}</p> : null}

        <div className="employee-table-wrap leave-history-wrap">
          <table className="employee-table leave-history-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Total Days</th>
                <th>Status</th>
                <th>Approved At</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan="8" className="table-empty">
                    Loading leave history...
                  </td>
                </tr>
              ) : leaveHistory.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty">
                    No leave history found
                  </td>
                </tr>
              ) : (
                leaveHistory.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employee_name || getEmployeeName(row)}</td>
                    <td>{row.leave_type || getLeaveTypeName(row)}</td>
                    <td>{formatDate(row.start_date)}</td>
                    <td>{formatDate(row.end_date)}</td>
                    <td>{row.total_days ?? "-"}</td>
                    <td>{renderStatusBadge(row.status || "Pending")}</td>
                    <td>{formatDateTime(row.approved_at)}</td>
                    <td>{formatDateTime(row.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="profile-card">
        <div className="employees-header">
          <div>
            <h2>Leave Calendar</h2>
            <p className="profile-muted">{monthTitle}</p>
          </div>

          <div className="table-actions">
            <button type="button" className="btn-secondary" onClick={handlePreviousMonth}>
              Previous
            </button>
            <button type="button" className="btn-secondary" onClick={handleNextMonth}>
              Next
            </button>
          </div>
        </div>

        <div className="employee-table-wrap leave-calendar-wrap">
          <table className="employee-table leave-calendar-table" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                <th>Sun</th>
                <th>Mon</th>
                <th>Tue</th>
                <th>Wed</th>
                <th>Thu</th>
                <th>Fri</th>
                <th>Sat</th>
              </tr>
            </thead>

            <tbody>
              {calendarWeeks.map((week, weekIndex) => (
                <tr key={`week-${weekIndex}`}>
                  {week.map((cell, dayIndex) => (
                    <td
                      key={`day-${weekIndex}-${dayIndex}`}
                      className="leave-calendar-cell"
                      style={{
                        verticalAlign: "top",
                        height: "132px",
                        width: "14.28%"
                      }}
                    >
                      {cell ? (
                        <>
                          <div className="leave-calendar-day-number" style={{ fontWeight: 700, marginBottom: "8px" }}>{cell.day}</div>

                          <div className="leave-calendar-events" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {cell.events.map((event) => (
                              <span
                                key={`${event.id}-${cell.day}`}
                                className="leave-calendar-chip"
                                style={{
                                  ...getStatusBadgeStyle(event.status || "Pending"),
                                  display: "inline-block",
                                  borderRadius: "999px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }}
                                title={`${event.employee_name || getEmployeeName(event)} - ${event.leave_type || getLeaveTypeName(event)} (${event.status || "Pending"})`}
                              >
                                <span className="leave-calendar-chip-name">{event.employee_name || getEmployeeName(event)}</span>
                                <span className="leave-calendar-chip-separator"> </span>
                                <span className="leave-calendar-chip-type">{getLeaveTypeAbbreviation(event)}</span>
                              </span>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
