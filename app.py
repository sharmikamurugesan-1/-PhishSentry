import os
import re
import logging
import joblib

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.exceptions import BadRequest
import email_protection_db as db

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
# CORS Handling
# --------------------------------------------------

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PATCH, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


# --------------------------------------------------
# Frontend & Static Routing (SPA Support)
# --------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(os.path.join(STATIC_DIR, "assets"), filename)


@app.route("/models/<path:filename>")
def serve_models(filename):
    return send_from_directory(os.path.join(STATIC_DIR, "models"), filename)


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


@app.route("/api/inbox/connect", methods=["POST", "OPTIONS"])
def inbox_connect():
    """Connects or switches email protection mode (Demo mode vs OAuth provider)."""
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json(silent=True) or {}
    provider = data.get("provider", "demo")
    email = data.get("email", "")
    is_demo = bool(data.get("is_demo", True if provider == "demo" else False))
    status = "connected" if (is_demo or email) else "awaiting_setup"

    updated = db.update_connection_info(
        provider=provider,
        status=status,
        email=email or ("user.protect@phishshift-demo.com" if is_demo else ""),
        is_demo=is_demo
    )
    return jsonify({"success": True, "connection": updated}), 200


@app.route("/api/inbox/scan", methods=["POST", "OPTIONS"])
def inbox_scan():
    """Scans all inbox messages through the trained ML model and updates threat alerts."""
    if request.method == "OPTIONS":
        return "", 204

    messages = db.get_inbox_messages()
    scanned = 0
    safe_count = 0
    suspicious_count = 0
    phishing_count = 0

    for msg in messages:
        # Evaluate message
        analysis = analyze_inbox_email(msg["subject"], msg["body"], msg["sender"])
        db.save_scan_result(
            message_id=msg["id"],
            verdict=analysis["verdict"],
            severity_level=analysis["severity_level"],
            model_score=analysis["model_score"],
            warning_signs=analysis["warning_signs"],
            new_status=analysis["status"]
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
        "scanned_count": scanned,
        "safe_count": safe_count,
        "suspicious_count": suspicious_count,
        "phishing_count": phishing_count,
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
