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

export default function Sidebar(){

  return (
    <div className="sidebar">

      <h2>MID Studio</h2>
      <p>HRMS</p>

      <nav>

        <Link to="/">
          <LayoutDashboard size={20}/>
          Dashboard
        </Link>

        <Link to="/employees">
          <Users size={20}/>
          Employees
        </Link>

        <Link to="/attendance">
          <CalendarCheck size={20}/>
          Attendance
        </Link>

        <Link to="/leave">
          <FileText size={20}/>
          Leave Management
        </Link>

        <Link to="#">
          <Wallet size={20}/>
          Payroll
        </Link>

        <Link to="#">
          <Bot size={20}/>
          AI Assistant
        </Link>

        <Link to="#">
          <Settings size={20}/>
          Settings
        </Link>

      </nav>

    </div>
  );
}