"""
Smart Condyle — Static Application Security Testing (SAST) Scanner
Scans the entire backend codebase for security vulnerabilities.
"""
import os, re, json, sys

SEVERITY_CRITICAL = "Critical"
SEVERITY_HIGH = "High"
SEVERITY_MEDIUM = "Medium"
SEVERITY_LOW = "Low"

findings = []

def add_finding(severity, vuln_type, file_path, line_num, description, impact, recommendation, endpoint="N/A"):
    findings.append({
        "severity": severity,
        "type": vuln_type,
        "file": file_path,
        "line": line_num,
        "endpoint": endpoint,
        "description": description,
        "impact": impact,
        "recommendation": recommendation,
    })

def scan_file(filepath, relative_path):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except:
        return

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # ── Hardcoded Credentials ──
        if re.search(r'(password|secret|api_key|token|passwd)\s*[=:]\s*["\'][^"\']{3,}["\']', line, re.I):
            if not re.search(r'(example|placeholder|your|test|sample|env|process\.env|os\.environ)', line, re.I):
                add_finding(SEVERITY_CRITICAL, "Hardcoded Credentials", relative_path, i,
                    f"Potential hardcoded credential found: {stripped[:100]}",
                    "Attackers can extract credentials from source code",
                    "Use environment variables or a secrets manager")

        # ── Plaintext Password Storage ──
        if re.search(r'password.*=.*req\.(password|body)', line, re.I) and not re.search(r'(hash|bcrypt|argon|scrypt|pbkdf)', line, re.I):
            add_finding(SEVERITY_CRITICAL, "Plaintext Password Storage", relative_path, i,
                "Password appears to be stored without hashing",
                "If database is compromised, all passwords are exposed in plaintext",
                "Use bcrypt, argon2, or scrypt to hash passwords before storing")

        # ── SQL Injection ──
        if re.search(r'(execute|query|raw)\s*\(.*[fF]["\'].*\{', line) or re.search(r'\.format\(.*\)', line):
            if re.search(r'(SELECT|INSERT|UPDATE|DELETE|DROP)', line, re.I):
                add_finding(SEVERITY_CRITICAL, "SQL Injection", relative_path, i,
                    f"Potential SQL injection via string formatting: {stripped[:100]}",
                    "Attackers can read, modify, or delete database data",
                    "Use parameterized queries or an ORM")

        # ── Command Injection ──
        if re.search(r'(os\.system|os\.popen|subprocess\.(call|run|Popen)|exec\(|eval\()', line):
            if re.search(r'(req\.|request\.|params|body|query|input|user)', line, re.I):
                add_finding(SEVERITY_CRITICAL, "Command Injection", relative_path, i,
                    f"User input may flow into OS command execution: {stripped[:100]}",
                    "Attackers can execute arbitrary commands on the server",
                    "Avoid using user input in OS commands; use allowlists")

        # ── Path Traversal ──
        if re.search(r'(open|read|write|path\.join)\s*\(.*\+', line) or re.search(r'\.filename', line):
            if not re.search(r'(sanitize|secure|safe|validate|abspath|realpath)', line, re.I):
                add_finding(SEVERITY_HIGH, "Path Traversal Risk", relative_path, i,
                    f"File path may be constructed from user input: {stripped[:100]}",
                    "Attackers can access files outside the intended directory",
                    "Validate and sanitize file paths; use os.path.realpath()")

        # ── CORS Wildcard ──
        if re.search(r'allow_origins\s*=\s*\[\s*["\']\*["\']\s*\]', line):
            add_finding(SEVERITY_HIGH, "CORS Wildcard", relative_path, i,
                "CORS is configured to allow all origins (*)",
                "Any website can make requests to this API, enabling CSRF-like attacks",
                "Restrict allow_origins to specific trusted domains")

        # ── Missing Authentication ──
        if re.search(r'@app\.(get|post|put|delete|patch)\s*\(', line):
            context = ''.join(lines[max(0,i-1):min(len(lines),i+10)])
            if not re.search(r'(auth|token|session|bearer|api_key|verify|jwt|credential)', context, re.I):
                endpoint_match = re.search(r'["\']([^"\']+)["\']', line)
                ep = endpoint_match.group(1) if endpoint_match else 'unknown'
                if ep not in ['/', '/docs', '/openapi.json', '/redoc']:
                    add_finding(SEVERITY_HIGH, "Missing Authentication", relative_path, i,
                        f"Endpoint {ep} has no authentication check",
                        "Unauthenticated users can access sensitive endpoints",
                        "Add authentication middleware or token validation",
                        endpoint=ep)

        # ── Missing Rate Limiting ──
        if re.search(r'@app\.(post)\s*\(\s*["\'](/login|/register|/reset-password)', line):
            add_finding(SEVERITY_MEDIUM, "Missing Rate Limiting", relative_path, i,
                f"Sensitive endpoint has no rate limiting: {stripped[:80]}",
                "Susceptible to brute-force attacks",
                "Add rate limiting using slowapi or similar middleware")

        # ── Debug Mode ──
        if re.search(r'(debug\s*=\s*True|DEBUG\s*=\s*True|reload\s*=\s*True)', line):
            add_finding(SEVERITY_MEDIUM, "Debug Mode Enabled", relative_path, i,
                "Application running in debug/reload mode",
                "Debug mode can leak stack traces and internal information",
                "Disable debug mode in production")

        # ── SMTP Credentials ──
        if re.search(r'(SMTP_PASSWORD|smtp_password)\s*[=:]\s*["\'][^"\']+["\']', line):
            add_finding(SEVERITY_HIGH, "Hardcoded SMTP Credentials", relative_path, i,
                "SMTP password is hardcoded in configuration",
                "Email service credentials could be compromised",
                "Use environment variables for SMTP credentials")

        # ── Sensitive Data in Logs ──
        if re.search(r'print\s*\(.*password', line, re.I) or re.search(r'console\.log\s*\(.*password', line, re.I):
            add_finding(SEVERITY_MEDIUM, "Sensitive Data Logging", relative_path, i,
                "Password or sensitive data may be printed to logs",
                "Sensitive information can be exposed through log files",
                "Never log passwords or sensitive tokens")

        # ── Missing Input Validation ──
        if re.search(r'def\s+(register|login|save|create)', line, re.I):
            context = ''.join(lines[max(0,i-1):min(len(lines),i+15)])
            if not re.search(r'(validate|sanitize|strip|escape|clean|regex|re\.)', context, re.I):
                add_finding(SEVERITY_MEDIUM, "Insufficient Input Validation", relative_path, i,
                    f"Function lacks comprehensive input validation: {stripped[:80]}",
                    "Malformed or malicious input may cause errors or security issues",
                    "Add input validation and sanitization for all user inputs")

        # ── Weak Password Policy ──
        if re.search(r'password.*len.*<\s*[1-7]\b', line) or re.search(r'minlength.*[1-7]', line, re.I):
            add_finding(SEVERITY_MEDIUM, "Weak Password Policy", relative_path, i,
                "Password minimum length is less than 8 characters",
                "Weak passwords are easily brute-forced",
                "Enforce minimum 8 characters with complexity requirements")

        # ── Missing Security Headers ──
        if re.search(r'(FastAPI|Express|Flask|app)\s*\(', line):
            context = ''.join(lines)
            if not re.search(r'(X-Content-Type|X-Frame-Options|Strict-Transport|Content-Security-Policy)', context, re.I):
                add_finding(SEVERITY_LOW, "Missing Security Headers", relative_path, i,
                    "Application does not set security headers",
                    "Missing headers can enable clickjacking, MIME sniffing attacks",
                    "Add security headers: X-Content-Type-Options, X-Frame-Options, HSTS")

        # ── Unrestricted File Upload ──
        if re.search(r'(UploadFile|upload|file\.save|multer)', line, re.I):
            context = ''.join(lines[max(0,i-1):min(len(lines),i+10)])
            if not re.search(r'(content_type|extension|allowed|whitelist|mimetype|validate)', context, re.I):
                add_finding(SEVERITY_HIGH, "Unrestricted File Upload", relative_path, i,
                    "File upload endpoint lacks content type validation",
                    "Attackers could upload malicious files (shells, malware)",
                    "Validate file extensions, content types, and file sizes")

        # ── IDOR Risk ──
        if re.search(r'(uid|user_id|userId)\s*=\s*(req\.|request\.)', line, re.I):
            add_finding(SEVERITY_HIGH, "IDOR Vulnerability", relative_path, i,
                "User ID taken directly from request body without verification",
                "Users can access other users' data by changing the UID",
                "Verify that the UID matches the authenticated user's session")

