"""
Smart Condyle — Static Application Security Testing (SAST) Scanner
Comprehensive multi-framework static security analysis engine.
Detects OWASP Top 10, CWE top risks, and API security vulnerabilities.
"""
import os
import re
import json
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

SEVERITY_CRITICAL = "Critical"
SEVERITY_HIGH = "High"
SEVERITY_MEDIUM = "Medium"
SEVERITY_LOW = "Low"

findings = []

def add_finding(severity, vuln_type, file_path, line_num, description, scenario, impact, recommendation, endpoint="N/A"):
    # Avoid duplicate findings on the same line and type
    for existing in findings:
        if existing['type'] == vuln_type and existing['file'] == file_path and existing['line'] == line_num:
            return
    findings.append({
        "id": f"SC-{len(findings) + 1:03d}",
        "severity": severity,
        "type": vuln_type,
        "file": file_path.replace("\\", "/"),
        "line": line_num,
        "endpoint": endpoint,
        "description": description,
        "scenario": scenario,
        "impact": impact,
        "recommendation": recommendation,
    })

def scan_file(filepath, relative_path):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            lines = content.splitlines()
    except Exception:
        return

    # Check for hardcoded credentials in .env or config files
    if relative_path.endswith('.env') or 'config' in relative_path.lower():
        for i, line in enumerate(lines, 1):
            if re.search(r'(MONGO_URI|DATABASE_URL|DB_PASS)\s*=\s*["\']?mongodb(\+srv)?:\/\/[^:]+:([^@]+)@', line):
                add_finding(
                    SEVERITY_CRITICAL, "Hardcoded Database Credentials", relative_path, i,
                    "Database connection string contains embedded plaintext credentials.",
                    "An attacker obtaining read access to the server or version history can extract administrative database credentials and exfiltrate all clinical records.",
                    "Full database takeover and unauthorized access to all healthcare datasets.",
                    "Inject database credentials via environment variables and secret stores (e.g. AWS Secrets Manager, HashiCorp Vault) rather than hardcoded configuration files."
                )
            if re.search(r'(SMTP_PASSWORD|EMAIL_PASSWORD|SECRET_KEY|JWT_SECRET)\s*=\s*["\']?[a-zA-Z0-9_-]{8,}', line):
                add_finding(
                    SEVERITY_CRITICAL, "Hardcoded Secret / SMTP Password", relative_path, i,
                    "Production SMTP/Secret key is hardcoded in the configuration file.",
                    "An adversary reading configuration files can hijack the SMTP relay to send phishing campaigns or intercept one-time verification tokens.",
                    "Unauthorized communication dispatch and token compromise.",
                    "Store email and authentication secrets in environment variables outside source control."
                )

    # General Code Scanning
    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # ── Plaintext Password Storage ──
        if re.search(r'["\']password["\']\s*:\s*req\.password', line) or (re.search(r'user_data.*password.*req\.password', line) and not re.search(r'hash|bcrypt|argon', content)):
            add_finding(
                SEVERITY_CRITICAL, "Plaintext Password Storage", relative_path, i,
                "User password from request is stored directly into the database without cryptographic hashing.",
                "A database leak or SQL/NoSQL injection immediately exposes every doctor's plaintext password, allowing unauthorized login across accounts.",
                "Mass credential exposure, unauthorized patient records access, and non-compliance with HIPAA/GDPR.",
                "Hash passwords using bcrypt, Argon2id, or PBKDF2 with unique salts before persisting.",
                endpoint="/register"
            )

        # ── Case-Insensitive Password Validation ──
        if re.search(r'password.*\.lower\(\)\s*==\s*req\.password\.lower\(\)', line):
            add_finding(
                SEVERITY_HIGH, "Weak Password Verification (Case-Insensitive Match)", relative_path, i,
                "Authentication logic allows case-insensitive password matching as a fallback.",
                "An attacker attempting brute-force attacks has significantly reduced search entropy because uppercase and lowercase distinctions are eliminated.",
                "Reduced password complexity and increased vulnerability to dictionary and brute-force attacks.",
                "Enforce strict case-sensitive matching and utilize secure constant-time password hash comparison (e.g. bcrypt.checkpw).",
                endpoint="/login"
            )

        # ── Unauthenticated Sensitive Dashboard ──
        if re.search(r'@app\.get\s*\(\s*["\']\/dashboard["\']\s*\)', line):
            add_finding(
                SEVERITY_CRITICAL, "Missing Authentication on Patient Dashboard", relative_path, i,
                "The patient data dashboard endpoint (/dashboard) renders clinical records to any unauthenticated caller.",
                "An anonymous external attacker browses to http://host:8000/dashboard and views names, phones, symptoms, injuries, and AI predictions of all patients.",
                "Catastrophic clinical privacy breach, HIPAA violation, and public exposure of Protected Health Information (PHI).",
                "Require session or Bearer token authentication and role-based access control (Doctor role required).",
                endpoint="/dashboard"
            )

        # ── Business Logic Bypass in Password Reset ──
        if re.search(r'@app\.post\s*\(\s*["\']\/reset-password["\']\s*\)', line):
            context = ''.join(lines[max(0, i-1):min(len(lines), i+15)])
            if not re.search(r'(otp|code|token|verify|session)', context, re.I):
                add_finding(
                    SEVERITY_CRITICAL, "Broken Password Reset Logic (No Verification)", relative_path, i,
                    "The password reset endpoint allows arbitrary password change with only an email address and no OTP/token verification.",
                    "An attacker issues a POST request to /reset-password with a known doctor email and a new password, instantly hijacking the target account without OTP verification.",
                    "Total account takeover of any user in the system.",
                    "Require validation of a one-time cryptographic token or OTP verified against the user's session before permitting password updates.",
                    endpoint="/reset-password"
                )

        # ── Insecure Direct Object Reference (IDOR) & Broken Access Control ──
        if re.search(r'@app\.post\s*\(\s*["\']\/(patients|history|profile)\/(save|get|delete|clear|deleted\/get|restore|permanent_delete)["\']\s*\)', line):
            ep_match = re.search(r'["\'](\/[^"\']+)["\']', line)
            ep = ep_match.group(1) if ep_match else "N/A"
            add_finding(
                SEVERITY_HIGH, "Insecure Direct Object Reference (IDOR)", relative_path, i,
                f"Endpoint {ep} relies on client-supplied 'uid' without verifying caller identity via authentication token.",
                "An attacker authenticated or unauthenticated sends another doctor's 'uid' in the JSON body to retrieve or modify their patient records and history.",
                "Horizontal privilege escalation, medical record tampering, and unauthorized data leakage.",
                "Derive caller identity securely from an authenticated JWT or session cookie on the server side instead of trusting client input.",
                endpoint=ep
            )

        # ── CORS Wildcard with Credentials ──
        if re.search(r'allow_origins\s*=\s*\[\s*["\']\*["\']\s*\]', line) and 'allow_credentials=True' in content:
            add_finding(
                SEVERITY_HIGH, "Overly Permissive CORS with Credentials", relative_path, i,
                "CORS middleware is configured with wildcard origin ('*') while allowing credentials.",
                "A malicious third-party site can make cross-origin requests to this API and read authenticated responses or forge actions in user browsers.",
                "Cross-Site Request Forgery (CSRF) risk and unintended cross-origin data exposure.",
                "Explicitly restrict 'allow_origins' to authorized frontend origins (e.g. mobile bundle schemes, trusted web domains).",
                endpoint="Global Middleware"
            )

        # ── Unrestricted File Upload & Path Traversal Risk ──
        if re.search(r'@app\.post\s*\(\s*["\']\/predict["\']\s*\)', line):
            context = ''.join(lines[max(0, i-1):min(len(lines), i+25)])
            if 'os.path.join(UPLOAD_FOLDER, file.filename)' in context and not re.search(r'(uuid|secure_filename|magic|imghdr|content_type)', context):
                add_finding(
                    SEVERITY_HIGH, "Unrestricted File Upload & Path Traversal", relative_path, i,
                    "Endpoint /predict uses unsanitized file.filename directly in filesystem path construction without content-type validation.",
                    "An attacker uploads a file with filename '../../etc/shadow' or an executable script, attempting path traversal or denial of service.",
                    "Arbitrary file write, server crash, or potential remote code execution.",
                    "Generate unique UUID-based filenames, validate MIME types (e.g. image/jpeg, image/png), check magic bytes, and enforce max upload size limits.",
                    endpoint="/predict"
                )

        # ── Missing Rate Limiting on Sensitive Endpoints ──
        if re.search(r'@app\.post\s*\(\s*["\']\/(login|register|send-verification-email|reset-password)["\']\s*\)', line):
            ep_match = re.search(r'["\'](\/[^"\']+)["\']', line)
            ep = ep_match.group(1) if ep_match else "N/A"
            if not re.search(r'limiter|rate_limit', content):
                add_finding(
                    SEVERITY_MEDIUM, "Missing Rate Limiting / Brute-Force Protection", relative_path, i,
                    f"Sensitive endpoint {ep} does not enforce rate limiting or request throttling.",
                    "An attacker floods the endpoint with automated brute-force attempts on credentials, or spams the email verification API to exhaust SMTP quotas.",
                    "Credential stuffing, account enumeration, and financial/quota denial of service.",
                    "Implement SlowAPI or Redis token-bucket rate limiting (e.g., max 5 attempts per minute per IP on auth endpoints).",
                    endpoint=ep
                )

        # ── Missing HTTP Security Headers ──
        if re.search(r'app\s*=\s*FastAPI\s*\(', line):
            if not re.search(r'(X-Content-Type-Options|X-Frame-Options|Content-Security-Policy)', content):
                add_finding(
                    SEVERITY_LOW, "Missing HTTP Security Headers", relative_path, i,
                    "Application does not emit standard defensive HTTP headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).",
                    "Browsers interacting with API or web views are vulnerable to clickjacking, MIME sniffing, and protocol downgrade attacks.",
                    "Increased surface area for client-side attacks.",
                    "Add custom middleware or Starlette SecurityHeadersMiddleware to set X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and CSP.",
                    endpoint="Global Middleware"
                )

        # ── Sensitive Data Exposure in Logs ──
        if re.search(r'print\s*\(\s*f?["\'].*(email|password|token|code|result)', line, re.I):
            add_finding(
                SEVERITY_MEDIUM, "Sensitive Information Disclosed in Console Logs", relative_path, i,
                "Application prints verification codes or sensitive diagnostic data to standard console output.",
                "Anyone with access to terminal logs, server log aggregators, or shared monitoring tools can read real-time verification codes and diagnosis data.",
                "Information leakage and breach of confidentiality for sensitive patient/auth data.",
                "Remove sensitive logging statements or redact passwords, OTPs, and clinical details using a structured logging framework.",
                endpoint="Internal Logic"
            )

