const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    // We launch puppeteer to capture exact console logs.
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER LOG] ${msg.type().toUpperCase()} - ${msg.text()}`);
    });
    page.on('pageerror', error => {
        console.log(`[BROWSER ERROR] ${error.message}`);
    });
    page.on('response', response => {
        if (!response.ok()) {
            console.log(`[NETWORK ERROR] ${response.url()} - ${response.status()}`);
        }
    });

    const testPath = 'https://financier-two-lyart.vercel.app/#/login';
    console.log(`Navigating to ${testPath}...`);
    try {
        await page.goto(testPath, { waitUntil: 'load', timeout: 30000 });
        console.log('Test page loaded.');
        
        // Wait a few seconds to let any loops occur
        await new Promise(r => setTimeout(r, 4000));
        
        const html = await page.content();
        console.log('DOM snapshot length:', html.length);
    } catch (err) {
    }
    
    await browser.close();
})();
