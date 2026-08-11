import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const reqDuration = new Trend('req_duration');
const reqCount = new Counter('total_requests');

// Test configuration: 100 virtual users, 1 minute
export const options = {
  vus: 100,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    error_rate: ['rate<0.1'],
  },
  summaryTrendStats: ['avg', 'min', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)'],
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

// Test data
const testUser = {
  name: 'Load Test User',
  email: `loadtest_${Date.now()}@test.com`,
  password: 'Test@1234',
  hospital: 'Test Hospital',
};

let registeredUser = null;

export function setup() {
  // Register a test user for login tests
  const uniqueEmail = `loadtest_${Date.now()}@test.com`;
  const res = http.post(`${BASE_URL}/register`, JSON.stringify({
    name: 'Load Test User',
    email: uniqueEmail,
    password: 'Test@1234',
    hospital: 'Test Hospital',
  }), { headers: { 'Content-Type': 'application/json' } });

  const body = JSON.parse(res.body);
  return { email: uniqueEmail, uid: body.user?.uid || 'test_uid' };
}

export default function (data) {
  const scenarios = [
    testHealthCheck,
    testRegister,
    testLogin,
    testCheckEmail,
    testResetPassword,
    testProfileSave,
    testProfileGet,
    testPatientSave,
    testPatientGet,
    testHistorySave,
    testHistoryGet,
    testHistoryDelete,
    testHistoryClear,
    testSendVerificationEmail,
  ];

  // Pick a random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario(data);
  sleep(0.1);
}

function testHealthCheck(data) {
  const res = http.get(`${BASE_URL}/`);
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'GET / status 200': (r) => r.status === 200,
    'GET / has message': (r) => JSON.parse(r.body).message !== undefined,
  });
  errorRate.add(!passed);
}

function testRegister(data) {
  const email = `user_${__VU}_${__ITER}_${Date.now()}@test.com`;
  const res = http.post(`${BASE_URL}/register`, JSON.stringify({
    name: 'Test User',
    email: email,
    password: 'Test@1234',
    hospital: 'Test Hospital',
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /register status 200': (r) => r.status === 200,
    'POST /register success': (r) => JSON.parse(r.body).success === true,
  });
  errorRate.add(!passed);
}

function testLogin(data) {
  const res = http.post(`${BASE_URL}/login`, JSON.stringify({
    email: data.email,
    password: 'Test@1234',
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /login status 200': (r) => r.status === 200,
    'POST /login success': (r) => JSON.parse(r.body).success === true,
  });
  errorRate.add(!passed);
}

function testCheckEmail(data) {
  const res = http.post(`${BASE_URL}/check-email`, JSON.stringify({
    email: data.email,
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /check-email status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

function testResetPassword(data) {
  const res = http.post(`${BASE_URL}/reset-password`, JSON.stringify({
    email: data.email,
    new_password: 'NewTest@1234',
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /reset-password status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

function testProfileSave(data) {
  const res = http.post(`${BASE_URL}/profile/save`, JSON.stringify({
    uid: data.uid,
    profile: { name: 'Dr. Test', role: 'Surgeon', hospital: 'Test Hospital' },
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /profile/save status 200': (r) => r.status === 200,
    'POST /profile/save success': (r) => JSON.parse(r.body).success === true,
  });
  errorRate.add(!passed);
}

function testProfileGet(data) {
  const res = http.post(`${BASE_URL}/profile/get`, JSON.stringify({
    uid: data.uid,
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /profile/get status 200': (r) => r.status === 200,
    'POST /profile/get success': (r) => JSON.parse(r.body).success === true,
  });
  errorRate.add(!passed);
}

function testPatientSave(data) {
  const res = http.post(`${BASE_URL}/patients/save`, JSON.stringify({
    uid: data.uid,
    patient: { name: 'Patient Test', age: 30, gender: 'Male' },
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /patients/save status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

function testPatientGet(data) {
  const res = http.post(`${BASE_URL}/patients/get`, JSON.stringify({
    uid: data.uid,
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /patients/get status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

function testHistorySave(data) {
  const res = http.post(`${BASE_URL}/history/save`, JSON.stringify({
    uid: data.uid,
    record: { patientName: 'Test Patient', prediction: 'Normal', confidence: 0.95 },
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /history/save status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

function testHistoryGet(data) {
  const res = http.post(`${BASE_URL}/history/get`, JSON.stringify({
    uid: data.uid,
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /history/get status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

function testHistoryDelete(data) {
  const res = http.post(`${BASE_URL}/history/delete`, JSON.stringify({
    uid: data.uid,
    record_id: 'nonexistent_id',
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /history/delete status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

function testHistoryClear(data) {
  const res = http.post(`${BASE_URL}/history/clear`, JSON.stringify({
    uid: data.uid,
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /history/clear status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

function testSendVerificationEmail(data) {
  const res = http.post(`${BASE_URL}/send-verification-email`, JSON.stringify({
    email: 'test@example.com',
    code: '123456',
    name: 'Test User',
  }), { headers: { 'Content-Type': 'application/json' } });
  reqCount.add(1);
  reqDuration.add(res.timings.duration);
  const passed = check(res, {
    'POST /send-verification-email status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const metrics = data.metrics;
  let output = '\n========== LOAD TEST SUMMARY ==========\n';
  output += `Virtual Users: ${options.vus}\n`;
  output += `Duration: ${options.duration}\n`;
  output += `\nHTTP Request Duration:\n`;
  if (metrics.http_req_duration) {
    const d = metrics.http_req_duration.values;
    output += `  Average: ${d.avg?.toFixed(2)}ms\n`;
    output += `  Min: ${d.min?.toFixed(2)}ms\n`;
    output += `  Max: ${d.max?.toFixed(2)}ms\n`;
    output += `  P95: ${d['p(95)']?.toFixed(2)}ms\n`;
  }
  if (metrics.http_reqs) {
    output += `\nTotal Requests: ${metrics.http_reqs.values.count}\n`;
    output += `Requests/sec: ${metrics.http_reqs.values.rate?.toFixed(2)}\n`;
  }
  if (metrics.error_rate) {
    output += `Error Rate: ${(metrics.error_rate.values.rate * 100).toFixed(2)}%\n`;
  }
  output += '=======================================\n';
  return output;
}
