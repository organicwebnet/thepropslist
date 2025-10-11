const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Function to extract venue information from Show Tours
async function extractShowToursVenues(page) {
    console.log('Extracting venues from Show Tours...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const venues = await page.evaluate(() => {
        const venueList = [];
        
        // Look for venue links and text
        const venueElements = document.querySelectorAll('a[href*="/venue/"], a[href*="/theatre/"], li a, ul a');
        
        venueElements.forEach((element, index) => {
            try {
                const text = element.textContent?.trim();
                const href = element.getAttribute('href');
                
                // Filter for venue-related links
                if (text && text.length > 0 && (href?.includes('/venue/') || href?.includes('/theatre/'))) {
                    const fullUrl = href.startsWith('http') ? href : `https://showtours.co.uk${href}`;
                    
                    venueList.push({
                        name: text,
                        url: fullUrl
                    });
                }
            } catch (error) {
                console.log(`Error processing element ${index}:`, error.message);
            }
        });
        
        // If no specific venue links found, look for text patterns that look like venue names
        if (venueList.length === 0) {
            const allText = document.body.textContent;
            const lines = allText.split('\n');
            
            lines.forEach(line => {
                const trimmedLine = line.trim();
                // Look for lines that look like venue names (contain "Theatre", "Hall", "Arena", etc.)
                if (trimmedLine && 
                    (trimmedLine.includes('Theatre') || 
                     trimmedLine.includes('Hall') || 
                     trimmedLine.includes('Arena') || 
                     trimmedLine.includes('Opera House') ||
                     trimmedLine.includes('Centre') ||
                     trimmedLine.includes('Palace')) &&
                    trimmedLine.length < 100) { // Reasonable length for venue names
                    
                    venueList.push({
                        name: trimmedLine,
                        url: ''
                    });
                }
            });
        }
        
        return venueList;
    });
    
    console.log(`Found ${venues.length} venues`);
    return venues;
}

// Function to get venue details from individual venue page
async function getVenueDetails(page, venueUrl) {
    if (!venueUrl) return null;
    
    try {
        console.log(`Getting details for: ${venueUrl}`);
        
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
                description: ''
            };
            
            // Extract venue name
            const nameSelectors = ['h1', '.venue-title', '.theatre-name', 'title'];
            for (const selector of nameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent?.trim()) {
                    details.name = element.textContent.trim();
                    break;
                }
            }
            
            // Extract address
            const addressSelectors = ['.address', '.venue-address', '.theatre-address', '[class*="address"]', 'address'];
            for (const selector of addressSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent?.trim()) {
                    details.address = element.textContent.trim();
                    break;
                }
            }
            
            // Look for address patterns in text
            if (!details.address) {
                const allText = document.body.textContent;
                const addressMatch = allText.match(/(\d+[^,]*,\s*[^,]*,\s*[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2})/i);
                if (addressMatch) {
                    details.address = addressMatch[1];
                }
            }
            
            // Extract website
            const websiteSelectors = ['a[href^="http"]:not([href*="showtours.co.uk"])', '.website a', 'a[href*="www."]'];
            for (const selector of websiteSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const href = element.getAttribute('href');
                    if (href && !href.includes('showtours.co.uk') && !href.includes('mailto:')) {
                        details.website = href;
                        break;
                    }
                }
            }
            
            // Extract phone
            const phoneMatch = document.body.textContent.match(/(\+44\s*\d{2,4}\s*\d{3,4}\s*\d{3,4}|\d{3,4}\s*\d{3,4}\s*\d{3,4})/);
            if (phoneMatch) {
                details.phone = phoneMatch[1];
            }
            
            return details;
        });
        
        return venueDetails;
        
    } catch (error) {
        console.log(`Error getting details from ${venueUrl}:`, error.message);
        return null;
    }
}

// Main function to scrape Show Tours venues
async function scrapeShowToursVenues() {
    let browser;
    
    try {
        console.log('Starting to scrape Show Tours venues...');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to the venues page
        console.log('Navigating to Show Tours venues page...');
        await page.goto('https://showtours.co.uk/venues/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Extract venue list
        const venues = await extractShowToursVenues(page);
        
        console.log(`Found ${venues.length} venues from Show Tours`);
        
        // Get details for each venue (limit to first 20 for now to test)
        const venuesWithDetails = [];
        const limit = Math.min(venues.length, 20); // Limit for testing
        
        for (let i = 0; i < limit; i++) {
            const venue = venues[i];
            console.log(`\n[${i + 1}/${limit}] Processing: ${venue.name}`);
            
            let venueDetails = null;
            if (venue.url) {
                venueDetails = await getVenueDetails(page, venue.url);
            }
            
            const finalVenue = {
                name: venue.name,
                address: venueDetails?.address || '',
                website: venueDetails?.website || '',
                phone: venueDetails?.phone || '',
                sourceUrl: venue.url || '',
                status: 'Operating', // All Show Tours venues are operating
                isExtant: true
            };
            
            venuesWithDetails.push(finalVenue);
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save to JSON file
        const outputPath = path.join(outputDir, 'showtours-venues.json');
        fs.writeFileSync(outputPath, JSON.stringify(venuesWithDetails, null, 2));
        
        console.log(`\n=== SHOW TOURS VENUES SCRAPED ===`);
        console.log(`Total venues processed: ${venuesWithDetails.length}`);
        console.log(`Data saved to: ${outputPath}`);
        
        console.log('\nSample venues:');
        venuesWithDetails.slice(0, 10).forEach((venue, index) => {
            console.log(`${index + 1}. ${venue.name}`);
            console.log(`   Address: ${venue.address || 'Not found'}`);
            console.log(`   Website: ${venue.website || 'Not found'}`);
            console.log(`   Phone: ${venue.phone || 'Not found'}`);
            console.log(`   Source: ${venue.sourceUrl}`);
            console.log('');
        });
        
        return venuesWithDetails;
        
    } catch (error) {
        console.error('Error scraping Show Tours venues:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the scraper if this script is executed directly
if (require.main === module) {
    scrapeShowToursVenues()
        .then(() => {
            console.log('Show Tours scraping completed successfully!');
        })
        .catch((error) => {
            console.error('Show Tours scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeShowToursVenues };
