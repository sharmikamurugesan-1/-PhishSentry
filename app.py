
import os
import joblib
from flask import Flask, request, jsonify
from sklearn.pipeline import Pipeline

app = Flask(__name__)

# Load model files relative to this Python file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_model(filename):
    path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model file not found: {path}")
    return joblib.load(path)

vectorizer = load_model("tfidf_vectorizer.joblib")
lr_model = load_model("logistic_regression_model.joblib")
svm_model = load_model("linear_svm_model.joblib")


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "running",
        "message": "Phishing Email Detection API",
        "endpoint": "/predict"
    })


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Send a valid JSON object"}), 400

    emails = data.get("emails", [])
    model_type = data.get("model", "svm")

    if not isinstance(emails, list) or not emails:
        return jsonify({"error": "Provide a non-empty list of email texts"}), 400

    if not all(isinstance(email, str) and email.strip() for email in emails):
        return jsonify({
            "error": "Every email must be a non-empty string"
        }), 400

    if model_type not in ("lr", "svm"):
        return jsonify({
            "error": "Invalid model. Choose 'lr' or 'svm'"
        }), 400

    try:
        # Transform email texts using the trained TF-IDF vectorizer
        features = vectorizer.transform(emails)

        model = lr_model if model_type == "lr" else svm_model
        predictions = model.predict(features)

        # Generate scores consistently for the selected model
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

        for idx, (email, pred, score) in enumerate(
            zip(emails, predictions, scores)
        ):
            prediction = int(pred)

            results.append({
                "email_index": idx,
                "text_preview": email[:100],
                "prediction": prediction,
                "label_name": "Phishing" if prediction == 1 else "Safe",
                "confidence_score": (
                    float(score) if score is not None else None
                ),
                "score_type": score_type
            })

        return jsonify({
            "model_used": (
                "Logistic Regression" if model_type == "lr"
                else "Linear SVM"
            ),
            "total_emails": len(results),
            "results": results
        }), 200

    except Exception:
        app.logger.exception("Email prediction failed")
        return jsonify({
            "error": "Prediction failed. Check the model files and server logs."
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
