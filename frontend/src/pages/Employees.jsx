import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Employees() {
	const [employees, setEmployees] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const fetchEmployees = async () => {
			try {
				const response = await api.get("/employees");
				setEmployees(response.data || []);
			} catch (error) {
				alert(error.response?.data?.message || "Failed to load employees");
			} finally {
				setLoading(false);
			}
		};

		fetchEmployees();
	}, []);

	const handleAddEmployee = async () => {
		const name = window.prompt("Employee Name");
		if (!name) return;

		const email = window.prompt("Employee Email");
		if (!email) return;

		const position = window.prompt("Position");
		if (!position) return;

		const department = window.prompt("Department");
		if (!department) return;

		setSaving(true);
		try {
			const response = await api.post("/employees", {
				name,
				email,
				position,
				department
			});

			setEmployees((prev) => [response.data, ...prev]);
		} catch (error) {
			alert(error.response?.data?.message || "Failed to add employee");
		} finally {
			setSaving(false);
		}
	};

	const handleEditEmployee = (employeeId) => {
		const target = employees.find((emp) => emp.id === employeeId);
		if (!target) return;

		const updatedName = window.prompt("Update Name", target.name || "");
		if (updatedName === null) return;

		const updatedEmail = window.prompt("Update Email", target.email || "");
		if (updatedEmail === null) return;

		const updatedPosition = window.prompt("Update Position", target.position || "");
		if (updatedPosition === null) return;

		const updatedDepartment = window.prompt("Update Department", target.department || "");
		if (updatedDepartment === null) return;

		setEmployees((prev) =>
			prev.map((emp) =>
				emp.id === employeeId
					? {
							...emp,
							name: updatedName,
							email: updatedEmail,
							position: updatedPosition,
							department: updatedDepartment
						}
					: emp
			)
		);
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
					onClick={handleAddEmployee}
					disabled={saving}
				>
					{saving ? "Saving..." : "Add Employee"}
				</button>
			</div>

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
												onClick={() => handleEditEmployee(employee.id)}
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
		</div>
	);
}