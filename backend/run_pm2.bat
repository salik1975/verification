@echo off
pm2 start uvicorn --name acufi-backend --interpreter "./venv13/Scripts/python.exe" -- main:app --host 127.0.0.1 --port 3209
