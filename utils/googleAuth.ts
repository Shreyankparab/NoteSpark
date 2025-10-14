import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import Constants from "expo-constants";
import * as Linking from "expo-linking";

// Define the correct type for WebBrowser success result
interface WebBrowserAuthSessionResult {
  type: "success" | "cancel" | "dismiss" | "locked";
  url?: string;
}

WebBrowser.maybeCompleteAuthSession();

type GoogleClientIds = {
  web: string;
};

const GOOGLE_CLIENT_IDS: GoogleClientIds = {
  web: "189308470391-65rvc8sk05df38si10ru69oh516r01bc.apps.googleusercontent.com",
};

// Get the correct redirect URI based on environment
const getRedirectUri = () => {
  try {
    // Always use the web redirect URI which is supported by Google Cloud Console
    // This is the most reliable approach for both development and production
    return "https://auth.expo.io/@joke69/NoteSpark";
  } catch (error) {
    console.error("Error determining redirect URI:", error);
    // Fallback to the most reliable option
    return "https://auth.expo.io/@joke69/NoteSpark";
  }
};

const REDIRECT_URI = getRedirectUri();

export async function signInWithGoogle(): Promise<void> {
  try {
    // Generate a random nonce to prevent CSRF attacks
    const nonce =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Add flowName parameter to match what's shown in the error screenshot
    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: GOOGLE_CLIENT_IDS.web,
        redirect_uri: REDIRECT_URI,
        response_type: "id_token",
        scope: "openid email profile",
        prompt: "select_account",
        nonce: nonce,
        flowName: "GeneralOAuthFlow", // Adding this to match what's in the error
      }).toString();

    console.log("Opening auth session with redirect URI:", REDIRECT_URI);
    console.log("Full auth URL:", authUrl);

    // Use maybeCompleteAuthSession to ensure the session is properly handled
    WebBrowser.maybeCompleteAuthSession();
    
    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI) as WebBrowserAuthSessionResult;

    if (result.type === "cancel") {
      console.log("User cancelled the sign-in process");
      return;
    }

    if (result.type !== "success" || !result.url) {
      console.error("Google Sign-In failed:", result);
      // Check if the URL contains invalid_request error (Error 400)
      if (result.url && result.url.includes("invalid_request")) {
        console.error(
          "Invalid request error detected. This may be due to redirect URI mismatch."
        );
        throw new Error(
          "Authentication failed: Redirect URI mismatch. Please check Google Cloud Console configuration."
        );
      }
      throw new Error("Google Sign-In failed. Please try again.");
    }

    const url = result.url;
    console.log("Auth result URL (partial):", url.substring(0, 50) + "...");

    // Try to extract token from fragment (hash) - this is the most common format
    const fragment = url.split("#")[1] || "";
    const fragmentParams = new URLSearchParams(fragment);
    const idTokenFromFragment = fragmentParams.get("id_token");

    // Try to extract token from query parameters as fallback
    const query = url.split("?")[1] || "";
    const queryParams = new URLSearchParams(query);
    const idTokenFromQuery = queryParams.get("id_token");

    const idToken = idTokenFromFragment || idTokenFromQuery;

    if (!idToken) {
      console.error("No id_token found in the response URL");
      throw new Error("Authentication failed: No token received from Google");
    }

    console.log("Successfully received id_token, signing in...");
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    console.log("Successfully signed in with Google");
  } catch (error) {
    console.error("Error during Google sign-in:", error);
    throw error;
  }
}

export function getGoogleSetupHelp(): string {
  return (
    "To fix the 'Error 400: invalid_request' issue, follow these steps:\n\n" +
    "1. Go to Google Cloud Console > APIs & Services > Credentials\n" +
    "2. Edit your OAuth 2.0 Client ID\n" +
    "3. Add ONLY this redirect URI:\n" +
    "   https://auth.expo.io/@joke69/NoteSpark\n\n" +
    "4. Remove any URIs with formats like exp://192.168.x.x:8081/--/redirect\n\n" +
    "Important notes:\n" +
    "• Make sure there are NO trailing slashes\n" +
    "• Wait 5-10 minutes for changes to propagate after saving\n" +
    "• Verify you're using the correct Web Client ID: " +
    GOOGLE_CLIENT_IDS.web +
    "\n" +
    "• If testing in Expo Go, you may need to clear browser cache or try in incognito mode\n" +
    "• The error 'redirect_uri=exp://192.168.1.10:8081/--/redirect' occurs because Google doesn't accept this format\n" +
    "• For development testing, we're now using https://auth.expo.io/@joke69/NoteSpark instead"
  );
}

