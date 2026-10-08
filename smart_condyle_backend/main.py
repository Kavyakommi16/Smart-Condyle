import os
import shutil
import time
import datetime
import json
import csv
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv()

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

for d in [UPLOAD_FOLDER, DATA_DIR]:
    os.makedirs(d, exist_ok=True)

# ──────────────── MongoDB Database Helpers ────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["smart_condyle"]

def export_tables_to_csv():
    try:
        for collection_name in ["patients", "history"]:
            collection = db[collection_name]
            cursor = collection.find({}, {"_id": 0})
            rows = list(cursor)
            if rows:
                with open(os.path.join(DATA_DIR, f"{collection_name}.csv"), "w", newline="", encoding="utf-8") as f:
                    writer = csv.writer(f)
                    writer.writerow(rows[0].keys())
                    for row in rows:
                        writer.writerow(row.values())
    except Exception as e:
        print("Error exporting CSV:", e)

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
    mobile: Optional[str] = ""

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
    return {"message": "Smart Condyle API Running with MongoDB"}

@app.get("/dashboard", response_class=HTMLResponse)
def doctor_dashboard():
    patients = list(db.patients.find({}, {"_id": 0}).sort("id", -1))
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Doctor Dashboard - Smart Condyle</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background-color: #f0f2f5; }
            h1 { color: #1a1a1a; text-align: center; margin-bottom: 30px; }
            .table-container { background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 15px; text-align: left; border-bottom: 1px solid #eaeaea; }
            th { background-color: #2563eb; color: white; font-weight: 600; text-transform: uppercase; font-size: 14px; }
            tr:hover { background-color: #f8fafc; }
            tr:last-child td { border-bottom: none; }
            .severity { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
            .btn { display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; margin-bottom: 20px; font-weight: bold; }
        </style>
    </head>
    <body>
        <h1>🩺 Patient Data Dashboard</h1>
        <a href="/data/patients.csv" class="btn" download style="display:none;">Download Excel (CSV)</a>
        <div class="table-container">
            <table>
                <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Phone</th>
                    <th>Injury & Symptoms</th>
                    <th>Prediction</th>
                </tr>
    """
    for p in patients:
        html += f"""
                <tr>
                    <td>{p.get('patientId', '')}</td>
                    <td><strong>{p.get('name', '')}</strong></td>
                    <td>{p.get('age', '')}</td>
                    <td>{p.get('gender', '')}</td>
                    <td>{p.get('phone', '')}</td>
                    <td>{p.get('injury', '')}<br><small style="color:gray;">{p.get('symptoms', '')}</small></td>
                    <td><span class="severity">{p.get('prediction', '')}</span></td>
                </tr>
        """
    html += """
            </table>
        </div>
    </body>
    </html>
    """
    return html

@app.post("/register")
def register_user(req: RegisterRequest):
    clean_email = req.email.strip().lower()
    
    if db.users.find_one({"email": clean_email}):
        return {"success": False, "message": "Email is already registered. Please log in."}
        
    uid = f"usr_{int(time.time()*1000)}"
    user_data = {
        "uid": uid,
        "name": req.name.strip(),
        "email": clean_email,
        "password": req.password,
        "hospital": req.hospital.strip() if req.hospital else "",
        "mobile": req.mobile.strip() if req.mobile else "",
        "createdAt": datetime.datetime.now().isoformat()
    }
    
    db.users.insert_one(user_data)
    
    safe_user = {k: v for k, v in user_data.items() if k not in ["_id", "password"]}
    return {"success": True, "user": safe_user}

@app.post("/login")
def login_user(req: LoginRequest):
    clean_email = req.email.strip().lower()
    
    user = db.users.find_one({"email": clean_email, "password": req.password})
    
    if user:
        safe_user = {k: v for k, v in user.items() if k not in ["_id", "password"]}
        return {"success": True, "user": safe_user}
    
    return {"success": False, "message": "Invalid credentials. User does not exist or password is incorrect."}

@app.post("/check-email")
def check_email(req: CheckEmailRequest):
    clean_email = req.email.strip().lower()
    exists = db.users.find_one({"email": clean_email}) is not None
    return {"exists": exists}

@app.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    clean_email = req.email.strip().lower()
    
    result = db.users.update_one(
        {"email": clean_email},
        {"$set": {"password": req.new_password}}
    )
    
    if result.modified_count > 0:
        return {"success": True, "message": "Password reset successfully."}
    
    return {"success": False, "message": "Email address not found."}

# ──────────────── Profile Endpoints ────────────────
@app.post("/profile/save")
def save_profile(req: ProfileRequest):
    existing = db.profiles.find_one({"uid": req.uid})
    existing_profile = json.loads(existing["profile_data"]) if existing and "profile_data" in existing else {}
    merged = {**existing_profile, **req.profile}
    
    db.profiles.update_one(
        {"uid": req.uid},
        {"$set": {"profile_data": json.dumps(merged)}},
        upsert=True
    )
    
    return {"success": True, "profile": merged}

@app.post("/profile/get")
def get_profile(req: GetDataRequest):
    profile_doc = db.profiles.find_one({"uid": req.uid})
    
    if profile_doc and "profile_data" in profile_doc:
        return {"success": True, "profile": json.loads(profile_doc["profile_data"])}
    return {"success": True, "profile": {}}

# ──────────────── Patient Endpoints ────────────────
@app.post("/patients/save")
def save_patient(req: PatientRequest):
    p = req.patient
    # Simple ID generation for backward compatibility with auto-increment
    patient_count = db.patients.count_documents({})
    new_id = patient_count + 1
    
    patient_data = {
        "id": new_id,
        "uid": req.uid,
        "patientId": p.get("patientId"),
        "name": p.get("name"),
        "age": p.get("age"),
        "gender": p.get("gender"),
        "phone": p.get("phone"),
        "injury": p.get("injury"),
        "symptoms": p.get("symptoms"),
        "medical_history": p.get("history"),
        "prediction": p.get("prediction"),
        "confidence": p.get("confidence"),
        "severity": p.get("severity"),
        "imageUri": p.get("imageUri")
    }
    
    db.patients.insert_one(patient_data)
    export_tables_to_csv()
    
    cursor = db.patients.find({"uid": req.uid}, {"_id": 0})
    patients = []
    for doc in cursor:
        doc["history"] = doc.pop("medical_history", "")
        patients.append(doc)
        
    return {"success": True, "patients": patients}

@app.post("/patients/get")
def get_patients(req: GetDataRequest):
    cursor = db.patients.find({"uid": req.uid}, {"_id": 0})
    patients = []
    for doc in cursor:
        doc["history"] = doc.pop("medical_history", "")
        patients.append(doc)
    return {"success": True, "patients": patients}

# ──────────────── History Endpoints ────────────────
@app.post("/history/save")
def save_history(req: HistoryRequest):
    record_id = str(int(time.time() * 1000))
    r = req.record
    
    history_data = {
        "id": record_id,
        "uid": req.uid,
        "patientId": r.get("patientId"),
        "name": r.get("name"),
        "age": r.get("age"),
        "gender": r.get("gender"),
        "injury": r.get("injury"),
        "symptoms": r.get("symptoms"),
        "medical_history": r.get("history"),
        "imageUri": r.get("imageUri"),
        "prediction": r.get("prediction"),
        "confidence": r.get("confidence"),
        "severity": r.get("severity"),
        "date": r.get("date"),
        "is_deleted": 0
    }
    
    db.history.insert_one(history_data)
    export_tables_to_csv()
    
    cursor = db.history.find({"uid": req.uid, "is_deleted": 0}, {"_id": 0}).sort("id", -1)
    history = []
    for doc in cursor:
        doc["history"] = doc.pop("medical_history", "")
        history.append(doc)
        
    return {"success": True, "history": history}

@app.post("/history/get")
def get_history(req: GetDataRequest):
    cursor = db.history.find({"uid": req.uid, "is_deleted": 0}, {"_id": 0}).sort("id", -1)
    history = []
    for doc in cursor:
        doc["history"] = doc.pop("medical_history", "")
        history.append(doc)
    return {"success": True, "history": history}

@app.post("/history/delete")
def delete_history(req: DeleteHistoryRequest):
    db.history.update_one(
        {"id": req.record_id, "uid": req.uid},
        {"$set": {"is_deleted": 1}}
    )
    return {"success": True}

@app.post("/history/clear")
def clear_history(req: ClearHistoryRequest):
    db.history.delete_many({"uid": req.uid})
    return {"success": True}

@app.post("/history/deleted/get")
def get_deleted_history(req: GetDataRequest):
    cursor = db.history.find({"uid": req.uid, "is_deleted": 1}, {"_id": 0}).sort("id", -1)
    history = []
    for doc in cursor:
        doc["history"] = doc.pop("medical_history", "")
        history.append(doc)
    return {"success": True, "history": history}

@app.post("/history/restore")
def restore_history(req: DeleteHistoryRequest):
    db.history.update_one(
        {"id": req.record_id, "uid": req.uid},
        {"$set": {"is_deleted": 0}}
    )
    return {"success": True}

@app.post("/history/permanent_delete")
def permanent_delete_history(req: DeleteHistoryRequest):
    db.history.delete_one({"id": req.record_id, "uid": req.uid})
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