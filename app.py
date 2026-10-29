import os
import re
import secrets
import logging
import gzip
import joblib

from flask import Flask, request, jsonify, render_template, send_from_directory, session, redirect
from werkzeug.exceptions import BadRequest
import email_protection_db as db
import google_mail_service

# --------------------------------------------------
# Flask application configuration
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app = Flask(
    __name__,
    static_folder=STATIC_DIR,
    template_folder=TEMPLATES_DIR
)

app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024  # 1 MB request limit
app.secret_key = os.environ.get("SECRET_KEY") or os.environ.get("FLASK_SECRET_KEY") or "phishshift-secret-key-prod-2026"

logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)


# --------------------------------------------------
# Load existing trained ML artifacts
# --------------------------------------------------

def load_artifact(filename):
    path = os.path.join(BASE_DIR, filename)

    if not os.path.isfile(path):
        raise FileNotFoundError(
            f"Required model file not found: {path}"
        )

    app.logger.info("Loading artifact: %s", filename)
    return joblib.load(path)


vectorizer = load_artifact("tfidf_vectorizer.joblib")
lr_model = load_artifact("logistic_regression_model.joblib")
svm_model = load_artifact("linear_svm_model.joblib")


# Initialize email protection database
db.init_db()


# --------------------------------------------------
# CORS Handling & Gzip Compression
# --------------------------------------------------

@app.after_request
def add_cors_and_compression(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PATCH, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"

    # Compress compressible text/js/json/css responses if client supports gzip
    accept_encoding = request.headers.get("Accept-Encoding", "")
    if (
        "gzip" in accept_encoding.lower()
        and response.status_code < 300
        and response.content_type
        and any(t in response.content_type for t in ["text/", "application/javascript", "application/json", "text/css", "image/svg+xml"])
        and "Content-Encoding" not in response.headers
    ):
        if response.direct_passthrough:
            response.direct_passthrough = False
        data = response.get_data()
        if len(data) >= 500:
            compressed = gzip.compress(data, compresslevel=6)
            response.set_data(compressed)
            response.headers["Content-Encoding"] = "gzip"
            response.headers["Content-Length"] = len(compressed)
            response.headers["Vary"] = "Accept-Encoding"

    return response


# --------------------------------------------------
# Frontend & Static Routing (SPA Support)
# --------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    resp = send_from_directory(os.path.join(STATIC_DIR, "assets"), filename)
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp


@app.route("/models/<path:filename>")
def serve_models(filename):
    resp = send_from_directory(os.path.join(STATIC_DIR, "models"), filename)
    resp.headers["Cache-Control"] = "public, max-age=604800, immutable"
    return resp


@app.route("/check", methods=["GET"])
@app.route("/result", methods=["GET"])
@app.route("/help", methods=["GET"])
@app.route("/privacy", methods=["GET"])
@app.route("/email-protection", methods=["GET"])
def spa_routes():
    return render_template("index.html")


@app.route("/<filename>", methods=["GET"])
def serve_root_file(filename):
    file_path = os.path.join(STATIC_DIR, filename)
    if os.path.isfile(file_path):
        return send_from_directory(STATIC_DIR, filename)
    # If not a static file, route to SPA index.html
    return render_template("index.html")


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "running",
        "service": "PhishShift",
        "models_loaded": True,
        "prediction_endpoint": "/predict"
    }), 200


