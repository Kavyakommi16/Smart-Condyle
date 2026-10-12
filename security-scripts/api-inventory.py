"""
Smart Condyle — API Endpoint Inventory Generator
Discovers all REST API endpoints from the backend codebase (FastAPI / Starlette routes).
Generates structured inventory matching Phase 2 specifications.
"""
import re
import os
import json
import sys

# Windows UTF-8 safety
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

def assess_roles(path, auth_required):
    if not auth_required:
        if path in ['/', '/docs', '/openapi.json', '/redoc']:
            return "Public / Anonymous"
        if any(k in path for k in ['register', 'login', 'check-email', 'reset-password', 'send-verification-email']):
            return "Public / Unauthenticated User"
        if path == '/dashboard':
            return "Public (Vulnerable: Should be Doctor / Clinical Staff)"
        if path == '/predict':
            return "Public (Vulnerable: Should be Authenticated Specialist)"
        return "Unauthenticated (Vulnerable: Missing Auth)"
    return "Authenticated Doctor / Clinical Specialist"

def categorize_endpoint(path):
    if path in ['/', '/docs', '/openapi.json', '/redoc']:
        return 'System & Documentation'
    elif any(k in path for k in ['register', 'login', 'email', 'password', 'check-email']):
        return 'Authentication & Identity'
    elif 'dashboard' in path:
        return 'Clinical Reporting'
    elif 'profile' in path:
        return 'Doctor Profile Management'
    elif 'patient' in path:
        return 'Patient Records (PHI)'
    elif 'history' in path:
        return 'Diagnostic History & Trash'
    elif 'predict' in path:
        return 'AI Inference & Fracture Detection'
    return 'General'

def assess_risk(path, method, auth_required):
    if path == '/dashboard':
        return 'Critical (Exposes All Clinical Data Publicly)'
    if path == '/reset-password':
        return 'Critical (Password Reset Without Token Verification)'
    if any(k in path for k in ['patient', 'history', 'profile']) and not auth_required:
        return 'High (IDOR & Broken Access Control)'
    if path == '/predict' and not auth_required:
        return 'High (Unauthenticated Model Execution & File Ingestion)'
    if method in ['POST', 'PUT', 'DELETE'] and not auth_required:
        return 'Medium (Missing Rate Limiting / Token)'
    return 'Low'

def get_endpoint_description(path, method):
    descriptions = {
        ('GET', '/'): 'API Health check and status ping',
        ('GET', '/dashboard'): 'Web dashboard displaying all saved patient records and diagnosis results',
        ('POST', '/register'): 'Registers a new doctor profile into MongoDB/local datastore',
        ('POST', '/login'): 'Validates user credentials against database',
        ('POST', '/check-email'): 'Checks if an email address already exists in the system',
        ('POST', '/reset-password'): 'Resets account password directly by email address',
        ('POST', '/profile/save'): 'Saves or updates doctor profile metadata',
        ('POST', '/profile/get'): 'Fetches doctor profile details by UID',
        ('POST', '/patients/save'): 'Saves a new patient clinical record',
        ('POST', '/patients/get'): 'Retrieves all active patient records for a UID',
        ('POST', '/history/save'): 'Saves a new AI fracture diagnosis history record',
        ('POST', '/history/get'): 'Retrieves active diagnosis history for a UID',
        ('POST', '/history/delete'): 'Soft-deletes a diagnosis record into Recycle Bin',
        ('POST', '/history/clear'): 'Clears all diagnosis history records for a UID',
        ('POST', '/history/deleted/get'): 'Fetches soft-deleted diagnosis records from Recycle Bin',
        ('POST', '/history/restore'): 'Restores a previously soft-deleted history record',
        ('POST', '/history/permanent_delete'): 'Permanently deletes a history record from database',
        ('POST', '/send-verification-email'): 'Dispatches 6-digit OTP verification code via Gmail SMTP',
        ('POST', '/predict'): 'Accepts X-ray image file and executes TFLite CNN inference model'
    }
    return descriptions.get((method, path), f"{method} request handler for {path}")

def discover_endpoints(filepath):
    endpoints = []
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for i, line in enumerate(lines, 1):
        match = re.search(r'@app\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', line, re.I)
        if match:
            method = match.group(1).upper()
            path = match.group(2)
            
            func_match = re.search(r'def\s+(\w+)', lines[i] if i < len(lines) else '')
            func_name = func_match.group(1) if func_match else 'unknown'

            context = ''.join(lines[max(0, i-2):min(len(lines), i+15)])
            # Real auth check (e.g. Depends(get_current_user), security bearer, etc.)
            has_auth = bool(re.search(r'(Depends\s*\(.*(auth|user|token|bearer|jwt)|security|oauth2)', context, re.I))
            
            params = re.findall(r'req:\s*(\w+)', context)
            file_param = 'UploadFile' if 'UploadFile' in context else None
            model = params[0] if params else (file_param or 'None')

            category = categorize_endpoint(path)
            expected_roles = assess_roles(path, has_auth)
            risk_level = assess_risk(path, method, has_auth)
            desc = get_endpoint_description(path, method)

            endpoints.append({
                'endpoint': path,
                'method': method,
                'auth_required': has_auth,
                'expected_roles': expected_roles,
                'controller_path': f"{os.path.basename(filepath)}:{i}",
                'full_file_path': filepath.replace('\\', '/'),
                'function': func_name,
                'line': i,
                'request_model': model,
                'category': category,
                'risk_level': risk_level,
                'description': desc
            })

    return endpoints

def main():
    backend_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'smart_condyle_backend')
    backend_dir = os.path.abspath(backend_dir)
    
    main_file = os.path.join(backend_dir, 'main.py')
    if not os.path.exists(main_file):
        print(f"[-] Error: main.py not found in {backend_dir}")
        sys.exit(1)

    print(f"[*] Discovering API endpoints in: {backend_dir}")
    endpoints = discover_endpoints(main_file)

    output_path = os.path.join(os.path.dirname(__file__), 'api-inventory.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(endpoints, f, indent=2)

    print("\n" + "="*60)
    print("API Endpoint Inventory Discovery Complete")
    print("="*60)
    print(f"  Total Discovered Endpoints : {len(endpoints)}")
    print(f"  Authenticated Endpoints    : {sum(1 for e in endpoints if e['auth_required'])}")
    print(f"  Unauthenticated Endpoints  : {sum(1 for e in endpoints if not e['auth_required'])}")
    print(f"\n[+] Inventory written to: {output_path}")

    return endpoints

if __name__ == '__main__':
    main()
