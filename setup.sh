#!/bin/bash

# Setup script for Synapse backend

echo "Setting up Python virtual environment..."

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # macOS/Linux
    source venv/bin/activate
fi

echo "✓ Virtual environment activated"

# Install dependencies
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

echo ""
echo "✓ Setup complete!"
echo ""
echo "To activate the virtual environment in the future:"
echo "  Windows: venv\\Scripts\\activate"
echo "  macOS/Linux: source venv/bin/activate"
echo ""
echo "To run the server:"
echo "  python app.py"
