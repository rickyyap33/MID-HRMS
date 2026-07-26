import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  Wallet,
  Bot,
  Settings
} from "lucide-react";

import { Link } from "react-router-dom";

export default function Sidebar({ isMobileOpen = false, onNavigate }){

  const handleNavigate = () => {
    if (typeof onNavigate === "function") {
      onNavigate();
    }
  };

  return (
    <div className={`sidebar ${isMobileOpen ? "sidebar-open" : ""}`}>

      <h2>MID Studio</h2>
      <p>HRMS</p>

      <nav>

        <Link to="/" onClick={handleNavigate}>
          <LayoutDashboard size={20}/>
          Dashboard
        </Link>

        <Link to="/employees" onClick={handleNavigate}>
          <Users size={20}/>
          Employees
        </Link>

        <Link to="/attendance" onClick={handleNavigate}>
          <CalendarCheck size={20}/>
          Attendance
        </Link>

        <Link to="/leave" onClick={handleNavigate}>
          <FileText size={20}/>
          Leave Management
        </Link>

        <div className="sidebar-placeholder" aria-disabled="true" title="Coming soon">
          <Wallet size={20}/>
          <span>Payroll</span>
          <small>Coming Soon</small>
        </div>

        <div className="sidebar-placeholder" aria-disabled="true" title="Coming soon">
          <Bot size={20}/>
          <span>AI Assistant</span>
          <small>Coming Soon</small>
        </div>

        <div className="sidebar-placeholder" aria-disabled="true" title="Coming soon">
          <Settings size={20}/>
          <span>Settings</span>
          <small>Coming Soon</small>
        </div>

      </nav>

    </div>
  );
}