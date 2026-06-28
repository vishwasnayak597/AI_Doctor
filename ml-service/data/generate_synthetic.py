"""
Synthetic fallback dataset generator.

Samples binary symptom cases from the clinically-informed P(symptom | disease) priors in
knowledge.py. Output schema matches the Kaggle dataset: one binary column per symptom +
a `prognosis` (disease) label. Reproducible via a fixed seed.

Run directly:  python data/generate_synthetic.py --per-disease 400
(train.py also calls generate() automatically when the Kaggle CSVs are missing.)
"""
from __future__ import annotations

import os
import sys
import argparse
import numpy as np
import pandas as pd

# allow `import knowledge` whether run from ml-service/ or ml-service/data/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import knowledge  # noqa: E402


def generate(per_disease: int = 400, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    symptoms = knowledge.symptom_list()
    rows = []

    for disease, meta in knowledge.DISEASES.items():
        probs = meta["symptoms"]
        for _ in range(per_disease):
            row = {}
            for s in symptoms:
                p = probs.get(s, knowledge.BASE_RATE)
                row[s] = int(rng.random() < p)
            # guarantee at least one positive symptom so a case is never empty
            if sum(row.values()) == 0:
                core = max(probs, key=probs.get)
                row[core] = 1
            row["prognosis"] = disease
            rows.append(row)

    df = pd.DataFrame(rows, columns=symptoms + ["prognosis"])
    return df.sample(frac=1.0, random_state=seed).reset_index(drop=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-disease", type=int, default=400)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "synthetic.csv"))
    args = parser.parse_args()

    df = generate(args.per_disease, args.seed)
    df.to_csv(args.out, index=False)
    print(f"Wrote {len(df)} synthetic cases ({df['prognosis'].nunique()} diseases, "
          f"{len(df.columns) - 1} symptoms) -> {args.out}")


if __name__ == "__main__":
    main()
