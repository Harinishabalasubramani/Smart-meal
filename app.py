from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = Path(__file__).resolve().parent
FOOD_RECIPES_PATH = BASE_DIR / "food_recipes.csv" / "food_recipes.csv"
MODELS_DIR = BASE_DIR / "models"
RISK_MODEL_PATH = MODELS_DIR / "health_risk_models.joblib"
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "foodora")

app = Flask(__name__)

mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
users_collection = mongo_client[MONGODB_DB_NAME]["users"]


def _init_users_store() -> None:
    try:
        users_collection.create_index("email", unique=True)
    except PyMongoError as exc:
        app.logger.warning("Unable to initialize MongoDB user index: %s", exc)


def _clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"[^a-z0-9|,\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _parse_pipe_ingredients(raw: str) -> str:
    if pd.isna(raw):
        return ""
    parts = [part.strip() for part in str(raw).split("|") if part.strip()]
    return _clean_text(" ".join(parts) if parts else str(raw))


def _split_tokens(text: str) -> List[str]:
    if not text:
        return []
    return [token for token in re.split(r"\s+", text) if token]


def _is_indian_cuisine(cuisine: str) -> bool:
    value = str(cuisine or "").strip().lower()
    indian_keywords = [
        "indian",
        "andhra",
        "awadhi",
        "bengali",
        "chettinad",
        "coorg",
        "goan",
        "gujarati",
        "hyderabadi",
        "karnataka",
        "kashmiri",
        "kerala",
        "konkani",
        "mangalorean",
        "maharashtrian",
        "mughlai",
        "north indian",
        "punjabi",
        "rajasthani",
        "south indian",
        "tamil",
        "udupi",
    ]
    return any(keyword in value for keyword in indian_keywords)


def _diet_match(df: pd.DataFrame, user_diet: str) -> pd.DataFrame:
    diet = (user_diet or "").strip().lower()
    mapped = {
        "vegetarian": ["vegetarian", "high protein vegetarian", "vegan", "jain", "no onion no garlic (sattvic)"],
        "vegan": ["vegan", "vegetarian", "high protein vegetarian", "jain", "no onion no garlic (sattvic)"],
        "eggetarian": ["eggetarian", "vegetarian", "high protein vegetarian"],
        "non-vegetarian": ["non vegeterian", "non vegetarian", "high protein non vegetarian", "eggetarian"],
    }
    accepted = mapped.get(diet)
    if not accepted:
        return df

    normalized_diet = df["diet"].fillna("").str.lower()
    mask = normalized_diet.apply(lambda value: any(tag in value for tag in accepted))
    subset = df[mask].copy()
    return subset if len(subset) > 20 else df


def _health_penalty(ingredients_text: str, risk_level: str) -> float:
    text = ingredients_text.lower()
    sugar_risk_terms = ["sugar", "jaggery", "honey", "syrup", "sweet"]
    sodium_risk_terms = ["salt", "pickle", "soy sauce", "sauce"]

    penalty = 0.0
    if risk_level in {"moderate", "high"}:
        penalty += 0.12 * sum(1 for term in sugar_risk_terms if term in text)
        penalty += 0.08 * sum(1 for term in sodium_risk_terms if term in text)
    return min(penalty, 0.6)


def _steps_from_instruction(text: str) -> List[str]:
    raw = str(text or "")
    pieces = [part.strip() for part in raw.split("|") if part.strip()]
    if pieces:
        return pieces[:8]
    sentences = [part.strip() for part in re.split(r"[.!?]", raw) if part.strip()]
    return sentences[:8]


def _risk_label_from_rules(age: float, sugar_level: float, systolic: float, diastolic: float) -> int:
    score = 0
    if sugar_level >= 200:
        score += 2
    elif sugar_level >= 140:
        score += 1

    if systolic >= 140 or diastolic >= 90:
        score += 2
    elif systolic >= 130 or diastolic >= 80:
        score += 1

    if age >= 60:
        score += 1
    elif age >= 45:
        score += 0.5

    if score >= 3:
        return 2
    if score >= 1.5:
        return 1
    return 0


def _generate_synthetic_health_dataset(n_samples: int = 2500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    age = rng.integers(18, 85, size=n_samples)
    sugar = np.clip(rng.normal(loc=125, scale=45, size=n_samples), 60, 350)
    systolic = np.clip(rng.normal(loc=128, scale=18, size=n_samples), 85, 210)
    diastolic = np.clip(rng.normal(loc=82, scale=12, size=n_samples), 50, 130)

    labels = np.array(
        [
            _risk_label_from_rules(a, s, sys, dia)
            for a, s, sys, dia in zip(age, sugar, systolic, diastolic)
        ]
    )

    noise_idx = rng.choice(n_samples, size=max(1, int(0.06 * n_samples)), replace=False)
    labels[noise_idx] = rng.integers(0, 3, size=len(noise_idx))

    return pd.DataFrame(
        {
            "age": age,
            "sugar_level": sugar,
            "bp_systolic": systolic,
            "bp_diastolic": diastolic,
            "risk_label": labels,
        }
    )


def _train_or_load_risk_models() -> Dict[str, object]:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    if RISK_MODEL_PATH.exists():
        return joblib.load(RISK_MODEL_PATH)

    data = _generate_synthetic_health_dataset()
    X = data[["age", "sugar_level", "bp_systolic", "bp_diastolic"]]
    y = data["risk_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    lr_pipeline = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(max_iter=1000, random_state=42)),
        ]
    )
    rf_model = RandomForestClassifier(
        n_estimators=250,
        max_depth=10,
        random_state=42,
        class_weight="balanced",
    )

    lr_pipeline.fit(X_train, y_train)
    rf_model.fit(X_train, y_train)

    payload = {
        "feature_order": ["age", "sugar_level", "bp_systolic", "bp_diastolic"],
        "label_map": {0: "low", 1: "moderate", 2: "high"},
        "lr_model": lr_pipeline,
        "rf_model": rf_model,
        "metadata": {
            "train_rows": len(X_train),
            "test_rows": len(X_test),
            "note": "Synthetic dataset used for demo only. Not for clinical decisions.",
        },
    }
    joblib.dump(payload, RISK_MODEL_PATH)
    return payload


def _compute_risk_metrics(models: Dict[str, object]) -> Dict[str, object]:
    data = _generate_synthetic_health_dataset()
    X = data[["age", "sugar_level", "bp_systolic", "bp_diastolic"]]
    y = data["risk_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    lr_predictions = models["lr_model"].predict(X_test)
    rf_predictions = models["rf_model"].predict(X_test)

    lr_accuracy = accuracy_score(y_test, lr_predictions)
    rf_accuracy = accuracy_score(y_test, rf_predictions)

    lr_precision, lr_recall, lr_f1, _ = precision_recall_fscore_support(
        y_test, lr_predictions, average="weighted", zero_division=0
    )
    rf_precision, rf_recall, rf_f1, _ = precision_recall_fscore_support(
        y_test, rf_predictions, average="weighted", zero_division=0
    )

    lr_probs = models["lr_model"].predict_proba(X_test)
    rf_probs = models["rf_model"].predict_proba(X_test)
    ensemble_predictions = np.argmax((lr_probs + rf_probs) / 2, axis=1)
    ensemble_accuracy = accuracy_score(y_test, ensemble_predictions)
    ensemble_precision, ensemble_recall, ensemble_f1, _ = precision_recall_fscore_support(
        y_test, ensemble_predictions, average="weighted", zero_division=0
    )

    return {
        "dataset": {
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
            "note": "Synthetic demo dataset used for presentation only.",
        },
        "models": {
            "logistic_regression": {
                "accuracy": round(float(lr_accuracy), 4),
                "precision": round(float(lr_precision), 4),
                "recall": round(float(lr_recall), 4),
                "f1_score": round(float(lr_f1), 4),
            },
            "random_forest": {
                "accuracy": round(float(rf_accuracy), 4),
                "precision": round(float(rf_precision), 4),
                "recall": round(float(rf_recall), 4),
                "f1_score": round(float(rf_f1), 4),
            },
            "ensemble": {
                "accuracy": round(float(ensemble_accuracy), 4),
                "precision": round(float(ensemble_precision), 4),
                "recall": round(float(ensemble_recall), 4),
                "f1_score": round(float(ensemble_f1), 4),
            },
        },
    }


def _load_recipe_data() -> pd.DataFrame:
    if not FOOD_RECIPES_PATH.exists():
        raise FileNotFoundError(f"Recipe file not found: {FOOD_RECIPES_PATH}")

    df = pd.read_csv(FOOD_RECIPES_PATH)
    df = df.rename(columns={"recipe_title": "name"})
    df["name"] = df["name"].astype(str).str.strip()
    df["ingredients_text"] = df["ingredients"].map(_parse_pipe_ingredients)
    df["diet"] = df["diet"].fillna("Unknown")
    df["cuisine"] = df["cuisine"].fillna("Unknown")
    df["instructions"] = df["instructions"].fillna("")

    # Restrict the recommendation dataset to Indian cuisines only.
    df = df[df["cuisine"].apply(_is_indian_cuisine)].copy()

    df = df[df["ingredients_text"].str.len() > 0].drop_duplicates(subset=["name"]).reset_index(drop=True)
    return df


def _build_recommender(df: pd.DataFrame):
    vectorizer = TfidfVectorizer(stop_words="english", max_features=10000)
    matrix = vectorizer.fit_transform(df["ingredients_text"])
    return vectorizer, matrix


RISK_MODELS = _train_or_load_risk_models()
RISK_METRICS = _compute_risk_metrics(RISK_MODELS)
RECIPES_DF = _load_recipe_data()
REC_VECTORIZER, REC_MATRIX = _build_recommender(RECIPES_DF)
_init_users_store()


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


@app.route("/api/health", methods=["POST", "OPTIONS"])
def predict_health_risk():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}

    age = float(payload.get("age", 0))
    sugar_level = float(payload.get("sugar_level", 0))
    bp_systolic = float(payload.get("bp_systolic", 0))
    bp_diastolic = float(payload.get("bp_diastolic", 0))

    features = pd.DataFrame(
        [[age, sugar_level, bp_systolic, bp_diastolic]],
        columns=RISK_MODELS["feature_order"],
    )

    lr_probs = RISK_MODELS["lr_model"].predict_proba(features)[0]
    rf_probs = RISK_MODELS["rf_model"].predict_proba(features)[0]

    ensemble_probs = (lr_probs + rf_probs) / 2
    pred_idx = int(np.argmax(ensemble_probs))
    risk_label = RISK_MODELS["label_map"][pred_idx]

    return jsonify(
        {
            "risk_label": risk_label,
            "model_predictions": {
                "logistic_regression": {
                    "predicted_label": RISK_MODELS["label_map"][int(np.argmax(lr_probs))],
                    "probabilities": {
                        RISK_MODELS["label_map"][i]: float(prob) for i, prob in enumerate(lr_probs)
                    },
                },
                "random_forest": {
                    "predicted_label": RISK_MODELS["label_map"][int(np.argmax(rf_probs))],
                    "probabilities": {
                        RISK_MODELS["label_map"][i]: float(prob) for i, prob in enumerate(rf_probs)
                    },
                },
            },
            "ensemble_confidence": float(np.max(ensemble_probs)),
            "note": RISK_MODELS["metadata"]["note"],
        }
    )


