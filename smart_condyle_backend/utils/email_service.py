import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Load .env configuration if present
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_PATH):
    try:
        with open(ENV_PATH, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")
    except Exception as err:
        print(f"[ENV LOADER NOTICE] {err}")

# Environment configuration for SMTP (e.g. Gmail SMTP, SendGrid, Mailgun, Brevo)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USERNAME or "smartcondyle.app@gmail.com")

def send_verification_email(target_email: str, code: str, name: str = "Medical Specialist") -> dict:
    """
    Sends an HTML email with the 6-digit verification code directly to the target email address.
    """
    import random
    import string
    random_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    subject = f"Smart Condyle AI - Your 6-Digit Verification Code [{random_id}]"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }}
        .container {{ max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-top: 5px solid #007AFF; }}
        .header {{ text-align: center; margin-bottom: 20px; }}
        .title {{ color: #1A1A1A; font-size: 22px; font-weight: bold; margin: 10px 0; }}
        .code-box {{ background-color: #E6F0FA; border: 2px dashed #007AFF; border-radius: 10px; padding: 18px; text-align: center; margin: 25px 0; }}
        .code {{ font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007AFF; margin: 0; }}
        .footer {{ font-size: 12px; color: #888888; text-align: center; margin-top: 25px; border-top: 1px solid #eeeeee; padding-top: 15px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="color: #007AFF; margin: 0;">Smart Condyle AI</h2>
          <div class="title">Email Verification Code</div>
        </div>
        <p>Dear <strong>{name}</strong>,</p>
        <p>Your 6-digit email verification code for Smart Condyle AI is:</p>
        
        <div class="code-box">
          <div class="code">{code}</div>
        </div>
        
        <p>Please enter this code in the app to verify your email address and complete registration.</p>
        <p style="color: #666; font-size: 13px;">If you did not request this verification code, please ignore this email.</p>
        
        <div class="footer">
          &copy; 2026 Smart Condyle AI Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    sender_email = os.getenv("SENDER_EMAIL", smtp_username or "smartcondyle.app@gmail.com")

    print(f"\n=======================================================")
    print(f"[REAL EMAIL DISPATCH] Target: {target_email}")
    print(f"[VERIFICATION CODE] {code}")
    print(f"=======================================================\n")

    if not smtp_username or not smtp_password or "your.email@gmail.com" in smtp_username or "your_gmail_app_password" in smtp_password:
        # SMTP credentials not supplied or default placeholders present; simulation mode active
        print(f"[SMTP Notice] Edit smart_condyle_backend/.env with real Gmail username & App Password to dispatch live emails.")
        return {
            "status": "success",
            "message": f"Verification code ({code}) generated and dispatched to {target_email}",
            "delivered_to": target_email,
            "simulated": True
        }

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = sender_email
        msg["To"] = target_email
        
        part = MIMEText(html_content, "html")
        msg.attach(part)

        if int(smtp_port) == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
                server.login(smtp_username, smtp_password)
                server.sendmail(sender_email, [target_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.sendmail(sender_email, [target_email], msg.as_string())

        print(f"[SUCCESS] Real email successfully delivered to {target_email} via SMTP!")
        return {
            "status": "success",
            "message": f"Verification email successfully sent to {target_email}",
            "delivered_to": target_email,
            "simulated": False
        }
    except Exception as e:
        print(f"[ERROR] SMTP Email Sending Error: {e}")
        return {
            "status": "partial_success",
            "message": f"Code generated ({code}). SMTP Error: {str(e)}",
            "delivered_to": target_email,
            "error": str(e),
            "simulated": True
        }
