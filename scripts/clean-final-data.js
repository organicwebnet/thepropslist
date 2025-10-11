const fs = require('fs');

// Function to clean up the final theatre data
function cleanFinalData() {
    try {
        console.log('Loading theatre data with status...');
        
        // Read the JSON file with status
        const inputPath = 'data/uk-theatres-with-status.json';
        const rawData = fs.readFileSync(inputPath, 'utf8');
        const theatres = JSON.parse(rawData);
        
        console.log(`Found ${theatres.length} theatres`);
        
        // Clean up each theatre entry - keep only essential fields
        const cleanedTheatres = theatres.map(theatre => {
            // Keep only essential fields
            const cleanedTheatre = {
                name: theatre.name.replace(/\d+$/, '').trim(), // Remove trailing numbers
                address: theatre.address.replace(/^Address/, '').trim(), // Remove "Address" prefix
                status: theatre.status,
                isExtant: theatre.isExtant
            };
            
            return cleanedTheatre;
        });
        
        // Count by status
        const extantCount = cleanedTheatres.filter(t => t.isExtant).length;
        const closedCount = cleanedTheatres.filter(t => !t.isExtant).length;
        
        // Save cleaned data
        const outputPath = 'data/uk-theatres-final.json';
        fs.writeFileSync(outputPath, JSON.stringify(cleanedTheatres, null, 2));
        
        console.log(`\n=== FINAL CLEANED DATA ===`);
        console.log(`Total theatres: ${cleanedTheatres.length}`);
        console.log(`Extant (working): ${extantCount}`);
        console.log(`Closed/Demolished: ${closedCount}`);
        console.log(`Cleaned data saved to: ${outputPath}`);
        
        console.log('\n=== SAMPLE THEATRES ===');
        cleanedTheatres.slice(0, 10).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address}`);
            console.log(`   Status: ${theatre.status} (Extant: ${theatre.isExtant})`);
            console.log('');
        });
        
        // Show status breakdown
        const statusBreakdown = {};
        cleanedTheatres.forEach(theatre => {
            statusBreakdown[theatre.status] = (statusBreakdown[theatre.status] || 0) + 1;
        });
        
        console.log('\n=== STATUS BREAKDOWN ===');
        Object.entries(statusBreakdown).forEach(([status, count]) => {
            console.log(`${status}: ${count}`);
        });
        
        return cleanedTheatres;
        
    } catch (error) {
        console.error('Error cleaning final data:', error);
        throw error;
    }
}

// Run the cleaning function
if (require.main === module) {
    cleanFinalData()
        .then(() => {
            console.log('\nFinal data cleaning completed successfully!');
        })
        .catch((error) => {
            console.error('Final data cleaning failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanFinalData };
