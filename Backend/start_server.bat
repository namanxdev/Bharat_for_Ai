@echo off
REM Quick start script for BharatConnect AI Backend (Windows)

echo Starting BharatConnect AI Backend...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Virtual environment not found. Creating one...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Run import test
echo.
echo Running import test...
python test_import.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo All imports successful! Starting server...
    echo.
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
) else (
    echo.
    echo Import test failed. Please check dependencies.
    exit /b 1
)