# --------------------------------------------------
# Email prediction API
# --------------------------------------------------

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return "", 204
    try:
        data = request.get_json(silent=False)
    except BadRequest:
        return jsonify({
            "error": "Invalid JSON. Send a valid JSON request body."
        }), 400

    if not isinstance(data, dict):
        return jsonify({
            "error": "Request body must be a JSON object."
        }), 400

    emails = data.get("emails")
    model_type = data.get("model", "svm")

    if not isinstance(emails, list) or len(emails) == 0:
        return jsonify({
            "error": "Provide a non-empty list of email texts."
        }), 400

    if len(emails) > 100:
        return jsonify({
            "error": "Maximum 100 emails per request."
        }), 400

    if not all(
        isinstance(email, str) and email.strip()
        for email in emails
    ):
        return jsonify({
            "error": "Every email must be a non-empty string."
        }), 400

    if sum(len(email) for email in emails) > 500_000:
        return jsonify({
            "error": "Combined email text exceeds the allowed limit."
        }), 400

    if model_type not in ("lr", "svm"):
        return jsonify({
            "error": "Invalid model. Choose 'lr' or 'svm'."
        }), 400

    try:
        # Convert email text into the trained TF-IDF feature space
        features = vectorizer.transform(emails)

        # Select the requested trained model
        model = lr_model if model_type == "lr" else svm_model

        predictions = model.predict(features)

        # Probabilities and SVM decision scores are different.
        if hasattr(model, "predict_proba"):
            scores = model.predict_proba(features)[:, 1]
            score_type = "probability"

        elif hasattr(model, "decision_function"):
            scores = model.decision_function(features)
            score_type = "decision_score"

        else:
            scores = [None] * len(predictions)
            score_type = "unavailable"

        results = []

        for idx, (email, prediction, score) in enumerate(
            zip(emails, predictions, scores)
        ):
            prediction = int(prediction)

            results.append({
                "email_index": idx,
                "text_preview": email[:100],
                "prediction": prediction,
                "label_name": (
                    "Phishing" if prediction == 1 else "Safe"
                ),
                "confidence_score": (
                    float(score) if score is not None else None
                ),
                "score_type": score_type
            })

        app.logger.info(
            "Prediction completed: model=%s, emails=%d",
            model_type,
            len(results)
        )

        return jsonify({
            "model_used": (
                "Logistic Regression"
                if model_type == "lr"
                else "Linear SVM"
            ),
            "total_emails": len(results),
            "results": results
        }), 200

    except Exception:
        app.logger.exception("Prediction failed")

        return jsonify({
            "error": (
                "Prediction failed. Check server logs "
                "for model or vectorizer compatibility issues."
            )
        }), 500


# --------------------------------------------------
# Automatic Email Protection & Inbox Scanning API
# --------------------------------------------------

