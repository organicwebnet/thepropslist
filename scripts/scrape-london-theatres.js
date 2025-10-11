const https = require('https');
const fs = require('fs');
const path = require('path');

// Function to make HTTPS request
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Function to extract theatre information from HTML
function extractTheatreData(html) {
    const theatres = [];
    
    // Debug: Let's see what we're working with
    console.log('HTML length:', html.length);
    console.log('First 1000 characters:', html.substring(0, 1000));
    
    // Try multiple patterns to match theatre entries
    const patterns = [
        // Pattern 1: * Theatre Name\nTheatre NameAddress\nCurrent and upcoming shows: Show Name,
        /\*\s*([^*\n]+?)\s*\n([^*\n]+?)\nCurrent and upcoming shows: ([^,]+),/g,
        
        // Pattern 2: Theatre Name\nAddress\nCurrent and upcoming shows: Show Name,
        /([A-Z][^*\n]+?)\s*\n([^*\n]+?)\nCurrent and upcoming shows: ([^,]+),/g,
        
        // Pattern 3: Look for theatre names followed by addresses
        /([A-Z][^*\n]+?Theatre)\s*\n([^*\n]+?)\nCurrent and upcoming shows: ([^,]+),/g,
        
        // Pattern 4: More flexible pattern
        /([A-Z][^*\n]+?)\s*\n([^*\n]+?)\nCurrent and upcoming shows: ([^,]+)/g
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const theatreName = match[1].trim();
            const addressLine = match[2].trim();
            const currentShow = match[3].trim();
            
            // Skip if we already have this theatre
            if (theatres.some(t => t.name === theatreName)) {
                continue;
            }
            
            // Extract address from the address line
            let address = addressLine;
            
            // Try to extract just the address part by removing the theatre name
            if (addressLine.includes(theatreName)) {
                address = addressLine.replace(theatreName, '').trim();
            }
            
            // Create web link (assuming the pattern based on the URL structure)
            const webLink = `https://www.londontheatre.co.uk/venues/${theatreName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
            
            theatres.push({
                name: theatreName,
                address: address,
                currentShow: currentShow,
                webLink: webLink
            });
        }
        
        if (theatres.length > 0) {
            console.log(`Found ${theatres.length} theatres using pattern`);
            break;
        }
    }
    
    // If no patterns worked, let's try a different approach
    if (theatres.length === 0) {
        console.log('No theatres found with regex patterns, trying alternative approach...');
        
        // Look for lines that contain "Theatre" and extract information
        const lines = html.split('\n');
        let currentTheatre = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for theatre names (lines starting with * or containing "Theatre")
            if (line.startsWith('*') && line.includes('Theatre')) {
                const theatreName = line.replace('*', '').trim();
                
                // Look for the next line which should contain the address
                if (i + 1 < lines.length) {
                    const addressLine = lines[i + 1].trim();
                    
                    // Look for the line with current shows
                    if (i + 2 < lines.length && lines[i + 2].includes('Current and upcoming shows:')) {
                        const showLine = lines[i + 2].trim();
                        const currentShow = showLine.replace('Current and upcoming shows:', '').replace(',', '').trim();
                        
                        let address = addressLine;
                        if (addressLine.includes(theatreName)) {
                            address = addressLine.replace(theatreName, '').trim();
                        }
                        
                        const webLink = `https://www.londontheatre.co.uk/venues/${theatreName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
                        
                        theatres.push({
                            name: theatreName,
                            address: address,
                            currentShow: currentShow,
                            webLink: webLink
                        });
                    }
                }
            }
        }
    }
    
    return theatres;
}

// Main function to scrape and save data
async function scrapeLondonTheatres() {
    try {
        console.log('Starting to scrape London Theatre venues...');
        
        const url = 'https://www.londontheatre.co.uk/venues';
        const html = await makeRequest(url);
        
        console.log('HTML content received, extracting theatre data...');
        
        const theatres = extractTheatreData(html);
        
        console.log(`Found ${theatres.length} theatres`);
        
        // Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save to JSON file
        const outputPath = path.join(outputDir, 'london-theatres.json');
        fs.writeFileSync(outputPath, JSON.stringify(theatres, null, 2));
        
        console.log(`Theatre data saved to: ${outputPath}`);
        console.log('Sample entries:');
        theatres.slice(0, 3).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address}`);
            console.log(`   Current Show: ${theatre.currentShow}`);
            console.log(`   Web Link: ${theatre.webLink}`);
            console.log('');
        });
        
        return theatres;
        
    } catch (error) {
        console.error('Error scraping theatre data:', error);
        throw error;
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

module.exports = { scrapeLondonTheatres, extractTheatreData };
