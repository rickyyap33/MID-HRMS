import { useEffect, useState } from "react";
import axios from "axios";

function App() {

  const [employees, setEmployees] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    position: "",
    department: ""
  });


  const loadEmployees = () => {

    axios
      .get("http://localhost:5000/employees")
      .then((response) => {
        setEmployees(response.data);
      });

  };


  useEffect(() => {
    loadEmployees();
  }, []);


  const handleSubmit = (e) => {

    e.preventDefault();

    axios
      .post(
        "http://localhost:5000/employees",
        form
      )
      .then(() => {

        setForm({
          name:"",
          email:"",
          position:"",
          department:""
        });

        loadEmployees();

      });

  };


  return (

    <div>

      <h1>MID Studio HRMS</h1>


      <h2>Add Employee</h2>


      <form onSubmit={handleSubmit}>

        <input
          placeholder="Name"
          value={form.name}
          onChange={(e)=>setForm({...form,name:e.target.value})}
        />

        <br/>


        <input
          placeholder="Email"
          value={form.email}
          onChange={(e)=>setForm({...form,email:e.target.value})}
        />

        <br/>


        <input
          placeholder="Position"
          value={form.position}
          onChange={(e)=>setForm({...form,position:e.target.value})}
        />

        <br/>


        <input
          placeholder="Department"
          value={form.department}
          onChange={(e)=>setForm({...form,department:e.target.value})}
        />

        <br/><br/>


        <button type="submit">
          Save Employee
        </button>


      </form>


      <hr/>


      <h2>Employee List</h2>


      <table border="1">

        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Position</th>
            <th>Department</th>
          </tr>
        </thead>


        <tbody>

        {employees.map((employee)=>(

          <tr key={employee.id}>

            <td>{employee.id}</td>
            <td>{employee.name}</td>
            <td>{employee.email}</td>
            <td>{employee.position}</td>
            <td>{employee.department}</td>

          </tr>

        ))}

        </tbody>

      </table>


    </div>

  );

}

export default App;