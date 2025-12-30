import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";

// Ensure auth session is ready
WebBrowser.maybeCompleteAuthSession();

// Client ID for Web (used for all platforms via implicit flow/popup)
const GOOGLE_CLIENT_ID = "189308470391-65rvc8sk05df38si10ru69oh516r01bc.apps.googleusercontent.com";

// Helper to determine if running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Get the correct redirect URI
const getRedirectUri = () => {
  try {
    // Attempt to generic a scheme-based URI (e.g., notespark://auth)
    return makeRedirectUri({
      scheme: 'notespark',
      path: 'auth'
    });
  } catch (e) {
    console.error("Redirect URI generation failed, falling back to proxy", e);
    return "https://auth.expo.io/@joke69/NoteSpark";
  }
};

export async function signInWithGoogle(): Promise<void> {
  try {
    // 1. Calculate the 'Deep Link' - where the app expects to receive the response
    const deepLink = getRedirectUri();

    // 2. Calculate the 'Google Redirect URI' - what we tell Google to send to
    let googleRedirectUri = deepLink;

    // Fix for Expo Go: Google doesn't allow exp:// URIs, so we use the auth.expo.io proxy
    if (isExpoGo || deepLink.includes('exp://')) {
      // We need to construct the proxy URL: https://auth.expo.io/@<owner>/<slug>
      // Use manifest config if available, otherwise fallback to hardcoded
      const slug = Constants.expoConfig?.slug || 'NoteSpark';
      // 'owner' might be undefined in dev, defaulting to your known username is safest for now
      const owner = Constants.expoConfig?.owner || 'joke69';

      googleRedirectUri = `https://auth.expo.io/@${owner}/${slug}`;
    }

    console.log("🚀 Starting Google Sign-In...");
    console.log("� Configuration:");
    console.log(`   - Deep Link (App): ${deepLink}`);
    console.log(`   - Redirect URI (Google): ${googleRedirectUri}`);

    if (googleRedirectUri.includes("auth.expo.io")) {
      console.log("   👉 ACTION REQUIRED: Add this URI to 'Authorized redirect URIs' in Google Cloud Console:");
      console.log(`      ${googleRedirectUri}`);
    }

    // Generate nonce for security
    const nonce = Math.random().toString(36).substring(2, 15);

    // Build the Auth URL
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: googleRedirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      prompt: "select_account",
      nonce: nonce,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Open the browser session
    // We pass 'deepLink' as the second arg so Expo knows when to close the browser (on matching return URL)
    const result = await WebBrowser.openAuthSessionAsync(authUrl, deepLink);

    if (result.type === "cancel") {
      console.log("❌ Sign-in cancelled by user");
      return;
    }

    if (result.type !== "success" || !result.url) {
      console.error("❌ Sign-in failed or incomplete", result);
      throw new Error(`Sign-in failed (${result.type})`);
    }

    // Parse the result URL to get the ID Token
    const url = result.url;
    // Google returns tokens in the hash fragment (#)
    let idToken = "";

    if (url.includes("#")) {
      const fragment = url.split("#")[1];
      const fragmentParams = new URLSearchParams(fragment);
      idToken = fragmentParams.get("id_token") || "";
    }

    // Fallback: Check query params if hash failed
    if (!idToken && url.includes("?")) {
      const query = url.split("?")[1];
      const queryParams = new URLSearchParams(query);
      idToken = queryParams.get("id_token") || "";
    }

    if (!idToken) {
      throw new Error("No ID token found in response URL");
    }

    // Sign in to Firebase
    console.log("✅ Authenticating with Firebase...");
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    console.log("🎉 Google Sign-in successful!");

  } catch (error) {
    console.error("🚨 Google Sign-In Error:", error);
    throw error;
  }
}

export function getGoogleSetupHelp(): string {
  return "Please check your terminal logs for the correct Redirect URI to add to Google Cloud Console.";
}
