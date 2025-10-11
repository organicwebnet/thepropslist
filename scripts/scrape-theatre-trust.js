const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Function to extract venue links from the A-Z listing page
async function extractVenueLinks(page) {
    console.log('Extracting venue links from A-Z listing...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const venueLinks = await page.evaluate(() => {
        const links = [];
        
        // Look for venue links - they typically have specific patterns
        const selectors = [
            'a[href*="/theatres/"]',
            'a[href*="/venue/"]',
            '.theatre-link',
            '.venue-link',
            'table a',
            'ul a',
            'ol a'
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
            // Fallback: get all links and filter
            elements = document.querySelectorAll('a');
            console.log(`Found ${elements.length} total links, filtering for venues...`);
        }
        
        elements.forEach((element, index) => {
            try {
                const href = element.getAttribute('href');
                const text = element.textContent?.trim();
                
                // Filter for venue/theatre links
                if (href && (href.includes('/theatres/') || href.includes('/venue/')) && text && text.length > 0) {
                    const fullUrl = href.startsWith('http') ? href : `https://database.theatrestrust.org.uk${href}`;
                    
                    links.push({
                        name: text,
                        url: fullUrl
                    });
                }
            } catch (error) {
                console.log(`Error processing element ${index}:`, error.message);
            }
        });
        
        return links;
    });
    
    console.log(`Found ${venueLinks.length} venue links`);
    return venueLinks;
}

// Function to extract detailed information from individual venue page
async function extractVenueDetails(page, venueUrl) {
    console.log(`Extracting details from: ${venueUrl}`);
    
    try {
        await page.goto(venueUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const venueDetails = await page.evaluate(() => {
            const details = {
                name: '',
                address: '',
                website: '',
                phone: '',
                email: '',
                description: '',
                status: '',
                isExtant: true
            };
            
            // Check if theatre is extant (currently operating)
            const pageText = document.body.textContent.toLowerCase();
            const extantIndicators = ['extant', 'currently operating', 'active', 'open'];
            const closedIndicators = ['closed', 'demolished', 'converted', 'disused', 'derelict', 'no longer', 'ceased operation'];
            
            // Check for closed/demolished status
            for (const indicator of closedIndicators) {
                if (pageText.includes(indicator)) {
                    details.isExtant = false;
                    details.status = 'Closed/Demolished';
                    break;
                }
            }
            
            // If not explicitly closed, check for extant status
            if (details.isExtant) {
                for (const indicator of extantIndicators) {
                    if (pageText.includes(indicator)) {
                        details.status = 'Extant';
                        break;
                    }
                }
            }
            
            // Extract venue name (usually in h1 or title)
            const nameSelectors = ['h1', '.venue-title', '.theatre-name', 'title'];
            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent?.trim()) {
                    let name = element.textContent.trim();
                    // Clean up name - remove numbers and extra text
                    name = name.replace(/\d+$/, '').trim(); // Remove trailing numbers
                    name = name.replace(/^Address/, '').trim(); // Remove "Address" prefix
                    details.name = name;
                    break;
                }
            }
            
            // Extract address information
            const addressSelectors = [
                '.address',
                '.venue-address',
                '.theatre-address',
                '[class*="address"]',
                'address'
            ];
            
            for (const selector of addressSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent?.trim()) {
                    let address = element.textContent.trim();
                    // Clean up address - remove "Address" prefix
                    address = address.replace(/^Address/, '').trim();
                    details.address = address;
                    break;
                }
            }
            
            // If no specific address class, look for address patterns in text
            if (!details.address) {
                const allText = document.body.textContent;
                const addressMatch = allText.match(/(\d+[^,]*,\s*[^,]*,\s*[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2})/i);
                if (addressMatch) {
                    details.address = addressMatch[1];
                }
            }
            
            // Extract website URL
            const websiteSelectors = [
                'a[href^="http"]:not([href*="theatrestrust.org.uk"])',
                '.website a',
                '.venue-website a',
                'a[href*="www."]'
            ];
            
            for (const selector of websiteSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const href = element.getAttribute('href');
                    if (href && !href.includes('theatrestrust.org.uk') && !href.includes('mailto:')) {
                        details.website = href;
                        break;
                    }
                }
            }
            
            // Extract phone number - look for UK phone number patterns
            const phonePatterns = [
                /(\+44\s*\d{2,4}\s*\d{3,4}\s*\d{3,4})/g,
                /(0\d{2,4}\s*\d{3,4}\s*\d{3,4})/g,
                /(\d{3,4}\s*\d{3,4}\s*\d{3,4})/g
            ];
            
            for (const pattern of phonePatterns) {
                const matches = document.body.textContent.match(pattern);
                if (matches && matches.length > 0) {
                    // Filter out common false positives
                    const validPhone = matches.find(phone => 
                        !phone.includes('609949931') && // Skip the common false positive
                        phone.length >= 10 &&
                        phone.length <= 15
                    );
                    if (validPhone) {
                        details.phone = validPhone.trim();
                        break;
                    }
                }
            }
            
            // Extract email
            const emailMatch = document.body.textContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
                details.email = emailMatch[1];
            }
            
            return details;
        });
        
        return venueDetails;
        
    } catch (error) {
        console.log(`Error extracting details from ${venueUrl}:`, error.message);
        return {
            name: '',
            address: '',
            website: '',
            phone: '',
            email: '',
            description: '',
            status: '',
            isExtant: false,
            error: error.message
        };
    }
}

