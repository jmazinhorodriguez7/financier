const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request =>
        console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
    );

    console.log('Navigating to http://localhost:51470...');
    try {
        await page.goto('http://localhost:51470', { waitUntil: 'networkidle2' });
        console.log('Page loaded.');
        
        // Wait a bit to ensure all scripts run
        await new Promise(r => setTimeout(r, 2000));
        
        const html = await page.content();
        console.log('Body length:', html.length);
        
        // Check if there is anything in #app
        const appContent = await page.$eval('#app', el => el.innerHTML);
        console.log('#app content length:', appContent.length);

    } catch (err) {
        console.error('Navigation failed:', err);
    }
    
    await browser.close();
})();