@app.route("/api/recommend", methods=["POST", "OPTIONS"])
def recommend_meals():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}
    ingredients = payload.get("ingredients", [])
    diet_type = str(payload.get("diet_type", "")).strip().lower()
    risk_label = str(payload.get("risk_label", "low")).strip().lower()
    top_n = int(payload.get("top_n", 6))

    if isinstance(ingredients, list):
        ingredients_text = _clean_text(" ".join(map(str, ingredients)))
        ingredient_set = set(_split_tokens(ingredients_text))
    else:
        ingredients_text = _clean_text(str(ingredients))
        ingredient_set = set(_split_tokens(ingredients_text))

    filtered = _diet_match(RECIPES_DF, diet_type)
    if filtered.empty:
        filtered = RECIPES_DF

    filtered_idx = filtered.index.to_numpy()
    filtered_matrix = REC_MATRIX[filtered_idx]

    query_vec = REC_VECTORIZER.transform([ingredients_text])
    sim_scores = cosine_similarity(query_vec, filtered_matrix).flatten()

    scored_rows = []
    for local_i, (global_i, sim_score) in enumerate(zip(filtered_idx, sim_scores)):
        row = RECIPES_DF.loc[global_i]
        recipe_ingredients = set(_split_tokens(row["ingredients_text"]))
        overlap = len(ingredient_set & recipe_ingredients)
        penalty = _health_penalty(row["ingredients_text"], risk_label)
        final_score = float(sim_score) + (0.04 * overlap) - penalty

        scored_rows.append((final_score, overlap, global_i))

    scored_rows.sort(key=lambda item: (item[0], item[1]), reverse=True)
    top_rows = scored_rows[: max(1, top_n)]

    meals = []
    for rank_score, overlap, idx in top_rows:
        row = RECIPES_DF.loc[idx]
        ingredient_tokens = _split_tokens(row["ingredients_text"])
        badge = "sugar-friendly" if risk_label in {"moderate", "high"} else "heart-healthy"

        meals.append(
            {
                "name": row["name"],
                "ingredients": ingredient_tokens[:12],
                "steps": _steps_from_instruction(row["instructions"]),
                "healthBadge": badge,
                "healthBenefit": (
                    "Lower-risk profile recommendation focused on ingredient similarity and reduced sugar/sodium signals."
                ),
                "cuisine": row["cuisine"],
                "diet": row["diet"],
                "score": round(float(rank_score), 4),
                "overlap_count": int(overlap),
            }
        )

    return jsonify(
        {
            "risk_label": risk_label,
            "algorithm": "TF-IDF + cosine similarity + content-based health penalty",
            "meals": meals,
        }
    )


@app.route("/api/health-and-recommend", methods=["POST", "OPTIONS"])
def health_and_recommend():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}

    age = float(payload.get("age", 0))
    sugar_level = float(payload.get("sugar_level", 0))
    bp_systolic = float(payload.get("bp_systolic", 0))
    bp_diastolic = float(payload.get("bp_diastolic", 0))

    health_response = predict_health_risk()
    health_json = health_response.get_json() if hasattr(health_response, "get_json") else {}
    risk_label = health_json.get("risk_label", "low")

    recommend_payload = {
        "ingredients": payload.get("ingredients", []),
        "diet_type": payload.get("diet_type", ""),
        "risk_label": risk_label,
        "top_n": payload.get("top_n", 6),
    }

    with app.test_request_context(json=recommend_payload):
        rec_response = recommend_meals()
        rec_json = rec_response.get_json() if hasattr(rec_response, "get_json") else {}

    return jsonify(
        {
            "input": {
                "age": age,
                "sugar_level": sugar_level,
                "bp_systolic": bp_systolic,
                "bp_diastolic": bp_diastolic,
            },
            "health": health_json,
            "recommendations": rec_json,
        }
    )


@app.route("/api/model-metrics", methods=["GET", "OPTIONS"])
def model_metrics():
    if request.method == "OPTIONS":
        return ("", 204)

    return jsonify(RISK_METRICS)


@app.route("/api/register", methods=["POST", "OPTIONS"])
def register_user():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}

    first_name = str(payload.get("first_name", "")).strip()
    last_name = str(payload.get("last_name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not all([first_name, last_name, email, password]):
        return jsonify({"error": "All fields are required."}), 400

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Please enter a valid email address."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    password_hash = generate_password_hash(password)

    try:
        users_collection.insert_one(
            {
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "password_hash": password_hash,
            }
        )
    except DuplicateKeyError:
        return jsonify({"error": "An account with this email already exists."}), 409
    except PyMongoError as exc:
        app.logger.exception("MongoDB registration error")
        return jsonify({"error": f"Database error: {exc}"}), 503

    return jsonify({"message": "Account created successfully."}), 201


@app.route("/api/login", methods=["POST", "OPTIONS"])
def login_user():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    try:
        row = users_collection.find_one(
            {"email": email},
            {"first_name": 1, "last_name": 1, "email": 1, "password_hash": 1},
        )
    except PyMongoError as exc:
        app.logger.exception("MongoDB login error")
        return jsonify({"error": f"Database error: {exc}"}), 503

    if not row:
        return jsonify({"error": "No account found for this email."}), 404

    if not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Incorrect password."}), 401

    return jsonify(
        {
            "message": "Login successful.",
            "user": {
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "email": row["email"],
            },
        }
    ), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
