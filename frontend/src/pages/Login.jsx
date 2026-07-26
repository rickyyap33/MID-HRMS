import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setLoginError("");
    setLoginNotice("");

    try {
      const response = await api.post("/login", {
        email,
        password
      });

      localStorage.setItem("token", response.data.token);
      setLoginNotice("Login successful. Redirecting to dashboard...");

      navigate("/dashboard");

    } catch (error) {
      setLoginError(error.response?.data?.message || "Login Failed");

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h1 className="page-title login-title">MID Studio HRMS</h1>
        <p className="employees-subtitle login-subtitle">Sign in to continue</p>

        {loginNotice ? <p className="profile-success">{loginNotice}</p> : null}
        {loginError ? <p className="profile-error">{loginError}</p> : null}

        <input
          className="profile-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />

        <input
          className="profile-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />

        <button className="btn-primary login-submit" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}