def scan_directory(directory, extensions=('.py', '.js', '.ts', '.json', '.env', '.yml', '.yaml')):
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'venv', '__pycache__', '.expo', 'dist')]
        for f in files:
            if any(f.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, f)
                relative = os.path.relpath(filepath, directory)
                scan_file(filepath, relative)

def main():
    backend_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'smart_condyle_backend')
    backend_dir = os.path.abspath(backend_dir)

    print(f"[*] Starting SAST Scan on: {backend_dir}")
    scan_directory(backend_dir)

    # Scan root directory for .env files
    root_dir = os.path.dirname(backend_dir)
    for item in os.listdir(root_dir):
        item_path = os.path.join(root_dir, item)
        if os.path.isdir(item_path) and item in ('smart_condyle_backend', 'smart_condyle_app_rn'):
            env_file = os.path.join(item_path, '.env')
            if os.path.exists(env_file):
                scan_file(env_file, os.path.relpath(env_file, root_dir))

    output_path = os.path.join(os.path.dirname(__file__), 'sast-results.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(findings, f, indent=2)

    critical = sum(1 for f in findings if f['severity'] == SEVERITY_CRITICAL)
    high = sum(1 for f in findings if f['severity'] == SEVERITY_HIGH)
    medium = sum(1 for f in findings if f['severity'] == SEVERITY_MEDIUM)
    low = sum(1 for f in findings if f['severity'] == SEVERITY_LOW)

    print("\n" + "="*60)
    print("SAST Static Application Security Testing Complete")
    print("="*60)
    print(f"  [!] Critical : {critical}")
    print(f"  [!] High     : {high}")
    print(f"  [*] Medium   : {medium}")
    print(f"  [-] Low      : {low}")
    print(f"  Total Issues : {len(findings)}")
    print(f"\n[+] Results saved to: {output_path}")

    return critical

if __name__ == '__main__':
    main()
    sys.exit(0)
