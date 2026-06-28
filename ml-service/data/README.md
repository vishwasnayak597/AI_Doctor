# Triage model data

The trainer (`../train.py`) loads symptom→disease data from one of two sources, in priority order:

## 1. Kaggle "Disease Prediction from Symptoms" (preferred — real data)
Dataset: https://www.kaggle.com/datasets/kaushil268/disease-prediction-using-machine-learning

Place the two CSVs here:
```
data/Training.csv
data/Testing.csv
```
Each row is a case: 132 binary symptom columns (0/1) + a `prognosis` (disease) label.

Fetch via the Kaggle API (needs a free Kaggle account + `~/.kaggle/kaggle.json`):
```bash
pip install kaggle
kaggle datasets download -d kaushil268/disease-prediction-using-machine-learning -p data --unzip
```
…or download the ZIP from the dataset page and extract `Training.csv` / `Testing.csv` here.

The raw mapping is almost deterministic, so `train.py` injects controlled noise (random symptom
flips) and evaluates on a held-out noisy split, so reported accuracy is realistic — not 100%.

## 2. Synthetic fallback (always works, no account needed)
If the Kaggle CSVs are absent, `train.py` calls `generate_synthetic.py`, which samples cases from
clinically-informed `P(symptom | disease)` priors and writes `data/synthetic.csv` with the same
schema. This keeps the training pipeline reproducible anywhere (CI included).
