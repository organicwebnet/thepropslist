const fs = require('fs');
const path = require('path');

// Function to extract theatres from West End Theatre list
function extractWestEndTheatres() {
    try {
        console.log('Extracting theatres from West End Theatre list...');
        
        // Based on the search results, here are the theatres with their locations
        const theatreData = [
            { name: "His Majesty's Theatre", location: "Aberdeen" },
            { name: "P&J Live", location: "Aberdeen" },
            { name: "Music Hall", location: "Aberdeen" },
            { name: "Aylesbury Waterside Theatre", location: "Aylesbury" },
            { name: "Queen's Theatre", location: "Barnstaple" },
            { name: "Theatre Royal", location: "Bath" },
            { name: "Forum", location: "Bath" },
            { name: "Grand Opera House", location: "Belfast" },
            { name: "SSE Arena", location: "Belfast" },
            { name: "Forum Theatre", location: "Billingham" },
            { name: "Alexandra Theatre", location: "Birmingham" },
            { name: "Hippodrome Theatre", location: "Birmingham" },
            { name: "The Rep Theatre", location: "Birmingham" },
            { name: "Utilita Arena", location: "Birmingham" },
            { name: "Resorts World Arena", location: "Birmingham" },
            { name: "Symphony Hall", location: "Birmingham" },
            { name: "Winter Gardens", location: "Blackpool" },
            { name: "Grand Theatre", location: "Blackpool" },
            { name: "Opera House", location: "Blackpool" },
            { name: "Pavilion Theatre", location: "Bournemouth" },
            { name: "Alhambra Theatre", location: "Bradford" },
            { name: "St Georges Hall", location: "Bradford" },
            { name: "Bradford Live", location: "Bradford" },
            { name: "Theatre Royal", location: "Brighton" },
            { name: "Brighton Dome", location: "Brighton" },
            { name: "Hippodrome Theatre", location: "Bristol" },
            { name: "Bristol Old Vic", location: "Bristol" },
            { name: "Buxton Opera House", location: "Buxton" },
            { name: "Cambridge Arts Theatre", location: "Cambridge" },
            { name: "Corn Exchange", location: "Cambridge" },
            { name: "The Marlowe Theatre", location: "Canterbury" },
            { name: "New Theatre", location: "Cardiff" },
            { name: "Wales Millennium Centre", location: "Cardiff" },
            { name: "Sherman Theatre", location: "Cardiff" },
            { name: "The Sands Centre", location: "Carlisle" },
            { name: "Everyman Theatre", location: "Cheltenham" },
            { name: "Cheltenham Town Hall", location: "Cheltenham" },
            { name: "Storyhouse", location: "Chester" },
            { name: "Festival Theatre", location: "Chichester" },
            { name: "Belgrade Theatre", location: "Coventry" },
            { name: "Hawth Theatre", location: "Crawley" },
            { name: "Lyceum Theatre", location: "Crewe" },
            { name: "Hippodrome", location: "Darlington" },
            { name: "The Orchard Theatre", location: "Dartford" },
            { name: "Millennium Forum Theatre and Conference Centre", location: "Derry" },
            { name: "Congress Theatre", location: "Eastbourne" },
            { name: "Devonshire Park Theatre", location: "Eastbourne" },
            { name: "Edinburgh Playhouse", location: "Edinburgh" },
            { name: "Festival Theatre", location: "Edinburgh" },
            { name: "Usher Hall", location: "Edinburgh" },
            { name: "Fareham Live", location: "Fareham" },
            { name: "Leas Cliff Hall", location: "Folkestone" },
            { name: "King's Theatre", location: "Glasgow" },
            { name: "Theatre Royal", location: "Glasgow" },
            { name: "Pavilion Theatre", location: "Glasgow" },
            { name: "Ovo Hydro", location: "Glasgow" },
            { name: "Grimsby Auditorium", location: "Grimsby" },
            { name: "G Live", location: "Guildford" },
            { name: "Yvonne Arnaud Theatre", location: "Guildford" },
            { name: "White Rock Theatre", location: "Hastings" },
            { name: "The Beck Theatre", location: "Hayes" },
            { name: "Wycombe Swan", location: "High Wycombe" },
            { name: "New Theatre", location: "Hull" },
            { name: "Connexin Live", location: "Hull" },
            { name: "Eden Court Theatre", location: "Inverness" },
            { name: "Regent Theatre", location: "Ipswich" },
            { name: "Corn Exchange", location: "Ipswich" },
            { name: "First Direct Arena", location: "Leeds" },
            { name: "Grand Theatre", location: "Leeds" },
            { name: "Leeds Playhouse", location: "Leeds" },
            { name: "Curve Theatre", location: "Leicester" },
            { name: "De Montfort Hall", location: "Leicester" },
            { name: "Empire Theatre", location: "Liverpool" },
            { name: "Playhouse Theatre", location: "Liverpool" },
            { name: "Everyman Theatre", location: "Liverpool" },
            { name: "M&S Bank Arena", location: "Liverpool" },
            { name: "Philharmonic Hall", location: "Liverpool" },
            { name: "Venue Cymru", location: "Llandudno" },
            { name: "Malvern Theatres", location: "Malvern" },
            { name: "AO Arena", location: "Manchester" },
            { name: "Opera House", location: "Manchester" },
            { name: "Palace Theatre", location: "Manchester" },
            { name: "Home", location: "Manchester" },
            { name: "Bridgewater Hall", location: "Manchester" },
            { name: "Milton Keynes Theatre", location: "Milton Keynes" },
            { name: "Floral Pavilion Theatre", location: "New Brighton" },
            { name: "Watermill Theatre", location: "Newbury" },
            { name: "Utilita Arena", location: "Newcastle" },
            { name: "Theatre Royal", location: "Newcastle" },
            { name: "City Hall", location: "Newcastle upon Tyne" },
            { name: "Royal and Derngate", location: "Northampton" },
            { name: "Theatre Royal", location: "Norwich" },
            { name: "Motorpoint Arena", location: "Nottingham" },
            { name: "Theatre Royal & Concert Hall", location: "Nottingham" },
            { name: "Playhouse Theatre", location: "Nottingham" },
            { name: "New Theatre", location: "Oxford" },
            { name: "Playhouse Theatre", location: "Oxford" },
            { name: "New Theatre", location: "Peterborough" },
            { name: "Theatre Royal", location: "Plymouth" },
            { name: "Pavilions", location: "Plymouth" },
            { name: "Lighthouse", location: "Poole" },
            { name: "King's Theatre", location: "Portsmouth" },
            { name: "Guildhall", location: "Portsmouth" },
            { name: "Granville Theatre", location: "Ramsgate" },
            { name: "Saffron Hall", location: "Saffron Walden" },
            { name: "The Lowry", location: "Salford" },
            { name: "Utilita Arena", location: "Sheffield" },
            { name: "Crucible Theatre", location: "Sheffield" },
            { name: "Lyceum Theatre", location: "Sheffield" },
            { name: "Sheffield City Hall", location: "Sheffield" },
            { name: "Theatre Severn", location: "Shrewsbury" },
            { name: "Mayflower Theatre", location: "Southampton" },
            { name: "Cliffs Pavilion", location: "Southend-on-Sea" },
            { name: "Palace Theatre", location: "Southend-on-Sea" },
            { name: "Globe Theatre", location: "Stockton-on-Tees" },
            { name: "Regent Theatre", location: "Stoke-on-Trent" },
            { name: "Victoria Hall", location: "Stoke-on-Trent" },
            { name: "Royal Shakespeare Theatre", location: "Stratford-upon-Avon" },
            { name: "Empire Theatre", location: "Sunderland" },
            { name: "Swansea Arena | Arena Abertawe", location: "Swansea" },
            { name: "Grand Theatre", location: "Swansea" },
            { name: "Wyvern Theatre", location: "Swindon" },
            { name: "The Arts Centre", location: "Swindon" },
            { name: "Princess Theatre", location: "Torquay" },
            { name: "Hall for Cornwall", location: "Truro" },
            { name: "Theatre Royal", location: "Windsor" },
            { name: "New Victoria Theatre", location: "Woking" },
            { name: "Rhoda McGaw Theatre", location: "Woking" },
            { name: "Grand Theatre", location: "Wolverhampton" },
            { name: "Connaught Theatre & Studio", location: "Worthing" },
            { name: "Assembly Hall", location: "Worthing" },
            { name: "Pavilion Theatre", location: "Worthing" },
            { name: "Westlands Entertainment Venue", location: "Yeovil" },
            { name: "Grand Opera House", location: "York" },
            { name: "Theatre Royal", location: "York" },
            { name: "Barbican", location: "York" }
        ];
        
        // Convert to the format we want with name and address
        const theatres = theatreData.map(theatre => ({
            name: theatre.name,
            address: theatre.location,
            status: 'Operating',
            isExtant: true,
            source: 'West End Theatre (https://www.westendtheatre.com/theatres/uk-ireland-regional-theatres/)'
        }));
        
        console.log(`Extracted ${theatres.length} operating theatres from West End Theatre`);
        
        // Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save to JSON file
        const outputPath = path.join(outputDir, 'uk-theatres-with-locations.json');
        fs.writeFileSync(outputPath, JSON.stringify(theatres, null, 2));
        
        console.log(`\n=== UK THEATRES WITH LOCATIONS ===`);
        console.log(`Total theatres: ${theatres.length}`);
        console.log(`Data saved to: ${outputPath}`);
        
        console.log('\nSample theatres with locations:');
        theatres.slice(0, 15).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}, ${theatre.address}`);
        });
        
        console.log('\n... and many more!');
        
        // Show location breakdown
        const locationCount = {};
        theatres.forEach(theatre => {
            locationCount[theatre.address] = (locationCount[theatre.address] || 0) + 1;
        });
        
        console.log('\n=== LOCATIONS WITH MOST THEATRES ===');
        const sortedLocations = Object.entries(locationCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        sortedLocations.forEach(([location, count]) => {
            console.log(`${location}: ${count} theatres`);
        });
        
        return theatres;
        
    } catch (error) {
        console.error('Error extracting West End Theatre venues:', error);
        throw error;
    }
}

// Run the extraction
if (require.main === module) {
    extractWestEndTheatres();
    console.log('\nWest End Theatre venue extraction completed successfully!');
}

module.exports = { extractWestEndTheatres };
