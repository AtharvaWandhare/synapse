#!/usr/bin/env node

/**
 * Simple test script for the LaTeX compilation service
 * Run with: node test.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

const simpleLatex = String.raw`\documentclass{article}
\begin{document}
Hello, World! This is a test document.
\end{document}`;

async function testHealthCheck() {
    console.log('Testing /health endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✓ Health check:', response.data);
        return true;
    } catch (error) {
        console.error('✗ Health check failed:', error.message);
        return false;
    }
}

async function testLatexCheck() {
    console.log('\nTesting /check-latex endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/check-latex`);
        console.log('✓ LaTeX check:', response.data);
        return true;
    } catch (error) {
        console.error('✗ LaTeX check failed:', error.response?.data || error.message);
        return false;
    }
}

async function testCompilation() {
    console.log('\nTesting /compile endpoint...');
    try {
        const response = await axios.post(`${BASE_URL}/compile`, {
            latex_code: simpleLatex
        });
        
        if (response.data.success) {
            console.log('✓ Compilation successful!');
            console.log(`  Filename: ${response.data.filename}`);
            console.log(`  Size: ${response.data.size} bytes`);
            console.log(`  Base64 length: ${response.data.pdf_base64.length} characters`);
            return true;
        } else {
            console.error('✗ Compilation failed:', response.data);
            return false;
        }
    } catch (error) {
        console.error('✗ Compilation request failed:', error.response?.data || error.message);
        return false;
    }
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('LaTeX Service Test Suite');
    console.log('='.repeat(60));
    console.log(`Target: ${BASE_URL}\n`);
    
    const health = await testHealthCheck();
    if (!health) {
        console.log('\n⚠ Server is not running. Start it with: npm run dev');
        process.exit(1);
    }
    
    const latexInstalled = await testLatexCheck();
    if (!latexInstalled) {
        console.log('\n⚠ LaTeX is not installed. Skipping compilation test.');
        console.log('Install LaTeX from: https://miktex.org/download');
        process.exit(1);
    }
    
    const compilation = await testCompilation();
    
    console.log('\n' + '='.repeat(60));
    console.log('Test Results:');
    console.log(`  Health Check: ${health ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  LaTeX Check:  ${latexInstalled ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Compilation:  ${compilation ? '✓ PASS' : '✗ FAIL'}`);
    console.log('='.repeat(60));
    
    if (health && latexInstalled && compilation) {
        console.log('\n✓ All tests passed! Service is ready to use.');
        process.exit(0);
    } else {
        console.log('\n✗ Some tests failed. Check the output above.');
        process.exit(1);
    }
}

runTests();
