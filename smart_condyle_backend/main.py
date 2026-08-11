import os
import json
import shutil
import time
import datetime
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any

from utils.preprocessing import preprocess_image
from utils.model import predict_image
from utils.email_service import send_verification_email

app = FastAPI(
    title="Smart Condyle Fracture Detection API",
    version="1.0"
)

# Enable CORS for React Native Web / Mobile app requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
DATA_DIR = "data"
USERS_FILE = os.path.join(DATA_DIR, "users.json")

for d in [UPLOAD_FOLDER, DATA_DIR]:
    os.makedirs(d, exist_ok=True)

# ──────────────── JSON File Helpers ────────────────
def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return []

def save_json(filepath, data):
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

def user_data_file(uid, kind):
    """Returns path like data/usr_1_123456_patients.json"""
    return os.path.join(DATA_DIR, f"{uid}_{kind}.json")

# ──────────────── Request Models ────────────────
class EmailRequest(BaseModel):
    email: str
    code: str
    name: Optional[str] = "Medical Specialist"

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    hospital: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class CheckEmailRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

class ProfileRequest(BaseModel):
    uid: str
    profile: dict

class GetDataRequest(BaseModel):
    uid: str

class PatientRequest(BaseModel):
    uid: str
    patient: dict

class HistoryRequest(BaseModel):
    uid: str
    record: dict

class DeleteHistoryRequest(BaseModel):
    uid: str
    record_id: str

class ClearHistoryRequest(BaseModel):
    uid: str

# ──────────────── Auth Endpoints ────────────────
@app.get("/")
def home():
    return {"message": "Smart Condyle API Running"}

@app.post("/register")
def register_user(req: RegisterRequest):
    users = load_json(USERS_FILE)
    clean_email = req.email.strip().lower()

    for u in users:
        if u.get("email", "").lower() == clean_email:
            return {"success": False, "message": "Email is already registered. Please log in."}

    new_user = {
        "uid": f"usr_{len(users) + 1}_{int(time.time())}",
        "name": req.name.strip(),
        "email": clean_email,
        "password": req.password,
        "hospital": req.hospital.strip() if req.hospital else "",
        "createdAt": datetime.datetime.now().isoformat(),
    }
    users.append(new_user)
    save_json(USERS_FILE, users)

    safe_user = {k: v for k, v in new_user.items() if k != "password"}
    return {"success": True, "user": safe_user}

@app.post("/login")
def login_user(req: LoginRequest):
    users = load_json(USERS_FILE)
    clean_email = req.email.strip().lower()

    for u in users:
        if u.get("email", "").lower() == clean_email and u.get("password") == req.password:
            safe_user = {k: v for k, v in u.items() if k != "password"}
            return {"success": True, "user": safe_user}

    return {"success": False, "message": "Invalid credentials. User does not exist or password is incorrect."}

@app.post("/check-email")
def check_email(req: CheckEmailRequest):
    users = load_json(USERS_FILE)
    clean_email = req.email.strip().lower()
    exists = any(u.get("email", "").lower() == clean_email for u in users)
    return {"exists": exists}

@app.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    users = load_json(USERS_FILE)
    clean_email = req.email.strip().lower()

    for u in users:
        if u.get("email", "").lower() == clean_email:
            u["password"] = req.new_password
            save_json(USERS_FILE, users)
            return {"success": True, "message": "Password reset successfully."}

    return {"success": False, "message": "Email address not found."}

# ──────────────── Profile Endpoints ────────────────
@app.post("/profile/save")
def save_profile(req: ProfileRequest):
    filepath = user_data_file(req.uid, "profile")
    existing = {}
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            existing = json.load(f)
    merged = {**existing, **req.profile}
    with open(filepath, "w") as f:
        json.dump(merged, f, indent=2)
    return {"success": True, "profile": merged}

@app.post("/profile/get")
def get_profile(req: GetDataRequest):
    filepath = user_data_file(req.uid, "profile")
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return {"success": True, "profile": json.load(f)}
    return {"success": True, "profile": {}}

# ──────────────── Patient Endpoints ────────────────
@app.post("/patients/save")
def save_patient(req: PatientRequest):
    filepath = user_data_file(req.uid, "patients")
    patients = load_json(filepath)
    patients.append(req.patient)
    save_json(filepath, patients)
    return {"success": True, "patients": patients}

@app.post("/patients/get")
def get_patients(req: GetDataRequest):
    filepath = user_data_file(req.uid, "patients")
    patients = load_json(filepath)
    return {"success": True, "patients": patients}

# ──────────────── History Endpoints ────────────────
@app.post("/history/save")
def save_history(req: HistoryRequest):
    filepath = user_data_file(req.uid, "history")
    history = load_json(filepath)
    record = {"id": str(int(time.time() * 1000)), **req.record}
    history.insert(0, record)
    save_json(filepath, history)
    return {"success": True, "history": history}

@app.post("/history/get")
def get_history(req: GetDataRequest):
    filepath = user_data_file(req.uid, "history")
    history = load_json(filepath)
    return {"success": True, "history": history}

@app.post("/history/delete")
def delete_history(req: DeleteHistoryRequest):
    filepath = user_data_file(req.uid, "history")
    history = load_json(filepath)
    
    target = next((r for r in history if r.get("id") == req.record_id), None)
    target_patient_id = target.get("patientId") if target else req.record_id
    target_name = target.get("name") if target else None

    updated = [r for r in history if r.get("id") != req.record_id 
               and r.get("patientId") != target_patient_id
               and (not target_name or r.get("name") != target_name)]
    save_json(filepath, updated)

    # Also remove from patients
    pfilepath = user_data_file(req.uid, "patients")
    patients = load_json(pfilepath)
    updated_patients = [p for p in patients if p.get("patientId") != target_patient_id 
                        and p.get("id") != req.record_id
                        and (not target_name or p.get("name") != target_name)]
    save_json(pfilepath, updated_patients)

    return {"success": True}

@app.post("/history/clear")
def clear_history(req: ClearHistoryRequest):
    for kind in ["history", "patients"]:
        filepath = user_data_file(req.uid, kind)
        save_json(filepath, [])
    return {"success": True}

# ──────────────── Email Endpoint ────────────────
@app.post("/send-verification-email")
def send_email_endpoint(req: EmailRequest):
    result = send_verification_email(req.email, req.code, req.name)
    return result

# ──────────────── AI Prediction Endpoint ────────────────
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    processed_image = preprocess_image(file_path)
    print("Image Shape:", processed_image.shape)

    result = predict_image(processed_image)
    print(result)

    return {
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "severity": result["severity"]
    }