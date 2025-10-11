const fs = require('fs');
const path = require('path');

// Function to extract London theatres from West End Theatre list
function extractLondonTheatres() {
    try {
        console.log('Extracting London theatres from West End Theatre list...');
        
        // Based on the search results, here are the London theatres with their full addresses
        const londonTheatres = [
            { name: "@sohoplace Theatre", address: "4 Soho Place, London, W1D 3BG, United Kingdom" },
            { name: "1 America Square", address: "1 America Square, London, EC3N 2LS, United Kingdom" },
            { name: "56 Davies Street", address: "56 Davies Street, London, W1K 5HR, United Kingdom" },
            { name: "ABBA Arena", address: "Pudding Mill Lane, London, E15 2PJ, United Kingdom" },
            { name: "Actors Church Covent Garden", address: "Bedford St, London WC2E 9ED, London, WC2E 9ED, United Kingdom" },
            { name: "Adelphi Theatre", address: "Strand, London, WC2E 7NA, United Kingdom" },
            { name: "Aldwych Theatre", address: "49 Aldwych, London, WC2B 4DF, United Kingdom" },
            { name: "Alexandra Palace Theatre", address: "Alexandra Palace Way , London, N22 7AY, United Kingdom" },
            { name: "Almeida Theatre", address: "Almeida Street, London, N1 1TA, United Kingdom" },
            { name: "Ambassadors Theatre", address: "West Street, London, WC2H 9ND, United Kingdom" },
            { name: "Apollo Theatre", address: "Shaftesbury Avenue, London, W1D 7ES, United Kingdom" },
            { name: "Apollo Victoria Theatre", address: "17 Wilton Road, London, SW1V 1LL, United Kingdom" },
            { name: "Arches Lane Theatre", address: "Arches Lane Circus West Village, London, SW11 8AB, United Kingdom" },
            { name: "Arches London Bridge", address: "8 Bermondsey Street, London, SE12ER, United Kingdom" },
            { name: "Arcola Theatre", address: "24 Ashwin Street , London, E8 3DL, United Kingdom" },
            { name: "Arts Theatre", address: "6-7 Great Newport Street, London, WC2H 7JB, United Kingdom" },
            { name: "Barbican Theatre", address: "Silk Street, London, EC2Y 8DS, United Kingdom" },
            { name: "Belle Livingstone's 58th Street Country Club", address: "133 Copeland Road, London, SE15 3SN, United Kingdom" },
            { name: "Bloomsbury Theatre", address: "15 Gordon Street , London, WC1H 0AH, United Kingdom" },
            { name: "Bridge Theatre", address: "3 Potters Fields Park, London, SE1 2SG, United Kingdom" },
            { name: "Brixton House", address: "385 Coldharbour, London, SW9 8GL, United Kingdom" },
            { name: "Bush Theatre", address: "7 Uxbridge Road, London, W12 8LJ, United Kingdom" },
            { name: "Cadogan Hall", address: "5 Sloane Terrace, London, SW1X 9DQ, United Kingdom" },
            { name: "Cambridge Theatre", address: "32-34 Earlham Street, London, WC2 9HU, United Kingdom" },
            { name: "Camden Garrison", address: "North Yard, Camden Stables, Chalk Farm Road, London, NW1 8AH, United Kingdom" },
            { name: "Capital Theatre", address: "Ariel Way, London, W12 7SL, United Kingdom" },
            { name: "Charing Cross Theatre", address: "The Arches, Villiers Street, London, WC2N 6NL, United Kingdom" },
            { name: "Churchill Theatre Bromley", address: "High Street Bromley, London, BR1 1HA, United Kingdom" },
            { name: "Coronet Theatre", address: "103 Notting Hill Gate, London, W11 3LB, United Kingdom" },
            { name: "County Hall", address: "Belvedere Road, London, SE1 7PB, United Kingdom" },
            { name: "Criterion Theatre", address: "Piccadilly Circus, London, SW1Y 4XA, United Kingdom" },
            { name: "Deptford Storehouse", address: "Off New King Street, Grove Street, London, SE8 3AA, United Kingdom" },
            { name: "Dock X", address: "Surrey Quays Road, London, SE16 2XU, United Kingdom" },
            { name: "Dominion Theatre", address: "268-269 Tottenham Court Road, London, W1T 7AQ, United Kingdom" },
            { name: "Donmar Warehouse", address: "41 Earlham Street, London, WC2H 9LX, United Kingdom" },
            { name: "Doyle's Opticians W12 Shopping", address: "Ground Floor, W12 Shopping, Shepherd's Bush, London, W12 8PP, United Kingdom" },
            { name: "Duchess Theatre", address: "3-5 Catherine Street, London, WC2B 5LA, United Kingdom" },
            { name: "Duke of York's Theatre", address: "45 St Martin's Lane, London, WC2N 4BG, United Kingdom" },
            { name: "Emerald Theatre", address: "8 Victoria Embankment, London, WC2R 2AB, United Kingdom" },
            { name: "Empress Museum", address: "Empress Space, London, SW6 1TT, United Kingdom" },
            { name: "Eventim Apollo", address: "2 Queen Caroline Street, London, W6 9QH, United Kingdom" },
            { name: "Evolution", address: "Battersea Park, Queenstown Rd, Chelsea Bridge, London, SW11 4NJ, United Kingdom" },
            { name: "Fortune Theatre", address: "Russell Street, London, WC2B 5HH, United Kingdom" },
            { name: "Garrick Theatre", address: "2 Charing Cross Road, London, WC2H 0HH, United Kingdom" },
            { name: "Gate Theatre", address: "26 Crowndale Road , London, NW1 1TT, United Kingdom" },
            { name: "Gielgud Theatre", address: "35-37 Shaftesbury Avenue, London, W1D 6AR, United Kingdom" },
            { name: "Gillian Lynne Theatre", address: "166 Drury Lane, London, WC2B 5PW, United Kingdom" },
            { name: "Greenwich Theatre", address: "Crooms Hill , London, SE10 8ES, United Kingdom" },
            { name: "Hackney Empire", address: "291 Mare Street, London, E8 1EJ, United Kingdom" },
            { name: "Hackney Town Hall", address: "Mare Street, London, E8 1EA, United Kingdom" },
            { name: "Hallmark Building", address: "56 Leadenhall Street, London, EC3A 2DX, United Kingdom" },
            { name: "Hampstead Theatre", address: "Eton Avenue, Swiss Cottage, London, NW3 3EU, United Kingdom" },
            { name: "Harold Pinter Theatre", address: "6 Panton Street, London, SW1Y 4DN, United Kingdom" },
            { name: "HERE at Outernet", address: "Charing Cross Road, London, WC2H 8LH, United Kingdom" },
            { name: "The Theatre, Hippodrome Casino", address: "Cranbourn Street, London, WC2H 7JH, United Kingdom" },
            { name: "His Majesty's Theatre", address: "Haymarket, London, SW1Y 4QL, United Kingdom" },
            { name: "Immerse LDN", address: "ExCeL Waterfront ExCel London, London, E16 1XL, United Kingdom" },
            { name: "Kiln Theatre", address: "269 Kilburn High Road, London, NW6 7JR, United Kingdom" },
            { name: "King's Head Theatre", address: "115 Upper Street, London, N1 1QN, United Kingdom" },
            { name: "Leicester Square Theatre", address: "6 Leicester Place, London, WC2H 7BX, United Kingdom" },
            { name: "London Coliseum", address: "St Martin's Lane, London, WC2N 4ES, United Kingdom" },
            { name: "London Palladium", address: "8 Argyll Street, London, W1F 7TF, United Kingdom" },
            { name: "Lyceum Theatre", address: "21 Wellington Street, London, WC2E 7RQ, United Kingdom" },
            { name: "Lyric Hammersmith Theatre", address: "Lyric Square, King Street, London, W6 0QL, United Kingdom" },
            { name: "Lyric Theatre", address: "29 Shaftesbury Avenue, London, W1D 7ES, United Kingdom" },
            { name: "Menier Chocolate Factory", address: "51-53 Southwark Street, London, SE1 1RU, United Kingdom" },
            { name: "National Theatre", address: "South Bank, London, SE1 9PX, United Kingdom" },
            { name: "New Wimbledon Theatre", address: "The Broadway, London, SW19 1QG, United Kingdom" },
            { name: "Novello Theatre", address: "Aldwych, London, WC2B 4LD, United Kingdom" },
            { name: "Old Vic Theatre", address: "The Cut, London, SE1 8NB, United Kingdom" },
            { name: "Open Air Theatre", address: "Inner Circle, Regent's Park, London, NW1 4NU, United Kingdom" },
            { name: "Other Palace", address: "12 Palace Street, London, SW1E 5JA, United Kingdom" },
            { name: "Palace Theatre", address: "113 Shaftesbury Avenue, London, W1D 5AY, United Kingdom" },
            { name: "Peacock Theatre", address: "Portugal Street, London, WC2A 2HT, United Kingdom" },
            { name: "Phoenix Theatre", address: "110 Charing Cross Road, London, WC2H 0JP, United Kingdom" },
            { name: "Piccadilly Theatre", address: "16 Denman Street, London, W1D 7DY, United Kingdom" },
            { name: "Playhouse Theatre", address: "Northumberland Avenue, London, WC2N 5DE, United Kingdom" },
            { name: "Prince Edward Theatre", address: "Old Compton Street, London, W1D 4HS, United Kingdom" },
            { name: "Prince of Wales Theatre", address: "31 Coventry Street, London, W1D 6AS, United Kingdom" },
            { name: "Queen's Theatre", address: "51 Shaftesbury Avenue, London, W1D 6BA, United Kingdom" },
            { name: "Richmond Theatre", address: "The Green, London, TW9 1QJ, United Kingdom" },
            { name: "Rose Theatre", address: "24-26 High Street, London, KT1 1HL, United Kingdom" },
            { name: "Royal Court Theatre", address: "Sloane Square, London, SW1W 8AS, United Kingdom" },
            { name: "Royal Opera House", address: "Bow Street, London, WC2E 9DD, United Kingdom" },
            { name: "Sadler's Wells Theatre", address: "Rosebery Avenue, London, EC1R 4TN, United Kingdom" },
            { name: "Savoy Theatre", address: "Strand, London, WC2R 0ET, United Kingdom" },
            { name: "Shakespeare's Globe", address: "21 New Globe Walk, London, SE1 9DT, United Kingdom" },
            { name: "Soho Theatre", address: "21 Dean Street, London, W1D 3NE, United Kingdom" },
            { name: "Sondheim Theatre", address: "51 Shaftesbury Avenue, London, W1D 6BA, United Kingdom" },
            { name: "Southwark Playhouse Borough", address: "77-85 Newington Causeway, London, SE1 6BD, United Kingdom" },
            { name: "Southwark Playhouse Elephant", address: "Dante Place, 80 Newington Butts, London, SE11 4FL, United Kingdom" },
            { name: "St Martin's Theatre", address: "West Street, London, WC2H 9NZ, United Kingdom" },
            { name: "Stage Door Theatre", address: "Prince of Wales Pub 150-151 Drury Lane, London, WC2B 5TD, United Kingdom" },
            { name: "The Comedy Store", address: "1a Oxendon Street, London, SW1Y 4EE, United Kingdom" },
            { name: "The Crown", address: "213-215 Tottenham Court Road, London, W1T 7PS, United Kingdom" },
            { name: "The Lost Estate", address: "7-9 Beaumont Avenue , London, W14 9LP, United Kingdom" },
            { name: "The Old Bauble Factory", address: "1 Launcelot Street , London, SE1 7AD, United Kingdom" },
            { name: "The Other Palace", address: "12 Palace Street, London, SW1E 5JA, United Kingdom" },
            { name: "The Truman Brewery", address: "91 Brick Lane, London, United Kingdom, , London, E1 6QR, United Kingdom" },
            { name: "The Vaults Theatre", address: "Launcelot Street, London, SE1 7AD, United Kingdom" },
            { name: "Yard Theatre", address: "Unit 2a Queen's Yard Hackney Wick, London, E9 5EN, United Kingdom" },
            { name: "Theatre on Kew", address: "Royal Botanic Gardens, London, TW9 3AE, United Kingdom" },
            { name: "Theatre Royal Drury Lane", address: "Catherine Street, London, WC2B 5JF, United Kingdom" },
            { name: "Theatre Royal Haymarket", address: "8 Haymarket, London, SW1Y 4HT, United Kingdom" },
            { name: "Theatre Royal Stratford East", address: "Gerry Raffles Square, London, E15 1BN, United Kingdom" },
            { name: "Tower Bridge Quay", address: "St Katharine's Way, London, E1W 1LD, United Kingdom" },
            { name: "Tower Vaults", address: "8-12 Tower Hill Vaults, London , London, EC3N 4EE, United Kingdom" },
            { name: "Trafalgar Theatre", address: "14 Whitehall, London, SW1A 2DY, United Kingdom" },
            { name: "Troubadour Canary Wharf Theatre", address: "Charter Street, Canary Wharf, London, E14, United Kingdom" },
            { name: "Troubadour Wembley Park Theatre", address: "1 Fulton Road, London, HA9 8TS, United Kingdom" },
            { name: "Tuff Nutt Jazz Club", address: "Southbank Centre, Belvedere Road, London, SE1 8XX, United Kingdom" },
            { name: "Turbine Theatre", address: "Arches Lane, Circus West Village, London, SW11 8AB, United Kingdom" },
            { name: "Underbelly Boulevard", address: "6 Walker's Court, London, W1F 0BT, United Kingdom" },
            { name: "Underbelly Festival Cavendish Square", address: "Cavendish Square Gardens, London, W1G 0AN, United Kingdom" },
            { name: "Union Theatre", address: "Old Union Arches, 229 Union Street, London, SE1 0LR, United Kingdom" },
            { name: "Upstairs at the Gatehouse", address: "1 North Road, London, N6 4BD, United Kingdom" },
            { name: "Vaudeville Theatre", address: "404 Strand, London, WC2R 0NH, United Kingdom" },
            { name: "Victoria Palace Theatre", address: "Victoria Street, London, SW1E 5EA, United Kingdom" },
            { name: "Waterloo East Theatre", address: "Brad Street, London, SE1 8TN, United Kingdom" },
            { name: "Wilton's Music Hall", address: "1 Graces Alley , London, E1 8JB, United Kingdom" },
            { name: "Wonderville", address: "57-60 Haymarket, London, SW1Y 4QX, United Kingdom" },
            { name: "Woolwich Works", address: "11 No. 1 Street, London, SE18 6HD, United Kingdom" },
            { name: "Wyndham's Theatre", address: "32-36 Charing Cross Road, London, WC2H 0DA, United Kingdom" },
            { name: "Young Vic Theatre", address: "66 The Cut, London, SE1 8LZ, United Kingdom" }
        ];
        
        // Convert to the format we want
        const theatres = londonTheatres.map(theatre => ({
            name: theatre.name,
            address: theatre.address,
            status: 'Operating',
            isExtant: true,
            source: 'West End Theatre London (https://www.westendtheatre.com/theatres/london-theatres-a-z-listing/)'
        }));
        
        console.log(`Extracted ${theatres.length} London theatres from West End Theatre`);
        
        // Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save to JSON file
        const outputPath = path.join(outputDir, 'london-theatres-with-addresses.json');
        fs.writeFileSync(outputPath, JSON.stringify(theatres, null, 2));
        
        console.log(`\n=== LONDON THEATRES WITH ADDRESSES ===`);
        console.log(`Total London theatres: ${theatres.length}`);
        console.log(`Data saved to: ${outputPath}`);
        
        console.log('\nSample London theatres with full addresses:');
        theatres.slice(0, 15).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address}`);
        });
        
        console.log('\n... and many more!');
        
        return theatres;
        
    } catch (error) {
        console.error('Error extracting London theatres:', error);
        throw error;
    }
}

// Run the extraction
if (require.main === module) {
    extractLondonTheatres();
    console.log('\nLondon theatre extraction completed successfully!');
}

module.exports = { extractLondonTheatres };
