const express = require('express');
const cors = require('cors');
const latex = require('node-latex');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create temp directory for PDFs
const TEMP_DIR = path.join(__dirname, 'temp');
const INPUTS_DIR = path.join(__dirname, 'inputs');
const ERROR_LOGS_DIR = path.join(TEMP_DIR, 'errors');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(INPUTS_DIR)) {
    fs.mkdirSync(INPUTS_DIR, { recursive: true });
}
if (!fs.existsSync(ERROR_LOGS_DIR)) {
    fs.mkdirSync(ERROR_LOGS_DIR, { recursive: true });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'latex-compilation-service' });
});

// Check if LaTeX is installed
app.get('/check-latex', (req, res) => {
    try {
        const version = execSync('pdflatex --version', { encoding: 'utf8' });
        const firstLine = version.split('\n')[0];
        res.json({ 
            installed: true, 
            version: firstLine,
            message: 'pdflatex is installed and accessible'
        });
    } catch (error) {
        res.status(500).json({ 
            installed: false, 
            error: 'pdflatex not found',
            message: 'Please install MiKTeX (Windows), MacTeX (macOS), or TeX Live (Linux)',
            details: error.message
        });
    }
});

// Compile LaTeX to PDF endpoint
app.post('/compile', async (req, res) => {
    const { latex_code } = req.body;

    if (!latex_code) {
        return res.status(400).json({ error: 'latex_code is required' });
    }

    let responseSent = false;
    const sendError = (statusCode, error, details) => {
        if (!responseSent) {
            responseSent = true;
            res.status(statusCode).json({ error, details });
        }
    };

    try {
        // Create a readable stream from the LaTeX code
        const input = Readable.from([latex_code]);

        // Generate unique filename
        const filename = `resume_${Date.now()}.pdf`;
        const outputPath = path.join(TEMP_DIR, filename);

        // Create write stream
        const output = fs.createWriteStream(outputPath);

        // LaTeX compilation options
        const options = {
            inputs: INPUTS_DIR,
            cmd: 'pdflatex',
            passes: 2,
            errorLogs: ERROR_LOGS_DIR
        };

        // Set timeout for compilation (30 seconds)
        const timeout = setTimeout(() => {
            if (!responseSent) {
                console.error('LaTeX compilation timeout');
                sendError(504, 'Compilation timeout', 'LaTeX compilation took too long');
                
                // Clean up
                if (fs.existsSync(outputPath)) {
                    try { fs.unlinkSync(outputPath); } catch (e) {}
                }
            }
        }, 30000);

        // Compile LaTeX
        const pdf = latex(input, options);

        // Handle errors during compilation
        pdf.on('error', (err) => {
            clearTimeout(timeout);
            console.error('LaTeX compilation error:', err);
            
            // Clean up output file if it exists
            if (fs.existsSync(outputPath)) {
                try {
                    fs.unlinkSync(outputPath);
                } catch (e) {
                    console.error('Error cleaning up file:', e);
                }
            }

            sendError(500, 'LaTeX compilation failed', err.message);
        });

        // Pipe to output file
        pdf.pipe(output);

        output.on('finish', () => {
            clearTimeout(timeout);
            
            if (responseSent) return;

            try {
                // Read the PDF file and send as base64
                const pdfBuffer = fs.readFileSync(outputPath);
                const base64Pdf = pdfBuffer.toString('base64');

                responseSent = true;
                res.json({
                    success: true,
                    pdf_base64: base64Pdf,
                    filename: filename,
                    size: pdfBuffer.length
                });

                // Clean up: delete the temp file after 1 minute
                setTimeout(() => {
                    if (fs.existsSync(outputPath)) {
                        try {
                            fs.unlinkSync(outputPath);
                        } catch (e) {
                            console.error('Error deleting temp file:', e);
                        }
                    }
                }, 60000);
            } catch (error) {
                console.error('Error reading PDF:', error);
                sendError(500, 'Error reading compiled PDF', error.message);
            }
        });

        output.on('error', (err) => {
            clearTimeout(timeout);
            console.error('Output stream error:', err);
            sendError(500, 'Error writing PDF file', err.message);
        });

    } catch (error) {
        console.error('Server error:', error);
        sendError(500, 'Internal server error', error.message);
    }
});

// Download PDF endpoint (for direct file download)
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(TEMP_DIR, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('Download error:', err);
        }
    });
});

// Clean up old temp files on startup
function cleanupOldFiles() {
    if (!fs.existsSync(TEMP_DIR)) return;

    try {
        const files = fs.readdirSync(TEMP_DIR);
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        files.forEach(file => {
            // Skip directories
            const filePath = path.join(TEMP_DIR, file);
            
            try {
                const stats = fs.statSync(filePath);
                
                // Skip if it's a directory
                if (stats.isDirectory()) return;
                
                const age = now - stats.mtimeMs;

                if (age > ONE_HOUR) {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up old file: ${file}`);
                }
            } catch (err) {
                console.error(`Error processing file ${file}:`, err.message);
            }
        });
    } catch (err) {
        console.error('Error during cleanup:', err.message);
    }
}

// Cleanup on startup
cleanupOldFiles();

// Cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

// Check if LaTeX is installed on startup
function checkLatexInstallation() {
    try {
        const version = execSync('pdflatex --version', { encoding: 'utf8' });
        console.log('✓ LaTeX installation found:');
        console.log('  ' + version.split('\n')[0]);
        return true;
    } catch (error) {
        console.error('⚠ WARNING: pdflatex not found!');
        console.error('  Please install LaTeX:');
        console.error('  - Windows: https://miktex.org/download');
        console.error('  - macOS: brew install --cask mactex');
        console.error('  - Linux: sudo apt-get install texlive-full');
        return false;
    }
}

// Start server
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`LaTeX Compilation Service`);
    console.log('='.repeat(60));
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ Temp directory: ${TEMP_DIR}`);
    console.log(`✓ Inputs directory: ${INPUTS_DIR}`);
    console.log(`✓ Error logs: ${ERROR_LOGS_DIR}`);
    console.log('');
    
    const latexInstalled = checkLatexInstallation();
    
    console.log('');
    console.log('Endpoints:');
    console.log(`  GET  /health       - Health check`);
    console.log(`  GET  /check-latex  - Verify LaTeX installation`);
    console.log(`  POST /compile      - Compile LaTeX to PDF`);
    console.log('='.repeat(60));
    
    if (!latexInstalled) {
        console.log('\n⚠ Server started but LaTeX is not installed.');
        console.log('   Compilation requests will fail until LaTeX is installed.\n');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    process.exit(0);
});
