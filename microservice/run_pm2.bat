@echo off
pm2 start uvicorn --name acufi-microservice --interpreter "./venv/Scripts/python.exe" -- microservice:app --host 0.0.0.0 --port 3206