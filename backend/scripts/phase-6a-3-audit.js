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

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const querySingleValue = async (client, sql, params = []) => {
  const result = await client.query(sql, params);
  return result.rows[0];
};

const getCounts = async (client) => {
  const tables = [
    'company_payroll_profile',
    'payroll_component_type',
    'payroll_component',
    'payroll_component_rule_version',
    'payroll_component_tax_flags_version'
  ];

  const counts = {};
  for (const table of tables) {
    const row = await querySingleValue(
      client,
      `SELECT count(*)::int AS count FROM public.${table}`
    );
    counts[table] = row.count;
  }

  return counts;
};

const verifySchema = async (client) => {
  const constraints = await client.query(`
    SELECT rel.relname AS table_name, c.conname AS constraint_name, c.contype AS constraint_type
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname IN (
        'company_payroll_profile',
        'payroll_component_type',
        'payroll_component',
        'payroll_component_rule_version',
        'payroll_component_tax_flags_version'
      )
    ORDER BY rel.relname, c.conname
  `);

  const indexes = await client.query(`
    SELECT tablename AS table_name, indexname AS index_name
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (
        'company_payroll_profile',
        'payroll_component_type',
        'payroll_component',
        'payroll_component_rule_version',
        'payroll_component_tax_flags_version'
      )
    ORDER BY tablename, indexname
  `);

  const columnCheck = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('payroll_component', 'payroll_component_rule_version', 'payroll_component_tax_flags_version')
      AND column_name ILIKE '%company%'
    ORDER BY table_name, column_name
  `);

  assert(columnCheck.rows.length === 0, 'Unexpected company-scoped columns exist on payroll component tables');

  const expectedConstraints = new Set([
    'company_payroll_profile_pkey',
    'company_payroll_profile_company_code_key',
    'company_payroll_profile_registration_no_key',
    'company_payroll_profile_default_currency_check',
    'company_payroll_profile_country_code_check',
    'payroll_component_type_pkey',
    'payroll_component_type_type_code_key',
    'payroll_component_type_type_name_key',
    'payroll_component_pkey',
    'payroll_component_component_code_key',
    'payroll_component_component_type_id_fkey',
    'payroll_component_rule_version_pkey',
    'payroll_component_rule_version_component_version_key',
    'payroll_component_rule_version_payroll_component_id_fkey',
    'payroll_component_rule_version_calculation_method_check',
    'payroll_component_rule_version_status_check',
    'payroll_component_rule_version_effective_range_check',
    'payroll_component_rule_version_fixed_amount_check',
    'payroll_component_rule_version_rate_value_check',
    'payroll_component_rule_version_minimum_amount_check',
    'payroll_component_rule_version_maximum_amount_check',
    'payroll_component_rule_version_rounding_scale_check',
    'payroll_component_rule_version_rounding_method_check',
    'payroll_component_rule_version_published_at_check',
    'payroll_component_rule_version_calculation_method_integrity_che',
    'payroll_component_rule_version_no_published_overlap',
    'payroll_component_tax_flags_version_pkey',
    'payroll_component_tax_flags_version_component_version_key',
    'payroll_component_tax_flags_version_payroll_component_id_fkey',
    'payroll_component_tax_flags_version_status_check',
    'payroll_component_tax_flags_version_effective_range_check',
    'payroll_component_tax_flags_version_published_at_check',
    'payroll_component_tax_flags_version_no_published_overlap'
  ]);

  const expectedIndexes = new Set([
    'idx_company_payroll_profile_country_code',
    'idx_company_payroll_profile_payroll_enabled',
    'idx_payroll_component_component_type_id',
    'idx_payroll_component_display_order',
    'idx_payroll_component_is_active',
    'idx_payroll_component_rule_version_component_id',
    'idx_payroll_component_rule_version_effective',
    'idx_payroll_component_rule_version_status',
    'idx_payroll_component_tax_flags_version_component_id',
    'idx_payroll_component_tax_flags_version_effective',
    'idx_payroll_component_tax_flags_version_status',
    'idx_payroll_component_type_is_active',
    'uq_payroll_component_rule_version_current_published',
    'uq_payroll_component_tax_flags_version_current_published'
  ]);

  const constraintNames = new Set(constraints.rows.map((row) => row.constraint_name));
  const indexNames = new Set(indexes.rows.map((row) => row.index_name));

  for (const expectedConstraint of expectedConstraints) {
    assert(constraintNames.has(expectedConstraint), `Missing constraint: ${expectedConstraint}`);
  }

  assert(
    constraints.rows.some((row) => row.constraint_name.startsWith('payroll_component_rule_version_calculation_method_integrity_che')),
    'Missing truncated calculation-method integrity constraint'
  );

  for (const expectedIndex of expectedIndexes) {
    assert(indexNames.has(expectedIndex), `Missing index: ${expectedIndex}`);
  }
};

const verifyLiveApi = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing');
  }

  const token = jwt.sign({ sub: 1, id: 1, role: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const employmentResponse = await fetch('http://127.0.0.1:5001/employees/3/employment', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(employmentResponse.status === 200, 'Expected GET /employees/3/employment to return 200');

  const employmentBody = await employmentResponse.json();
  assert(employmentBody.salary_configured === true, 'Expected employee 3 salary to remain configured');
  assert(typeof employmentBody.salary_amount === 'string', 'Expected employee 3 salary_amount string in compatibility response');

  const historyResponse = await fetch('http://127.0.0.1:5001/employees/3/salary-history', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(historyResponse.status === 200, 'Expected GET /employees/3/salary-history to return 200');

  const historyBody = await historyResponse.json();
  assert(Array.isArray(historyBody.salary_history), 'Expected salary_history array');
  assert(historyBody.salary_history.length >= 1, 'Expected at least one salary history row');
};

const runTemporaryIsolationChecks = async (client) => {
  const uniqueSuffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
  const typeCode = `AT_${uniqueSuffix}`;
  const typeName = `Audit Type ${uniqueSuffix}`;
  const componentCode = `AC_${uniqueSuffix}`;
  const componentName = `Audit Component ${uniqueSuffix}`;
  const effectiveDate = new Date().toISOString().slice(0, 10);
  const publishedAt = new Date();

  await client.query('BEGIN');
  try {
    const typeResult = await client.query(
      `INSERT INTO public.payroll_component_type (type_code, type_name, is_active)
       VALUES ($1, $2, true)
       RETURNING id`,
      [typeCode, typeName]
    );
    const payrollComponentTypeId = typeResult.rows[0].id;

    const componentResult = await client.query(
      `INSERT INTO public.payroll_component (
        component_code,
        component_name,
        component_type_id,
        description,
        display_order,
        system_defined,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, false, true)
      RETURNING id`,
      [componentCode, componentName, payrollComponentTypeId, 'Temporary audit component', 9000]
    );
    const payrollComponentId = componentResult.rows[0].id;

    const ruleVersionResult = await client.query(
      `INSERT INTO public.payroll_component_rule_version (
        payroll_component_id,
        version_no,
        effective_from,
        effective_to,
        calculation_method,
        fixed_amount,
        calculation_config,
        minimum_amount,
        maximum_amount,
        rounding_method,
        rounding_scale,
        status,
        published_at
      ) VALUES ($1, 1, $2, $2, 'FIXED', 100.00, '{}'::jsonb, NULL, NULL, NULL, NULL, 'PUBLISHED', $3)
      RETURNING id`,
      [payrollComponentId, effectiveDate, publishedAt]
    );

    const taxVersionResult = await client.query(
      `INSERT INTO public.payroll_component_tax_flags_version (
        payroll_component_id,
        version_no,
        effective_from,
        effective_to,
        taxable_for_pcb,
        epf_applicable,
        socso_applicable,
        eis_applicable,
        hrd_levy_applicable,
        status,
        published_at
      ) VALUES ($1, 1, $2, $2, false, false, false, false, false, 'PUBLISHED', $3)
      RETURNING id`,
      [payrollComponentId, effectiveDate, publishedAt]
    );

    assert(typeof ruleVersionResult.rows[0].id === 'number', 'Expected temporary rule version insert to succeed');
    assert(typeof taxVersionResult.rows[0].id === 'number', 'Expected temporary tax flags version insert to succeed');

    await expectDbError(
      client,
      `INSERT INTO public.payroll_component (component_code, component_name, component_type_id, system_defined, is_active)
       VALUES ($1, $2, $3, false, true)`,
      [componentCode, `${componentName} Duplicate`, payrollComponentTypeId],
      '23505',
      'Duplicate component code should be rejected'
    );

    await expectDbError(
      client,
      `INSERT INTO public.payroll_component_rule_version (
        payroll_component_id,
        version_no,
        effective_from,
        calculation_method,
        fixed_amount,
        calculation_config,
        status
      ) VALUES ($1, 1, $2, 'FIXED', 100.00, '{}'::jsonb, 'DRAFT')`,
      [payrollComponentId, effectiveDate],
      '23505',
      'Duplicate rule version number should be rejected'
    );

    await expectDbError(
      client,
      `INSERT INTO public.payroll_component_rule_version (
        payroll_component_id,
        version_no,
        effective_from,
        effective_to,
        calculation_method,
        fixed_amount,
        calculation_config,
        status,
        published_at
      ) VALUES ($1, 2, $2, $2, 'FIXED', 100.00, '{}'::jsonb, 'PUBLISHED', $3)`,
      [payrollComponentId, effectiveDate, publishedAt],
      '23P01',
      'Overlapping published rule version should be rejected'
    );

    await expectDbError(
      client,
      `INSERT INTO public.payroll_component_tax_flags_version (
        payroll_component_id,
        version_no,
        effective_from,
        taxable_for_pcb,
        epf_applicable,
        socso_applicable,
        eis_applicable,
        hrd_levy_applicable,
        status
      ) VALUES ($1, 1, $2, false, false, false, false, false, 'DRAFT')`,
      [payrollComponentId, effectiveDate],
      '23505',
      'Duplicate tax flags version number should be rejected'
    );

    await expectDbError(
      client,
      `INSERT INTO public.payroll_component_tax_flags_version (
        payroll_component_id,
        version_no,
        effective_from,
        effective_to,
        taxable_for_pcb,
        epf_applicable,
        socso_applicable,
        eis_applicable,
        hrd_levy_applicable,
        status,
        published_at
      ) VALUES ($1, 2, $2, $2, false, false, false, false, false, 'PUBLISHED', $3)`,
      [payrollComponentId, effectiveDate, publishedAt],
      '23P01',
      'Overlapping published tax flags version should be rejected'
    );

    await expectDbError(
      client,
      `DELETE FROM public.payroll_component WHERE id = $1`,
      [payrollComponentId],
      '23503',
      'Deleting a parent component with existing versions should be blocked'
    );

    await client.query('ROLLBACK');

    const afterRollback = await getCounts(client);
    assert(afterRollback.payroll_component_type === 3, 'Temporary component type should not persist after rollback');
    assert(afterRollback.payroll_component === 0, 'Temporary component should not persist after rollback');
    assert(afterRollback.payroll_component_rule_version === 0, 'Temporary rule version should not persist after rollback');
    assert(afterRollback.payroll_component_tax_flags_version === 0, 'Temporary tax flags version should not persist after rollback');

    return {
      tempTypeCode: typeCode,
      tempComponentCode: componentCode,
      tempRuleVersionId: ruleVersionResult.rows[0].id,
      tempTaxVersionId: taxVersionResult.rows[0].id
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw error;
  }
};

const expectDbError = async (client, sql, params, expectedCode, message) => {
  const savepoint = `sp_${Math.floor(Math.random() * 1e9)}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await client.query(sql, params);
    throw new Error(message);
  } catch (error) {
    if (error.code !== expectedCode) {
      throw new Error(`${message} (expected ${expectedCode}, got ${error.code || 'no-code'})`);
    }
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  }
};

