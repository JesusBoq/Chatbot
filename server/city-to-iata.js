export const CITY_TO_IATA = {
  // Estados Unidos
  'nueva york': 'JFK', 'new york': 'JFK', 'nyc': 'JFK', 'manhattan': 'JFK', 'ny': 'JFK',
  'los angeles': 'LAX', 'la': 'LAX', 'los angeles': 'LAX',
  'san francisco': 'SFO', 'sf': 'SFO',
  'chicago': 'ORD',
  'miami': 'MIA',
  'boston': 'BOS',
  'washington': 'IAD', 'dc': 'IAD', 'washington dc': 'IAD',
  'seattle': 'SEA',
  'atlanta': 'ATL',
  'houston': 'IAH',
  'dallas': 'DFW',
  'philadelphia': 'PHL',
  'phoenix': 'PHX',
  'usa': 'JFK', 'united states': 'JFK', 'estados unidos': 'JFK', 'america': 'JFK',
  
  // Reino Unido
  'londres': 'LHR', 'london': 'LHR', 'londom': 'LHR', 'londón': 'LHR', 'lon': 'LHR',
  'manchester': 'MAN',
  'edinburgh': 'EDI',
  'glasgow': 'GLA',
  'birmingham': 'BHX',
  'uk': 'LHR', 'united kingdom': 'LHR', 'reino unido': 'LHR', 'inglaterra': 'LHR', 'england': 'LHR',
  
  // España
  'madrid': 'MAD',
  'barcelona': 'BCN',
  'valencia': 'VLC',
  'sevilla': 'SVQ', 'seville': 'SVQ',
  'bilbao': 'BIO',
  'spain': 'MAD', 'españa': 'MAD', 'español': 'MAD',
  
  // Francia
  'paris': 'CDG', 'parís': 'CDG',
  'lyon': 'LYS',
  'marseille': 'MRS', 'marsella': 'MRS',
  'nice': 'NCE',
  'france': 'CDG', 'francia': 'CDG', 'french': 'CDG',
  
  // Alemania
  'berlin': 'BER',
  'munich': 'MUC', 'múnich': 'MUC',
  'frankfurt': 'FRA',
  'hamburg': 'HAM',
  'cologne': 'CGN', 'colonia': 'CGN',
  'germany': 'FRA', 'alemania': 'FRA', 'german': 'FRA',
  
  // Italia
  'rome': 'FCO', 'roma': 'FCO',
  'milan': 'MXP', 'milán': 'MXP', 'milano': 'MXP',
  'venice': 'VCE', 'venecia': 'VCE',
  'naples': 'NAP', 'napoles': 'NAP',
  'italy': 'FCO', 'italia': 'FCO', 'italian': 'FCO',
  
  // Países Bajos
  'amsterdam': 'AMS',
  'netherlands': 'AMS', 'países bajos': 'AMS', 'holanda': 'AMS', 'dutch': 'AMS',
  
  // Bélgica
  'brussels': 'BRU', 'bruselas': 'BRU',
  'belgium': 'BRU', 'bélgica': 'BRU', 'belgian': 'BRU',
  
  // Suiza
  'zurich': 'ZRH', 'zúrich': 'ZRH',
  'geneva': 'GVA', 'ginebra': 'GVA',
  'switzerland': 'ZRH', 'suiza': 'ZRH', 'swiss': 'ZRH',
  
  // Austria
  'vienna': 'VIE', 'viena': 'VIE',
  'austria': 'VIE', 'austria': 'VIE', 'austrian': 'VIE',
  
  // Portugal
  'lisbon': 'LIS', 'lisboa': 'LIS',
  'porto': 'OPO',
  'portugal': 'LIS', 'portuguese': 'LIS',
  
  // Grecia
  'athens': 'ATH', 'atenas': 'ATH',
  'greece': 'ATH', 'grecia': 'GRE', 'greek': 'ATH',
  
  // Turquía
  'istanbul': 'IST',
  'ankara': 'ESB',
  'turkey': 'IST', 'turquía': 'IST', 'turkish': 'IST',
  
  // Rusia
  'moscow': 'SVO', 'moscú': 'SVO', 'moscu': 'SVO',
  'saint petersburg': 'LED', 'san petersburgo': 'LED',
  'russia': 'SVO', 'rusia': 'SVO', 'russian': 'SVO',
  
  // China
  'beijing': 'PEK', 'pekin': 'PEK', 'pequín': 'PEK',
  'shanghai': 'PVG',
  'guangzhou': 'CAN',
  'shenzhen': 'SZX',
  'hong kong': 'HKG',
  'china': 'PEK', 'chinese': 'PEK', 'chino': 'PEK',
  
  // Japón
  'tokyo': 'NRT', 'tokio': 'NRT',
  'osaka': 'KIX',
  'kyoto': 'UKB',
  'japan': 'NRT', 'japón': 'NRT', 'japanese': 'NRT',
  
  // Corea del Sur
  'seoul': 'ICN', 'seúl': 'ICN',
  'busan': 'PUS',
  'south korea': 'ICN', 'corea del sur': 'ICN', 'korea': 'ICN',
  
  // India
  'delhi': 'DEL', 'nueva delhi': 'DEL', 'new delhi': 'DEL',
  'mumbai': 'BOM', 'bombay': 'BOM',
  'bangalore': 'BLR', 'bengaluru': 'BLR',
  'chennai': 'MAA', 'madras': 'MAA',
  'kolkata': 'CCU', 'calcuta': 'CCU', 'calcutta': 'CCU',
  'hyderabad': 'HYD',
  'pune': 'PNQ',
  'goa': 'GOI',
  'kochi': 'COK', 'cochin': 'COK',
  'jaipur': 'JAI',
  'ahmedabad': 'AMD',
  'india': 'DEL', 'indian': 'DEL', 'indio': 'DEL',
  
  // Tailandia
  'bangkok': 'BKK',
  'phuket': 'HKT',
  'thailand': 'BKK', 'tailandia': 'BKK', 'thai': 'BKK',
  
  // Singapur
  'singapore': 'SIN', 'singapur': 'SIN',
  
  // Malasia
  'kuala lumpur': 'KUL',
  'malaysia': 'KUL', 'malasia': 'KUL', 'malaysian': 'KUL',
  
  // Indonesia
  'jakarta': 'CGK',
  'bali': 'DPS',
  'indonesia': 'CGK', 'indonesian': 'CGK',
  
  // Filipinas
  'manila': 'MNL',
  'philippines': 'MNL', 'filipinas': 'MNL', 'filipino': 'MNL',
  
  // Vietnam
  'ho chi minh': 'SGN', 'ho chi minh city': 'SGN',
  'hanoi': 'HAN',
  'vietnam': 'SGN', 'vietnamita': 'SGN',
  
  // Australia
  'sydney': 'SYD',
  'melbourne': 'MEL',
  'brisbane': 'BNE',
  'perth': 'PER',
  'australia': 'SYD', 'australia': 'SYD', 'australian': 'SYD',
  
  // Nueva Zelanda
  'auckland': 'AKL',
  'wellington': 'WLG',
  'new zealand': 'AKL', 'nueva zelanda': 'AKL',
  
  // Emiratos Árabes Unidos
  'dubai': 'DXB',
  'abu dhabi': 'AUH',
  'uae': 'DXB', 'emiratos arabes unidos': 'DXB', 'emirates': 'DXB',
  
  // Arabia Saudí
  'riyadh': 'RUH',
  'jeddah': 'JED',
  'saudi arabia': 'RUH', 'arabia saudí': 'RUH', 'arabia saudita': 'RUH',
  
  // Qatar
  'doha': 'DOH',
  'qatar': 'DOH',
  
  // Egipto
  'cairo': 'CAI', 'el cairo': 'CAI',
  'egipt': 'CAI', 'egypt': 'CAI', 'egipcio': 'CAI',
  
  // Sudáfrica
  'johannesburg': 'JNB',
  'cape town': 'CPT', 'ciudad del cabo': 'CPT',
  'south africa': 'JNB', 'sudáfrica': 'JNB', 'sudafrica': 'JNB',
  
  // Brasil
  'sao paulo': 'GRU', 'são paulo': 'GRU',
  'rio de janeiro': 'GIG', 'rio': 'GIG',
  'brasilia': 'BSB', 'brasília': 'BSB',
  'brazil': 'GRU', 'brasil': 'GRU', 'brasileño': 'GRU', 'brasileiro': 'GRU',
  
  // Argentina
  'buenos aires': 'EZE',
  'argentina': 'EZE', 'argentine': 'EZE', 'argentino': 'EZE',
  
  // México
  'mexico city': 'MEX', 'ciudad de mexico': 'MEX', 'méxico': 'MEX',
  'cancun': 'CUN', 'cancún': 'CUN',
  'guadalajara': 'GDL',
  'mexico': 'MEX', 'méxico': 'MEX', 'mexican': 'MEX', 'mexicano': 'MEX',
  
  // Canadá
  'toronto': 'YYZ',
  'vancouver': 'YVR',
  'montreal': 'YUL', 'montréal': 'YUL',
  'calgary': 'YYC',
  'canada': 'YYZ', 'canadá': 'YYZ', 'canadian': 'YYZ', 'canadiense': 'YYZ',
  
  // Chile
  'santiago': 'SCL',
  'chile': 'SCL', 'chilean': 'SCL', 'chileno': 'SCL',
  
  // Colombia
  'bogota': 'BOG', 'bogotá': 'BOG',
  'medellin': 'MDE', 'medellín': 'MDE',
  'colombia': 'BOG', 'colombian': 'BOG', 'colombiano': 'BOG',
  
  // Perú
  'lima': 'LIM',
  'peru': 'LIM', 'perú': 'LIM', 'peruvian': 'LIM', 'peruano': 'LIM',
  
  // Panamá
  'panama city': 'PTY', 'panamá': 'PTY',
  'panama': 'PTY', 'panamanian': 'PTY', 'panameño': 'PTY',
  
  // República Dominicana
  'santo domingo': 'SDQ',
  'dominican republic': 'SDQ', 'república dominicana': 'SDQ',
  
  // Cuba
  'havana': 'HAV', 'la habana': 'HAV',
  'cuba': 'HAV', 'cuban': 'HAV', 'cubano': 'HAV',
  
  // Polonia
  'warsaw': 'WAW', 'varsovia': 'WAW',
  'poland': 'WAW', 'polonia': 'WAW', 'polish': 'WAW',
  
  // República Checa
  'prague': 'PRG', 'praga': 'PRG',
  'czech republic': 'PRG', 'república checa': 'PRG', 'checo': 'PRG',
  
  // Hungría
  'budapest': 'BUD',
  'hungary': 'BUD', 'hungría': 'BUD', 'hungarian': 'BUD',
  
  // Rumania
  'bucharest': 'OTP', 'bucarest': 'OTP',
  'romania': 'OTP', 'rumania': 'OTP', 'romanian': 'OTP',
  
  // Suecia
  'stockholm': 'ARN',
  'sweden': 'ARN', 'suecia': 'ARN', 'swedish': 'ARN',
  
  // Noruega
  'oslo': 'OSL',
  'norway': 'OSL', 'noruega': 'OSL', 'norwegian': 'OSL',
  
  // Dinamarca
  'copenhagen': 'CPH', 'copenhague': 'CPH',
  'denmark': 'CPH', 'dinamarca': 'CPH', 'danish': 'CPH',
  
  // Finlandia
  'helsinki': 'HEL',
  'finland': 'HEL', 'finlandia': 'HEL', 'finnish': 'HEL',
  
  // Irlanda
  'dublin': 'DUB',
  'ireland': 'DUB', 'irlanda': 'DUB', 'irish': 'DUB',
  
  // Israel
  'tel aviv': 'TLV',
  'jerusalem': 'JRS',
  'israel': 'TLV', 'israeli': 'TLV',
  
  // Marruecos
  'casablanca': 'CMN',
  'rabat': 'RBA',
  'morocco': 'CMN', 'marruecos': 'CMN', 'moroccan': 'CMN',
  
  // Kenia
  'nairobi': 'NBO',
  'kenya': 'NBO', 'kenia': 'NBO', 'kenyan': 'NBO',
  
  // Nigeria
  'lagos': 'LOS',
  'abuja': 'ABV',
  'nigeria': 'LOS', 'nigerian': 'LOS',
};

