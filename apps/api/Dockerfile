FROM python:3.12-slim
# cache-bust: 2026-03-31

WORKDIR /app

COPY pyproject.toml setup.py ./
RUN pip install --no-cache-dir -e .

COPY . .

EXPOSE 8000

CMD ["/bin/sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
