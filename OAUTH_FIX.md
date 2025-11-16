# Fixing OAuth Redirect URI Mismatch

## Problem
You're getting: `Error 400: redirect_uri_mismatch`

This means the redirect URI in your code doesn't match what's registered in Google Cloud Console.

## Solution

### 1. Check Your Current Redirect URI
Your app is using: `http://localhost:8000/api/v1/calendar/oauth/callback`

### 2. Add It to Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Select your project
3. Navigate to: **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (the one you created)
5. Click **Edit** (pencil icon)
6. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:8000/api/v1/calendar/oauth/callback
   ```
7. Click **Save**

### 3. Important Notes

- The URI must match **exactly** (including `http://` not `https://`)
- No trailing slashes
- Case-sensitive
- Wait 1-2 minutes after saving for changes to propagate

### 4. Test Again

After adding the redirect URI, try connecting Google Calendar again.

## Alternative: If Frontend Will Handle OAuth

If you want the frontend to handle the OAuth callback instead, you'd need:

1. Add this to Google Cloud Console:
   ```
   http://localhost:3000/api/auth/callback/google
   ```

2. Create a Next.js API route to handle the callback

But for now, the backend callback should work once you add the redirect URI to Google Cloud Console.

