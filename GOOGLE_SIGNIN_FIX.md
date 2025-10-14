# Google Sign-In Fix Guide

## Problem
Getting error: "Something went wrong trying to finish signing in. Please close this screen to go back to the app."

## Root Cause
The redirect URI used by the app is not properly configured in Google Cloud Console.

---

## Solution Steps

### Step 1: Get Your Redirect URIs

Run this command in your NoteSpark project directory to see what redirect URIs your app will use:

```bash
npx expo start
```

Then check the console output for the redirect URI, or run:

```bash
npx uri-scheme list
```

Your redirect URIs will be something like:
- **Expo Go (Development)**: `exp://192.168.x.x:8081/--/redirect` or `exp://localhost:8081/--/redirect`
- **Standalone App**: `notespark://redirect`
- **Web**: `https://auth.expo.io/@joke69/NoteSpark/redirect`

### Step 2: Configure Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one if you haven't)

2. **Navigate to OAuth Consent Screen**
   - Go to: APIs & Services → OAuth consent screen
   - Make sure your app is configured (add test users if in testing mode)

3. **Configure OAuth 2.0 Client ID**
   - Go to: APIs & Services → Credentials
   - Find your Web Client ID: `791494175227-nu9nrtmsnrdi61nckfg5srn5pbcr25ee.apps.googleusercontent.com`
   - Click on it to edit

4. **Add Authorized Redirect URIs**
   
   Add ALL of these URIs to the "Authorized redirect URIs" section:

   ```
   https://auth.expo.io/@joke69/NoteSpark
   https://auth.expo.io/@joke69/NoteSpark/redirect
   notespark://redirect
   exp://localhost:8081/--/redirect
   exp://127.0.0.1:8081/--/redirect
   ```

   **Important**: 
   - Click "+ ADD URI" for each one
   - Make sure there are NO trailing slashes
   - Make sure there are NO spaces
   - URIs are case-sensitive

5. **Save Changes**
   - Click "SAVE" at the bottom
   - Wait 5-10 minutes for changes to propagate

### Step 3: Update app.json (Already Done)

Your `app.json` already has the correct scheme:
```json
"scheme": "notespark"
```

### Step 4: Test the Fix

1. **Restart your Expo app**:
   ```bash
   # Stop the current server (Ctrl+C)
   # Clear cache and restart
   npx expo start -c
   ```

2. **Try Google Sign-In again**
   - The error should be gone
   - You should be able to complete sign-in successfully

---

## Alternative Solution: Use Email/Password

If Google Sign-In continues to have issues, users can:
1. Use the "Register" option
2. Sign up with email and password
3. This works immediately without any configuration

---

## Troubleshooting

### Still Getting the Error?

1. **Check Console Logs**
   - Look at the Expo console output
   - Check for the actual redirect URI being used
   - Make sure it's added to Google Cloud Console

2. **Verify Google Cloud Settings**
   - Make sure OAuth consent screen is configured
   - Add your email as a test user if app is in "Testing" mode
   - Verify the Client ID matches: `791494175227-nu9nrtmsnrdi61nckfg5srn5pbcr25ee`

3. **Clear Cache**
   ```bash
   # Clear Expo cache
   npx expo start -c
   
   # Clear Google auth cache (if on Android)
   # Settings → Apps → Expo Go → Storage → Clear Cache
   ```

4. **Wait for Propagation**
   - Google Cloud changes can take 5-10 minutes to take effect
   - Try again after waiting

### For Production Build

When you build a standalone app (not Expo Go), you'll need:

1. **Android**: Add SHA-1 fingerprint to Firebase Console
   ```bash
   # Get SHA-1
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

2. **iOS**: Configure URL schemes in Xcode

---

## Quick Reference

**Your App Details:**
- Expo Username: `joke69`
- App Slug: `NoteSpark`
- Scheme: `notespark`
- Google Client ID: `791494175227-nu9nrtmsnrdi61nckfg5srn5pbcr25ee.apps.googleusercontent.com`

**Required Redirect URIs in Google Cloud:**
```
https://auth.expo.io/@joke69/NoteSpark
https://auth.expo.io/@joke69/NoteSpark/redirect
notespark://redirect
exp://localhost:8081/--/redirect
exp://127.0.0.1:8081/--/redirect
```

---

## Code Changes Made

The `googleAuthSimple.ts` file has been updated to:
- Use `AuthSession.makeRedirectUri()` for proper URI generation
- Better error handling and logging
- Improved token parsing from URL fragments
- User-friendly error messages

---

## Need Help?

If you're still having issues:
1. Check the Expo console logs for the actual redirect URI
2. Make sure that exact URI is in Google Cloud Console
3. Wait 10 minutes after adding URIs
4. Try clearing cache and restarting

The email/password authentication works perfectly as a backup option!
