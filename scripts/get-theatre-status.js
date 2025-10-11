const puppeteer = require('puppeteer');
const fs = require('fs');

// Function to extract status from a theatre page
async function getTheatreStatus(page, theatreUrl) {
    try {
        await page.goto(theatreUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusInfo = await page.evaluate(() => {
            const pageText = document.body.textContent.toLowerCase();
            
            // Look for specific status indicators
            const statusIndicators = {
                extant: ['extant', 'currently operating', 'active', 'open', 'in use'],
                closed: ['closed', 'demolished', 'converted', 'disused', 'derelict', 'no longer', 'ceased operation', 'shut down'],
                converted: ['converted to', 'now a', 'became', 'redeveloped as'],
                demolished: ['demolished', 'pulled down', 'torn down', 'destroyed']
            };
            
            let status = 'Unknown';
            let isExtant = true;
            
            // Check for closed/demolished status first
            for (const indicator of statusIndicators.closed) {
                if (pageText.includes(indicator)) {
                    status = 'Closed';
                    isExtant = false;
                    break;
                }
            }
            
            // Check for demolished status
            for (const indicator of statusIndicators.demolished) {
                if (pageText.includes(indicator)) {
                    status = 'Demolished';
                    isExtant = false;
                    break;
                }
            }
            
            // Check for converted status
            for (const indicator of statusIndicators.converted) {
                if (pageText.includes(indicator)) {
                    status = 'Converted';
                    isExtant = false;
                    break;
                }
            }
            
            // If not closed, check for extant status
            if (isExtant) {
                for (const indicator of statusIndicators.extant) {
                    if (pageText.includes(indicator)) {
                        status = 'Extant';
                        break;
                    }
                }
            }
            
            // Look for specific status text in the page
            const statusElements = document.querySelectorAll('*');
            let foundStatus = '';
            
            for (const element of statusElements) {
                const text = element.textContent?.toLowerCase() || '';
                if (text.includes('status:') || text.includes('condition:')) {
                    foundStatus = element.textContent.trim();
                    break;
                }
            }
            
            return {
                status: status,
                isExtant: isExtant,
                statusText: foundStatus,
                pageTitle: document.title
            };
        });
        
        return statusInfo;
        
    } catch (error) {
        console.log(`Error getting status from ${theatreUrl}:`, error.message);
        return {
            status: 'Error',
            isExtant: false,
            statusText: error.message,
            pageTitle: ''
        };
    }
}

// Main function to update all theatres with status
async function updateTheatreStatus() {
    let browser;
    
    try {
        console.log('Loading existing theatre data...');
        
        // Read existing data
        const theatres = JSON.parse(fs.readFileSync('data/uk-theatres.json', 'utf8'));
        console.log(`Found ${theatres.length} theatres to update`);
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Update each theatre with status
        for (let i = 0; i < theatres.length; i++) {
            const theatre = theatres[i];
            console.log(`\n[${i + 1}/${theatres.length}] Getting status for: ${theatre.name}`);
            
            const statusInfo = await getTheatreStatus(page, theatre.sourceUrl);
            
            // Update theatre with status information
            theatre.status = statusInfo.status;
            theatre.isExtant = statusInfo.isExtant;
            theatre.statusText = statusInfo.statusText;
            theatre.pageTitle = statusInfo.pageTitle;
            
            console.log(`   Status: ${statusInfo.status} (Extant: ${statusInfo.isExtant})`);
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Save updated data
        const outputPath = 'data/uk-theatres-with-status.json';
        fs.writeFileSync(outputPath, JSON.stringify(theatres, null, 2));
        
        // Show summary
        const extantCount = theatres.filter(t => t.isExtant).length;
        const closedCount = theatres.filter(t => !t.isExtant).length;
        
        console.log(`\n=== STATUS UPDATE COMPLETE ===`);
        console.log(`Total theatres: ${theatres.length}`);
        console.log(`Extant (working): ${extantCount}`);
        console.log(`Closed/Demolished: ${closedCount}`);
        console.log(`Updated data saved to: ${outputPath}`);
        
        // Show sample of extant theatres
        console.log('\n=== SAMPLE EXTANT THEATRES ===');
        const extantTheatres = theatres.filter(t => t.isExtant).slice(0, 5);
        extantTheatres.forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address}`);
            console.log(`   Status: ${theatre.status}`);
            console.log(`   Website: ${theatre.website || 'Not available'}`);
            console.log('');
        });
        
        return theatres;
        
    } catch (error) {
        console.error('Error updating theatre status:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the status update
if (require.main === module) {
    updateTheatreStatus()
        .then(() => {
            console.log('Status update completed successfully!');
        })
        .catch((error) => {
            console.error('Status update failed:', error);
            process.exit(1);
        });
}

module.exports = { updateTheatreStatus };