def scan_directory(directory, extensions=('.py', '.js', '.ts', '.json', '.env', '.yml', '.yaml')):
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'venv', '__pycache__', '.expo')]
        for f in files:
            if any(f.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, f)
                relative = os.path.relpath(filepath, directory)
                scan_file(filepath, relative)

def main():
    scan_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'smart_condyle_backend')
    scan_dir = os.path.abspath(scan_dir)

    print(f"🔍 Scanning: {scan_dir}")
    scan_directory(scan_dir)

    # Also scan frontend
    frontend_dir = os.path.join(os.path.dirname(scan_dir), 'smart_condyle_app_rn', 'src')
    if os.path.exists(frontend_dir):
        print(f"🔍 Scanning frontend: {frontend_dir}")
        scan_directory(frontend_dir)

    # Also scan .env files
    root_dir = os.path.dirname(scan_dir)
    for item in os.listdir(root_dir):
        item_path = os.path.join(root_dir, item)
        if os.path.isdir(item_path):
            env_file = os.path.join(item_path, '.env')
            if os.path.exists(env_file):
                scan_file(env_file, os.path.relpath(env_file, root_dir))

    # Save results
    output_path = os.path.join(os.path.dirname(__file__), 'sast-results.json')
    with open(output_path, 'w') as f:
        json.dump(findings, f, indent=2)

    # Print summary
    critical = sum(1 for f in findings if f['severity'] == SEVERITY_CRITICAL)
    high = sum(1 for f in findings if f['severity'] == SEVERITY_HIGH)
    medium = sum(1 for f in findings if f['severity'] == SEVERITY_MEDIUM)
    low = sum(1 for f in findings if f['severity'] == SEVERITY_LOW)

    print(f"\n{'='*50}")
    print(f"SAST Scan Complete")
    print(f"{'='*50}")
    print(f"Critical: {critical}")
    print(f"High:     {high}")
    print(f"Medium:   {medium}")
    print(f"Low:      {low}")
    print(f"Total:    {len(findings)}")
    print(f"\nResults saved to: {output_path}")

    return critical  # Return critical count for CI fail check

if __name__ == '__main__':
    exit_code = main()
    # Don't fail the process, let the workflow handle it
    sys.exit(0)
