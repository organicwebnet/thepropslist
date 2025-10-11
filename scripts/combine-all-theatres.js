const fs = require('fs');
const path = require('path');

// Function to combine all theatre data
function combineAllTheatres() {
    try {
        console.log('Combining all theatre data...');
        
        // Read regional UK theatres
        const regionalTheatres = JSON.parse(fs.readFileSync('data/uk-theatres-with-locations.json', 'utf8'));
        console.log(`Loaded ${regionalTheatres.length} regional UK theatres`);
        
        // Read London theatres
        const londonTheatres = JSON.parse(fs.readFileSync('data/london-theatres-with-addresses.json', 'utf8'));
        console.log(`Loaded ${londonTheatres.length} London theatres`);
        
        // Combine all theatres
        const allTheatres = [...regionalTheatres, ...londonTheatres];
        
        console.log(`\nCombined total: ${allTheatres.length} theatres`);
        
        // Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save combined data
        const outputPath = path.join(outputDir, 'uk-all-theatres-complete.json');
        fs.writeFileSync(outputPath, JSON.stringify(allTheatres, null, 2));
        
        console.log(`\n=== COMPLETE UK THEATRES DATABASE ===`);
        console.log(`Total theatres: ${allTheatres.length}`);
        console.log(`Regional UK theatres: ${regionalTheatres.length}`);
        console.log(`London theatres: ${londonTheatres.length}`);
        console.log(`Data saved to: ${outputPath}`);
        
        console.log('\nSample of complete database:');
        allTheatres.slice(0, 20).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address}`);
            console.log(`   Status: ${theatre.status}`);
            console.log('');
        });
        
        console.log('... and many more!');
        
        return allTheatres;
        
    } catch (error) {
        console.error('Error combining theatre data:', error);
        throw error;
    }
}

// Run the combination
if (require.main === module) {
    combineAllTheatres();
    console.log('\nTheatre data combination completed successfully!');
}

module.exports = { combineAllTheatres };
