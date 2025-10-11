const fs = require('fs');
const path = require('path');

// Function to clean up theatre data
function cleanTheatreData() {
    try {
        console.log('Loading theatre data...');
        
        // Read the JSON file
        const inputPath = path.join(__dirname, '..', 'data', 'uk-theatres.json');
        const rawData = fs.readFileSync(inputPath, 'utf8');
        const theatres = JSON.parse(rawData);
        
        console.log(`Found ${theatres.length} theatres`);
        
        // Clean up each theatre entry
        const cleanedTheatres = theatres.map(theatre => {
            // Remove email field
            const { email, ...cleanedTheatre } = theatre;
            
            // Clean up name (remove trailing numbers)
            if (cleanedTheatre.name) {
                cleanedTheatre.name = cleanedTheatre.name.replace(/\d+$/, '').trim();
            }
            
            // Clean up address (remove "Address" prefix)
            if (cleanedTheatre.address) {
                cleanedTheatre.address = cleanedTheatre.address.replace(/^Address/, '').trim();
            }
            
            // Clean up phone (remove the common false positive)
            if (cleanedTheatre.phone === '609949931') {
                cleanedTheatre.phone = '';
            }
            
            return cleanedTheatre;
        });
        
        // Save cleaned data
        const outputPath = path.join(__dirname, '..', 'data', 'uk-theatres-cleaned.json');
        fs.writeFileSync(outputPath, JSON.stringify(cleanedTheatres, null, 2));
        
        console.log(`Cleaned data saved to: ${outputPath}`);
        console.log('Sample cleaned entries:');
        
        cleanedTheatres.slice(0, 5).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address || 'Not found'}`);
            console.log(`   Website: ${theatre.website || 'Not found'}`);
            console.log(`   Phone: ${theatre.phone || 'Not found'}`);
            console.log(`   Source: ${theatre.sourceUrl}`);
            console.log('');
        });
        
        return cleanedTheatres;
        
    } catch (error) {
        console.error('Error cleaning theatre data:', error);
        throw error;
    }
}

// Run the cleaning function
if (require.main === module) {
    cleanTheatreData()
        .then(() => {
            console.log('Data cleaning completed successfully!');
        })
        .catch((error) => {
            console.error('Data cleaning failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanTheatreData };
