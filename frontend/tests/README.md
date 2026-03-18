# Playwright Test Suite

This directory contains comprehensive end-to-end tests for the MCP Sentinel application.

## Test Structure

### Test Files

- **`dashboard.spec.ts`** - Dashboard and home page tests
- **`server-management.spec.ts`** - Server CRUD operations and form validation
- **`endpoint-scanning.spec.ts`** - Endpoint discovery and scanning features
- **`monitoring.spec.ts`** - Server monitoring and health checks
- **`tool-discovery.spec.ts`** - Tool discovery and risk assessment
- **`all-features.spec.ts`** - Integration tests for complete user flows

### Helper Files

- **`auth-helpers.ts`** - Authentication bypass and mocking utilities
- **`test-helpers.ts`** - Component waiting and tab navigation helpers
- **`auth-setup.ts`** - Core authentication setup functions
- **`global-setup.ts`** - Global test configuration

## Running Tests

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test server-management
```

### Run Tests in UI Mode
```bash
npx playwright test --ui
```

### Run Tests with HTML Report
```bash
npx playwright test --reporter=html
```

### View HTML Report
```bash
npx playwright show-report
```

## Test Features

### Authentication Bypass
All tests use mocked authentication to bypass Clerk. The `navigateWithAuth()` helper function handles this automatically.

### Tab Navigation
The `ensureServersTab()` helper ensures tests are on the correct tab before running assertions.

### Component Waiting
Robust waiting utilities ensure components are fully loaded before interactions:
- `waitForComponent()` - Wait for specific component
- `waitForServerManager()` - Wait for server manager to load
- `waitForElementWithRetry()` - Retry-based element waiting

## Test Coverage

### ✅ Server Management
- Add server with validation
- Edit server
- Delete server with confirmation
- Form field validation
- URL format validation
- Server list display

### ✅ Endpoint Scanning
- Single endpoint scan
- Multiple endpoint scan
- Port range scanning
- Discovery tab navigation

### ✅ Monitoring
- Server status display
- Health metrics
- Auto-refresh toggle
- Ping functionality
- Monitoring start/stop

### ✅ Tool Discovery
- Tool discovery for servers
- Risk level display
- Tool count display

## Configuration

Tests are configured in `playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Browser: Chromium
- Reporter: HTML and list
- Global setup: `tests/global-setup.ts`

## Troubleshooting

### Tests Failing Due to Auth
- Ensure `auth-helpers.ts` is imported
- Use `navigateWithAuth()` for protected routes
- Check that Clerk mocking is working

### Tab Navigation Issues
- Use `ensureServersTab()` helper
- Check that sidebar is fully loaded before clicking tabs
- Increase wait times if needed

### Component Not Found
- Use `waitForServerManager()` before assertions
- Check selector patterns match actual UI
- Verify component is actually rendered

## CI/CD Integration

Tests can be run in CI/CD pipelines:
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run tests
npx playwright test --reporter=html
```