// Function to get next page URL for A-Z pagination
async function getNextPageUrl(page) {
    return await page.evaluate(() => {
        // Look for pagination elements
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
                    return href.startsWith('http') ? href : `https://database.theatrestrust.org.uk${href}`;
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
                        return href.startsWith('http') ? href : `https://database.theatrestrust.org.uk${href}`;
                    }
                }
            }
        }
        
        // Look for A-Z navigation (letters)
        const letterLinks = document.querySelectorAll('a[href*="letter="], a[href*="alpha="]');
        if (letterLinks.length > 0) {
            // Find current letter and get next one
            const currentUrl = window.location.href;
            const currentLetterMatch = currentUrl.match(/[?&](letter|alpha)=([A-Z])/i);
            
            if (currentLetterMatch) {
                const currentLetter = currentLetterMatch[2].toUpperCase();
                const nextLetter = String.fromCharCode(currentLetter.charCodeAt(0) + 1);
                
                if (nextLetter <= 'Z') {
                    return currentUrl.replace(/[?&](letter|alpha)=[A-Z]/i, `$1=${nextLetter}`);
                }
            }
        }
        
        return null;
    });
}

// Function to scrape all pages and venues
async function scrapeAllVenues(page) {
    const allVenues = [];
    const seenVenueNames = new Set();
    let currentPage = 1;
    let hasNextPage = true;
    let duplicateCount = 0;
    const maxDuplicates = 3;
    
    while (hasNextPage) {
        console.log(`\n--- Scraping page ${currentPage} ---`);
        
        // Extract venue links from current page
        const venueLinks = await extractVenueLinks(page);
        
        // Process each venue link
        let newVenues = 0;
        let duplicatesOnThisPage = 0;
        
        for (const venueLink of venueLinks) {
            // Create a unique key for the venue
            const venueKey = venueLink.name.toLowerCase().trim();
            
            if (seenVenueNames.has(venueKey)) {
                duplicatesOnThisPage++;
                continue;
            }
            
            seenVenueNames.add(venueKey);
            
            // Extract detailed information from venue page
            const venueDetails = await extractVenueDetails(page, venueLink.url);
            
            // Include ALL theatres regardless of status
            const venue = {
                name: venueDetails.name || venueLink.name,
                address: venueDetails.address,
                website: venueDetails.website,
                phone: venueDetails.phone,
                email: venueDetails.email,
                status: venueDetails.status || 'Unknown',
                isExtant: venueDetails.isExtant,
                sourceUrl: venueLink.url,
                ...venueDetails
            };
            
            allVenues.push(venue);
            newVenues++;
            
            if (venueDetails.isExtant) {
                console.log(`✓ Added extant theatre: ${venue.name}`);
            } else {
                console.log(`✓ Added theatre: ${venue.name} (${venueDetails.status})`);
            }
            
            // Small delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`Found ${venueLinks.length} venue links on page ${currentPage}`);
        console.log(`New venues: ${newVenues}, Duplicates: ${duplicatesOnThisPage}`);
        console.log(`Total unique venues collected so far: ${allVenues.length}`);
        
        // Check for duplicates to detect cycling
        if (duplicatesOnThisPage > 0) {
            duplicateCount++;
            if (duplicateCount >= maxDuplicates) {
                console.log(`Found ${duplicateCount} consecutive pages with duplicates. Likely cycling. Stopping...`);
                break;
            }
        } else {
            duplicateCount = 0;
        }
        
        // Check for next page
        const nextPageUrl = await getNextPageUrl(page);
        
        if (nextPageUrl) {
            console.log(`Next page URL found: ${nextPageUrl}`);
            
            try {
                await page.goto(nextPageUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                currentPage++;
                
                // Safety check
                if (currentPage > 50) {
                    console.log('Reached maximum page limit (50), stopping...');
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
    
    return allVenues;
}

// Main function to scrape Theatre Trust database
async function scrapeTheatreTrust() {
    let browser;
    
    try {
        console.log('Starting to scrape Theatre Trust database...');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to the theatres list page
        console.log('Navigating to Theatre Trust database...');
        await page.goto('https://database.theatrestrust.org.uk/discover-theatres/theatres-database/theatres-list-a-z', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Scrape all venues
        console.log('Starting to scrape all venues...');
        const allVenues = await scrapeAllVenues(page);
        
        // Count theatres by status
        const extantCount = allVenues.filter(v => v.isExtant).length;
        const closedCount = allVenues.filter(v => !v.isExtant).length;
        
        console.log(`\n=== SCRAPING SUMMARY ===`);
        console.log(`Found ${allVenues.length} total theatres`);
        console.log(`  - Extant (operating): ${extantCount}`);
        console.log(`  - Closed/Demolished: ${closedCount}`);
        
        // Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save to JSON file
        const outputPath = path.join(outputDir, 'uk-all-theatres.json');
        fs.writeFileSync(outputPath, JSON.stringify(allVenues, null, 2));
        
        console.log(`All theatre data saved to: ${outputPath}`);
        console.log('\nSample theatres:');
        allVenues.slice(0, 5).forEach((venue, index) => {
            console.log(`${index + 1}. ${venue.name}`);
            console.log(`   Address: ${venue.address || 'Not found'}`);
            console.log(`   Website: ${venue.website || 'Not found'}`);
            console.log(`   Phone: ${venue.phone || 'Not found'}`);
            console.log(`   Status: ${venue.status || 'Unknown'}`);
            console.log(`   Is Extant: ${venue.isExtant ? 'Yes' : 'No'}`);
            console.log(`   Source: ${venue.sourceUrl}`);
            console.log('');
        });
        
        return allVenues;
        
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
    scrapeTheatreTrust()
        .then(() => {
            console.log('Scraping completed successfully!');
        })
        .catch((error) => {
            console.error('Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeTheatreTrust };
