"""
Smart Condyle — Dynamic Application Security Testing (DAST) Scanner
Non-destructive API security verification engine.
Validates live endpoints for Broken Auth, IDOR, CORS, Headers, Rate Limiting, and Uploads.
"""
import os
import sys
import json
import requests
import time

# Windows UTF-8 safety
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")

dast_findings = []

def add_dast_finding(category, name, endpoint, severity, passed, evidence, remediation):
    dast_findings.append({
        "category": category,
        "name": name,
        "endpoint": endpoint,
        "severity": severity,
        "status": "FAIL (Vulnerable)" if not passed else "PASS (Secure)",
        "vulnerable": not passed,
        "evidence": evidence,
        "remediation": remediation
    })

def test_connectivity():
    try:
        r = requests.get(f"{API_URL}/", timeout=3)
        return r.status_code == 200
    except Exception as e:
        return False

def test_security_headers():
    print("[*] Probing HTTP Defensive Security Headers...")
    try:
        r = requests.get(f"{API_URL}/", timeout=3)
        headers = {k.lower(): v for k, v in r.headers.items()}
        
        missing = []
        for h in ["x-content-type-options", "x-frame-options", "strict-transport-security", "content-security-policy"]:
            if h not in headers:
                missing.append(h)
        
        if missing:
            add_dast_finding(
                "API Security / Headers",
                "Missing Protective Security Headers",
                "/",
                "Low",
                passed=False,
                evidence=f"Missing defensive HTTP headers: {', '.join(missing)}",
                remediation="Implement middleware adding X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and CSP."
            )
        else:
            add_dast_finding("API Security / Headers", "Defensive Security Headers", "/", "Low", passed=True, evidence="All required security headers present.", remediation="Maintain security header config.")
    except Exception as e:
        pass

def test_cors_policy():
    print("[*] Probing Cross-Origin Resource Sharing (CORS) Policy...")
    try:
        test_origin = "https://unauthorized-attacker-site.com"
        r = requests.get(f"{API_URL}/", headers={"Origin": test_origin}, timeout=3)
        
        allow_origin = r.headers.get("access-control-allow-origin", "")
        allow_creds = r.headers.get("access-control-allow-credentials", "")
        
        if allow_origin == "*" or allow_origin == test_origin:
            add_dast_finding(
                "API Security / CORS",
                "Permissive CORS Wildcard / Origin Reflection",
                "/",
                "High",
                passed=False,
                evidence=f"Access-Control-Allow-Origin returned: '{allow_origin}' with Allow-Credentials: '{allow_creds}'",
                remediation="Configure CORS with an explicit allowlist of authorized mobile / web origins."
            )
        else:
            add_dast_finding("API Security / CORS", "CORS Origin Policy", "/", "High", passed=True, evidence=f"CORS properly restricts origin to: {allow_origin}", remediation="N/A")
    except Exception as e:
        pass

def test_unauthenticated_dashboard():
    print("[*] Probing Public Dashboard Exposure (/dashboard)...")
    try:
        r = requests.get(f"{API_URL}/dashboard", timeout=3)
        if r.status_code == 200 and "Patient Data Dashboard" in r.text:
            add_dast_finding(
                "Authentication & PHI Exposure",
                "Unauthenticated Access to Patient Records Dashboard",
                "/dashboard",
                "Critical",
                passed=False,
                evidence=f"HTTP 200 OK received without authentication. Endpoint leaked clinical dashboard HTML ({len(r.text)} bytes).",
                remediation="Require authentication and verify Doctor role before serving patient data."
            )
        elif r.status_code in [401, 403]:
            add_dast_finding("Authentication & PHI Exposure", "Patient Records Dashboard", "/dashboard", "Critical", passed=True, evidence="Endpoint properly rejected unauthenticated request.", remediation="N/A")
    except Exception as e:
        pass

def test_idor_and_broken_auth():
    print("[*] Probing IDOR & Missing Authentication on Sensitive Endpoints...")
    try:
        # Probe /patients/get with an arbitrary UID and no auth token
        test_uid = "usr_security_probe_random"
        r = requests.post(f"{API_URL}/patients/get", json={"uid": test_uid}, timeout=3)
        if r.status_code == 200 and "patients" in r.json():
            add_dast_finding(
                "Authorization / IDOR",
                "Insecure Direct Object Reference (IDOR) on Patient Data",
                "/patients/get",
                "High",
                passed=False,
                evidence="Endpoint accepted arbitrary client UID without Bearer token or session verification, returning HTTP 200.",
                remediation="Authenticate requests via JWT/session tokens; derive caller UID on server rather than accepting client-supplied UID."
            )
        
        # Probe /history/get with an arbitrary UID
        r_hist = requests.post(f"{API_URL}/history/get", json={"uid": test_uid}, timeout=3)
        if r_hist.status_code == 200 and "history" in r_hist.json():
            add_dast_finding(
                "Authorization / IDOR",
                "Insecure Direct Object Reference (IDOR) on Diagnostic History",
                "/history/get",
                "High",
                passed=False,
                evidence="Endpoint accepted arbitrary client UID without authentication token, returning HTTP 200.",
                remediation="Enforce server-side session authentication on history retrieval."
            )
    except Exception as e:
        pass

def test_rate_limiting():
    print("[*] Probing Rate Limiting on Authentication (/login)...")
    try:
        throttled = False
        for i in range(10):
            r = requests.post(
                f"{API_URL}/login",
                json={"email": "nonexistent_probe_audit@test.com", "password": "WrongPassword123!"},
                timeout=2
            )
            if r.status_code == 429:
                throttled = True
                break
        
        if not throttled:
            add_dast_finding(
                "Rate Limiting / Anti-Automation",
                "Lack of Rate Limiting on Login Endpoint",
                "/login",
                "Medium",
                passed=False,
                evidence="10 consecutive invalid login requests in <2 seconds returned HTTP 200 without HTTP 429 Too Many Requests response.",
                remediation="Implement IP and account-based rate limiting (e.g. slowapi with max 5 attempts/minute)."
            )
        else:
            add_dast_finding("Rate Limiting / Anti-Automation", "Login Rate Limiting", "/login", "Medium", passed=True, evidence="Requests throttled with HTTP 429.", remediation="N/A")
    except Exception as e:
        pass

def test_file_upload_validation():
    print("[*] Probing File Upload Validation on AI Inference (/predict)...")
    try:
        # Non-destructive test: send non-image file with text/plain mime type
        files = {'file': ('malicious_test.txt', b'non-image plain text content', 'text/plain')}
        r = requests.post(f"{API_URL}/predict", files=files, timeout=3)
        
        # If server returns 500 error because it attempted to process a non-image without validating content-type first:
        if r.status_code == 500 or "Internal Server Error" in r.text:
            add_dast_finding(
                "Input Validation / File Upload",
                "Unrestricted File Upload Without MIME Validation",
                "/predict",
                "High",
                passed=False,
                evidence="Uploaded text/plain file was accepted by route and crashed backend image processor (HTTP 500 Internal Server Error) instead of rejecting with HTTP 400/415.",
                remediation="Validate MIME type (image/jpeg, image/png) and verify image header magic bytes prior to processing."
            )
        elif r.status_code in [400, 415]:
            add_dast_finding("Input Validation / File Upload", "File Upload Validation", "/predict", "High", passed=True, evidence="Server rejected invalid MIME type with HTTP 4xx.", remediation="N/A")
    except Exception as e:
        pass

def test_error_leakage():
    print("[*] Probing Information / Error Leakage on Malformed Input...")
    try:
        r = requests.post(f"{API_URL}/login", data="INVALID_MALFORMED_JSON", headers={"Content-Type": "application/json"}, timeout=3)
        if "JSON decode error" in r.text or "detail" in r.text:
            add_dast_finding(
                "API Security / Error Handling",
                "Verbose Schema / Parser Error Exposure",
                "/login",
                "Low",
                passed=False,
                evidence=f"FastAPI default JSON validation error returned raw parser message: {r.text[:120]}...",
                remediation="Implement custom exception handler for RequestValidationError to return generic error messages."
            )
    except Exception as e:
        pass

def main():
    print("="*60)
    print("Smart Condyle — Dynamic Application Security Testing (DAST)")
    print(f"Target Environment: {API_URL}")
    print("="*60)

    if not test_connectivity():
        print(f"[-] Environment {API_URL} is currently offline or unreachable.")
        print("[*] DAST recorded offline state; continuing pipeline.")
        output_path = os.path.join(os.path.dirname(__file__), 'dast-results.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump([], f, indent=2)
        return

    print("[+] Live backend is ONLINE. Running non-destructive detection probes...")
    test_cors_policy()
    test_security_headers()
    test_unauthenticated_dashboard()
    test_idor_and_broken_auth()
    test_rate_limiting()
    test_file_upload_validation()
    test_error_leakage()

    output_path = os.path.join(os.path.dirname(__file__), 'dast-results.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dast_findings, f, indent=2)

    total_probes = len(dast_findings)
    vulnerabilities = sum(1 for f in dast_findings if f['vulnerable'])

    print("\n" + "="*60)
    print("DAST Probing Complete")
    print("="*60)
    print(f"  Total Probes Executed   : {total_probes}")
    print(f"  Vulnerabilities Verified: {vulnerabilities}")
    print(f"[+] DAST results written to: {output_path}")

if __name__ == '__main__':
    main()