def analyze_inbox_email(subject, body, sender):
    """Analyzes an inbox email using the trained TF-IDF & Logistic Regression ML models + sender rules."""
    full_text = f"{subject}\n\n{body}"
    sender_rule = db.check_sender_rule(sender)

    # 1. Real ML evaluation
    features = vectorizer.transform([full_text])
    ml_prediction = int(lr_model.predict(features)[0])
    if hasattr(lr_model, "predict_proba"):
        ml_score = float(lr_model.predict_proba(features)[0, 1])
    else:
        ml_score = 0.95 if ml_prediction == 1 else 0.05

    # 2. Extract warning signs
    warning_signs = []

    # Check deceptive links & IPs
    url_matches = re.findall(
        r"(https?://[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:xyz|top|ru|cn|click|loan|live|club|online|site)[^\s]*)",
        full_text,
        re.IGNORECASE
    )
    has_suspicious_tld = any(
        re.search(r"\.(xyz|top|click|loan|live|club|online|site)", u, re.I)
        for u in url_matches
    )
    has_ip_link = any(
        re.search(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", u)
        for u in url_matches
    )

    if has_ip_link:
        warning_signs.append("Points to a raw numeric IP address instead of an official domain")
    if has_suspicious_tld:
        warning_signs.append("Uses a high-risk disposable web domain extension (.xyz, .top)")

    # Pressure, panic, and credential wording
    if re.search(r"\b(blocked|suspended|terminated|freeze|deactivated)\b", full_text, re.I):
        warning_signs.append("Uses panic wording threatening immediate account suspension")
    if re.search(r"\b(immediately|urgent|within \d+ hours?|act now|hurry)\b", full_text, re.I):
        warning_signs.append("Creates artificial time pressure to rush action")
    if re.search(r"\b(kyc|pan|aadhaar|pin|password|otp|cvv|credentials)\b", full_text, re.I):
        warning_signs.append("Requests sensitive credentials or personal identity details")

    # 3. Apply sender rules
    if sender_rule == "blocked":
        warning_signs.insert(0, f"Sender '{sender}' is on your personal Blocked Senders list")
        return {
            "verdict": "likely_scam",
            "severity_level": "critical",
            "model_score": max(round(ml_score, 4), 0.98),
            "warning_signs": warning_signs,
            "status": "blocked"
        }

    if sender_rule == "trusted":
        # A trusted sender must NOT bypass phishing analysis if dangerous links/phrases are detected
        if ml_score >= 0.70 or has_ip_link or has_suspicious_tld:
            warning_signs.append(f"Sender address '{sender}' is in your trusted list, but message content shows high risk of compromised account or spoofing")
            return {
                "verdict": "likely_scam",
                "severity_level": "high",
                "model_score": round(ml_score, 4),
                "warning_signs": warning_signs,
                "status": "in_review"
            }
        elif ml_score >= 0.40 or warning_signs:
            warning_signs.append(f"Sender '{sender}' is trusted, but unexpected wording was flagged for your review")
            return {
                "verdict": "not_sure",
                "severity_level": "medium",
                "model_score": round(ml_score, 4),
                "warning_signs": warning_signs,
                "status": "in_review"
            }
        else:
            return {
                "verdict": "no_signs",
                "severity_level": "low",
                "model_score": round(ml_score, 4),
                "warning_signs": ["Sender is verified on your Trusted Senders list"],
                "status": "safe"
            }

    # 4. Standard classification for unlisted senders
    if (ml_score >= 0.65 or ml_prediction == 1) or has_ip_link or has_suspicious_tld:
        severity = "critical" if ml_score >= 0.85 or has_ip_link else "high"
        return {
            "verdict": "likely_scam",
            "severity_level": severity,
            "model_score": round(ml_score, 4),
            "warning_signs": warning_signs or ["Model detected suspicious scam patterns"],
            "status": "in_review"
        }
    elif ml_score >= 0.35 or len(warning_signs) > 0:
        return {
            "verdict": "not_sure",
            "severity_level": "medium",
            "model_score": round(ml_score, 4),
            "warning_signs": warning_signs or ["Contains ambiguous phrasing; proceed with care"],
            "status": "in_review"
        }
    else:
        return {
            "verdict": "no_signs",
            "severity_level": "low",
            "model_score": round(ml_score, 4),
            "warning_signs": [],
            "status": "safe"
        }


@app.route("/api/inbox/status", methods=["GET"])
def inbox_status():
    """Returns current inbox protection connection state, scan stats, and alert counts."""
    conn_info = db.get_connection_info()
    messages = db.get_inbox_messages()
    alerts = db.get_threat_alerts(include_dismissed=False)

    total_count = len(messages)
    pending_count = sum(1 for m in messages if m["scan_status"] == "pending")
    in_review_count = sum(1 for m in messages if m["status"] == "in_review")
    safe_count = sum(1 for m in messages if m["status"] in ("safe", "released"))
    blocked_count = sum(1 for m in messages if m["status"] == "blocked")
    unread_alerts = sum(1 for a in alerts if not a["is_read"])

    return jsonify({
        "connection": conn_info,
        "stats": {
            "total_messages": total_count,
            "pending_scans": pending_count,
            "in_review": in_review_count,
            "safe": safe_count,
            "blocked": blocked_count,
            "active_alerts": len(alerts),
            "unread_alerts": unread_alerts
        }
    }), 200


# --------------------------------------------------
# Real Google OAuth 2.0 & Gmail Integration
# --------------------------------------------------

@app.route("/api/auth/google/url", methods=["GET"])
def google_auth_url():
    """Returns official Google OAuth 2.0 consent URL or clear setup requirements if unconfigured."""
    redirect_uri = google_mail_service.get_default_redirect_uri(request.host)
    if not google_mail_service.is_google_oauth_configured():
        return jsonify({
            "configured": False,
            "message": "Google OAuth is not configured yet on the backend.",
            "setup_guide": {
                "required_env_vars": [
                    "GOOGLE_CLIENT_ID (or VITE_GOOGLE_CLIENT_ID)",
                    "GOOGLE_CLIENT_SECRET"
                ],
                "authorized_redirect_uri": redirect_uri,
                "scope": "https://www.googleapis.com/auth/gmail.readonly"
            }
        }), 200

    state = secrets.token_urlsafe(32)
    session["oauth_state"] = state
    auth_url = google_mail_service.build_authorization_url(state=state, redirect_uri=redirect_uri)
    return jsonify({
        "configured": True,
        "auth_url": auth_url,
        "redirect_uri": redirect_uri
    }), 200


@app.route("/api/auth/google/callback", methods=["GET"])
def google_auth_callback():
    """Handles official Google OAuth authorization code callback."""
    error = request.args.get("error")
    if error:
        app.logger.warning("Google OAuth error from user consent: %s", error)
        return redirect(f"/email-protection?auth_error={error}")

    code = request.args.get("code")
    state = request.args.get("state")

    if not code:
        return redirect("/email-protection?auth_error=missing_code")

    expected_state = session.get("oauth_state")
    if expected_state and state and state != expected_state:
        app.logger.error("OAuth state mismatch: possible CSRF attempt.")
        return redirect("/email-protection?auth_error=state_mismatch")

    try:
        redirect_uri = google_mail_service.get_default_redirect_uri(request.host)
        tokens = google_mail_service.exchange_code_for_tokens(code, redirect_uri=redirect_uri)
        user_email = google_mail_service.get_user_profile(tokens["access_token"])
        if not user_email:
            return redirect("/email-protection?auth_error=could_not_read_profile")

        db.set_real_account_connected(
            provider="google",
            email=user_email,
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            expires_in=tokens.get("expires_in", 3600)
        )
        app.logger.info("Successfully connected real Google account: %s", user_email)
        return redirect("/email-protection?connected=1")

    except Exception:
        app.logger.exception("Google OAuth callback exchange failed")
        return redirect("/email-protection?auth_error=exchange_failed")


@app.route("/api/auth/disconnect", methods=["POST", "OPTIONS"])
def disconnect_account():
    """Disconnects real account, clears tokens and associated messages."""
    if request.method == "OPTIONS":
        return "", 204
    updated = db.disconnect_inbox()
    return jsonify({"success": True, "connection": updated}), 200


@app.route("/api/inbox/demo-mode", methods=["POST", "OPTIONS"])
def toggle_demo_mode():
    """Explicitly enables or disables Demo Mode for sandbox testing."""
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json(silent=True) or {}
    action = data.get("action", "enable")

    if action == "enable":
        updated = db.enable_demo_mode()
    else:
        updated = db.disconnect_inbox()

    return jsonify({"success": True, "connection": updated}), 200


@app.route("/api/inbox/scan-30-days", methods=["POST", "OPTIONS"])
@app.route("/api/inbox/scan", methods=["POST", "OPTIONS"])
def inbox_scan():
    """Scans emails from the last 30 days using real Gmail API or sandbox demo messages."""
    if request.method == "OPTIONS":
        return "", 204

    conn_info = db.get_connection_info()
    if conn_info.get("status") != "connected":
        return jsonify({
            "error": "No email account connected. Please connect your Gmail account first, or enable Sandbox Demo Mode below."
        }), 400

    # 1. Real Google Gmail account connected
    if not conn_info.get("is_demo") and conn_info.get("provider") == "google":
        tokens = db.get_stored_tokens()
        if not tokens or not tokens.get("access_token"):
            return jsonify({"error": "Missing access token. Please reconnect your account."}), 401

        access_token = tokens["access_token"]
        refresh_token = tokens.get("refresh_token")

        try:
            fetch_res = google_mail_service.fetch_emails_last_30_days(access_token, max_messages=50)
        except google_mail_service.GmailApiError as err:
            if "expired" in str(err).lower() and refresh_token:
                try:
                    new_tokens = google_mail_service.refresh_access_token(refresh_token)
                    db.update_access_token(new_tokens["access_token"], new_tokens.get("expires_in", 3600))
                    fetch_res = google_mail_service.fetch_emails_last_30_days(new_tokens["access_token"], max_messages=50)
                except Exception as refresh_err:
                    return jsonify({"error": f"Session expired. Please reconnect your account: {str(refresh_err)}"}), 401
            else:
                return jsonify({"error": f"Could not retrieve Gmail messages: {str(err)}"}), 502
        except Exception as err:
            return jsonify({"error": f"Gmail request failed: {str(err)}"}), 500

        retrieved_emails = fetch_res.get("emails", [])
        total_found = fetch_res.get("total_found", len(retrieved_emails))
        date_range = fetch_res.get("date_range", {})

        # Save to database (deduplicating by provider_message_id)
        db.save_real_email_batch(retrieved_emails)

        # Evaluate through trained ML models
        messages = db.get_inbox_messages()
        scanned = 0
        safe_count = 0
        suspicious_count = 0
        phishing_count = 0

        for msg in messages:
            analysis = analyze_inbox_email(msg["subject"], msg["body"], msg["sender"])
            db.save_scan_result(
                message_id=msg["id"],
                verdict=analysis["verdict"],
                severity_level=analysis["severity_level"],
                model_score=analysis["model_score"],
                warning_signs=analysis["warning_signs"],
                new_status=analysis["status"],
                is_demo=0
            )
            scanned += 1
            if analysis["verdict"] == "no_signs":
                safe_count += 1
            elif analysis["verdict"] == "not_sure":
                suspicious_count += 1
            else:
                phishing_count += 1

        return jsonify({
            "success": True,
            "mode": "real",
            "total_found": total_found,
            "scanned_count": scanned,
            "safe_count": safe_count,
            "suspicious_count": suspicious_count,
            "phishing_count": phishing_count,
            "date_range": date_range,
            "messages": db.get_inbox_messages()
        }), 200

    # 2. Sandbox Demo Mode
    messages = db.get_inbox_messages()
    scanned = 0
    safe_count = 0
    suspicious_count = 0
    phishing_count = 0

    for msg in messages:
        analysis = analyze_inbox_email(msg["subject"], msg["body"], msg["sender"])
        db.save_scan_result(
            message_id=msg["id"],
            verdict=analysis["verdict"],
            severity_level=analysis["severity_level"],
            model_score=analysis["model_score"],
            warning_signs=analysis["warning_signs"],
            new_status=analysis["status"],
            is_demo=1
        )
        scanned += 1
        if analysis["verdict"] == "no_signs":
            safe_count += 1
        elif analysis["verdict"] == "not_sure":
            suspicious_count += 1
        else:
            phishing_count += 1

    return jsonify({
        "success": True,
        "mode": "demo",
        "total_found": len(messages),
        "scanned_count": scanned,
        "safe_count": safe_count,
        "suspicious_count": suspicious_count,
        "phishing_count": phishing_count,
        "date_range": {"from": "Last 30 Days", "to": "Today"},
        "messages": db.get_inbox_messages()
    }), 200


@app.route("/api/inbox/messages", methods=["GET"])
def inbox_messages():
    """Returns inbox messages filtered by status."""
    status_filter = request.args.get("status")
    if status_filter in ("all", "", None):
        messages = db.get_inbox_messages()
    else:
        messages = db.get_inbox_messages(status_filter=status_filter)
    return jsonify({"messages": messages}), 200


@app.route("/api/inbox/review", methods=["POST", "OPTIONS"])
def inbox_review_action():
    """Executes review actions: mark_safe, keep_blocked, or release (with mandatory confirmation)."""
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True) or {}
    message_id = data.get("message_id")
    action = data.get("action")
    confirmation = bool(data.get("confirmation", False))

    if not message_id or not action:
        return jsonify({"error": "Provide message_id and action."}), 400

    msg = db.get_message_by_id(message_id)
    if not msg:
        return jsonify({"error": "Message not found."}), 404

    if action == "release":
        if not confirmation:
            return jsonify({
                "error": "Explicit user confirmation is required before releasing a suspicious email."
            }), 400
        db.update_message_status(message_id, "released")
        message_note = "Email has been released and restored to your inbox."

    elif action == "mark_safe":
        db.update_message_status(message_id, "safe")
        if data.get("add_to_trusted"):
            try:
                db.add_sender(msg["sender"], "trusted", "Added to trusted list via review queue")
            except Exception:
                pass
        message_note = "Email marked as safe."

    elif action == "keep_blocked":
        db.update_message_status(message_id, "blocked")
        if data.get("add_to_blocked"):
            try:
                db.add_sender(msg["sender"], "blocked", "Added to blocked list via review queue")
            except Exception:
                pass
        message_note = "Email confirmed as blocked."

    else:
        return jsonify({"error": "Invalid action. Use 'release', 'mark_safe', or 'keep_blocked'."}), 400

    updated_msg = db.get_message_by_id(message_id)
    return jsonify({
        "success": True,
        "message": message_note,
        "email": updated_msg
    }), 200