const main = async () => {
  const client = await pool.connect();
  try {
    const beforeCounts = await getCounts(client);
    assert(beforeCounts.company_payroll_profile === 1, 'Expected exactly one company payroll profile');
    assert(beforeCounts.payroll_component_type === 3, 'Expected three payroll component types');
    assert(beforeCounts.payroll_component === 0, 'Expected no persisted payroll components before audit');
    assert(beforeCounts.payroll_component_rule_version === 0, 'Expected no persisted payroll component rule versions before audit');
    assert(beforeCounts.payroll_component_tax_flags_version === 0, 'Expected no persisted payroll component tax flag versions before audit');

    const company = await querySingleValue(
      client,
      `SELECT company_code, legal_name, payroll_display_name, default_currency, country_code, timezone, payroll_enabled
       FROM public.company_payroll_profile
       ORDER BY id
       LIMIT 1`
    );
    assert(company.company_code === 'MIDSTUDIO', 'Expected MIDSTUDIO company code');
    assert(company.payroll_enabled === false, 'Expected payroll_enabled to remain false');

    const componentTypes = await client.query(
      `SELECT type_code, type_name, is_active
       FROM public.payroll_component_type
       ORDER BY id`
    );
    const typeSignature = componentTypes.rows.map((row) => `${row.type_code}:${row.type_name}:${row.is_active}`).join('|');
    assert(
      typeSignature === 'EARNING:Earning:true|DEDUCTION:Deduction:true|REIMBURSEMENT:Reimbursement:true',
      'Unexpected payroll component type seed data'
    );

    await verifySchema(client);
    const tempArtifacts = await runTemporaryIsolationChecks(client);
    await verifyLiveApi();

    const afterCounts = await getCounts(client);
    assert(afterCounts.company_payroll_profile === beforeCounts.company_payroll_profile, 'Company payroll profile count changed unexpectedly');
    assert(afterCounts.payroll_component_type === beforeCounts.payroll_component_type, 'Payroll component type count changed unexpectedly');
    assert(afterCounts.payroll_component === beforeCounts.payroll_component, 'Payroll component count changed unexpectedly');
    assert(afterCounts.payroll_component_rule_version === beforeCounts.payroll_component_rule_version, 'Payroll component rule version count changed unexpectedly');
    assert(afterCounts.payroll_component_tax_flags_version === beforeCounts.payroll_component_tax_flags_version, 'Payroll component tax flags version count changed unexpectedly');

    console.log('PHASE 6A-3 AUDIT PASS');
    console.log(JSON.stringify({
      beforeCounts,
      afterCounts,
      tempArtifacts,
      company,
      componentTypes: componentTypes.rows,
      verifiedApi: true
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(`PHASE 6A-3 AUDIT FAIL: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});