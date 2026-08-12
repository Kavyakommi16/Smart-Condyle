const ExcelJS = require('exceljs');
const path = require('path');

async function generateReport(results) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Condyle Selenium Tests';
  workbook.created = new Date();

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
  const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };

  // ── Sheet 1: Test Summary ──
  const summarySheet = workbook.addWorksheet('Test Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 35 },
    { header: 'Value', key: 'value', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  const summaryRows = [
    { metric: 'Total Test Cases', value: total.toString(), status: '✅' },
    { metric: 'Passed', value: passed.toString(), status: '✅' },
    { metric: 'Failed', value: failed.toString(), status: failed > 0 ? '❌' : '✅' },
    { metric: 'Skipped', value: skipped.toString(), status: '⏭️' },
    { metric: 'Pass Rate', value: `${((passed/total)*100).toFixed(1)}%`, status: passed/total > 0.9 ? '✅' : '⚠️' },
    { metric: '', value: '', status: '' },
    { metric: 'Test Framework', value: 'Selenium WebDriver', status: '' },
    { metric: 'Browser', value: 'Chrome (Headless)', status: '' },
    { metric: 'Platform', value: 'Web (Expo Web)', status: '' },
    { metric: 'App', value: 'Smart Condyle', status: '' },
    { metric: 'Execution Date', value: new Date().toISOString(), status: '' },
  ];

  summaryRows.forEach(r => summarySheet.addRow(r));
  summarySheet.getRow(1).eachCell(c => { c.fill = headerFill; c.font = headerFont; c.alignment = { horizontal: 'center' }; });

  // Category breakdown
  const categories = {};
  results.forEach(r => {
    if (!categories[r.category]) categories[r.category] = { total: 0, passed: 0, failed: 0 };
    categories[r.category].total++;
    if (r.status === 'PASS') categories[r.category].passed++;
    if (r.status === 'FAIL') categories[r.category].failed++;
  });

  summarySheet.addRow({});
  summarySheet.addRow({ metric: 'Category Breakdown', value: '', status: '' });
  Object.entries(categories).forEach(([cat, data]) => {
    summarySheet.addRow({ metric: `  ${cat}`, value: `${data.passed}/${data.total}`, status: data.failed > 0 ? '⚠️' : '✅' });
  });

  // ── Sheet 2: Detailed Test Results ──
  const detailSheet = workbook.addWorksheet('Detailed Test Results');
  detailSheet.columns = [
    { header: 'TC ID', key: 'id', width: 10 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Page/Screen', key: 'screen', width: 22 },
    { header: 'Test Case', key: 'testCase', width: 55 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Duration (ms)', key: 'duration', width: 14 },
    { header: 'Error Message', key: 'error', width: 40 },
  ];

  detailSheet.getRow(1).eachCell(c => { c.fill = headerFill; c.font = headerFont; c.alignment = { horizontal: 'center' }; });

  results.forEach(r => {
    const row = detailSheet.addRow(r);
    const statusCell = row.getCell('status');
    if (r.status === 'PASS') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00CC00' } };
    } else if (r.status === 'FAIL') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
      statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };
    }
  });

  const outputPath = path.join(__dirname, '..', 'selenium-test-report.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Selenium Test Report generated: ${outputPath} (${results.length} test cases)`);

  // Generate Markdown Summary for GitHub Actions
  const fs = require('fs');
  const mdContent = `
## 🌐 Web E2E Test Execution Summary (Build #1)

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tests** | ${total} | 📋 |
| **Passed** | ${passed} | ✅ |
| **Failed** | ${failed} | ${failed > 0 ? '❌' : '➖'} |
| **Pass Rate** | ${((passed/total)*100).toFixed(2)}% | 🏆 |

### 📊 Results by Category

| Category | Total | Passed | Failed |
|----------|-------|--------|--------|
${Object.entries(categories).map(([cat, data]) => `| ${cat} | ${data.total} | ${data.passed} | ${data.failed} |`).join('\\n')}
`;
  fs.writeFileSync(path.join(__dirname, '..', 'summary.md'), mdContent);
}

module.exports = { generateReport };
