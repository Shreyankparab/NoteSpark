# 🔧 Google OAuth "Access Blocked" Fix

## ❌ Current Error
```
Access blocked: Authorization Error
Parameter not allowed for this message type: code_challenge_method
Error 400: invalid_request
```

## 🎯 Root Cause
The redirect URI in Google Cloud Console doesn't match what the app is sending.

## ✅ Quick Fix Steps

### 1. **Update Google Cloud Console**

Go to [Google Cloud Console](https://console.cloud.google.com/) → Your Project → Credentials → Your Web Client ID

**Add these Authorized Redirect URIs:**
```
https://auth.expo.io/@joke69/NoteSpark
https://auth.expo.io/@joke69/NoteSpark/redirect
exp://127.0.0.1:8081/--/redirect
exp://localhost:8081/--/redirect
notespark://redirect
```

### 2. **Alternative: Use Expo's AuthSession Discovery**

If the above doesn't work, try this simpler approach:

```typescript
// In utils/googleAuth.ts, replace the signInWithGoogle function with:
export const signInWithGoogle = async (): Promise<boolean> => {
  try {
    if (!isGoogleSignInConfigured()) {
      Alert.alert('Google Sign-In Not Configured');
      return false;
    }

    // Use discovery document approach
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    };

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
      {
        clientId: GOOGLE_OAUTH_CONFIG.clientId.web,
        scopes: ['openid', 'profile', 'email'],
        redirectUri: AuthSession.makeRedirectUri(),
        responseType: AuthSession.ResponseType.IdToken,
      },
      discovery
    );

    const result = await promptAsync();
    
    if (result?.type === 'success') {
      const { id_token } = result.params;
      if (id_token) {
        const credential = GoogleAuthProvider.credential(id_token);
        await signInWithCredential(auth, credential);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Google Sign-In error:', error);
    return false;
  }
};
```

### 3. **Test the Redirect URI**

Run this in your browser to see what redirect URI Expo is expecting:
```
https://auth.expo.io/@joke69/NoteSpark
```

## 🚀 Quick Test

1. Update Google Cloud Console redirect URIs
2. Restart your Expo development server
3. Try Google Sign-In again

The error should be resolved!
