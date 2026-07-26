import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Employees() {
	const [employees, setEmployees] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [pageMessage, setPageMessage] = useState("");
	const [pageError, setPageError] = useState("");
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [employeeForm, setEmployeeForm] = useState({
		name: "",
		email: "",
		position: "",
		department: ""
	});
	const [editingEmployeeId, setEditingEmployeeId] = useState(null);
	const [modalError, setModalError] = useState("");
	const [modalSubmitting, setModalSubmitting] = useState(false);

	const fetchEmployees = useCallback(async (showLoading = true) => {
		if (showLoading) {
			setLoading(true);
		}

		try {
			const response = await api.get("/employees");
			setEmployees(response.data || []);
		} catch (error) {
			setPageError(error.response?.data?.message || "Failed to load employees.");
		} finally {
			if (showLoading) {
				setLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		fetchEmployees();
	}, [fetchEmployees]);

	const resetForm = () => {
		setEmployeeForm({
			name: "",
			email: "",
			position: "",
			department: ""
		});
	};

	const openAddModal = () => {
		setPageError("");
		setPageMessage("");
		setModalError("");
		setEditingEmployeeId(null);
		resetForm();
		setIsAddModalOpen(true);
	};

	const openEditModal = (employeeId) => {
		const target = employees.find((emp) => emp.id === employeeId);
		if (!target) return;

		setPageError("");
		setPageMessage("");
		setModalError("");
		setEditingEmployeeId(employeeId);
		setEmployeeForm({
			name: target.name || "",
			email: target.email || "",
			position: target.position || "",
			department: target.department || ""
		});
		setIsEditModalOpen(true);
	};

	const closeModals = () => {
		if (modalSubmitting) return;

		setIsAddModalOpen(false);
		setIsEditModalOpen(false);
		setModalError("");
		setEditingEmployeeId(null);
	};

	const handleFormChange = (field, value) => {
		if (modalError) {
			setModalError("");
		}
		setEmployeeForm((prev) => ({ ...prev, [field]: value }));
	};

	const validateEmployeeForm = () => {
		const trimmedName = employeeForm.name.trim();
		const trimmedEmail = employeeForm.email.trim();
		const trimmedPosition = employeeForm.position.trim();
		const trimmedDepartment = employeeForm.department.trim();

		if (!trimmedName) return "Name is required.";
		if (!trimmedEmail) return "Email is required.";
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return "Email format is invalid.";
		if (!trimmedPosition) return "Position is required.";
		if (!trimmedDepartment) return "Department is required.";

		return "";
	};

	const handleAddEmployeeSubmit = async (event) => {
		event.preventDefault();

		if (modalSubmitting) return;

		const validationError = validateEmployeeForm();
		if (validationError) {
			setModalError(validationError);
			return;
		}

		setModalSubmitting(true);
		setModalError("");

		try {
			await api.post("/employees", {
				name: employeeForm.name.trim(),
				email: employeeForm.email.trim(),
				position: employeeForm.position.trim(),
				department: employeeForm.department.trim()
			});

			setIsAddModalOpen(false);
			resetForm();
			await fetchEmployees(false);
			setPageError("");
			setPageMessage("Employee added successfully.");
		} catch (error) {
			setModalError(error.response?.data?.message || "Failed to add employee.");
		} finally {
			setModalSubmitting(false);
		}
	};

	const handleEditEmployeeSubmit = async (event) => {
		event.preventDefault();

		if (modalSubmitting || !editingEmployeeId) return;

		const validationError = validateEmployeeForm();
		if (validationError) {
			setModalError(validationError);
			return;
		}

		setModalSubmitting(true);
		setModalError("");

		try {
			await api.put(`/employees/${editingEmployeeId}`, {
				name: employeeForm.name.trim(),
				email: employeeForm.email.trim(),
				position: employeeForm.position.trim(),
				department: employeeForm.department.trim()
			});

			setIsEditModalOpen(false);
			setEditingEmployeeId(null);
			await fetchEmployees(false);
			setPageError("");
			setPageMessage("Employee updated successfully.");
		} catch (error) {
			setModalError(error.response?.data?.message || "Failed to update employee.");
		} finally {
			setModalSubmitting(false);
		}
	};

	const handleDeleteEmployee = (employeeId) => {
		const confirmed = window.confirm("Delete this employee?");
		if (!confirmed) return;

		setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
	};

	const filteredEmployees = useMemo(() => {
		const keyword = searchTerm.toLowerCase().trim();
		if (!keyword) return employees;

		return employees.filter((emp) => {
			const idValue = String(emp.id || "").toLowerCase();
			const nameValue = String(emp.name || "").toLowerCase();
			const emailValue = String(emp.email || "").toLowerCase();
			const positionValue = String(emp.position || "").toLowerCase();
			const departmentValue = String(emp.department || "").toLowerCase();

			return (
				idValue.includes(keyword) ||
				nameValue.includes(keyword) ||
				emailValue.includes(keyword) ||
				positionValue.includes(keyword) ||
				departmentValue.includes(keyword)
			);
		});
	}, [employees, searchTerm]);

	const formatDate = (value) => {
		if (!value) return "-";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "-";
		return date.toLocaleDateString();
	};

	return (
		<div className="employees-page">
			<div className="employees-header">
				<div>
					<h1>Employees</h1>
					<p className="employees-subtitle">Manage your team directory</p>
				</div>

				<button
					className="btn-primary"
					onClick={openAddModal}
				>
					Add Employee
				</button>
			</div>

			{pageMessage ? <p className="profile-success">{pageMessage}</p> : null}
			{pageError ? <p className="profile-error">{pageError}</p> : null}

			<div className="employees-toolbar">
				<input
					type="text"
					className="employee-search"
					placeholder="Search employee"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
			</div>

			<div className="employee-table-wrap">
				<table className="employee-table">
					<thead>
						<tr>
							<th>Employee ID</th>
							<th>Name</th>
							<th>Email</th>
							<th>Position</th>
							<th>Department</th>
							<th>Created Date</th>
							<th>Action</th>
						</tr>
					</thead>

					<tbody>
						{loading ? (
							<tr>
								<td colSpan="7" className="table-empty">
									Loading employees...
								</td>
							</tr>
						) : filteredEmployees.length === 0 ? (
							<tr>
								<td colSpan="7" className="table-empty">
									No employees found.
								</td>
							</tr>
						) : (
							filteredEmployees.map((employee) => (
								<tr key={employee.id}>
									<td>{employee.id || "-"}</td>
									<td>{employee.name || "-"}</td>
									<td>{employee.email || "-"}</td>
									<td>{employee.position || "-"}</td>
									<td>{employee.department || "-"}</td>
									<td>{formatDate(employee.created_at || employee.createdAt || employee.created_date)}</td>
									<td>
										<div className="table-actions">
											<Link
												className="btn-secondary profile-link"
												to={`/employees/${employee.id}/profile`}
											>
												View Profile
											</Link>

											<button
												className="btn-secondary"
												onClick={() => openEditModal(employee.id)}
											>
												Edit
											</button>

											<button
												className="btn-danger"
												onClick={() => handleDeleteEmployee(employee.id)}
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

			{isAddModalOpen ? (
				<div className="salary-modal-backdrop" role="presentation">
					<div className="salary-modal" role="dialog" aria-modal="true" aria-labelledby="add-employee-title">
						<h4 id="add-employee-title">Add Employee</h4>
						<p className="salary-modal-note">Create a new employee record.</p>

						<form className="salary-modal-form" onSubmit={handleAddEmployeeSubmit} noValidate>
							<div className="profile-field">
								<span>Full Name</span>
								<input
									className="profile-input"
									value={employeeForm.name}
									onChange={(e) => handleFormChange("name", e.target.value)}
									disabled={modalSubmitting}
								/>
							</div>

							<div className="profile-field">
								<span>Email</span>
								<input
									className="profile-input"
									type="email"
									value={employeeForm.email}
									onChange={(e) => handleFormChange("email", e.target.value)}
									disabled={modalSubmitting}
								/>
							</div>

							<div className="profile-field">
								<span>Position</span>
								<input
									className="profile-input"
									value={employeeForm.position}
									onChange={(e) => handleFormChange("position", e.target.value)}
									disabled={modalSubmitting}
								/>
							</div>

							<div className="profile-field">
								<span>Department</span>
								<input
									className="profile-input"
									value={employeeForm.department}
									onChange={(e) => handleFormChange("department", e.target.value)}
									disabled={modalSubmitting}
								/>
							</div>

							{modalError ? <p className="profile-error">{modalError}</p> : null}

							<div className="profile-form-actions salary-modal-actions">
								<button type="button" className="btn-secondary" onClick={closeModals} disabled={modalSubmitting}>
									Cancel
								</button>
								<button type="submit" className="btn-primary" disabled={modalSubmitting}>
									{modalSubmitting ? "Adding..." : "Add Employee"}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			{isEditModalOpen ? (
				<div className="salary-modal-backdrop" role="presentation">
					<div className="salary-modal" role="dialog" aria-modal="true" aria-labelledby="edit-employee-title">
						<h4 id="edit-employee-title">Edit Employee</h4>
						<p className="salary-modal-note">Update the employee record.</p>

						<form className="salary-modal-form" onSubmit={handleEditEmployeeSubmit} noValidate>
							<div className="profile-field">
								<span>Full Name</span>
								<input
									className="profile-input"
									value={employeeForm.name}
									onChange={(e) => handleFormChange("name", e.target.value)}
									disabled={modalSubmitting}
								/>
							</div>

							<div className="profile-field">
								<span>Email</span>
								<input
									className="profile-input"
									type="email"
									value={employeeForm.email}
									onChange={(e) => handleFormChange("email", e.target.value)}
									disabled={modalSubmitting}
								/>
							</div>

							<div className="profile-field">
								<span>Position</span>
								<input
									className="profile-input"
									value={employeeForm.position}
									onChange={(e) => handleFormChange("position", e.target.value)}
									disabled={modalSubmitting}
								/>
							</div>

							<div className="profile-field">
								<span>Department</span>
								<input
									className="profile-input"
									value={employeeForm.department}
									onChange={(e) => handleFormChange("department", e.target.value)}
									disabled={modalSubmitting}
								/>
							</div>

							{modalError ? <p className="profile-error">{modalError}</p> : null}

							<div className="profile-form-actions salary-modal-actions">
								<button type="button" className="btn-secondary" onClick={closeModals} disabled={modalSubmitting}>
									Cancel
								</button>
								<button type="submit" className="btn-primary" disabled={modalSubmitting}>
									{modalSubmitting ? "Saving..." : "Save Changes"}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</div>
	);
}