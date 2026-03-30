# API App

FastAPI service for:

- Twilio webhook handling
- live voice orchestration
- provider adapters
- clinic policy and call state handling

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```
