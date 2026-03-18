import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate a detailed test report from Playwright results
 */
export function generateTestReport() {
  const reportDir = path.join(__dirname, '../playwright-report');
  const testResultsDir = path.join(__dirname, '../test-results');
  
  // Ensure directories exist
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Run Playwright tests with HTML reporter
  try {
    console.log('Running Playwright tests...');
    execSync('npx playwright test --reporter=html,list', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    
    console.log('\n✓ Tests completed!');
    console.log(`\nView HTML report: ${reportDir}/index.html`);
    console.log(`Test results: ${testResultsDir}`);
  } catch (error) {
    console.error('Test execution failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateTestReport();
}







