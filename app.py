import os
import logging
import joblib

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.exceptions import BadRequest

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


# --------------------------------------------------
# CORS Handling
# --------------------------------------------------

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
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
