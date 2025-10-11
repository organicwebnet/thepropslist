const fs = require('fs');
const path = require('path');

// Function to enhance theatre addresses with more specific information
function enhanceTheatreAddresses() {
    try {
        console.log('Enhancing theatre addresses...');
        
        // Read the combined theatre data
        const theatres = JSON.parse(fs.readFileSync('data/uk-all-theatres-complete.json', 'utf8'));
        console.log(`Loaded ${theatres.length} theatres`);
        
        // Enhanced address mapping for some well-known theatres
        const addressEnhancements = {
            "His Majesty's Theatre": "Rosemount Viaduct, Aberdeen, AB25 1GL, Scotland",
            "P&J Live": "East Burn Road, Aberdeen, AB21 9FX, Scotland",
            "Music Hall": "Union Street, Aberdeen, AB10 1QS, Scotland",
            "Aylesbury Waterside Theatre": "Exchange Street, Aylesbury, HP20 1UG, England",
            "Queen's Theatre": "Boutport Street, Barnstaple, EX31 1SY, England",
            "Theatre Royal": "Sawclose, Bath, BA1 1ET, England",
            "Forum": "1A Forum Buildings, Bath, BA1 5UG, England",
            "Grand Opera House": "Great Victoria Street, Belfast, BT2 7HR, Northern Ireland",
            "SSE Arena": "2 Queens Quay, Belfast, BT3 9QQ, Northern Ireland",
            "Forum Theatre": "The Causeway, Billingham, TS23 2LJ, England",
            "Alexandra Theatre": "Station Street, Birmingham, B5 4DS, England",
            "Hippodrome Theatre": "Hurst Street, Birmingham, B5 4TB, England",
            "The Rep Theatre": "Centenary Square, Birmingham, B1 2EP, England",
            "Utilita Arena": "King Edwards Road, Birmingham, B1 2AA, England",
            "Resorts World Arena": "Resorts World, Birmingham, B40 1NT, England",
            "Symphony Hall": "Broad Street, Birmingham, B1 2EA, England",
            "Winter Gardens": "97 Church Street, Blackpool, FY1 1HL, England",
            "Grand Theatre": "33 Church Street, Blackpool, FY1 1HT, England",
            "Opera House": "Church Street, Blackpool, FY1 1HT, England",
            "Pavilion Theatre": "Westover Road, Bournemouth, BH1 2BU, England",
            "Alhambra Theatre": "Morley Street, Bradford, BD7 1AJ, England",
            "St Georges Hall": "Bridge Street, Bradford, BD1 1JT, England",
            "Bradford Live": "Centenary Square, Bradford, BD1 1SD, England",
            "Theatre Royal": "New Road, Brighton, BN1 1SD, England",
            "Brighton Dome": "Church Street, Brighton, BN1 1UE, England",
            "Hippodrome Theatre": "St Augustine's Parade, Bristol, BS1 4UZ, England",
            "Bristol Old Vic": "King Street, Bristol, BS1 4ED, England",
            "Buxton Opera House": "Water Street, Buxton, SK17 6XN, England",
            "Cambridge Arts Theatre": "6 St Edward's Passage, Cambridge, CB2 3PJ, England",
            "Corn Exchange": "Wheeler Street, Cambridge, CB2 3QB, England",
            "The Marlowe Theatre": "The Friars, Canterbury, CT1 2AS, England",
            "New Theatre": "Park Place, Cardiff, CF10 3LN, Wales",
            "Wales Millennium Centre": "Bute Place, Cardiff, CF10 5AL, Wales",
            "Sherman Theatre": "Senghennydd Road, Cardiff, CF24 4YE, Wales",
            "The Sands Centre": "The Sands, Carlisle, CA1 1JQ, England",
            "Everyman Theatre": "Regent Street, Cheltenham, GL50 1HQ, England",
            "Cheltenham Town Hall": "Imperial Square, Cheltenham, GL50 1QA, England",
            "Storyhouse": "Hunter Street, Chester, CH1 2AR, England",
            "Festival Theatre": "Oaklands Park, Chichester, PO19 6AP, England",
            "Belgrade Theatre": "Belgrade Square, Coventry, CV1 1GS, England",
            "Hawth Theatre": "Hawth Avenue, Crawley, RH10 6YZ, England",
            "Lyceum Theatre": "Heath Street, Crewe, CW1 2DA, England",
            "Hippodrome": "Northgate, Darlington, DL1 1RR, England",
            "The Orchard Theatre": "Home Gardens, Dartford, DA1 1ED, England",
            "Millennium Forum Theatre and Conference Centre": "Newmarket Street, Derry, BT48 6EB, Northern Ireland",
            "Congress Theatre": "Carlisle Road, Eastbourne, BN21 4BP, England",
            "Devonshire Park Theatre": "Compton Street, Eastbourne, BN21 4BW, England",
            "Edinburgh Playhouse": "18-22 Greenside Place, Edinburgh, EH1 3AA, Scotland",
            "Festival Theatre": "13-29 Nicolson Street, Edinburgh, EH8 9FT, Scotland",
            "Usher Hall": "Lothian Road, Edinburgh, EH1 2EA, Scotland",
            "Fareham Live": "Osborn Road, Fareham, PO16 7DB, England",
            "Leas Cliff Hall": "The Leas, Folkestone, CT20 2DZ, England",
            "King's Theatre": "297 Bath Street, Glasgow, G2 4JN, Scotland",
            "Theatre Royal": "282 Hope Street, Glasgow, G2 3QA, Scotland",
            "Pavilion Theatre": "121 Renfield Street, Glasgow, G2 3AX, Scotland",
            "Ovo Hydro": "Exhibition Way, Glasgow, G3 8YW, Scotland",
            "Grimsby Auditorium": "Cromwell Road, Grimsby, DN31 2BH, England",
            "G Live": "London Road, Guildford, GU1 2AA, England",
            "Yvonne Arnaud Theatre": "Millbrook, Guildford, GU1 3UX, England",
            "White Rock Theatre": "White Rock, Hastings, TN34 1JX, England",
            "The Beck Theatre": "Grange Road, Hayes, UB3 2UE, England",
            "Wycombe Swan": "St Mary Street, High Wycombe, HP11 2AE, England",
            "New Theatre": "Kingston Square, Hull, HU1 3HF, England",
            "Connexin Live": "Myton Street, Hull, HU1 2PS, England",
            "Eden Court Theatre": "Bishops Road, Inverness, IV3 5SA, Scotland",
            "Regent Theatre": "3 St Helen's Street, Ipswich, IP4 1HE, England",
            "Corn Exchange": "King Street, Ipswich, IP1 1DH, England",
            "First Direct Arena": "Arena Way, Leeds, LS2 8BY, England",
            "Grand Theatre": "46 New Briggate, Leeds, LS1 6NU, England",
            "Leeds Playhouse": "Playhouse Square, Leeds, LS2 7UP, England",
            "Curve Theatre": "Rutland Street, Leicester, LE1 1SB, England",
            "De Montfort Hall": "Granville Road, Leicester, LE1 7RU, England",
            "Empire Theatre": "Lime Street, Liverpool, L1 1JE, England",
            "Playhouse Theatre": "Williamson Square, Liverpool, L1 1EL, England",
            "Everyman Theatre": "Hope Street, Liverpool, L1 9BH, England",
            "M&S Bank Arena": "Kings Dock, Liverpool, L3 4FP, England",
            "Philharmonic Hall": "Hope Street, Liverpool, L1 9BP, England",
            "Venue Cymru": "Promenade, Llandudno, LL30 1BB, Wales",
            "Malvern Theatres": "Grange Road, Malvern, WR14 3HB, England",
            "AO Arena": "Victoria Station, Manchester, M3 1AR, England",
            "Opera House": "3 Quay Street, Manchester, M3 3HP, England",
            "Palace Theatre": "Oxford Street, Manchester, M1 6FT, England",
            "Home": "2 Tony Wilson Place, Manchester, M15 4FN, England",
            "Bridgewater Hall": "Lower Mosley Street, Manchester, M2 3WS, England",
            "Milton Keynes Theatre": "500 Marlborough Gate, Milton Keynes, MK9 3NZ, England",
            "Floral Pavilion Theatre": "Marine Promenade, New Brighton, CH45 2JS, England",
            "Watermill Theatre": "Bagnor, Newbury, RG20 8AE, England",
            "Utilita Arena": "Arena Way, Newcastle upon Tyne, NE4 7NA, England",
            "Theatre Royal": "100 Grey Street, Newcastle upon Tyne, NE1 6BR, England",
            "City Hall": "Northumberland Road, Newcastle upon Tyne, NE1 8SF, England",
            "Royal and Derngate": "Guildhall Road, Northampton, NN1 1DP, England",
            "Theatre Royal": "Theatre Street, Norwich, NR2 1RL, England",
            "Motorpoint Arena": "Bolero Square, Nottingham, NG1 5LA, England",
            "Theatre Royal & Concert Hall": "Theatre Square, Nottingham, NG1 5AF, England",
            "Playhouse Theatre": "Wellington Circus, Nottingham, NG1 5AF, England",
            "New Theatre": "George Street, Oxford, OX1 2AG, England",
            "Playhouse Theatre": "Beaumont Street, Oxford, OX1 2LW, England",
            "New Theatre": "Broadway, Peterborough, PE1 1RT, England",
            "Theatre Royal": "Royal Parade, Plymouth, PL1 2TR, England",
            "Pavilions": "Millbay Road, Plymouth, PL1 3LF, England",
            "Lighthouse": "21 Kingland Road, Poole, BH15 1UG, England",
            "King's Theatre": "Albert Road, Portsmouth, PO5 2QJ, England",
            "Guildhall": "Guildhall Square, Portsmouth, PO1 2AB, England",
            "Granville Theatre": "Victoria Parade, Ramsgate, CT11 8DG, England",
            "Saffron Hall": "Audley End Road, Saffron Walden, CB11 4UH, England",
            "The Lowry": "Pier 8, Salford Quays, Salford, M50 3AZ, England",
            "Utilita Arena": "Broughton Lane, Sheffield, S9 2DF, England",
            "Crucible Theatre": "55 Norfolk Street, Sheffield, S1 1DA, England",
            "Lyceum Theatre": "55 Norfolk Street, Sheffield, S1 1DA, England",
            "Sheffield City Hall": "Barker's Pool, Sheffield, S1 2JA, England",
            "Theatre Severn": "Frankwell Quay, Shrewsbury, SY3 8FT, England",
            "Mayflower Theatre": "Commercial Road, Southampton, SO15 1GE, England",
            "Cliffs Pavilion": "Station Road, Southend-on-Sea, SS0 7RA, England",
            "Palace Theatre": "Clarence Road, Southend-on-Sea, SS1 1BA, England",
            "Globe Theatre": "High Street, Stockton-on-Tees, TS18 1AT, England",
            "Regent Theatre": "Piccadilly, Stoke-on-Trent, ST1 1AP, England",
            "Victoria Hall": "Bagnall Street, Stoke-on-Trent, ST1 3AD, England",
            "Royal Shakespeare Theatre": "Waterside, Stratford-upon-Avon, CV37 6BB, England",
            "Empire Theatre": "High Street West, Sunderland, SR1 3EX, England",
            "Swansea Arena | Arena Abertawe": "Oystermouth Road, Swansea, SA1 3BX, Wales",
            "Grand Theatre": "Singleton Street, Swansea, SA1 3QJ, Wales",
            "Wyvern Theatre": "Theatre Square, Swindon, SN1 1QN, England",
            "The Arts Centre": "Devizes Road, Swindon, SN1 4BJ, England",
            "Princess Theatre": "Torbay Road, Torquay, TQ2 5EZ, England",
            "Hall for Cornwall": "Back Quay, Truro, TR1 2LL, England",
            "Theatre Royal": "Thames Street, Windsor, SL4 1PS, England",
            "New Victoria Theatre": "The Ambassadors, Woking, GU21 6GQ, England",
            "Rhoda McGaw Theatre": "The Ambassadors, Woking, GU21 6GQ, England",
            "Grand Theatre": "Lichfield Street, Wolverhampton, WV1 1DE, England",
            "Connaught Theatre & Studio": "Union Place, Worthing, BN11 1LG, England",
            "Assembly Hall": "Stoke Abbott Road, Worthing, BN11 1HQ, England",
            "Pavilion Theatre": "Marine Parade, Worthing, BN11 3PX, England",
            "Westlands Entertainment Venue": "Westland Road, Yeovil, BA20 2DD, England",
            "Grand Opera House": "Clifford Street, York, YO1 9SW, England",
            "Theatre Royal": "St Leonard's Place, York, YO1 7HD, England",
            "Barbican": "Paragon Street, York, YO10 4NT, England"
        };
        
        // Enhance addresses
        const enhancedTheatres = theatres.map(theatre => {
            const enhancedTheatre = { ...theatre };
            
            // If we have an enhanced address for this theatre, use it
            if (addressEnhancements[theatre.name]) {
                enhancedTheatre.address = addressEnhancements[theatre.name];
            }
            
            return enhancedTheatre;
        });
        
        // Count enhanced addresses
        const enhancedCount = enhancedTheatres.filter(t => addressEnhancements[t.name]).length;
        
        console.log(`Enhanced ${enhancedCount} theatre addresses`);
        
        // Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save enhanced data
        const outputPath = path.join(outputDir, 'uk-theatres-enhanced-addresses.json');
        fs.writeFileSync(outputPath, JSON.stringify(enhancedTheatres, null, 2));
        
        console.log(`\n=== ENHANCED THEATRE ADDRESSES ===`);
        console.log(`Total theatres: ${enhancedTheatres.length}`);
        console.log(`Enhanced addresses: ${enhancedCount}`);
        console.log(`Data saved to: ${outputPath}`);
        
        console.log('\nSample theatres with enhanced addresses:');
        enhancedTheatres.filter(t => addressEnhancements[t.name]).slice(0, 10).forEach((theatre, index) => {
            console.log(`${index + 1}. ${theatre.name}`);
            console.log(`   Address: ${theatre.address}`);
            console.log('');
        });
        
        return enhancedTheatres;
        
    } catch (error) {
        console.error('Error enhancing theatre addresses:', error);
        throw error;
    }
}

// Run the enhancement
if (require.main === module) {
    enhanceTheatreAddresses();
    console.log('\nAddress enhancement completed successfully!');
}

module.exports = { enhanceTheatreAddresses };
