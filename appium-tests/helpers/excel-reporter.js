const ExcelJS = require('exceljs');
const path = require('path');

async function generateReport(results) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Condyle Appium Tests';
  workbook.created = new Date();

  // ── Sheet 1: Test Summary ──
  const summarySheet = workbook.addWorksheet('Test Summary');
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4F72' } };
  const headerFont = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };

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
    { metric: 'Test Framework', value: 'Appium + WebDriverIO', status: '' },
    { metric: 'Platform', value: 'Android (Expo Go)', status: '' },
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
    { header: 'Screen', key: 'screen', width: 22 },
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

  const outputPath = path.join(__dirname, '..', 'appium-test-report.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Appium Test Report generated: ${outputPath} (${results.length} test cases)`);
}

module.exports = { generateReport };
