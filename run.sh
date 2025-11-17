#!/bin/bash
# Run script for Synapse backend (macOS/Linux)

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    python app.py
else
    echo "Error: Virtual environment not found!"
    echo "Please run setup.sh first to create the virtual environment."
    exit 1
fi
