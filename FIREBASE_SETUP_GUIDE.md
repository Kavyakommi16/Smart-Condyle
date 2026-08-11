# Firebase Authentication Production Setup Guide

This guide details the complete configuration steps required to connect **Smart Condyle AI** to **Firebase Authentication** in Production.

---

## Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Enter Project Name: `smart-condyle-ai`.
4. Enable or disable Google Analytics as preferred, then click **Create project**.

---

## Step 2: Register Web App & Obtain API Credentials
1. In your Firebase Project Overview page, click the **Web icon (`</>`)** to register a web application.
2. Enter App nickname: `Smart Condyle Web/Mobile`.
3. Click **Register app**.
4. Copy your Firebase Configuration object values (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

---

## Step 3: Enable Authentication Providers
1. In the left navigation menu, click **Build** -> **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab:
   - **Email/Password**: Click **Email/Password**, toggle **Enable**, and click **Save**.
   - **Google**: Click **Google**, toggle **Enable**, set support email to your Google email, and click **Save**.

---

## Step 4: Configure Authorized Domains for Web & Mobile
1. Under **Authentication** -> **Settings** -> **Authorized domains**:
2. Click **Add domain**.
3. Add `localhost` and your production domain (e.g. `smartcondyle.app` or Vercel/Expo host URL).

---

## Step 5: Configure Environment Variables in the Project
1. Open the project root environment file: [smart_condyle_app_rn/.env](file:///c:/Users/Kavya%20Kommi/SmartCondyle/smart_condyle_app_rn/.env).
2. Paste your Firebase credentials:

```ini
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyYourActualFirebaseApiKeyHere
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=smart-condyle-ai.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=smart-condyle-ai
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=smart-condyle-ai.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

---

## Step 6: Customize Email Templates (Optional)
1. Go to **Authentication** -> **Templates**.
2. Customize the **Email address verification** and **Password reset** templates with your hospital/app branding.

---

## Step 7: Verify Production Authentication
Restart your Metro bundler:
```bash
npx expo start --web --clear
```
- Sign up with a new email to receive an official **Firebase Verification Email**.
- Request password reset to receive an official **Firebase Password Reset Link**.
- Click **Sign in with Google** to verify via Google Auth.
