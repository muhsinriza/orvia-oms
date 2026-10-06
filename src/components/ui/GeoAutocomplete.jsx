/**
 * GeoAutocomplete — ülke ve şehir alanları için native datalist autocomplete.
 * Tüm ülkeler dahili; şehirler seçilen ülkeye göre filtrelenir.
 */

// ── Ülke listesi (ISO 3166-1 alpha-2 + görünen isim, alfabetik) ──────────────
export const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
  'Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize',
  'Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil',
  'Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad',
  'Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba',
  'Cyprus','Czech Republic',
  'Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia',
  'Eswatini','Ethiopia',
  'Fiji','Finland','France',
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala',
  'Guinea','Guinea-Bissau','Guyana',
  'Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan',
  'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein',
  'Lithuania','Luxembourg',
  'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands',
  'Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia',
  'Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger',
  'Nigeria','North Korea','North Macedonia','Norway',
  'Oman',
  'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru',
  'Philippines','Poland','Portugal',
  'Qatar',
  'Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
  'Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal',
  'Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia',
  'Solomon Islands','Somalia','South Africa','South Korea','South Sudan',
  'Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga',
  'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States',
  'Uruguay','Uzbekistan',
  'Vanuatu','Vatican City','Venezuela','Vietnam',
  'Yemen',
  'Zambia','Zimbabwe',
]

// ── Büyük ticaret / liman şehirleri, ülkeye göre ─────────────────────────────
const CITIES_BY_COUNTRY = {
  'Turkey': [
    'Adana','Ankara','Antalya','Bursa','Denizli','Diyarbakır','Erzurum',
    'Eskişehir','Gaziantep','Hatay','İstanbul','İzmir','Kayseri','Konya',
    'Malatya','Manisa','Mersin','Muğla','Samsun','Trabzon',
  ],
  'Germany': [
    'Berlin','Hamburg','Munich','Cologne','Frankfurt','Stuttgart','Düsseldorf',
    'Leipzig','Bremen','Dresden','Hannover','Nuremberg','Duisburg','Essen',
  ],
  'Netherlands': [
    'Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven','Tilburg',
    'Groningen','Almere','Breda','Nijmegen',
  ],
  'Belgium': ['Brussels','Antwerp','Ghent','Charleroi','Liège','Bruges','Namur'],
  'France': [
    'Paris','Marseille','Lyon','Toulouse','Nice','Nantes','Strasbourg',
    'Montpellier','Bordeaux','Lille','Rennes',
  ],
  'United Kingdom': [
    'London','Birmingham','Manchester','Leeds','Glasgow','Liverpool','Bristol',
    'Sheffield','Edinburgh','Cardiff','Belfast','Leicester','Nottingham',
  ],
  'Poland': [
    'Warsaw','Kraków','Łódź','Wrocław','Poznań','Gdańsk','Szczecin',
    'Bydgoszcz','Lublin','Katowice',
  ],
  'Czech Republic': ['Prague','Brno','Ostrava','Plzeň','Liberec','Olomouc'],
  'Romania': ['Bucharest','Cluj-Napoca','Timișoara','Iași','Constanța','Brașov'],
  'Hungary': ['Budapest','Debrecen','Miskolc','Szeged','Pécs','Győr'],
  'Spain': [
    'Madrid','Barcelona','Valencia','Seville','Zaragoza','Málaga','Murcia',
    'Palma','Las Palmas','Bilbao',
  ],
  'Italy': [
    'Rome','Milan','Naples','Turin','Palermo','Genoa','Bologna','Florence',
    'Bari','Venice','Verona',
  ],
  'Portugal': ['Lisbon','Porto','Braga','Coimbra','Funchal','Setúbal'],
  'Greece': ['Athens','Thessaloniki','Patras','Piraeus','Heraklion','Larissa'],
  'Russia': [
    'Moscow','Saint Petersburg','Novosibirsk','Yekaterinburg','Kazan',
    'Nizhny Novgorod','Chelyabinsk','Samara','Ufa','Rostov-on-Don',
  ],
  'Ukraine': ['Kyiv','Kharkiv','Odessa','Dnipro','Donetsk','Zaporizhzhia','Lviv'],
  'Egypt': [
    'Cairo','Alexandria','Giza','Suez','Port Said','Ismailia',
    'Hurghada','Sharm el-Sheikh','Luxor','Aswan',
  ],
  'Saudi Arabia': [
    'Riyadh','Jeddah','Mecca','Medina','Dammam','Khobar','Tabuk','Abha',
  ],
  'United Arab Emirates': [
    'Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah',
  ],
  'Qatar': ['Doha','Al Wakrah','Al Khor','Umm Salal'],
  'Kuwait': ['Kuwait City','Hawalli','Salmiya','Farwaniya'],
  'Bahrain': ['Manama','Riffa','Muharraq','Hamad Town'],
  'Oman': ['Muscat','Salalah','Nizwa','Sohar'],
  'Jordan': ['Amman','Zarqa','Irbid','Aqaba'],
  'Lebanon': ['Beirut','Tripoli','Sidon','Tyre'],
  'Iraq': ['Baghdad','Basra','Mosul','Erbil','Kirkuk'],
  'Iran': ['Tehran','Mashhad','Isfahan','Karaj','Tabriz','Shiraz'],
  'Israel': ['Tel Aviv','Jerusalem','Haifa','Beer Sheva','Netanya'],
  'India': [
    'Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Surat',
    'Pune','Ahmedabad','Jaipur','Lucknow','Nagpur',
  ],
  'China': [
    'Beijing','Shanghai','Guangzhou','Shenzhen','Chengdu','Tianjin',
    'Wuhan','Xi\'an','Hangzhou','Nanjing','Qingdao','Dalian','Ningbo',
  ],
  'Japan': ['Tokyo','Osaka','Yokohama','Nagoya','Sapporo','Kobe','Fukuoka'],
  'South Korea': ['Seoul','Busan','Incheon','Daegu','Daejeon','Gwangju'],
  'Singapore': ['Singapore'],
  'Malaysia': ['Kuala Lumpur','George Town','Ipoh','Johor Bahru','Petaling Jaya'],
  'Indonesia': ['Jakarta','Surabaya','Bandung','Medan','Semarang','Makassar'],
  'Thailand': ['Bangkok','Chiang Mai','Pattaya','Phuket','Hat Yai'],
  'Vietnam': ['Hanoi','Ho Chi Minh City','Da Nang','Hai Phong','Can Tho'],
  'Pakistan': ['Karachi','Lahore','Islamabad','Faisalabad','Rawalpindi'],
  'Bangladesh': ['Dhaka','Chittagong','Sylhet','Rajshahi','Khulna'],
  'United States': [
    'New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia',
    'San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville',
    'Miami','Seattle','Denver','Boston','Atlanta',
  ],
  'Canada': [
    'Toronto','Vancouver','Montreal','Calgary','Edmonton','Ottawa',
    'Winnipeg','Quebec City','Hamilton',
  ],
  'Brazil': [
    'São Paulo','Rio de Janeiro','Brasília','Salvador','Fortaleza',
    'Belo Horizonte','Manaus','Curitiba','Recife','Porto Alegre',
  ],
  'Argentina': ['Buenos Aires','Córdoba','Rosario','Mendoza','La Plata'],
  'Mexico': ['Mexico City','Guadalajara','Monterrey','Puebla','Tijuana'],
  'South Africa': ['Johannesburg','Cape Town','Durban','Pretoria','Port Elizabeth'],
  'Nigeria': ['Lagos','Abuja','Kano','Ibadan','Port Harcourt'],
  'Kenya': ['Nairobi','Mombasa','Kisumu','Eldoret'],
  'Ethiopia': ['Addis Ababa','Dire Dawa','Mekele','Gondar'],
  'Morocco': ['Casablanca','Rabat','Marrakech','Fez','Tangier','Agadir'],
  'Tunisia': ['Tunis','Sfax','Sousse','Kairouan','Bizerte'],
  'Algeria': ['Algiers','Oran','Constantine','Annaba','Blida'],
  'Australia': ['Sydney','Melbourne','Brisbane','Perth','Adelaide','Gold Coast'],
  'New Zealand': ['Auckland','Wellington','Christchurch','Hamilton'],
  'Kazakhstan': ['Almaty','Nur-Sultan','Shymkent','Karaganda'],
  'Uzbekistan': ['Tashkent','Samarkand','Bukhara','Namangan','Andijan'],
  'Azerbaijan': ['Baku','Ganja','Sumqayit'],
  'Georgia': ['Tbilisi','Batumi','Kutaisi'],
  'Armenia': ['Yerevan','Gyumri'],
}

