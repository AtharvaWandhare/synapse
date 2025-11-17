# LaTeX Compilation Service

A Node.js microservice for compiling LaTeX code to PDF documents.

## Prerequisites

You need to have LaTeX installed on your system:

### Windows
```bash
# Install MiKTeX
# Download from: https://miktex.org/download
# Or use chocolatey:
choco install miktex
```

### macOS
```bash
# Install MacTeX
brew install --cask mactex
```

### Linux
```bash
# Install TeX Live
sudo apt-get update
sudo apt-get install texlive-full
```

## Installation

```bash
npm install
```

## Quick Start

### 1. Check if LaTeX is installed
```bash
# The server will check on startup, or you can test manually:
pdflatex --version
```

### 2. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 3. Run tests
```bash
npm test
```

The service will run on `http://localhost:5001`

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "latex-compilation-service"
}
```

### GET /check-latex
Verify LaTeX installation.

**Response (Success):**
```json
{
  "installed": true,
  "version": "pdfTeX 3.141592653-2.6-1.40.25 (MiKTeX 24.1)",
  "message": "pdflatex is installed and accessible"
}
```

**Response (Error):**
```json
{
  "installed": false,
  "error": "pdflatex not found",
  "message": "Please install MiKTeX (Windows), MacTeX (macOS), or TeX Live (Linux)"
}
```

### POST /compile
Compile LaTeX code to PDF.

**Request:**
```json
{
  "latex_code": "\\documentclass{article}\\begin{document}Hello World\\end{document}"
}
```

**Response:**
```json
{
  "success": true,
  "pdf_base64": "base64_encoded_pdf_data...",
  "filename": "resume_1234567890.pdf",
  "size": 12345
}
```

**Error Response:**
```json
{
  "error": "LaTeX compilation failed",
  "details": "Error message from pdflatex"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "latex-compilation-service"
}
```

## Configuration

- Port: `5001` (default, set via `PORT` env variable)
- Temp directory: `./temp`
- Inputs directory: `./inputs` (for custom LaTeX packages/files)
- LaTeX command: `pdflatex`
- Compilation passes: `2`
- Compilation timeout: `30 seconds`
- File cleanup: `1 hour` after creation

## Testing

Run the test suite to verify everything is working:

```bash
npm test
```

This will:
1. Check if the server is running
2. Verify LaTeX installation
3. Compile a test document

## Troubleshooting

### "pdflatex not found"
Install LaTeX on your system:
- **Windows**: Download MiKTeX from https://miktex.org/download
- **macOS**: `brew install --cask mactex`
- **Linux**: `sudo apt-get install texlive-full`

### "Compilation timeout"
Large documents or first-time package downloads may take longer. The timeout is set to 30 seconds.

### Missing LaTeX packages
MiKTeX will auto-install missing packages on first use. Make sure to allow the package manager to run.

### Port already in use
Change the port by setting the `PORT` environment variable:
```bash
PORT=5002 npm run dev
```

## Notes

- Temporary PDF files are automatically cleaned up after 1 hour
- Maximum request size: 10MB
- CORS enabled for all origins
