import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Login from "./pages/Login";

import "./App.css";


function Layout(){

  return (

    <div className="layout">

      <Sidebar />

      <main className="content">

        <div className="page-shell">

          <Routes>

            <Route path="/" element={<Dashboard />} />

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/login" element={<Login />} />

            <Route 
              path="/employees" 
              element={<Employees />} 
            />

            <Route
              path="/employees/:id/profile"
              element={<EmployeeProfile />}
            />

            <Route
              path="/attendance"
              element={<Attendance />}
            />

            <Route
              path="/leave"
              element={<Leave />}
            />

          </Routes>

        </div>

      </main>

    </div>

  )

}



function App(){

  return (

    <BrowserRouter>

      <Layout />

    </BrowserRouter>

  )

}


export default App;