// ── Component: CountryInput ───────────────────────────────────────────────────
export function CountryInput({ value, onChange, className = 'input', placeholder = 'Örn: Almanya', id }) {
  const listId = id ? `countries-${id}` : 'countries-global'
  return (
    <>
      <input
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
      />
      <datalist id={listId}>
        {COUNTRIES.map(c => <option key={c} value={c}/>)}
      </datalist>
    </>
  )
}

// ── Component: CityInput ──────────────────────────────────────────────────────
// country prop: mevcut ülke değeri — buna göre şehir listesi filtrelenir.
// Ülke eşleşmezse (veya boşsa) tüm şehirleri göster.
export function CityInput({ value, onChange, country = '', className = 'input', placeholder = 'Şehir', id }) {
  const listId = id ? `cities-${id}` : 'cities-global'

  // Ülke eşleşmesini bul (büyük/küçük harf duyarsız)
  const matchedCountry = Object.keys(CITIES_BY_COUNTRY).find(
    k => k.toLowerCase() === (country || '').toLowerCase()
  )
  const cities = matchedCountry
    ? CITIES_BY_COUNTRY[matchedCountry]
    : Object.values(CITIES_BY_COUNTRY).flat()

  return (
    <>
      <input
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
      />
      <datalist id={listId}>
        {cities.map(c => <option key={c} value={c}/>)}
      </datalist>
    </>
  )
}
