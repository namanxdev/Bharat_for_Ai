#!/bin/bash
# Quick start script for BharatConnect AI Backend

echo "Starting BharatConnect AI Backend..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate || source venv/Scripts/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run import test
echo ""
echo "Running import test..."
python test_import.py

if [ $? -eq 0 ]; then
    echo ""
    echo "All imports successful! Starting server..."
    echo ""
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
else
    echo ""
    echo "Import test failed. Please check dependencies."
    exit 1
fi
