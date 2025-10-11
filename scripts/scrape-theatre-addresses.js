const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Function to extract address from individual theatre page
async function getTheatreAddress(page, theatreUrl) {
    if (!theatreUrl) return null;
    
    try {
        console.log(`Getting address from: ${theatreUrl}`);
        
        await page.goto(theatreUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const addressInfo = await page.evaluate(() => {
            const info = {
                address: '',
                phone: '',
                website: ''
            };
            
            // Look for address in various selectors
            const addressSelectors = [
                '.address',
                '.venue-address',
                '.theatre-address',
                '[class*="address"]',
                'address',
                '.location',
                '.venue-location',
                '.contact-info',
                '.venue-details'
            ];
            
            for (const selector of addressSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent?.trim()) {
                    let address = element.textContent.trim();
                    // Clean up the address
                    address = address.replace(/^Address[:\s]*/i, '').trim();
                    if (address.length > 10) { // Reasonable address length
                        info.address = address;
                        break;
                    }
                }
            }
            
            // If no specific address element, look for address patterns in text
            if (!info.address) {
                const allText = document.body.textContent;
                const addressPatterns = [
                    // UK postcode pattern
                    /([^,\n]*,\s*[^,\n]*,\s*[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2})/i,
                    // Street address pattern
                    /(\d+[^,\n]*,\s*[^,\n]*,\s*[^,\n]*,\s*[A-Z][a-z]+)/i,
                    // General address pattern
                    /([^,\n]*,\s*[^,\n]*,\s*[^,\n]*,\s*[A-Z][a-z]+\s*[A-Z]{1,2}\d{1,2})/i
                ];
                
                for (const pattern of addressPatterns) {
                    const match = allText.match(pattern);
                    if (match && match[1].length > 15) {
                        info.address = match[1].trim();
                        break;
                    }
                }
            }
            
            // Extract phone number
            const phoneMatch = document.body.textContent.match(/(\+44\s*\d{2,4}\s*\d{3,4}\s*\d{3,4}|\d{3,4}\s*\d{3,4}\s*\d{3,4})/);
            if (phoneMatch) {
                info.phone = phoneMatch[1];
            }
            
            // Extract website
            const websiteSelectors = [
                'a[href^="http"]:not([href*="westendtheatre.com"])',
                '.website a',
                'a[href*="www."]'
            ];
            
            for (const selector of websiteSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const href = element.getAttribute('href');
                    if (href && !href.includes('westendtheatre.com') && !href.includes('mailto:')) {
                        info.website = href;
                        break;
                    }
                }
            }
            
            return info;
        });
        
        return addressInfo;
        
    } catch (error) {
        console.log(`Error getting address from ${theatreUrl}:`, error.message);
        return null;
    }
}

// Function to construct theatre URLs from the data
function constructTheatreUrls(theatres) {
    return theatres.map(theatre => {
        // Create URL based on theatre name
        const urlName = theatre.name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .trim();
        
        return {
            ...theatre,
            detailUrl: `https://www.westendtheatre.com/theatres/${urlName}/`
        };
    });
}

// Main function to scrape addresses for all theatres
async function scrapeAllTheatreAddresses() {
    let browser;
    
    try {
        console.log('Loading theatre data...');
        
        // Read the combined theatre data
        const theatres = JSON.parse(fs.readFileSync('data/uk-all-theatres-complete.json', 'utf8'));
        console.log(`Loaded ${theatres.length} theatres`);
        
        // Construct URLs for each theatre
        const theatresWithUrls = constructTheatreUrls(theatres);
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Process each theatre (limit to first 20 for testing)
        const limit = Math.min(theatresWithUrls.length, 20);
        console.log(`Processing first ${limit} theatres for testing...`);
        
        for (let i = 0; i < limit; i++) {
            const theatre = theatresWithUrls[i];
            console.log(`\n[${i + 1}/${limit}] Processing: ${theatre.name}`);
            
            const addressInfo = await getTheatreAddress(page, theatre.detailUrl);
            
            if (addressInfo) {
                // Update theatre with address information
                theatre.address = addressInfo.address || theatre.address;
                theatre.phone = addressInfo.phone || '';
                theatre.website = addressInfo.website || '';
                
                console.log(`   Address: ${theatre.address}`);
                console.log(`   Phone: ${theatre.phone || 'Not found'}`);
                console.log(`   Website: ${theatre.website || 'Not found'}`);
            } else {
                console.log(`   Could not extract address information`);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Save updated data
        const outputPath = 'data/uk-theatres-with-full-addresses.json';
        fs.writeFileSync(outputPath, JSON.stringify(theatresWithUrls.slice(0, limit), null, 2));
        
        console.log(`\n=== ADDRESS SCRAPING COMPLETE ===`);
        console.log(`Processed ${limit} theatres`);
        console.log(`Updated data saved to: ${outputPath}`);
        
        // Show summary
        const withAddresses = theatresWithUrls.slice(0, limit).filter(t => t.address && t.address.length > 10);
        console.log(`Theatres with full addresses: ${withAddresses.length}/${limit}`);
        
        console.log('\nSample theatres with full addresses:');
        withAddresses.slice(0, 5).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address}`);
            console.log(`   Phone: ${theatre.phone || 'Not found'}`);
            console.log(`   Website: ${theatre.website || 'Not found'}`);
            console.log('');
        });
        
        return theatresWithUrls.slice(0, limit);
        
    } catch (error) {
        console.error('Error scraping theatre addresses:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the address scraping
if (require.main === module) {
    scrapeAllTheatreAddresses()
        .then(() => {
            console.log('Address scraping completed successfully!');
        })
        .catch((error) => {
            console.error('Address scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeAllTheatreAddresses };
