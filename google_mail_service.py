"""
PhishShift Google Mail Integration Service
Handles official Google OAuth 2.0 PKCE / Authorization Code Flow and Gmail API v1 messages retrieval.
Requests minimal read-only scope: https://www.googleapis.com/auth/gmail.readonly
"""

import os
import re
import json
import base64
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_MESSAGES_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages"

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
USERINFO_EMAIL_SCOPE = "https://www.googleapis.com/auth/userinfo.email"

class GoogleAuthError(Exception):
    """Raised when Google OAuth operations fail."""
    pass

class GmailApiError(Exception):
    """Raised when Gmail API requests fail."""
    pass


def get_google_client_id():
    return os.environ.get("GOOGLE_CLIENT_ID") or os.environ.get("VITE_GOOGLE_CLIENT_ID") or ""


def get_google_client_secret():
    return os.environ.get("GOOGLE_CLIENT_SECRET") or ""


def is_google_oauth_configured():
    client_id = get_google_client_id()
    client_secret = get_google_client_secret()
    return bool(client_id and client_secret)


def get_default_redirect_uri(request_host=None, request_scheme="https"):
    """
    Computes redirect URI. Priority:
    1. GOOGLE_REDIRECT_URI env var
    2. Dynamic callback URL from request host (if provided)
    3. Production default: https://phishsentry.onrender.com/api/auth/google/callback
    """
    configured = os.environ.get("GOOGLE_REDIRECT_URI")
    if configured:
        return configured.strip()
    
    if request_host:
        # Determine scheme (handle x-forwarded-proto or local)
        if "localhost" in request_host or "127.0.0.1" in request_host:
            request_scheme = "http"
        return f"{request_scheme}://{request_host}/api/auth/google/callback"
        
    return "https://phishsentry.onrender.com/api/auth/google/callback"


def build_authorization_url(state, redirect_uri=None):
    """
    Generates official Google OAuth 2.0 authorization URL with anti-CSRF state.
    """
    client_id = get_google_client_id()
    if not client_id:
        raise GoogleAuthError("Google Client ID is not configured in environment (GOOGLE_CLIENT_ID).")

    redirect = redirect_uri or get_default_redirect_uri()
    scopes = f"{GMAIL_READONLY_SCOPE} {USERINFO_EMAIL_SCOPE}"

    params = {
        "client_id": client_id,
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": scopes,
        "access_type": "offline",      # Requests refresh token
        "prompt": "consent",           # Ensures refresh token on first authorization
        "state": state,
        "include_granted_scopes": "true"
    }

    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code, redirect_uri=None):
    """
    Exchanges authorization code for access and refresh tokens.
    """
    client_id = get_google_client_id()
    client_secret = get_google_client_secret()

    if not client_id or not client_secret:
        raise GoogleAuthError("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.")

    redirect = redirect_uri or get_default_redirect_uri()

    payload = urllib.parse.urlencode({
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect,
        "grant_type": "authorization_code"
    }).encode("utf-8")

    req = urllib.request.Request(
        GOOGLE_TOKEN_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PhishShift/2.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in", 3600),
                "token_type": data.get("token_type", "Bearer")
            }
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8", errors="replace")
        raise GoogleAuthError(f"Google Token Exchange Failed ({err.code}): {err_body}")
    except Exception as err:
        raise GoogleAuthError(f"Token exchange network error: {str(err)}")


def refresh_access_token(refresh_token):
    """
    Refreshes an expired Google access token using the stored refresh token.
    """
    client_id = get_google_client_id()
    client_secret = get_google_client_secret()

    if not client_id or not client_secret or not refresh_token:
        raise GoogleAuthError("Missing credentials for token refresh.")

    payload = urllib.parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }).encode("utf-8")

    req = urllib.request.Request(
        GOOGLE_TOKEN_URL,
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PhishShift/2.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "access_token": data.get("access_token"),
                "expires_in": data.get("expires_in", 3600)
            }
    except Exception as err:
        raise GoogleAuthError(f"Could not refresh access token: {str(err)}")


def get_user_profile(access_token):
    """
    Retrieves authorized user's email address from Google OAuth2 userinfo endpoint.
    """
    req = urllib.request.Request(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}", "User-Agent": "PhishShift/2.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("email") or ""
    except Exception as err:
        raise GoogleAuthError(f"Could not fetch user profile: {str(err)}")


def extract_plain_text_from_payload(payload):
    """
    Recursively navigates Gmail message payload to extract plain text safely.
    Strips raw HTML tags to prevent rendering untrusted HTML or script execution.
    """
    body_text = ""
    
    # 1. Direct body
    data = payload.get("body", {}).get("data")
    mime_type = payload.get("mimeType", "")
    
    if data:
        try:
            # Gmail uses URL-safe base64
            decoded = base64.urlsafe_b64decode(data + "===").decode("utf-8", errors="replace")
            if "html" in mime_type:
                decoded = strip_html_tags(decoded)
            body_text += decoded + "\n"
        except Exception:
            pass
            
    # 2. Multipart parts
    parts = payload.get("parts", [])
    for part in parts:
        part_mime = part.get("mimeType", "")
        part_data = part.get("body", {}).get("data")
        
        if part_data:
            try:
                decoded = base64.urlsafe_b64decode(part_data + "===").decode("utf-8", errors="replace")
                if "plain" in part_mime:
                    body_text += decoded + "\n"
                elif "html" in part_mime and not body_text:
                    body_text += strip_html_tags(decoded) + "\n"
            except Exception:
                pass
                
        # Recursive check for nested parts (e.g. multipart/related inside multipart/alternative)
        if part.get("parts"):
            body_text += extract_plain_text_from_payload(part) + "\n"

    # Clean whitespace
    lines = [line.strip() for line in body_text.splitlines() if line.strip()]
    return "\n".join(lines)


def strip_html_tags(html_content):
    """
    Safely removes script, style tags and converts HTML to plain text without executing anything.
    """
    if not html_content:
        return ""
    # Strip script and style blocks
    cleaned = re.sub(r"<(script|style|iframe|object|embed).*?</\1>", " ", html_content, flags=re.DOTALL | re.IGNORECASE)
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    # Unescape common entities
    cleaned = cleaned.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
    # Normalize whitespace
    return " ".join(cleaned.split())


def fetch_emails_last_30_days(access_token, max_messages=50):
    """
    Queries Gmail API for messages received in the last 30 days (excluding spam/trash).
    Fetches full message metadata and safely extracts sender, subject, date, and text.
    """
    # 1. Compute 30-day query: after:YYYY/MM/DD -in:spam -in:trash
    now_utc = datetime.now(timezone.utc)
    thirty_days_ago = now_utc - timedelta(days=30)
    after_date_str = thirty_days_ago.strftime("%Y/%m/%d")
    
    query = f"after:{after_date_str} -in:spam -in:trash"
    params = urllib.parse.urlencode({"q": query, "maxResults": min(max_messages, 100)})
    list_url = f"{GMAIL_MESSAGES_URL}?{params}"

    req = urllib.request.Request(
        list_url,
        headers={"Authorization": f"Bearer {access_token}", "User-Agent": "PhishShift/2.0"}
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            list_data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        if err.code == 401:
            raise GmailApiError("Token expired or invalid. Please reconnect your account.")
        raise GmailApiError(f"Gmail list messages failed ({err.code}): {err.reason}")
    except Exception as err:
        raise GmailApiError(f"Gmail request error: {str(err)}")

    message_items = list_data.get("messages", [])
    total_found = list_data.get("resultSizeEstimate", len(message_items))

    if not message_items:
        return {
            "date_range": {
                "from": after_date_str,
                "to": now_utc.strftime("%Y/%m/%d")
            },
            "total_found": 0,
            "emails": []
        }

    emails = []
    # 2. Retrieve details for each message
    for item in message_items:
        msg_id = item["id"]
        msg_url = f"{GMAIL_MESSAGES_URL}/{msg_id}?format=full"
        
        detail_req = urllib.request.Request(
            msg_url,
            headers={"Authorization": f"Bearer {access_token}", "User-Agent": "PhishShift/2.0"}
        )

        try:
            with urllib.request.urlopen(detail_req, timeout=15) as detail_resp:
                msg_data = json.loads(detail_resp.read().decode("utf-8"))
                
                # Extract headers
                headers = msg_data.get("payload", {}).get("headers", [])
                header_dict = {h.get("name", "").lower(): h.get("value", "") for h in headers}
                
                sender = header_dict.get("from", "Unknown Sender")
                subject = header_dict.get("subject", "(No Subject)")
                date_hdr = header_dict.get("date", "")
                
                # Internal timestamp in milliseconds
                internal_date_ms = int(msg_data.get("internalDate", 0))
                if internal_date_ms:
                    received_dt = datetime.fromtimestamp(internal_date_ms / 1000.0, tz=timezone.utc)
                    formatted_date = received_dt.strftime("%Y-%m-%d %H:%M UTC")
                else:
                    formatted_date = date_hdr or "Recently"

                snippet = msg_data.get("snippet", "")
                body_text = extract_plain_text_from_payload(msg_data.get("payload", {}))
                if not body_text.strip():
                    body_text = snippet

                emails.append({
                    "provider_message_id": msg_id,
                    "sender": sender,
                    "subject": subject,
                    "date": formatted_date,
                    "snippet": snippet,
                    "body": body_text
                })
        except Exception:
            # Skip individually unreadable messages gracefully
            continue

    return {
        "date_range": {
            "from": after_date_str,
            "to": now_utc.strftime("%Y/%m/%d")
        },
        "total_found": total_found,
        "emails": emails
    }
