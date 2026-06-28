FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Train at build time so the image ships with a ready model.
# (Uses the synthetic fallback if Kaggle CSVs aren't present in the build context.)
RUN python train.py

# Render injects $PORT; bind to it (fallback 8001 for local docker runs).
ENV PORT=8001
EXPOSE 8001
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8001}"]
