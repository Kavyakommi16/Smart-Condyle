"""
Smart Condyle — Automated Backend Vulnerability Test Suite
Executes standardized security test cases covering OWASP Top 10 API vulnerabilities:
  - TC-SEC-01: Public Access & Clinical PHI Exposure (/dashboard)
  - TC-SEC-02: Broken Password Reset Logic Without OTP (/reset-password)
  - TC-SEC-03: Insecure Direct Object Reference (IDOR) on Patient Data (/patients/get)
  - TC-SEC-04: Insecure Direct Object Reference (IDOR) on History (/history/get)
  - TC-SEC-05: Overly Permissive CORS Wildcard with Credentials
  - TC-SEC-06: Missing Defensive HTTP Security Headers
  - TC-SEC-07: Unrestricted File Upload & Missing MIME Validation (/predict)
  - TC-SEC-08: Missing Rate Limiting on Login Endpoint (/login)
  - TC-SEC-09: Information Leakage on Malformed Payload
  - TC-SEC-10: Plaintext Password Storage Verification (/register)
"""
import unittest
import requests
import os
import sys

# Windows UTF-8 safety
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = os.getenv("API_URL", "http://127.0.0.1:8000")

class BackendVulnerabilityTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        try:
            r = requests.get(f"{BASE_URL}/", timeout=2)
            cls.server_online = (r.status_code == 200)
        except Exception:
            cls.server_online = False

    def setUp(self):
        if not self.server_online:
            self.skipTest(f"Backend server is offline at {BASE_URL}")

    def test_tc_sec_01_public_dashboard_phi_leakage(self):
        """TC-SEC-01: Test if /dashboard exposes clinical records to unauthenticated visitors."""
        resp = requests.get(f"{BASE_URL}/dashboard", timeout=3)
        self.assertEqual(resp.status_code, 200, "Dashboard endpoint should respond")
        # Security Assertion: Check for vulnerable public exposure
        is_vulnerable = "Patient Data Dashboard" in resp.text
        self.assertTrue(is_vulnerable, "Vulnerability Confirmed: /dashboard is publicly accessible without authentication")

    def test_tc_sec_02_broken_password_reset(self):
        """TC-SEC-02: Test if /reset-password accepts reset requests without OTP validation."""
        # Probe without any OTP or verification token
        payload = {"email": "security_audit_nonexistent@test.com", "new_password": "NewAuditPassword123!"}
        resp = requests.post(f"{BASE_URL}/reset-password", json=payload, timeout=3)
        self.assertEqual(resp.status_code, 200)
        # Endpoint returns JSON without demanding an OTP code in schema
        data = resp.json()
        self.assertIn("message", data, "Vulnerability Confirmed: Endpoint accepts password resets without OTP validation")

    def test_tc_sec_03_idor_patients_endpoint(self):
        """TC-SEC-03: Test Insecure Direct Object Reference (IDOR) on /patients/get without token."""
        probe_uid = "usr_probe_arbitrary_doctor"
        resp = requests.post(f"{BASE_URL}/patients/get", json={"uid": probe_uid}, timeout=3)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), "Vulnerability Confirmed: Endpoint accepts arbitrary UID without Bearer token")

    def test_tc_sec_04_idor_history_endpoint(self):
        """TC-SEC-04: Test Insecure Direct Object Reference (IDOR) on /history/get without token."""
        probe_uid = "usr_probe_arbitrary_doctor"
        resp = requests.post(f"{BASE_URL}/history/get", json={"uid": probe_uid}, timeout=3)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"), "Vulnerability Confirmed: History endpoint accepts arbitrary UID without session validation")

    def test_tc_sec_05_cors_wildcard_credentials(self):
        """TC-SEC-05: Test for CORS wildcard allow-origin with credentials enabled."""
        headers = {"Origin": "https://untrusted-external-site.com"}
        resp = requests.get(f"{BASE_URL}/", headers=headers, timeout=3)
        allow_origin = resp.headers.get("access-control-allow-origin")
        allow_creds = resp.headers.get("access-control-allow-credentials")
        is_vulnerable = (allow_origin == "*" or allow_origin == "https://untrusted-external-site.com")
        self.assertTrue(is_vulnerable, f"Vulnerability Confirmed: Permissive CORS configuration (Allow-Origin: {allow_origin})")

    def test_tc_sec_06_missing_security_headers(self):
        """TC-SEC-06: Test for missing defensive HTTP headers."""
        resp = requests.get(f"{BASE_URL}/", timeout=3)
        headers = {k.lower(): v for k, v in resp.headers.items()}
        missing = [h for h in ["x-content-type-options", "x-frame-options", "content-security-policy"] if h not in headers]
        self.assertTrue(len(missing) > 0, f"Vulnerability Confirmed: Missing defensive headers ({missing})")

    def test_tc_sec_07_unrestricted_file_upload(self):
        """TC-SEC-07: Test if /predict accepts non-image file uploads without MIME validation."""
        files = {'file': ('vulnerability_test.txt', b'plain text non-image contents', 'text/plain')}
        resp = requests.post(f"{BASE_URL}/predict", files=files, timeout=3)
        # Should reject with 400 or 415, but unvalidated upload fails at internal image processor (500)
        self.assertIn(resp.status_code, [200, 500], "Vulnerability Confirmed: Endpoint accepted non-image upload without initial MIME check")

    def test_tc_sec_08_missing_rate_limiting(self):
        """TC-SEC-08: Test for absence of rate limiting on sensitive /login endpoint."""
        throttled = False
        for _ in range(8):
            r = requests.post(
                f"{BASE_URL}/login",
                json={"email": "audit_bruteforce@test.com", "password": "BadPassword123"},
                timeout=2
            )
            if r.status_code == 429:
                throttled = True
                break
        self.assertFalse(throttled, "Vulnerability Confirmed: 8 rapid requests accepted without HTTP 429 rate limit")

    def test_tc_sec_09_api_error_traceback_leakage(self):
        """TC-SEC-09: Test if malformed payload returns verbose internal schema errors."""
        resp = requests.post(
            f"{BASE_URL}/login",
            data="INVALID_JSON_PAYLOAD_STRUCTURE",
            headers={"Content-Type": "application/json"},
            timeout=3
        )
        self.assertEqual(resp.status_code, 422, "FastAPI returns 422 with internal decode error details")
        self.assertIn("JSON decode error", resp.text, "Vulnerability Confirmed: Detailed parser error trace leaked to client")

    def test_tc_sec_10_static_password_hashing_check(self):
        """TC-SEC-10: Verify whether password hashing is implemented in backend source code."""
        backend_dir = os.path.join(os.path.dirname(__file__), "..", "smart_condyle_backend")
        main_file = os.path.join(backend_dir, "main.py")
        if os.path.exists(main_file):
            with open(main_file, "r", encoding="utf-8") as f:
                content = f.read()
            has_bcrypt = ("bcrypt" in content or "argon2" in content or "pbkdf2" in content)
            self.assertFalse(has_bcrypt, "Vulnerability Confirmed: Backend persists passwords without bcrypt/argon2 hashing")

if __name__ == "__main__":
    unittest.main(verbosity=2)
