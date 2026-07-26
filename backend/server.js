const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());


const uploadRoot = path.join(__dirname, "uploads");
const employeeUploadRoot = path.join(uploadRoot, "employees");

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png"
]);

const allowedExtensions = new Set([
  ".pdf",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png"
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const employeeFolder = path.join(employeeUploadRoot, String(req.params.id));
    fs.mkdirSync(employeeFolder, { recursive: true });
    cb(null, employeeFolder);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, fileExtension)
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const safeBaseName = baseName || "document";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBaseName}-${uniqueSuffix}${fileExtension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(fileExtension) || !allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Unsupported file type. Allowed: PDF, DOCX, JPG, PNG."));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

fs.mkdirSync(employeeUploadRoot, { recursive: true });

app.use("/uploads", express.static(uploadRoot));


const resolveDocumentFile = (filePathValue) => {
  if (typeof filePathValue !== "string" || filePathValue.trim() === "") {
    const error = new Error("Invalid file path");
    error.statusCode = 400;
    throw error;
  }

  const normalizedFilePath = filePathValue.trim().replace(/^\/+/, "");

  if (!normalizedFilePath.startsWith("uploads/")) {
    const error = new Error("Invalid file path");
    error.statusCode = 403;
    throw error;
  }

  const resolvedPath = path.resolve(__dirname, normalizedFilePath);
  const resolvedUploadsRoot = path.resolve(uploadRoot);
  const withinUploadsRoot =
    resolvedPath === resolvedUploadsRoot ||
    resolvedPath.startsWith(`${resolvedUploadsRoot}${path.sep}`);

  if (!withinUploadsRoot) {
    const error = new Error("Invalid file path");
    error.statusCode = 403;
    throw error;
  }

  return resolvedPath;
};


const getBusinessDateMalaysia = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(new Date());
  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
};


const formatDateOnly = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    const parts = formatter.formatToParts(value);
    const dateParts = {};

    for (const part of parts) {
      if (part.type !== "literal") {
        dateParts[part.type] = part.value;
      }
    }

    return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  }

  return String(value).slice(0, 10);
};


const isValidDateOnlyValue = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }

  const [yearText, monthText, dayText] = trimmed.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === (month - 1)
    && date.getUTCDate() === day
  );
};


const isStrictPositiveNumericValue = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return false;
    }

    if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
      return false;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0;
  }

  return false;
};


const resolveEmployeeSalary = async (employeeId, targetDate) => {
  const result = await pool.query(
    `SELECT
      id,
      salary_amount,
      salary_basis,
      currency_code,
      effective_from,
      effective_to
    FROM employee_salary_history
    WHERE employee_id=$1
      AND record_status='PUBLISHED'
      AND effective_from <= $2
      AND (
        effective_to IS NULL
        OR effective_to >= $2
      )
    ORDER BY effective_from DESC, id DESC
    LIMIT 2`,
    [employeeId, targetDate]
  );

  if (result.rows.length === 0) {
    return null;
  }

  if (result.rows.length > 1) {
    const error = new Error("Salary history integrity error");
    error.statusCode = 500;
    error.employeeId = employeeId;
    error.targetDate = targetDate;
    throw error;
  }

  const salaryRow = result.rows[0];

  return {
    ...salaryRow,
    effective_from: formatDateOnly(salaryRow.effective_from),
    effective_to: formatDateOnly(salaryRow.effective_to)
  };
};


const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Unauthorized"
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    return res.status(401).json({
      message: "Unauthorized"
    });
  }

  const token = parts[1];

  if (!process.env.JWT_SECRET) {
    return res.status(401).json({
      message: "Unauthorized"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || typeof decoded !== "object") {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const hasSub = decoded.sub !== undefined && decoded.sub !== null;
    const hasId = decoded.id !== undefined && decoded.id !== null;

    const parsePositiveInteger = (value) => {
      if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return value;
      }

      if (typeof value === "string" && /^[1-9][0-9]*$/.test(value)) {
        const parsed = Number(value);
        return Number.isSafeInteger(parsed) ? parsed : null;
      }

      return null;
    };

    const parsedSubId = hasSub ? parsePositiveInteger(decoded.sub) : null;
    const parsedId = hasId ? parsePositiveInteger(decoded.id) : null;

    if (hasSub && hasId && parsedSubId !== null && parsedId !== null && parsedSubId !== parsedId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const resolvedUserId = parsedSubId !== null ? parsedSubId : parsedId;
    if (resolvedUserId === null) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (typeof decoded.role !== "string" || decoded.role.trim() === "") {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    req.user = {
      id: resolvedUserId,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized"
    });
  }
};


const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden"
      });
    }

    next();
  };
};


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


