import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Login from "./pages/Login";

import "./App.css";


function Layout(){
  const location = useLocation();
  const isLoginRoute = location.pathname === "/login";
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (

    <div className={`layout ${isLoginRoute ? "layout-login" : ""}`}>

      {!isLoginRoute ? (
        <>
          <Sidebar
            isMobileOpen={isMobileSidebarOpen}
            onNavigate={() => setIsMobileSidebarOpen(false)}
          />
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label="Open navigation"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu size={18} />
            Menu
          </button>
          <div
            className={`sidebar-overlay ${isMobileSidebarOpen ? "sidebar-overlay-open" : ""}`}
            role="presentation"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        </>
      ) : null}

      <main className={`content ${isLoginRoute ? "content-login" : ""}`}>

        <div className={`page-shell ${isLoginRoute ? "page-shell-login" : ""}`}>

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