const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Function to extract theatre information from the page
async function extractTheatreData(page) {
    console.log('Extracting theatre data from the page...');
    
    // Wait for the content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find theatre elements using various selectors
    const theatres = await page.evaluate(() => {
        const results = [];
        
        // Look for different possible selectors
        const selectors = [
            'a[href*="/venues/"]',
            '.venue-item',
            '.theatre-item',
            '[data-testid*="venue"]',
            'li a[href*="/venues/"]',
            'div a[href*="/venues/"]'
        ];
        
        let elements = [];
        for (const selector of selectors) {
            elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`Found ${elements.length} elements with selector: ${selector}`);
                break;
            }
        }
        
        if (elements.length === 0) {
            // Try to find any links that might contain theatre information
            elements = document.querySelectorAll('a');
            console.log(`Found ${elements.length} total links, filtering for venues...`);
        }
        
        elements.forEach((element, index) => {
            try {
                const href = element.getAttribute('href');
                const text = element.textContent?.trim();
                
                // Filter for venue links
                if (href && href.includes('/venues/') && text && text.length > 0) {
                    // Extract theatre name from the text
                    let theatreName = text;
                    
                    // Try to get more detailed information
                    const parent = element.parentElement;
                    const grandParent = parent?.parentElement;
                    
                    // Look for address information in nearby elements
                    let address = '';
                    let currentShow = '';
                    
                    // Check parent and sibling elements for additional info
                    if (parent) {
                        const parentText = parent.textContent?.trim() || '';
                        const siblings = Array.from(parent.children);
                        
                        siblings.forEach(sibling => {
                            const siblingText = sibling.textContent?.trim() || '';
                            if (siblingText && siblingText !== text) {
                                // Check if this looks like an address
                                if (siblingText.match(/\d+.*(Street|Road|Avenue|Lane|Place|Square)/i)) {
                                    address = siblingText;
                                }
                                // Check if this looks like a show name
                                else if (siblingText.includes('Current') || siblingText.includes('show')) {
                                    currentShow = siblingText;
                                }
                            }
                        });
                    }
                    
                    // If we don't have address from siblings, try to extract from the text itself
                    if (!address && text.includes('Theatre')) {
                        const parts = text.split('Theatre');
                        if (parts.length > 1) {
                            theatreName = parts[0] + 'Theatre';
                            address = parts[1].trim();
                        }
                    }
                    
                    // Clean up the theatre name
                    theatreName = theatreName.replace(/^\*/, '').trim();
                    
                    // Create the full web link
                    const webLink = href.startsWith('http') ? href : `https://www.londontheatre.co.uk${href}`;
                    
                    if (theatreName && theatreName.length > 0) {
                        results.push({
                            name: theatreName,
                            address: address,
                            currentShow: currentShow,
                            webLink: webLink
                        });
                    }
                }
            } catch (error) {
                console.log(`Error processing element ${index}:`, error.message);
            }
        });
        
        return results;
    });
    
    console.log(`Extracted ${theatres.length} theatres from the page`);
    return theatres;
}

// Function to check if there's a next page and get the next page URL
async function getNextPageUrl(page) {
    return await page.evaluate(() => {
        // Look for pagination elements with proper selectors
        const paginationSelectors = [
            'a[aria-label="Next page"]',
            'a[aria-label="Next"]',
            '.next-page',
            '.pagination-next'
        ];
        
        for (const selector of paginationSelectors) {
            const nextButton = document.querySelector(selector);
            if (nextButton && !nextButton.classList.contains('disabled')) {
                const href = nextButton.getAttribute('href');
                if (href) {
                    return href.startsWith('http') ? href : `https://www.londontheatre.co.uk${href}`;
                }
            }
        }
        
        // Look for links containing "Next" text
        const allLinks = document.querySelectorAll('a');
        for (const link of allLinks) {
            const text = link.textContent?.trim().toLowerCase();
            if (text === 'next' || text === '>' || text.includes('next page')) {
                if (!link.classList.contains('disabled')) {
                    const href = link.getAttribute('href');
                    if (href) {
                        return href.startsWith('http') ? href : `https://www.londontheatre.co.uk${href}`;
                    }
                }
            }
        }
        
        // Alternative: look for numbered pagination
        const pageNumbers = document.querySelectorAll('.pagination a, .page-numbers a, [class*="page"] a');
        let currentPage = 1;
        let maxPage = 1;
        
        pageNumbers.forEach(link => {
            const text = link.textContent?.trim();
            const href = link.getAttribute('href');
            
            if (text && !isNaN(parseInt(text))) {
                const pageNum = parseInt(text);
                maxPage = Math.max(maxPage, pageNum);
                
                if (link.classList.contains('current') || link.classList.contains('active')) {
                    currentPage = pageNum;
                }
            }
        });
        
        if (currentPage < maxPage) {
            return `https://www.londontheatre.co.uk/venues?page=${currentPage + 1}`;
        }
        
        // Try to find pagination by looking at the URL structure
        const currentUrl = window.location.href;
        const urlMatch = currentUrl.match(/[?&]page=(\d+)/);
        if (urlMatch) {
            const currentPageNum = parseInt(urlMatch[1]);
            return `https://www.londontheatre.co.uk/venues?page=${currentPageNum + 1}`;
        } else {
            // If no page parameter, try page 2
            return 'https://www.londontheatre.co.uk/venues?page=2';
        }
    });
}

// Function to scrape all pages
async function scrapeAllPages(page) {
    const allTheatres = [];
    const seenTheatreNames = new Set();
    let currentPage = 1;
    let hasNextPage = true;
    let duplicateCount = 0;
    const maxDuplicates = 5; // Stop if we see 5 consecutive duplicates
    
    while (hasNextPage) {
        console.log(`\n--- Scraping page ${currentPage} ---`);
        
        // Extract theatres from current page
        const pageTheatres = await extractTheatreData(page);
        
        // Check for duplicates and count new theatres
        let newTheatres = 0;
        let duplicatesOnThisPage = 0;
        
        pageTheatres.forEach(theatre => {
            if (seenTheatreNames.has(theatre.name)) {
                duplicatesOnThisPage++;
            } else {
                seenTheatreNames.add(theatre.name);
                allTheatres.push(theatre);
                newTheatres++;
            }
        });
        
        console.log(`Found ${pageTheatres.length} theatres on page ${currentPage}`);
        console.log(`New theatres: ${newTheatres}, Duplicates: ${duplicatesOnThisPage}`);
        console.log(`Total unique theatres collected so far: ${allTheatres.length}`);
        
        // If we have too many duplicates, we might be cycling
        if (duplicatesOnThisPage > 0) {
            duplicateCount++;
            if (duplicateCount >= maxDuplicates) {
                console.log(`Found ${duplicateCount} consecutive pages with duplicates. Likely cycling through alphabet. Stopping...`);
                break;
            }
        } else {
            duplicateCount = 0; // Reset counter if we found new theatres
        }
        
        // Check for next page
        const nextPageUrl = await getNextPageUrl(page);
        
        if (nextPageUrl) {
            console.log(`Next page URL found: ${nextPageUrl}`);
            
            // Navigate to next page
            try {
                await page.goto(nextPageUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                
                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 3000));
                currentPage++;
                
                // Safety check to prevent infinite loops (26 letters + some buffer)
                if (currentPage > 30) {
                    console.log('Reached maximum page limit (30), stopping...');
                    break;
                }
            } catch (error) {
                console.log('Error navigating to next page:', error.message);
                hasNextPage = false;
            }
        } else {
            console.log('No next page found, pagination complete');
            hasNextPage = false;
        }
    }
    
    return allTheatres;
}

// Main function to scrape theatre data
async function scrapeLondonTheatres() {
    let browser;
    
    try {
        console.log('Starting to scrape London Theatre venues with Puppeteer...');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set user agent to avoid being blocked
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to the venues page
        console.log('Navigating to https://www.londontheatre.co.uk/venues...');
        await page.goto('https://www.londontheatre.co.uk/venues', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Scrape all pages with pagination
        console.log('Starting to scrape all pages...');
        const uniqueTheatres = await scrapeAllPages(page);
        
        console.log(`Found ${uniqueTheatres.length} unique theatres`);
        
        // Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save to JSON file
        const outputPath = path.join(outputDir, 'london-theatres.json');
        fs.writeFileSync(outputPath, JSON.stringify(uniqueTheatres, null, 2));
        
        console.log(`Theatre data saved to: ${outputPath}`);
        console.log('Sample entries:');
        uniqueTheatres.slice(0, 5).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address || 'Not found'}`);
            console.log(`   Current Show: ${theatre.currentShow || 'Not found'}`);
            console.log(`   Web Link: ${theatre.webLink}`);
            console.log('');
        });
        
        return uniqueTheatres;
        
    } catch (error) {
        console.error('Error scraping theatre data:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the scraper if this script is executed directly
if (require.main === module) {
    scrapeLondonTheatres()
        .then(() => {
            console.log('Scraping completed successfully!');
        })
        .catch((error) => {
            console.error('Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeLondonTheatres };
