const fs = require('fs');

// Read the existing data
const theatres = JSON.parse(fs.readFileSync('data/uk-theatres.json', 'utf8'));

console.log(`Total theatres in database: ${theatres.length}`);
console.log('\n=== WORKING THEATRES WITH ADDRESSES ===\n');

let workingCount = 0;

theatres.forEach((theatre, index) => {
    // Clean up the data
    const name = theatre.name.replace(/\d+$/, '').trim();
    const address = theatre.address.replace(/^Address/, '').trim();
    const website = theatre.website;
    
    // Only show theatres that have addresses (likely working)
    if (address && address.length > 10) {
        workingCount++;
        console.log(`${workingCount}. ${name}`);
        console.log(`   Address: ${address}`);
        console.log(`   Website: ${website || 'Not available'}`);
        console.log(`   Source: ${theatre.sourceUrl}`);
        console.log('');
    }
});

console.log(`\nFound ${workingCount} theatres with complete addresses (likely working)`);
