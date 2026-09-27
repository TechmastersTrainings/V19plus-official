# ============================================================
# V19plus Video Transcoding Worker
# Base: Python 3.12 Slim + FFmpeg
# Region: Singapore (Render Video Worker)
# ============================================================
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

COPY . .

# Run the ARQ worker process
CMD ["python", "-m", "src.worker"]
