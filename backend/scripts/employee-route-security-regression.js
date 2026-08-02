require('dotenv').config();
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const baseUrl = 'http://127.0.0.1:5000';

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const makeToken = (role, options = {}) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing');
  }

  const payload = {
    sub: String(options.userId || 1),
    id: options.userId || 1,
    role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: options.expiresIn || '1h'
  });
};

const requestStatus = async (method, route, token) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers
  });

  return response.status;
};

const findTargets = async (client) => {
  const employeeRow = await client.query(`
    SELECT id
    FROM employees
    ORDER BY id ASC
    LIMIT 1
  `);
  assert(employeeRow.rows.length === 1, 'No employee rows available for security regression');

  const employeeId = employeeRow.rows[0].id;

  const profileRow = await client.query(
    'SELECT employee_id FROM employee_profiles WHERE employee_id = $1 LIMIT 1',
    [employeeId]
  );

  const employmentRow = await client.query(
    'SELECT employee_id FROM employment_details WHERE employee_id = $1 LIMIT 1',
    [employeeId]
  );

  const salaryHistoryRow = await client.query(
    'SELECT employee_id FROM employee_salary_history WHERE employee_id = $1 LIMIT 1',
    [employeeId]
  );

  return {
    employeeId,
    hasProfile: profileRow.rows.length === 1,
    hasEmployment: employmentRow.rows.length === 1,
    hasSalaryHistory: salaryHistoryRow.rows.length === 1
  };
};

const main = async () => {
  const client = await pool.connect();

  try {
    const targets = await findTargets(client);
    const routes = [
      { method: 'GET', route: '/employees', category: 'employee-list', expectAdmin: 200 },
      { method: 'GET', route: `/employees/${targets.employeeId}/profile`, category: 'employee-profile', expectAdmin: targets.hasProfile ? 200 : 404 },
      { method: 'GET', route: `/employees/${targets.employeeId}/employment`, category: 'employee-employment', expectAdmin: targets.hasEmployment ? 200 : 404 },
      { method: 'GET', route: `/employees/${targets.employeeId}/salary-history`, category: 'employee-salary-history', expectAdmin: targets.hasSalaryHistory ? 200 : 404 },
      { method: 'GET', route: `/employees/${targets.employeeId}/documents`, category: 'employee-documents', expectAdmin: 200 },
      { method: 'GET', route: `/employees/${targets.employeeId}/attendance`, category: 'employee-attendance', expectAdmin: 200 },
      { method: 'GET', route: `/employees/${targets.employeeId}/leave-balance`, category: 'employee-leave-balance', expectAdmin: 200 },
      { method: 'GET', route: `/employees/${targets.employeeId}/leave-history`, category: 'employee-leave-history', expectAdmin: 200 }
    ];

    const adminToken = makeToken('Admin');
    const hrToken = makeToken('HR');
    const supervisorToken = makeToken('Supervisor');
    const invalidToken = 'invalid.token.value';
    const expiredToken = makeToken('Admin', { expiresIn: '-1s' });

    const results = [];

    for (const item of routes) {
      const missingTokenStatus = await requestStatus(item.method, item.route, null);
      assert(missingTokenStatus === 401, `Missing-token request unexpectedly returned ${missingTokenStatus} for ${item.route}`);
      results.push({ route: item.route, scenario: 'missing-token', status: missingTokenStatus, expected: 401, result: 'PASS' });

      const invalidTokenStatus = await requestStatus(item.method, item.route, invalidToken);
      assert(invalidTokenStatus === 401, `Invalid-token request unexpectedly returned ${invalidTokenStatus} for ${item.route}`);
      results.push({ route: item.route, scenario: 'invalid-token', status: invalidTokenStatus, expected: 401, result: 'PASS' });

      const expiredTokenStatus = await requestStatus(item.method, item.route, expiredToken);
      assert(expiredTokenStatus === 401, `Expired-token request unexpectedly returned ${expiredTokenStatus} for ${item.route}`);
      results.push({ route: item.route, scenario: 'expired-token', status: expiredTokenStatus, expected: 401, result: 'PASS' });

      const hrStatus = await requestStatus(item.method, item.route, hrToken);
      assert(hrStatus === 403, `HR token unexpectedly returned ${hrStatus} for ${item.route}`);
      results.push({ route: item.route, scenario: 'hr-role', status: hrStatus, expected: 403, result: 'PASS' });

      const supervisorStatus = await requestStatus(item.method, item.route, supervisorToken);
      assert(supervisorStatus === 403, `Supervisor token unexpectedly returned ${supervisorStatus} for ${item.route}`);
      results.push({ route: item.route, scenario: 'supervisor-role', status: supervisorStatus, expected: 403, result: 'PASS' });

      const adminStatus = await requestStatus(item.method, item.route, adminToken);
      assert(adminStatus === item.expectAdmin, `Admin token unexpectedly returned ${adminStatus} for ${item.route}; expected ${item.expectAdmin}`);
      results.push({ route: item.route, scenario: 'admin-role', status: adminStatus, expected: item.expectAdmin, result: 'PASS' });
    }

    console.log('EMPLOYEE ROUTE SECURITY REGRESSION PASS');
    console.log(JSON.stringify({
      employeeId: targets.employeeId,
      routesCovered: routes.length,
      results,
      crossCompanyCheck: {
        status: 'NOT AVAILABLE',
        reason: 'Current employee-access model has no company-scoped request or token boundary to exercise separately.'
      }
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(`EMPLOYEE ROUTE SECURITY REGRESSION FAIL: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});