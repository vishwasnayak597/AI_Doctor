"""
Train the triage model.

Pipeline: load data (Kaggle CSVs if present, else synthetic) -> inject controlled noise
-> train Bernoulli Naive Bayes (primary, served) + Random Forest / MLP (comparators)
-> evaluate (accuracy, top-3, macro-F1, Brier/calibration) -> persist model.pkl + model_meta.json.

The SERVED model is the Naive Bayes parameters (class log-priors + per-symptom
log P(symptom=1|disease)), because they let the API compute a posterior over *partial*
evidence and the information gain of each unobserved symptom — which a black-box classifier
cannot do.

Run:  python train.py [--noise 0.05] [--per-disease 400]
"""
from __future__ import annotations

import os
import re
import json
import argparse
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import BernoulliNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, f1_score, brier_score_loss

import knowledge
from data.generate_synthetic import generate as generate_synthetic

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
MODEL_PATH = os.path.join(HERE, "model.pkl")
META_PATH = os.path.join(HERE, "model_meta.json")


def humanize(symptom: str) -> str:
    return "Do you have " + symptom.replace("_", " ").strip().lower() + "?"


def load_data(per_disease: int) -> tuple[pd.DataFrame, str, dict[str, str]]:
    """Returns (dataframe with `prognosis` label, source name, symptom->question map)."""
    train_csv = os.path.join(DATA_DIR, "Training.csv")
    if os.path.exists(train_csv):
        df = pd.read_csv(train_csv)
        test_csv = os.path.join(DATA_DIR, "Testing.csv")
        if os.path.exists(test_csv):
            df = pd.concat([df, pd.read_csv(test_csv)], ignore_index=True)
        # drop stray unnamed / all-NaN columns Kaggle ships
        df = df.loc[:, ~df.columns.str.contains("^Unnamed")]
        df = df.dropna(axis=1, how="all")
        df = df.rename(columns={"prognosis": "prognosis"})
        symptom_cols = [c for c in df.columns if c != "prognosis"]
        questions = {s: knowledge.SYMPTOMS.get(s, humanize(s)) for s in symptom_cols}
        return df[symptom_cols + ["prognosis"]], "kaggle", questions

    print("Kaggle CSVs not found -> generating synthetic dataset from clinical priors.")
    df = generate_synthetic(per_disease=per_disease)
    questions = dict(knowledge.SYMPTOMS)
    return df, "synthetic", questions


def inject_noise(X: np.ndarray, rate: float, seed: int = 7) -> np.ndarray:
    """Randomly flip symptom bits at `rate` to simulate noisy real-world reporting."""
    if rate <= 0:
        return X
    rng = np.random.default_rng(seed)
    flips = rng.random(X.shape) < rate
    return np.where(flips, 1 - X, X)


def top_k_accuracy(proba: np.ndarray, y_idx: np.ndarray, k: int = 3) -> float:
    topk = np.argsort(proba, axis=1)[:, -k:]
    return float(np.mean([y_idx[i] in topk[i] for i in range(len(y_idx))]))


def disease_meta(name: str) -> dict:
    for k, v in knowledge.DISEASES.items():
        if k.lower() == name.lower():
            return {"specialization": v["specialization"], "urgency": v["urgency"]}
    return {"specialization": knowledge.DEFAULT_SPECIALIZATION, "urgency": knowledge.DEFAULT_URGENCY}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--noise", type=float, default=0.05, help="symptom-flip noise rate")
    parser.add_argument("--per-disease", type=int, default=400, help="synthetic cases per disease")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df, source, questions = load_data(args.per_disease)
    symptoms = [c for c in df.columns if c != "prognosis"]
    X = df[symptoms].astype(int).to_numpy()
    y = df["prognosis"].astype(str).to_numpy()

    X = inject_noise(X, args.noise, seed=args.seed)

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, random_state=args.seed, stratify=y
    )

    # ---- primary model: Bernoulli Naive Bayes (served) ----
    nb = BernoulliNB(alpha=1.0)
    nb.fit(X_tr, y_tr)
    classes = list(nb.classes_)
    class_to_idx = {c: i for i, c in enumerate(classes)}
    y_te_idx = np.array([class_to_idx[c] for c in y_te])

    nb_proba = nb.predict_proba(X_te)
    nb_pred = nb.predict(X_te)
    metrics = {
        "source": source,
        "noise_rate": args.noise,
        "n_samples": int(len(df)),
        "n_symptoms": len(symptoms),
        "n_diseases": len(classes),
        "naive_bayes": {
            "accuracy": round(float(accuracy_score(y_te, nb_pred)), 4),
            "top3_accuracy": round(top_k_accuracy(nb_proba, y_te_idx, 3), 4),
            "macro_f1": round(float(f1_score(y_te, nb_pred, average="macro")), 4),
            # one-vs-rest mean Brier score = calibration quality (lower is better)
            "brier_score": round(float(np.mean([
                brier_score_loss((y_te == c).astype(int), nb_proba[:, i])
                for i, c in enumerate(classes)
            ])), 4),
        },
    }

    # ---- comparators (benchmark only, not served) ----
    rf = RandomForestClassifier(n_estimators=200, random_state=args.seed, n_jobs=-1)
    rf.fit(X_tr, y_tr)
    metrics["random_forest"] = {
        "accuracy": round(float(accuracy_score(y_te, rf.predict(X_te))), 4),
        "top3_accuracy": round(top_k_accuracy(rf.predict_proba(X_te), y_te_idx, 3), 4),
    }

    mlp = MLPClassifier(hidden_layer_sizes=(64,), max_iter=300, random_state=args.seed)
    mlp.fit(X_tr, y_tr)
    metrics["mlp"] = {
        "accuracy": round(float(accuracy_score(y_te, mlp.predict(X_te))), 4),
        "top3_accuracy": round(top_k_accuracy(mlp.predict_proba(X_te), y_te_idx, 3), 4),
    }

    # ---- persist served model (NB parameters for partial-evidence inference) ----
    model = {
        "classes": classes,                                  # disease names
        "symptoms": symptoms,                                # feature order
        "class_log_prior": nb.class_log_prior_.tolist(),     # log P(disease)
        "feature_log_prob": nb.feature_log_prob_.tolist(),   # log P(symptom=1 | disease)
        "questions": questions,                              # symptom -> question text
        "disease_meta": {c: disease_meta(c) for c in classes},
        "metrics": metrics,
    }
    joblib.dump(model, MODEL_PATH)
    with open(META_PATH, "w") as f:
        json.dump({k: model[k] for k in ("classes", "symptoms", "questions", "disease_meta", "metrics")},
                  f, indent=2)

    print("\n=== Training complete ===")
    print(f"source={source}  samples={metrics['n_samples']}  "
          f"diseases={metrics['n_diseases']}  symptoms={metrics['n_symptoms']}  noise={args.noise}")
    print(f"Naive Bayes : acc={metrics['naive_bayes']['accuracy']}  "
          f"top3={metrics['naive_bayes']['top3_accuracy']}  "
          f"macroF1={metrics['naive_bayes']['macro_f1']}  brier={metrics['naive_bayes']['brier_score']}")
    print(f"RandomForest: acc={metrics['random_forest']['accuracy']}  top3={metrics['random_forest']['top3_accuracy']}")
    print(f"MLP         : acc={metrics['mlp']['accuracy']}  top3={metrics['mlp']['top3_accuracy']}")
    print(f"Saved -> {MODEL_PATH}\n        {META_PATH}")


if __name__ == "__main__":
    main()