@app.route("/api/senders", methods=["GET", "POST", "OPTIONS"])
def manage_senders():
    """Manages trusted and blocked sender lists."""
    if request.method == "OPTIONS":
        return "", 204

    if request.method == "GET":
        list_type = request.args.get("list_type")
        senders = db.get_senders(list_type=list_type)
        return jsonify({"senders": senders}), 200

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        email = data.get("email", "")
        list_type = data.get("list_type", "trusted")
        note = data.get("note", "")

        try:
            created = db.add_sender(email, list_type, note)
            return jsonify({"success": True, "sender": created}), 201
        except ValueError as err:
            return jsonify({"error": str(err)}), 400
        except Exception as err:
            return jsonify({"error": "Could not add sender. Please check the email format."}), 400


@app.route("/api/senders/<int:sender_id>", methods=["DELETE", "OPTIONS"])
def delete_sender_route(sender_id):
    """Deletes a sender from trusted or blocked lists."""
    if request.method == "OPTIONS":
        return "", 204
    deleted = db.delete_sender(sender_id)
    if deleted:
        return jsonify({"success": True}), 200
    return jsonify({"error": "Sender not found."}), 404


@app.route("/api/alerts", methods=["GET", "OPTIONS"])
def list_alerts():
    """Returns active threat alerts."""
    if request.method == "OPTIONS":
        return "", 204
    alerts = db.get_threat_alerts(include_dismissed=False)
    unread_count = sum(1 for a in alerts if not a["is_read"])
    return jsonify({"alerts": alerts, "unread_count": unread_count}), 200


