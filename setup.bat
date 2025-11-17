@echo off
REM Setup script for Synapse backend (Windows)

echo Setting up Python virtual environment...

REM Check if venv exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)

REM Activate virtual environment
call venv\Scripts\activate

echo Virtual environment activated

REM Install dependencies
echo Installing dependencies from requirements.txt...
pip install -r requirements.txt

echo.
echo Setup complete!
echo.
echo To activate the virtual environment in the future:
echo   venv\Scripts\activate
echo.
echo To run the server:
echo   python app.py
