const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());


const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});


// Test API
app.get("/", (req,res)=>{
    res.json({
        message:"MID Studio HRMS API Running"
    });
});


// Get Employees
app.get("/employees", async(req,res)=>{
    const result = await pool.query(
        "SELECT * FROM employees ORDER BY id DESC"
    );

    res.json(result.rows);
});


// Create Employee
app.post("/employees", async(req,res)=>{

    const {
        name,
        email,
        position,
        department
    } = req.body;


    const result = await pool.query(
        `INSERT INTO employees
        (name,email,position,department)
        VALUES($1,$2,$3,$4)
        RETURNING *`,
        [
            name,
            email,
            position,
            department
        ]
    );


    res.json(result.rows[0]);
});


app.listen(process.env.PORT,()=>{
    console.log(
        `MID HRMS running on port ${process.env.PORT}`
    );
});
app.post("/login", async (req, res) => {

  const { email, password } = req.body;

  try {

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );


    if(result.rows.length === 0){
      return res.status(401).json({
        message:"User not found"
      });
    }


    const user = result.rows[0];


    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );


    if(!passwordMatch){

      return res.status(401).json({
        message:"Wrong password"
      });

    }


    const token = jwt.sign(
      {
        id:user.id,
        role:user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn:"8h"
      }
    );


    res.json({

      message:"Login successful",

      token,

      user:{
        id:user.id,
        name:user.name,
        role:user.role
      }

    });


  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }

});