@app.route("/api/alerts/<int:alert_id>", methods=["PATCH", "DELETE", "OPTIONS"])
def handle_alert(alert_id):
    """Marks an alert as read (PATCH) or dismisses it (DELETE)."""
    if request.method == "OPTIONS":
        return "", 204

    if request.method == "PATCH":
        data = request.get_json(silent=True) or {}
        is_read = data.get("is_read", True)
        db.mark_alert_read(alert_id, is_read=is_read)
        return jsonify({"success": True}), 200

    if request.method == "DELETE":
        db.dismiss_alert(alert_id)
        return jsonify({"success": True}), 200

    return jsonify({"error": "Unsupported method."}), 405


@app.route("/api/inbox/reset-demo", methods=["POST", "OPTIONS"])
def reset_demo():
    """Resets demo mailbox back to fresh unscanned state."""
    if request.method == "OPTIONS":
        return "", 204
    db.reset_demo_inbox()
    return jsonify({"success": True, "message": "Demo mailbox reset successfully."}), 200


# --------------------------------------------------
# Error handlers
# --------------------------------------------------

@app.errorhandler(413)
def request_too_large(error):
    return jsonify({
        "error": "Request too large. Maximum request size is 1 MB."
    }), 413


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found."
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Internal server error."
    }), 500


# --------------------------------------------------
# Local development entry point
# Render uses: gunicorn app:app
# --------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