// Update Employee
app.put("/employees/:id", async(req,res)=>{

  const { id } = req.params;

  const {
    name,
    email,
    position,
    department
  } = req.body;

  try {

    const result = await pool.query(
      `UPDATE employees
      SET name=$1,
        email=$2,
        position=$3,
        department=$4
      WHERE id=$5
      RETURNING *`,
      [
        name,
        email,
        position,
        department,
        id
      ]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Employee not found"
      });
    }


    res.json(result.rows[0]);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Delete Employee
app.delete("/employees/:id", async(req,res)=>{

  const { id } = req.params;

  try {

    const result = await pool.query(
      "DELETE FROM employees WHERE id=$1 RETURNING id",
      [id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Employee not found"
      });
    }


    res.json({
      message:"Employee deleted successfully"
    });

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get Employee Profile
app.get("/employees/:id/profile", async(req,res)=>{

  const { id } = req.params;

  try {

    const result = await pool.query(
      "SELECT * FROM employee_profiles WHERE employee_id=$1",
      [id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Employee profile not found"
      });
    }


    res.json(result.rows[0]);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Create Employee Profile
app.post("/employees/:id/profile", async(req,res)=>{

  const { id } = req.params;

  const {
    phone,
    address,
    date_of_birth,
    emergency_contact_name,
    emergency_contact_phone
  } = req.body;

  try {

    const result = await pool.query(
      `INSERT INTO employee_profiles
      (employee_id,phone,address,date_of_birth,emergency_contact_name,emergency_contact_phone)
      VALUES($1,$2,$3,$4,$5,$6)
      RETURNING *`,
      [
        id,
        phone,
        address,
        date_of_birth,
        emergency_contact_name,
        emergency_contact_phone
      ]
    );


    res.json(result.rows[0]);

  } catch(error){

    console.log(error);

    if(error.code === "23503"){
      return res.status(404).json({
        message:"Employee not found"
      });
    }


    if(error.code === "23505"){
      return res.status(400).json({
        message:"Employee profile already exists"
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Update Employee Profile
app.put("/employees/:id/profile", async(req,res)=>{

  const { id } = req.params;

  const {
    phone,
    address,
    date_of_birth,
    emergency_contact_name,
    emergency_contact_phone
  } = req.body;

  try {

    const result = await pool.query(
      `UPDATE employee_profiles
      SET phone=$1,
          address=$2,
          date_of_birth=$3,
          emergency_contact_name=$4,
          emergency_contact_phone=$5,
          updated_at=now()
      WHERE employee_id=$6
      RETURNING *`,
      [
        phone,
        address,
        date_of_birth,
        emergency_contact_name,
        emergency_contact_phone,
        id
      ]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Employee profile not found"
      });
    }


    res.json(result.rows[0]);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get Employment Details
app.get("/employees/:id/employment", authenticateToken, requireRoles("Admin"), async(req,res)=>{

  const { id } = req.params;

  try {

    const result = await pool.query(
      "SELECT * FROM employment_details WHERE employee_id=$1",
      [id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Employment details not found"
      });
    }


    const businessDate = getBusinessDateMalaysia();
    const salary = await resolveEmployeeSalary(id, businessDate);
    const employment = result.rows[0];

    res.json({
      ...employment,
      salary_amount: salary ? salary.salary_amount : null,
      salary_basis: salary ? salary.salary_basis : null,
      salary_currency_code: salary ? salary.currency_code : null,
      salary_effective_from: salary ? salary.effective_from : null,
      salary_configured: Boolean(salary)
    });

  } catch(error){

    if(error.message === "Salary history integrity error"){
      console.error("Salary history integrity error", {
        employeeId: id,
        targetDate: getBusinessDateMalaysia()
      });

      return res.status(500).json({
        message:"Salary history integrity error"
      });
    }

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get Salary History (Admin only)
app.get("/employees/:id/salary-history", authenticateToken, requireRoles("Admin"), async(req,res)=>{

  const { id } = req.params;

  if(!/^[1-9][0-9]*$/.test(id)){
    return res.status(400).json({
      message:"Invalid employee id"
    });
  }

  try {

    const employeeResult = await pool.query(
      "SELECT id FROM employees WHERE id=$1",
      [id]
    );


    if(employeeResult.rows.length === 0){
      return res.status(404).json({
        message:"Employee not found"
      });
    }


    const salaryHistoryResult = await pool.query(
      `SELECT id,
              employee_id,
              salary_amount,
              salary_basis,
              currency_code,
              effective_from,
              effective_to,
              record_status,
              reason,
              source_type,
              source_reference,
              created_by_user_id,
              approved_by_user_id,
              approved_at,
              cancelled_by_user_id,
              cancelled_at,
              created_at,
              updated_at
       FROM employee_salary_history
       WHERE employee_id=$1
       ORDER BY effective_from DESC, id DESC`,
      [id]
    );

    const salaryHistory = salaryHistoryResult.rows.map((row) => ({
      ...row,
      effective_from: formatDateOnly(row.effective_from),
      effective_to: formatDateOnly(row.effective_to)
    }));

    res.json({
      employee_id: Number(id),
      salary_history: salaryHistory
    });

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Create Salary Draft (Admin only)
app.post("/employees/:id/salary-history/drafts", authenticateToken, requireRoles("Admin"), async(req,res)=>{

  const { id } = req.params;

  if(!/^[1-9][0-9]*$/.test(id)){
    return res.status(400).json({
      message:"Invalid employee id"
    });
  }

  if(req.body === null || typeof req.body !== "object" || Array.isArray(req.body)){
    return res.status(400).json({
      message:"Invalid request body"
    });
  }

  const forbiddenFields = new Set([
    "employee_id",
    "record_status",
    "source_type",
    "created_by_user_id",
    "approved_by_user_id",
    "approved_at",
    "cancelled_by_user_id",
    "cancelled_at",
    "effective_to",
    "role",
    "user_id"
  ]);

  const allowedFields = new Set([
    "salary_amount",
    "salary_basis",
    "currency_code",
    "effective_from",
    "reason",
    "source_reference"
  ]);

  const bodyKeys = Object.keys(req.body);
  const forbiddenField = bodyKeys.find((key) => forbiddenFields.has(key));

  if(forbiddenField){
    return res.status(400).json({
      message:`Forbidden field: ${forbiddenField}`
    });
  }

  const unexpectedField = bodyKeys.find((key) => !allowedFields.has(key));

  if(unexpectedField){
    return res.status(400).json({
      message:`Unexpected field: ${unexpectedField}`
    });
  }

  const {
    salary_amount,
    salary_basis,
    currency_code,
    effective_from,
    reason,
    source_reference
  } = req.body;

  if(salary_amount === undefined || !isStrictPositiveNumericValue(salary_amount)){
    return res.status(400).json({
      message:"Invalid salary_amount"
    });
  }

  if(typeof salary_basis !== "string" || !["MONTHLY", "WEEKLY", "DAILY", "HOURLY"].includes(salary_basis.trim())){
    return res.status(400).json({
      message:"Invalid salary_basis"
    });
  }

  if(typeof currency_code !== "string" || !/^[A-Z]{3}$/.test(currency_code.trim())){
    return res.status(400).json({
      message:"Invalid currency_code"
    });
  }

  if(!isValidDateOnlyValue(effective_from)){
    return res.status(400).json({
      message:"Invalid effective_from"
    });
  }

  if(typeof reason !== "string" || reason.trim() === ""){
    return res.status(400).json({
      message:"Invalid reason"
    });
  }

  if(source_reference !== undefined && source_reference !== null && typeof source_reference !== "string"){
    return res.status(400).json({
      message:"Invalid source_reference"
    });
  }

  const employeeId = Number(id);
  const createdByUserId = req.user.id;
  const normalizedSalaryAmount = typeof salary_amount === "string" ? salary_amount.trim() : salary_amount;
  const normalizedSalaryBasis = salary_basis.trim();
  const normalizedCurrencyCode = currency_code.trim();
  const normalizedEffectiveFrom = effective_from.trim();
  const normalizedReason = reason.trim();
  const normalizedSourceReference = source_reference === undefined ? null : source_reference;

  const client = await pool.connect();
  let transactionActive = false;

  try {

    await client.query("BEGIN");
    transactionActive = true;

    const employeeResult = await client.query(
      "SELECT id FROM employees WHERE id=$1",
      [employeeId]
    );

    if(employeeResult.rows.length === 0){
      await client.query("ROLLBACK");
      transactionActive = false;

      return res.status(404).json({
        message:"Employee not found"
      });
    }

    const insertResult = await client.query(
      `INSERT INTO employee_salary_history (
          employee_id,
          salary_amount,
          salary_basis,
          currency_code,
          effective_from,
          effective_to,
          record_status,
          reason,
          source_type,
          source_reference,
          created_by_user_id,
          approved_by_user_id,
          approved_at,
          cancelled_by_user_id,
          cancelled_at
        ) VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NULL,
          'DRAFT',
          $6,
          'MANUAL',
          $7,
          $8,
          NULL,
          NULL,
          NULL,
          NULL
        )
        RETURNING id,
                  employee_id,
                  salary_amount,
                  salary_basis,
                  currency_code,
                  effective_from,
                  effective_to,
                  record_status,
                  reason,
                  source_type,
                  source_reference,
                  created_by_user_id,
                  approved_by_user_id,
                  approved_at,
                  cancelled_by_user_id,
                  cancelled_at,
                  created_at,
                  updated_at`,
      [
        employeeId,
        normalizedSalaryAmount,
        normalizedSalaryBasis,
        normalizedCurrencyCode,
        normalizedEffectiveFrom,
        normalizedReason,
        normalizedSourceReference,
        createdByUserId
      ]
    );

    await client.query("COMMIT");
    transactionActive = false;

    const draft = insertResult.rows[0];

    return res.status(201).json({
      message:"Salary draft created",
      draft:{
        ...draft,
        effective_from: formatDateOnly(draft.effective_from),
        effective_to: formatDateOnly(draft.effective_to)
      }
    });

  } catch(error){

    if(transactionActive){
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
    }

    if(error.code === "23505" && error.constraint === "uq_employee_salary_history_one_active_draft_per_employee"){
      return res.status(409).json({
        message:"Active draft already exists for this employee."
      });
    }

    if(error.code === "23514"){
      return res.status(400).json({
        message:"Invalid salary draft payload"
      });
    }

    if(error.code === "23503" && error.constraint === "employee_salary_history_employee_id_fkey"){
      return res.status(404).json({
        message:"Employee not found"
      });
    }

    console.log(error);

    return res.status(500).json({
      message:"Server error"
    });

  } finally {
    client.release();
  }
});


// Create Employment Details
// Legacy salary_amount is compatibility data only; salary changes belong in employee_salary_history.
app.post("/employees/:id/employment", authenticateToken, requireRoles("Admin"), async(req,res)=>{

  const { id } = req.params;

  const {
    join_date,
    employment_type,
    manager_id,
    salary_amount,
    employment_status
  } = req.body;

  try {

    const result = await pool.query(
      `INSERT INTO employment_details
      (employee_id,join_date,employment_type,manager_id,employment_status)
      VALUES($1,$2,$3,$4,$5)
      RETURNING *`,
      [
        id,
        join_date,
        employment_type,
        manager_id,
        employment_status
      ]
    );


    res.json(result.rows[0]);

  } catch(error){

    console.log(error);

    if(error.code === "23503"){
      return res.status(404).json({
        message:"Employee or manager not found"
      });
    }


    if(error.code === "23505"){
      return res.status(400).json({
        message:"Employment details already exists"
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Update Employment Details
app.put("/employees/:id/employment", authenticateToken, requireRoles("Admin"), async(req,res)=>{

  const { id } = req.params;

  const {
    join_date,
    employment_type,
    manager_id,
    salary_amount,
    employment_status
  } = req.body;

  try {

    const result = await pool.query(
      `UPDATE employment_details
      SET join_date=$1,
          employment_type=$2,
          manager_id=$3,
          employment_status=$4,
          updated_at=now()
      WHERE employee_id=$5
      RETURNING *`,
      [
        join_date,
        employment_type,
        manager_id,
        employment_status,
        id
      ]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Employment details not found"
      });
    }


    res.json(result.rows[0]);

  } catch(error){

    console.log(error);

    if(error.code === "23503"){
      return res.status(404).json({
        message:"Manager not found"
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get Employee Documents
app.get("/employees/:id/documents", async(req,res)=>{

  const { id } = req.params;

  try {

    const result = await pool.query(
      "SELECT * FROM employee_documents WHERE employee_id=$1 ORDER BY id DESC",
      [id]
    );


    res.json(result.rows);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// View Employee Document
app.get("/documents/:id/view", async(req,res)=>{

  const { id } = req.params;

  try {

    const result = await pool.query(
      "SELECT file_path, file_name FROM employee_documents WHERE id=$1",
      [id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Document not found"
      });
    }


    const document = result.rows[0];
    const resolvedFilePath = resolveDocumentFile(document.file_path);

    if(!fs.existsSync(resolvedFilePath)){
      return res.status(404).json({
        message:"File not found"
      });
    }


    res.sendFile(resolvedFilePath);

  } catch(error){

    console.log(error);

    if(error.statusCode === 400 || error.statusCode === 403){
      return res.status(error.statusCode).json({
        message:error.message
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Download Employee Document
app.get("/documents/:id/download", async(req,res)=>{

  const { id } = req.params;

  try {

    const result = await pool.query(
      "SELECT file_path, file_name FROM employee_documents WHERE id=$1",
      [id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Document not found"
      });
    }


    const document = result.rows[0];
    const resolvedFilePath = resolveDocumentFile(document.file_path);

    if(!fs.existsSync(resolvedFilePath)){
      return res.status(404).json({
        message:"File not found"
      });
    }


    res.download(resolvedFilePath, document.file_name || path.basename(resolvedFilePath));

  } catch(error){

    console.log(error);

    if(error.statusCode === 400 || error.statusCode === 403){
      return res.status(error.statusCode).json({
        message:error.message
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Create Employee Document Metadata
app.post("/employees/:id/documents", (req,res)=>{

  upload.single("file")(req,res, async(error)=>{

    if(error){

      console.log(error);

      if(error.code === "LIMIT_FILE_SIZE"){
        return res.status(413).json({
          message:"File size must be 10MB or less."
        });
      }


      return res.status(400).json({
        message:error.message || "File upload failed."
      });

    }

    const { id } = req.params;

    if(!req.file){
      return res.status(400).json({
        message:"File is required"
      });
    }


    const { document_type } = req.body;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const generatedDocumentName = path
      .basename(req.file.originalname, fileExtension)
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .replace(/^_+|_+$/g, "") || "document";
    const relativeFilePath = `/uploads/employees/${id}/${req.file.filename}`;

    if(!document_type){
      try {
        await fs.promises.unlink(req.file.path);
      } catch(unlinkError){
        console.log(unlinkError);
      }

      return res.status(400).json({
        message:"document_type is required"
      });
    }

    try {

      const result = await pool.query(
        `INSERT INTO employee_documents
        (employee_id,document_type,document_name,file_name,file_path,file_mime_type,file_size_bytes)
        VALUES($1,$2,$3,$4,$5,$6,$7)
        RETURNING *`,
        [
          id,
          document_type,
          generatedDocumentName,
          req.file.filename,
          relativeFilePath,
          req.file.mimetype,
          req.file.size
        ]
      );


      res.json(result.rows[0]);

    } catch(error){

      console.log(error);

      try {
        await fs.promises.unlink(req.file.path);
      } catch(unlinkError){
        console.log(unlinkError);
      }

      if(error.code === "23503"){
        return res.status(404).json({
          message:"Employee not found"
        });
      }


      res.status(500).json({
        message:"Server error"
      });

    }
  });
});


// Delete Employee Document
app.delete("/documents/:id", async(req,res)=>{

  const { id } = req.params;

  try {

    const result = await pool.query(
      "DELETE FROM employee_documents WHERE id=$1 RETURNING id",
      [id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Document not found"
      });
    }


    res.json({
      message:"Document deleted successfully",
      id: result.rows[0].id
    });

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get All Attendance Records
app.get("/attendance", async(req,res)=>{

  try {

    const result = await pool.query(
      `SELECT *
       FROM attendance_records
       ORDER BY attendance_date DESC, id DESC`
    );


    res.json(result.rows);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get Attendance Records For One Employee
app.get("/employees/:id/attendance", async(req,res)=>{

  const { id } = req.params;

  try {

    const employeeCheck = await pool.query(
      "SELECT id FROM employees WHERE id=$1",
      [id]
    );


    if(employeeCheck.rows.length === 0){
      return res.status(404).json({
        message:"Employee not found"
      });
    }


    const result = await pool.query(
      `SELECT *
       FROM attendance_records
       WHERE employee_id=$1
       ORDER BY attendance_date DESC, id DESC`,
      [id]
    );


    res.json(result.rows);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Add Attendance Record
app.post("/employees/:id/attendance", async(req,res)=>{

  const { id } = req.params;

  const {
    attendance_date,
    check_in_time,
    check_out_time,
    status,
    remarks
  } = req.body;

  try {

    const result = await pool.query(
      `INSERT INTO attendance_records
       (employee_id, attendance_date, check_in_time, check_out_time, status, remarks)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id, attendance_date, check_in_time, check_out_time, status, remarks]
    );


    res.status(201).json({
      message:"Attendance record created successfully",
      record: result.rows[0]
    });

  } catch(error){

    console.error(error.message);
    console.error(error.stack);

    if(error.code === "23503"){
      return res.status(404).json({
        message:"Employee not found"
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Update Attendance Record
app.put("/attendance/:id", async(req,res)=>{

  const { id } = req.params;

  const {
    attendance_date,
    check_in_time,
    check_out_time,
    status,
    remarks
  } = req.body;

  try {

    const result = await pool.query(
      `UPDATE attendance_records
       SET attendance_date=$1,
           check_in_time=$2,
           check_out_time=$3,
           status=$4,
           remarks=$5
       WHERE id=$6
       RETURNING *`,
      [attendance_date, check_in_time, check_out_time, status, remarks, id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Attendance record not found"
      });
    }


    res.json({
      message:"Attendance record updated successfully",
      record: result.rows[0]
    });

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Delete Attendance Record
app.delete("/attendance/:id", async(req,res)=>{

  const { id } = req.params;

  try {

    const result = await pool.query(
      "DELETE FROM attendance_records WHERE id=$1 RETURNING *",
      [id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Attendance record not found"
      });
    }


    res.json({
      message:"Attendance record deleted successfully",
      record: result.rows[0]
    });

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get Leave Types
app.get("/leave-types", async(req,res)=>{

  try {

    const result = await pool.query(
      `SELECT *
       FROM leave_types
       ORDER BY id ASC`
    );


    res.json(result.rows);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get All Leave Requests
app.get("/leave-requests", async(req,res)=>{

  try {

    const result = await pool.query(
      `SELECT lr.*, e.name AS employee_name, lt.name AS type_name
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       ORDER BY lr.created_at DESC, lr.id DESC`
    );


    res.json(result.rows);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Create Leave Request
app.post("/employees/:id/leave-request", async(req,res)=>{

  const { id } = req.params;

  const {
    leave_type_id,
    start_date,
    end_date,
    reason,
    status
  } = req.body;

  try {

    const result = await pool.query(
      `INSERT INTO leave_requests
       (employee_id, leave_type_id, start_date, end_date, reason, status)
       VALUES($1,$2,$3,$4,$5,COALESCE($6, 'Pending'))
       RETURNING *`,
      [id, leave_type_id, start_date, end_date, reason, status]
    );


    res.status(201).json({
      message:"Leave request created successfully",
      request: result.rows[0]
    });

  } catch(error){

    console.log(error);

    if(error.code === "23503"){
      return res.status(404).json({
        message:"Employee or leave type not found"
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Approve Leave Request
app.put("/leave-requests/:id/approve", async(req,res)=>{

  const { id } = req.params;

  const { approved_by } = req.body;

  try {

    const result = await pool.query(
      `UPDATE leave_requests
       SET status='Approved', approved_by=$1, approved_at=NOW(), updated_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [approved_by, id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Leave request not found"
      });
    }


    res.json({
      message:"Leave request approved successfully",
      request: result.rows[0]
    });

  } catch(error){

    console.log(error);

    if(error.code === "23503"){
      return res.status(404).json({
        message:"Approver not found"
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Reject Leave Request
app.put("/leave-requests/:id/reject", async(req,res)=>{

  const { id } = req.params;

  const { approved_by } = req.body;

  try {

    const result = await pool.query(
      `UPDATE leave_requests
       SET status='Rejected', approved_by=$1, approved_at=NOW(), updated_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [approved_by, id]
    );


    if(result.rows.length === 0){
      return res.status(404).json({
        message:"Leave request not found"
      });
    }


    res.json({
      message:"Leave request rejected successfully",
      request: result.rows[0]
    });

  } catch(error){

    console.log(error);

    if(error.code === "23503"){
      return res.status(404).json({
        message:"Approver not found"
      });
    }


    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get Leave Balance For One Employee
app.get("/employees/:id/leave-balance", async(req,res)=>{

  const { id } = req.params;

  try {

    const employeeCheck = await pool.query(
      "SELECT id FROM employees WHERE id=$1",
      [id]
    );


    if(employeeCheck.rows.length === 0){
      return res.status(404).json({
        message:"Employee not found"
      });
    }


    const leaveTypesResult = await pool.query(
      `SELECT id, name, days_allowed
       FROM leave_types
       ORDER BY id ASC`
    );


    const approvedUsageResult = await pool.query(
      `SELECT leave_type_id,
              COALESCE(SUM((end_date - start_date) + 1), 0)::int AS used_days
       FROM leave_requests
       WHERE employee_id=$1
         AND status='Approved'
       GROUP BY leave_type_id`,
      [id]
    );


    const usedByType = new Map(
      approvedUsageResult.rows.map((row) => [
        Number(row.leave_type_id),
        Number(row.used_days)
      ])
    );


    const balances = leaveTypesResult.rows.map((type) => {

      const entitled = Number(type.days_allowed) || 0;
      const used = usedByType.get(Number(type.id)) || 0;

      return {
        leave_type: type.name,
        entitled,
        used,
        remaining: entitled - used
      };
    });


    res.json(balances);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get All Leave History
app.get("/leave-history", async(req,res)=>{

  try {

    const result = await pool.query(
      `SELECT lr.id,
              lr.employee_id,
              e.name AS employee_name,
              lr.leave_type_id,
              lt.name AS leave_type,
              lr.start_date,
              lr.end_date,
              (lr.end_date - lr.start_date + 1)::int AS total_days,
              lr.reason,
              lr.status,
              lr.approved_by,
              lr.approved_at,
              lr.created_at,
              lr.updated_at
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       ORDER BY lr.created_at DESC, lr.id DESC`
    );


    res.json(result.rows);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
});


// Get Leave History For One Employee
app.get("/employees/:id/leave-history", async(req,res)=>{

  const { id } = req.params;

  try {

    const employeeCheck = await pool.query(
      "SELECT id FROM employees WHERE id=$1",
      [id]
    );


    if(employeeCheck.rows.length === 0){
      return res.status(404).json({
        message:"Employee not found"
      });
    }


    const result = await pool.query(
      `SELECT lr.id,
              lr.employee_id,
              e.name AS employee_name,
              lr.leave_type_id,
              lt.name AS leave_type,
              lr.start_date,
              lr.end_date,
              (lr.end_date - lr.start_date + 1)::int AS total_days,
              lr.reason,
              lr.status,
              lr.approved_by,
              lr.approved_at,
              lr.created_at,
              lr.updated_at
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.employee_id=$1
       ORDER BY lr.created_at DESC, lr.id DESC`,
      [id]
    );


    res.json(result.rows);

  } catch(error){

    console.log(error);

    res.status(500).json({
      message:"Server error"
    });

  }
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
        sub:String(user.id),
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