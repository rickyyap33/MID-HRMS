import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();


  const handleLogin = async () => {

    try {

      const response = await api.post("/login", {
        email,
        password
      });


      localStorage.setItem(
        "token",
        response.data.token
      );


      alert("Login Successful");

      navigate("/dashboard");


    } catch (error) {

      alert(
        error.response?.data?.message 
        || "Login Failed"
      );

    }

  };


  return (
    <div style={{
      padding:"50px"
    }}>

      <h1>
        MID Studio HRMS
      </h1>


      <input
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />


      <br/><br/>


      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />


      <br/><br/>


      <button onClick={handleLogin}>
        Login
      </button>


    </div>
  );
}