const puppeteer = require('puppeteer');

// Debug function to examine a single theatre page
async function debugTheatrePage() {
    let browser;
    
    try {
        console.log('Starting debug session...');
        
        browser = await puppeteer.launch({
            headless: false, // Show browser for debugging
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to a specific theatre page
        const testUrl = 'https://database.theatrestrust.org.uk/index.php/resources/theatres/show/2993-alban-arena';
        console.log(`Navigating to: ${testUrl}`);
        
        await page.goto(testUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract and analyze the page content
        const pageAnalysis = await page.evaluate(() => {
            const analysis = {
                title: document.title,
                h1Text: document.querySelector('h1')?.textContent?.trim() || 'No H1 found',
                bodyText: document.body.textContent.substring(0, 1000), // First 1000 chars
                statusKeywords: [],
                addressElements: [],
                websiteLinks: []
            };
            
            // Look for status-related keywords
            const statusKeywords = ['extant', 'closed', 'demolished', 'converted', 'disused', 'derelict', 'active', 'operating', 'open'];
            const bodyText = document.body.textContent.toLowerCase();
            
            statusKeywords.forEach(keyword => {
                if (bodyText.includes(keyword)) {
                    analysis.statusKeywords.push(keyword);
                }
            });
            
            // Look for address elements
            const addressSelectors = ['.address', '.venue-address', '.theatre-address', '[class*="address"]', 'address'];
            addressSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.textContent?.trim()) {
                        analysis.addressElements.push({
                            selector: selector,
                            text: el.textContent.trim()
                        });
                    }
                });
            });
            
            // Look for website links
            const links = document.querySelectorAll('a[href^="http"]');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.includes('theatrestrust.org.uk') && !href.includes('mailto:')) {
                    analysis.websiteLinks.push({
                        text: link.textContent?.trim() || '',
                        href: href
                    });
                }
            });
            
            return analysis;
        });
        
        console.log('\n=== PAGE ANALYSIS ===');
        console.log('Title:', pageAnalysis.title);
        console.log('H1 Text:', pageAnalysis.h1Text);
        console.log('\nStatus Keywords Found:', pageAnalysis.statusKeywords);
        console.log('\nAddress Elements:');
        pageAnalysis.addressElements.forEach((addr, index) => {
            console.log(`  ${index + 1}. [${addr.selector}] ${addr.text}`);
        });
        console.log('\nWebsite Links:');
        pageAnalysis.websiteLinks.forEach((link, index) => {
            console.log(`  ${index + 1}. ${link.text} -> ${link.href}`);
        });
        console.log('\nFirst 1000 characters of body text:');
        console.log(pageAnalysis.bodyText);
        
        // Wait for user to examine the browser
        console.log('\nBrowser is open for manual inspection. Press Enter to continue...');
        await new Promise(resolve => {
            process.stdin.once('data', () => resolve());
        });
        
    } catch (error) {
        console.error('Debug error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the debug function
debugTheatrePage()
    .then(() => {
        console.log('Debug completed!');
    })
    .catch((error) => {
        console.error('Debug failed:', error);
        process.exit(1);
    });
