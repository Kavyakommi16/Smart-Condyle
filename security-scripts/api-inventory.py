"""
Smart Condyle — API Endpoint Inventory Generator
Discovers all FastAPI endpoints from the backend source code.
"""
import re, os, json, sys

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

            context = ''.join(lines[max(0,i-2):min(len(lines),i+15)])
            has_auth = bool(re.search(r'(auth|token|session|bearer|api_key|verify|jwt)', context, re.I))
            
            params = re.findall(r'req:\s*(\w+)', context)
            model = params[0] if params else 'None'

            category = categorize_endpoint(path)

            endpoints.append({
                'endpoint': path,
                'method': method,
                'function': func_name,
                'file': os.path.basename(filepath),
                'line': i,
                'auth_required': has_auth,
                'request_model': model,
                'category': category,
                'risk_level': assess_risk(path, method, has_auth),
            })

    return endpoints

def categorize_endpoint(path):
    if path in ['/', '/docs', '/openapi.json', '/redoc']:
        return 'System'
    elif 'register' in path or 'login' in path or 'email' in path or 'password' in path:
        return 'Authentication'
    elif 'profile' in path:
        return 'Profile'
    elif 'patient' in path:
        return 'Patient Data'
    elif 'history' in path:
        return 'History'
    elif 'predict' in path:
        return 'AI/ML'
    elif 'verification' in path or 'otp' in path:
        return 'Verification'
    return 'General'

def assess_risk(path, method, has_auth):
    if method in ['POST', 'PUT', 'DELETE'] and not has_auth:
        if any(k in path for k in ['register', 'login', 'reset-password', 'send-verification']):
            return 'Medium'
        return 'High'
    if has_auth:
        return 'Low'
    if method == 'GET':
        return 'Low'
    return 'Medium'

def main():
    backend_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'smart_condyle_backend')
    backend_dir = os.path.abspath(backend_dir)
    
    main_file = os.path.join(backend_dir, 'main.py')
    if not os.path.exists(main_file):
        print(f"❌ main.py not found in {backend_dir}")
        sys.exit(1)

    endpoints = discover_endpoints(main_file)

    # Also scan any router files
    for root, dirs, files in os.walk(backend_dir):
        dirs[:] = [d for d in dirs if d not in ('venv', '__pycache__', '.git')]
        for f in files:
            if f.endswith('.py') and f != 'main.py':
                filepath = os.path.join(root, f)
                endpoints.extend(discover_endpoints(filepath))

    output_path = os.path.join(os.path.dirname(__file__), 'api-inventory.json')
    with open(output_path, 'w') as f:
        json.dump(endpoints, f, indent=2)

    print(f"\n{'='*50}")
    print(f"API Inventory Discovery Complete")
    print(f"{'='*50}")
    print(f"Total Endpoints: {len(endpoints)}")
    print(f"Authenticated:   {sum(1 for e in endpoints if e['auth_required'])}")
    print(f"Unauthenticated: {sum(1 for e in endpoints if not e['auth_required'])}")
    print(f"\nCategories:")
    categories = {}
    for e in endpoints:
        categories[e['category']] = categories.get(e['category'], 0) + 1
    for cat, count in categories.items():
        print(f"  {cat}: {count}")
    print(f"\nSaved to: {output_path}")

if __name__ == '__main__':
    main()
