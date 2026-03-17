// Set required env vars before any module is imported
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db'
process.env['BETTER_AUTH_SECRET'] = 'test-secret-for-unit-tests-only'
