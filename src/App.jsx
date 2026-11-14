import { useState, useCallback, useEffect, useMemo, useRef } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

// The Google key is NOT in this app. Searches go through the Supabase Edge Function "places-search",
// which keeps the key secret, enforces the daily limit and logs usage for the Founder.
const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const CRM_URL = import.meta.env.VITE_CRM_URL || "";

const SA_CITIES = [
  "Cape Town","Johannesburg","Durban","Pretoria","Port Elizabeth",
  "Bloemfontein","East London","Nelspruit","Polokwane","Kimberley",
  "George","Rustenburg","Pietermaritzburg","Stellenbosch","Paarl",
  "Hermanus","Knysna","Mossel Bay","Worcester","Upington",
];

// Suburbs/areas per SA city for multi-area search
const SA_CITY_AREAS = {
  "Cape Town": ["Cape Town CBD","Bellville","Claremont","Wynberg","Mitchells Plain","Khayelitsha","Tableview","Goodwood","Parow","Brackenfell","Somerset West","Strand","Paarl","Stellenbosch","Franschhoek","Constantia","Hout Bay","Green Point","Sea Point","Observatory"],
  "Johannesburg": ["Sandton","Randburg","Roodepoort","Soweto","Midrand","Fourways","Boksburg","Germiston","Alberton","Kempton Park","Edenvale","Benoni","Brakpan","Springs","Krugersdorp","Centurion","Northcliff","Parktown","Rosebank","Melville"],
  "Durban": ["Durban CBD","Pinetown","Chatsworth","Phoenix","Umlazi","Westville","Musgrave","Berea","Umhlanga","La Lucia","Amanzimtoti","Hillcrest","Kloof","Queensburgh","Tongaat","Stanger","Verulam","Isipingo","Southbroom","Ballitoville"],
  "Pretoria": ["Pretoria CBD","Centurion","Hatfield","Arcadia","Sunnyside","Lynnwood","Menlyn","Garsfontein","Faerie Glen","Silverton","Mamelodi","Atteridgeville","Gezina","Wonderboom","Brooklyn","Waterkloof","Pretoria North","Pretoria East","Pretoria West","Rietfontein"],
  "Port Elizabeth": ["Port Elizabeth CBD","Uitenhage","Despatch","Summerstrand","Walmer","Newton Park","Korsten","Gelvandale","Bethelsdorp","Motherwell","Framesby","Lorraine","Parsons Hill","Mill Park","Richmond Hill","Malabar","Bloemendal","Westering","Mount Road","Linton Grange"],
  "Bloemfontein": ["Bloemfontein CBD","Bram Fischer","Brandwag","Universitas","Langenhoven Park","Dan Pienaar","Westdene","Fichardt Park","Navalsig","Arboretum","Wilgehof","Pellissier","Kagisanong","Rocklands","Botshabelo","Thaba Nchu","Bainsvlei","Heidedal","Mangaung","Woodland Hills"],
  "East London": ["East London CBD","Mdantsane","Bhisho","King William's Town","Stutterheim","Gonubie","Beacon Bay","Nahoon","Berea","Vincent","Greenfields","Selborne","Quigney","Cambridge","Southernwood","Fleet Street","Stirling","Sunnyridge","Braelyn","Amalinda"],
  "Nelspruit": ["Nelspruit CBD","Mbombela","White River","Hazyview","Barberton","Graskop","Sabie","Lydenburg","Witrivier","Malelane","Komatipoort","Thulamahashe","Bushbuckridge","Acornhoek","Kanyamazane","Matsulu","Nelspruit Ext","Riverside Park","West Acres","Rocky Drift"],
  "Polokwane": ["Polokwane CBD","Seshego","Bendor","Mankweng","Tzaneen","Phalaborwa","Louis Trichardt","Thohoyandou","Mokopane","Bela-Bela","Modimolle","Lephalale","Lebowakgomo","Burgersfort","Giyani","Musina","Makhado","Thabazimbi","Marble Hall","Dendron"],
  "Kimberley": ["Kimberley CBD","Galeshewe","Roodepan","Barkly West","Upington","Kuruman","Douglas","Prieska","De Aar","Britstown","Carnarvon","Loxton","Richmond","Hanover","Colesberg","Philipstown","Victoria West","Three Sisters","Vosburg","Niekerkshoop"],
  "George": ["George CBD","Mossel Bay","Oudtshoorn","Knysna","Plettenberg Bay","Wilderness","Sedgefield","Herold's Bay","Victoria Bay","Uniondale","Ladismith","Calitzdorp","Barrydale","Swellendam","Riviersonderend","Heidelberg","Stilbaai","Groot Brak River","Klein Brak River","Hartenbos"],
  "Rustenburg": ["Rustenburg CBD","Phokeng","Brits","Swartruggens","Koster","Magaliesburg","Hartbeespoort","Thabazimbi","Northam","Mokopane","Bela-Bela","Vaalwater","Modimolle","Mabopane","Atteridgeville","Soshanguve","Temba","Hammanskraal","Zeerust","Lichtenburg"],
  "Pietermaritzburg": ["Pietermaritzburg CBD","Edendale","Northdale","Prestbury","Scottsville","Hayfields","Athlone","Raisethorpe","Plessislaer","Sobantu","Ashburton","Mkondeni","Imbali","Slangspruit","Clarendon","Town Bush","Bisley","Chase Valley","Wembley","Napierville"],
  "Stellenbosch": ["Stellenbosch CBD","Paarl","Franschhoek","Somerset West","Strand","Gordon's Bay","Grabouw","Villiersdorp","Robertson","Worcester","Rawsonville","Ceres","Tulbagh","Wellington","Malmesbury","Darling","Vredenburg","Saldanha","Langebaan","Hopefield"],
  "Paarl": ["Paarl CBD","Wellington","Franschhoek","Stellenbosch","Worcester","Rawsonville","Villiersdorp","Grabouw","Ceres","Tulbagh","Malmesbury","Darling","Vredenburg","Saldanha","Langebaan","Hopefield","Moorreesburg","Piketberg","Porterville","Citrusdal"],
  "Hermanus": ["Hermanus CBD","Kleinmond","Betty's Bay","Pringle Bay","Rooi-Els","Stanford","Gansbaai","Pearly Beach","Franskraal","Baardskeerdersbos","De Kelders","Uilenkraalsmond","Bloudam","Vermont","Onrus","Sandbaai","Hawston","Fisherhaven","Arabella","Zwelihle"],
  "Knysna": ["Knysna CBD","Plettenberg Bay","Wilderness","Sedgefield","George","Mossel Bay","Oudtshoorn","Uniondale","Avontuur","Kareedouw","Humansdorp","Jeffreys Bay","St Francis Bay","Patensie","Hankey","Loerie","Thornhill","Misgund","Noll","Haarlem"],
  "Mossel Bay": ["Mossel Bay CBD","George","Knysna","Oudtshoorn","Wilderness","Sedgefield","Herold's Bay","Victoria Bay","Groot Brak River","Klein Brak River","Hartenbos","Dana Bay","Pinnacle Point","Boggomsbaai","Vleesbaai","Fransmanshoek","Brandwacht","Wolwedans","Glentana","Reebok"],
  "Worcester": ["Worcester CBD","Rawsonville","Villiersdorp","Grabouw","Ceres","Tulbagh","Wellington","Paarl","Franschhoek","Stellenbosch","Robertson","Bonnievale","McGregor","Ashton","Montagu","Barrydale","Swellendam","Napier","Bredasdorp","Arniston"],
  "Upington": ["Upington CBD","Keimoes","Kakamas","Kenhardt","Loxton","Victoria West","Carnarvon","Prieska","Douglas","Kimberley","Kuruman","Kathu","Olifantshoek","Postmasburg","Danielskuil","Campbell","Griquatown","Hanover","Richmond","Britstown"],
};

// Cities per US state for multi-city search (to bypass 60-result API cap)
const USA_STATE_CITIES = {
  Alabama: ["Birmingham","Montgomery","Huntsville","Mobile","Tuscaloosa","Hoover","Dothan","Auburn","Decatur","Madison"],
  Alaska: ["Anchorage","Fairbanks","Juneau","Sitka","Ketchikan","Wasilla","Kenai","Kodiak","Bethel","Palmer"],
  Arizona: ["Phoenix","Tucson","Mesa","Chandler","Scottsdale","Glendale","Gilbert","Tempe","Peoria","Surprise"],
  Arkansas: ["Little Rock","Fort Smith","Fayetteville","Springdale","Jonesboro","North Little Rock","Conway","Rogers","Pine Bluff","Bentonville"],
  California: ["Los Angeles","San Diego","San Jose","San Francisco","Fresno","Sacramento","Long Beach","Oakland","Bakersfield","Anaheim","Santa Ana","Riverside","Stockton","Irvine","Chula Vista","Fremont","San Bernardino","Modesto","Fontana","Moreno Valley"],
  Colorado: ["Denver","Colorado Springs","Aurora","Fort Collins","Lakewood","Thornton","Arvada","Westminster","Pueblo","Centennial"],
  Connecticut: ["Bridgeport","New Haven","Hartford","Stamford","Waterbury","Norwalk","Danbury","New Britain","West Hartford","Greenwich","Fairfield","Hamden","Bristol","Meriden","Milford","Stratford","East Hartford","Middletown","Shelton","Norwich"],
  Delaware: ["Wilmington","Dover","Newark","Middletown","Smyrna","Milford","Seaford","Georgetown","Elsmere","New Castle"],
  Florida: ["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Hialeah","Port St. Lucie","Cape Coral","Tallahassee","Fort Lauderdale","Pembroke Pines","Hollywood","Gainesville","Miramar","Coral Springs","West Palm Beach","Clearwater","Lakeland","Pompano Beach","Davie"],
  Georgia: ["Atlanta","Columbus","Augusta","Macon","Savannah","Athens","Sandy Springs","South Fulton","Roswell","Johns Creek"],
  Hawaii: ["Honolulu","Pearl City","Hilo","Kailua","Waipahu","Kaneohe","Mililani","Kahului","Ewa Beach","Kihei"],
  Idaho: ["Boise","Nampa","Meridian","Idaho Falls","Pocatello","Caldwell","Coeur d'Alene","Twin Falls","Lewiston","Post Falls"],
  Illinois: ["Chicago","Aurora","Naperville","Joliet","Rockford","Springfield","Elgin","Peoria","Champaign","Waukegan"],
  Indiana: ["Indianapolis","Fort Wayne","Evansville","South Bend","Carmel","Fishers","Bloomington","Hammond","Gary","Lafayette"],
  Iowa: ["Des Moines","Cedar Rapids","Davenport","Sioux City","Iowa City","Ankeny","Waterloo","Ames","West Des Moines","Council Bluffs"],
  Kansas: ["Wichita","Overland Park","Kansas City","Topeka","Olathe","Lawrence","Shawnee","Manhattan","Lenexa","Salina"],
  Kentucky: ["Louisville","Lexington","Bowling Green","Owensboro","Covington","Hopkinsville","Richmond","Florence","Georgetown","Henderson"],
  Louisiana: ["New Orleans","Baton Rouge","Shreveport","Metairie","Lafayette","Lake Charles","Kenner","Bossier City","Monroe","Alexandria"],
  Maine: ["Portland","Lewiston","Bangor","South Portland","Auburn","Biddeford","Sanford","Saco","Augusta","Westbrook"],
  Maryland: ["Baltimore","Frederick","Rockville","Gaithersburg","Bowie","Hagerstown","Annapolis","College Park","Salisbury","Laurel"],
  Massachusetts: ["Boston","Worcester","Springfield","Cambridge","Lowell","Brockton","Quincy","Lynn","New Bedford","Fall River","Newton","Somerville","Lawrence","Framingham","Haverhill","Waltham","Malden","Brookline","Plymouth","Medford"],
  Michigan: ["Detroit","Grand Rapids","Warren","Sterling Heights","Ann Arbor","Lansing","Flint","Dearborn","Livonia","Westland"],
  Minnesota: ["Minneapolis","St. Paul","Rochester","Duluth","Brooklyn Park","Plymouth","Maple Grove","Woodbury","St. Cloud","Eagan"],
  Mississippi: ["Jackson","Gulfport","Southaven","Hattiesburg","Biloxi","Meridian","Tupelo","Olive Branch","Horn Lake","Clinton"],
  Missouri: ["Kansas City","St. Louis","Springfield","Independence","Columbia","Lee's Summit","O'Fallon","St. Joseph","St. Charles","Blue Springs"],
  Montana: ["Billings","Missoula","Great Falls","Bozeman","Butte","Helena","Kalispell","Havre","Anaconda","Miles City"],
  Nebraska: ["Omaha","Lincoln","Bellevue","Grand Island","Kearney","Fremont","Hastings","Norfolk","Columbus","North Platte"],
  Nevada: ["Las Vegas","Henderson","Reno","North Las Vegas","Sparks","Carson City","Fernley","Elko","Mesquite","Boulder City"],
  "New Hampshire": ["Manchester","Nashua","Concord","Derry","Dover","Rochester","Salem","Merrimack","Hudson","Londonderry"],
  "New Jersey": ["Newark","Jersey City","Paterson","Elizabeth","Edison","Woodbridge","Lakewood","Toms River","Hamilton","Trenton"],
  "New Mexico": ["Albuquerque","Las Cruces","Rio Rancho","Santa Fe","Roswell","Farmington","Clovis","Hobbs","Alamogordo","Carlsbad"],
  "New York": ["New York City","Buffalo","Rochester","Yonkers","Syracuse","Albany","New Rochelle","Mount Vernon","Schenectady","Utica"],
  "North Carolina": ["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem","Fayetteville","Cary","Wilmington","High Point","Concord"],
  "North Dakota": ["Fargo","Bismarck","Grand Forks","Minot","West Fargo","Williston","Dickinson","Mandan","Jamestown","Wahpeton"],
  Ohio: ["Columbus","Cleveland","Cincinnati","Toledo","Akron","Dayton","Parma","Canton","Youngstown","Lorain"],
  Oklahoma: ["Oklahoma City","Tulsa","Norman","Broken Arrow","Lawton","Edmond","Moore","Midwest City","Enid","Stillwater"],
  Oregon: ["Portland","Salem","Eugene","Gresham","Hillsboro","Beaverton","Bend","Medford","Springfield","Corvallis"],
  Pennsylvania: ["Philadelphia","Pittsburgh","Allentown","Erie","Reading","Scranton","Bethlehem","Lancaster","Harrisburg","Altoona"],
  "Rhode Island": ["Providence","Cranston","Warwick","Pawtucket","East Providence","Woonsocket","North Providence","Cumberland","West Warwick","Johnston"],
  "South Carolina": ["Columbia","Charleston","North Charleston","Mount Pleasant","Rock Hill","Greenville","Summerville","Goose Creek","Hilton Head","Sumter"],
  "South Dakota": ["Sioux Falls","Rapid City","Aberdeen","Brookings","Watertown","Mitchell","Yankton","Pierre","Huron","Vermillion"],
  Tennessee: ["Nashville","Memphis","Knoxville","Chattanooga","Clarksville","Murfreesboro","Franklin","Jackson","Johnson City","Bartlett"],
  Texas: ["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington","Corpus Christi","Plano","Laredo","Lubbock","Garland","Irving","Amarillo","Grand Prairie","Brownsville","Pasadena","Killeen","McKinney","Frisco"],
  Utah: ["Salt Lake City","West Valley City","Provo","West Jordan","Orem","Sandy","Ogden","St. George","Layton","South Jordan"],
  Vermont: ["Burlington","South Burlington","Rutland","Barre","Montpelier","Winooski","St. Albans","Newport","Vergennes","Middlebury"],
  Virginia: ["Virginia Beach","Norfolk","Chesapeake","Richmond","Newport News","Alexandria","Hampton","Roanoke","Portsmouth","Suffolk"],
  Washington: ["Seattle","Spokane","Tacoma","Vancouver","Bellevue","Kent","Everett","Renton","Spokane Valley","Kirkland"],
  "West Virginia": ["Charleston","Huntington","Parkersburg","Morgantown","Wheeling","Weirton","Fairmont","Martinsburg","Beckley","Clarksburg"],
  Wisconsin: ["Milwaukee","Madison","Green Bay","Kenosha","Racine","Appleton","Waukesha","Oshkosh","Eau Claire","Janesville"],
  Wyoming: ["Cheyenne","Casper","Laramie","Gillette","Rock Springs","Sheridan","Green River","Evanston","Riverton","Jackson"],
};

const USA_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado",
  "Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho",
  "Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
  "Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma",
  "Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming",
];

const CANADA_PROVINCES = [
  "Alberta","British Columbia","Manitoba","New Brunswick",
  "Newfoundland and Labrador","Nova Scotia","Ontario","Prince Edward Island",
  "Quebec","Saskatchewan",
];

const CANADA_PROVINCE_CITIES = {
  "Alberta": ["Calgary","Edmonton","Red Deer","Lethbridge","St. Albert","Medicine Hat","Grande Prairie","Airdrie","Spruce Grove","Leduc"],
  "British Columbia": ["Vancouver","Surrey","Burnaby","Richmond","Kelowna","Abbotsford","Coquitlam","Langley","Saanich","Delta"],
  "Manitoba": ["Winnipeg","Brandon","Steinbach","Thompson","Portage la Prairie","Winkler","Selkirk","Dauphin","Morden","The Pas"],
  "New Brunswick": ["Moncton","Saint John","Fredericton","Dieppe","Riverview","Miramichi","Edmundston","Campbellton","Bathurst","Oromocto"],
  "Newfoundland and Labrador": ["St. John's","Mount Pearl","Corner Brook","Paradise","Conception Bay South","Grand Falls-Windsor","Gander","Happy Valley-Goose Bay","Labrador City","Stephenville"],
  "Nova Scotia": ["Halifax","Cape Breton","Truro","New Glasgow","Glace Bay","Sydney","Dartmouth","Bedford","Kentville","Amherst"],
  "Ontario": ["Toronto","Ottawa","Mississauga","Brampton","Hamilton","London","Markham","Vaughan","Kitchener","Windsor","Richmond Hill","Oakville","Burlington","Sudbury","Oshawa","Barrie","Waterloo","Cambridge","Kingston","Guelph"],
  "Prince Edward Island": ["Charlottetown","Summerside","Stratford","Cornwall","Montague","Kensington","Souris","Alberton","Georgetown","O'Leary"],
  "Quebec": ["Montreal","Quebec City","Laval","Gatineau","Longueuil","Sherbrooke","Saguenay","Levis","Trois-Rivieres","Terrebonne","Saint-Jean-sur-Richelieu","Repentigny","Brossard","Drummondville","Saint-Jerome","Granby","Blainville","Saint-Hyacinthe","Mirabel","Dollard-des-Ormeaux"],
  "Saskatchewan": ["Saskatoon","Regina","Prince Albert","Moose Jaw","Swift Current","Yorkton","North Battleford","Estevan","Weyburn","Lloydminster"],
};

const COUNTRIES = [
  { label: "South Africa", value: "South Africa", hasSub: "sa_cities" },
  { label: "USA", value: "United States", hasSub: "usa_states" },
  { label: "Canada", value: "Canada", hasSub: "canada_provinces" },
  { label: "Argentina", value: "Argentina" },
  { label: "Australia", value: "Australia" },
  { label: "Austria", value: "Austria" },
  { label: "Bangladesh", value: "Bangladesh" },
  { label: "Belgium", value: "Belgium" },
  { label: "Bermuda", value: "Bermuda" },
  { label: "Brazil", value: "Brazil" },
  { label: "Brunei", value: "Brunei" },
  { label: "Bulgaria", value: "Bulgaria" },
  { label: "China", value: "China" },
  { label: "Colombia", value: "Colombia" },
  { label: "Croatia", value: "Croatia" },
  { label: "Cyprus", value: "Cyprus" },
  { label: "Czech Republic", value: "Czech Republic" },
  { label: "Denmark", value: "Denmark" },
  { label: "Faroe Islands", value: "Faroe Islands" },
  { label: "France", value: "France" },
  { label: "Germany", value: "Germany" },
  { label: "Greece", value: "Greece" },
  { label: "Guam", value: "Guam" },
  { label: "Hong Kong", value: "Hong Kong" },
  { label: "Hungary", value: "Hungary" },
  { label: "Iceland", value: "Iceland" },
  { label: "India", value: "India" },
  { label: "Indonesia", value: "Indonesia" },
  { label: "Ireland", value: "Ireland" },
  { label: "Israel", value: "Israel" },
  { label: "Italy", value: "Italy" },
  { label: "Japan", value: "Japan" },
  { label: "Luxembourg", value: "Luxembourg" },
  { label: "Malaysia", value: "Malaysia" },
  { label: "Malta", value: "Malta" },
  { label: "Mexico", value: "Mexico" },
  { label: "Mongolia", value: "Mongolia" },
  { label: "Netherlands", value: "Netherlands" },
  { label: "New Zealand", value: "New Zealand" },
  { label: "Norway", value: "Norway" },
  { label: "Peru", value: "Peru" },
  { label: "Poland", value: "Poland" },
  { label: "Portugal", value: "Portugal" },
  { label: "Puerto Rico", value: "Puerto Rico" },
  { label: "Romania", value: "Romania" },
  { label: "Singapore", value: "Singapore" },
  { label: "Slovakia", value: "Slovakia" },
  { label: "Slovenia", value: "Slovenia" },
  { label: "South Korea", value: "South Korea" },
  { label: "Spain", value: "Spain" },
  { label: "Sweden", value: "Sweden" },
  { label: "Switzerland", value: "Switzerland" },
  { label: "Taiwan", value: "Taiwan" },
  { label: "Thailand", value: "Thailand" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "US Virgin Islands", value: "US Virgin Islands" },
  { label: "Venezuela", value: "Venezuela" },
  { label: "Vietnam", value: "Vietnam" },
];

const CATEGORIES = [
  "Accounting Firm",
  "Bakery",
  "Biokineticist",
  "Bond Originator",
  "Butchery",
  "Car Wash",
  "Carpenter",
  "Catering",
  "Chiropractor",
  "Cleaning Service",
  "Clothing Boutique",
  "Construction Company",
  "Courier Service",
  "Dental Clinic",
  "Dietitian",
  "Doctor",
  "Driving School",
  "Electrician",
  "Event Venue",
  "Financial Advisor",
  "Florist",
  "Furniture Store",
  "Funeral Parlour",
  "Garden Centre",
  "Gym",
  "Hair Salon",
  "Hardware Store",
  "Insurance Broker",
  "Kids Party Entertainment",
  "Labour Broker",
  "Landscaping",
  "Lash & Brow Studio",
  "Law Firm",
  "Locksmith",
  "Massage Therapist",
  "Mechanic",
  "Mortgage Broker",
  "Nail Salon",
  "Optometrist",
  "Painter",
  "Panel Beater",
  "Personal Trainer",
  "Pest Control",
  "Pet Shop",
  "Pharmacy",
  "Photographer",
  "Physiotherapy",
  "Plumber",
  "Pool Maintenance",
  "Private Tutor",
  "Psychologist",
  "Real Estate Agent",
  "Restaurant",
  "Second Hand Shop",
  "Security Company",
  "Security Staffing Agency",
  "Solar Installer",
  "Spa",
  "Speech Therapist",
  "Staffing Agency",
  "Tailor",
  "Tattoo Studio",
  "Tiling Contractor",
  "Towing Service",
  "Veterinarian",
  "Waterproofing Contractor",
  "Wedding Venue",
];

const STAGES = ["New","Contacted","In Progress","Proposal","Closed","Lost"];

const STAGE_COLORS = {
  New: { bg: "rgba(122,92,26,0.15)", color: "#5A5248" },
  Contacted: { bg: "rgba(122,92,26,0.15)", color: "#7A5C1A" },
  "In Progress": { bg: "rgba(160,120,40,0.15)", color: "#A07828" },
  Proposal: { bg: "rgba(160,120,40,0.15)", color: "#A07828" },
  Closed: { bg: "rgba(160,120,40,0.15)", color: "#A07828" },
  Lost: { bg: "rgba(90,84,76,0.25)", color: "#9A9186" },
};

const MANUAL_SOURCES = [
  { id: "facebook", label: "Facebook / Instagram", icon: "📘", hint: "Found on FB Marketplace or IG Business" },
  { id: "referral", label: "Referral", icon: "🤝", hint: "Referred by someone you know" },
  { id: "cold", label: "Cold Outreach", icon: "📞", hint: "Found via directory or cold call list" },
  { id: "event", label: "Networking Event", icon: "🎪", hint: "Met at an event or expo" },
  { id: "directory", label: "Directory / Yell", icon: "📒", hint: "Found on a business directory" },
  { id: "other", label: "Other", icon: "✦", hint: "Custom source" },
];



// ── SEARCH MODES ────────────────────────────────────────────────────────────────
const SEARCH_MODES = [
  { id: "all", label: "All Results", icon: "◌", hint: "Every business found — no website filter" },
  { id: "no_site", label: "No Website", icon: "○", hint: "Businesses with no online presence at all" },
  { id: "outdated_site", label: "Outdated Site", icon: "◐", hint: "Have a site, but it looks stale or template-era" },
  { id: "no_ecommerce", label: "No Online Store", icon: "●", hint: "Retail with a site but no cart / checkout" },
];

// Retail-leaning categories — used to nudge the "No Online Store" mode
const RETAIL_CATEGORIES = new Set([
  "Bakery","Butchery","Clothing Boutique","Florist","Furniture Store","Garden Centre","Hardware Store",
  "Pet Shop","Pharmacy","Second Hand Shop","Tailor","Spa","Lash & Brow Studio",
]);

// Signals that suggest an old / template-built / unmaintained site
const OUTDATED_BUILDER_PATTERNS = [
  { re: /wix\.com|wixsite/i, label: "Wix (legacy editor)" },
  { re: /weebly/i, label: "Weebly" },
  { re: /godaddy|websitebuilder/i, label: "GoDaddy Builder" },
  { re: /jimdo/i, label: "Jimdo" },
  { re: /squarespace.*7\./i, label: "Squarespace 7" },
  { re: /joomla/i, label: "Joomla" },
  { re: /flash|shockwave/i, label: "Flash/Shockwave" },
  { re: /<frameset|<frame /i, label: "HTML Frames" },
  { re: /font face=|<center>|marquee/i, label: "Pre-2010 HTML" },
  { re: /<table[^>]*width=["']?\d+%?["']?/i, label: "Table-based layout" },
  // Stale copyright year — only in footer-like context, not business founding dates
  { re: /(?<!est\.?\s)(?<!established\s)(?<!since\s)(?<!founded\s)copyright.{0,20}(19|20)(0[0-9]|1[0-5])\b/i, label: "Stale copyright year" },
  // No viewport meta = not mobile-optimised (checked separately in analyzeHtml)
];

// Non-HTTPS is an instant outdated signal — checked on the URL itself
function isHttpOnly(url) {
  return /^http:\/\//i.test(url);
}

// Missing key SEO/modern-web tags
function detectMissingModernTags(html) {
  const missing = [];
  if (!/name=["']viewport["']/i.test(html)) missing.push("No responsive viewport");
  if (!/<meta[^>]+name=["']description["']/i.test(html)) missing.push("No meta description");
  if (!/<meta[^>]+property=["']og:/i.test(html)) missing.push("No Open Graph tags");
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) missing.push("No canonical URL");
  return missing;
}

// Strong signals: platform fingerprints, payment gateways, or markup attributes
// that are essentially unambiguous evidence of an online store.
const ECOMMERCE_STRONG_PATTERNS = [
  /shopify/i,
  /woocommerce/i,
  /\/cart\.js|cart_count|cart-count|cart-drawer|cart-icon/i,
  /payfast|paypal\.com\/|stripe\.com|js\.stripe|yoco\.com|peach\s?payments|snapscan/i,
  // Additional SA & African payment gateways
  /ozow\.com|dpo\s?group|paygate|payu|zapper\.com|mobicred|capitecpay/i,
  /data-add-to-cart|add-to-cart-button|js-add-to-cart/i,
  /data-product-id|data-variant-id/i,
  /<form[^>]*(action=["'][^"']*cart|checkout)/i,
  /online\s?store|web\s?shop|webshop/i,
  // JSON-LD Product schema — clean, reliable signal
  /"@type"\s*:\s*"Product"/i,
  // WooCommerce block themes & headless
  /wc-block|woocommerce-cart|woocommerce-checkout/i,
];

// Weak signals: common words that *can* indicate ecommerce but also show up on
// non-commerce pages (nav icons, blog posts, casual phrasing like "checkout our").
// Two or more weak signals together are treated as moderate evidence.
const ECOMMERCE_WEAK_PATTERNS = [
  /\badd\s?to\s?cart\b/i,
  /\bcheckout\b/i,
  /\bshopping\s?cart\b/i,
  /\bbuy\s?now\b/i,
  /\bprice\b.{0,40}\b(r|zar|\$|usd|gbp|€)\s?\d/i, // a price-looking number near currency
];

function detectEcommerce(html) {
  if (ECOMMERCE_STRONG_PATTERNS.some(re => re.test(html))) return true;
  const weakMatches = ECOMMERCE_WEAK_PATTERNS.filter(re => re.test(html)).length;
  return weakMatches >= 2;
}

// ── SITE INSPECTOR ──────────────────────────────────────────────────────────────
// Set this to your deployed Cloudflare Worker URL (see site-inspector-worker.js)
// e.g. "https://lead-empire-inspector.YOUR-SUBDOMAIN.workers.dev"
const INSPECTOR_WORKER_URL = "https://lead-finder.mishael-c4d.workers.dev"; // <-- paste your worker URL here once deployed

function analyzeHtml(url, html) {
  const result = {
    url, reachable: true, outdatedSignals: [], hasEcommerce: false,
    pitchHints: [], // what they DO have — useful for no_ecommerce pitch angle
    html: html.slice(0, 50000),
  };

  // Check HTTP-only URL
  if (isHttpOnly(url)) result.outdatedSignals.push("No HTTPS");

  // Builder/era patterns
  for (const p of OUTDATED_BUILDER_PATTERNS) {
    if (p.re.test(html)) result.outdatedSignals.push(p.label);
  }

  // Missing modern tags
  const missingTags = detectMissingModernTags(html);
  result.outdatedSignals.push(...missingTags);

  // Ecommerce detection
  result.hasEcommerce = detectEcommerce(html);

  // Pitch hints: what does the site actually have?
  if (!result.hasEcommerce) {
    if (/<form[^>]*>/i.test(html)) result.pitchHints.push("Has contact form");
    if (/whatsapp|wa\.me/i.test(html)) result.pitchHints.push("Uses WhatsApp");
    if (/price|pricelist|price.?list|our.?rates/i.test(html)) result.pitchHints.push("Has price list");
    if (/book.?now|appointment|booking/i.test(html)) result.pitchHints.push("Has booking");
    if (/gallery|portfolio|our.?work/i.test(html)) result.pitchHints.push("Has gallery");
    if (/facebook\.com|instagram\.com|twitter\.com/i.test(html)) result.pitchHints.push("Has social links");
  }

  return result;
}

// Tries the deployed Worker first (no CORS issues server-side). Falls back to a
// direct browser fetch (works for sites with permissive CORS), and finally to a
// "couldn't inspect" result so the UI can offer to open the site manually.
async function inspectSite(url) {
  const empty = { url, reachable: false, outdatedSignals: [], hasEcommerce: false, pitchHints: [], html: "" };

  // HTTP-only is an instant signal — no need to fetch
  const httpOnlySignal = isHttpOnly(url) ? ["No HTTPS"] : [];

  if (INSPECTOR_WORKER_URL) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${INSPECTOR_WORKER_URL}?url=${encodeURIComponent(url)}`, { signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data.reachable) {
          // Merge any HTTP-only signal the worker might miss (it follows redirects)
          const outdatedSignals = [...new Set([...httpOnlySignal, ...(data.outdatedSignals || [])])];
          return { url, ...data, outdatedSignals, pitchHints: data.pitchHints || [] };
        }
        return empty;
      }
    } catch (e) {
      // worker unreachable — fall through to direct fetch
    }
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal, mode: "cors" });
    clearTimeout(t);
    if (!res.ok) return empty;
    const html = await res.text();
    return analyzeHtml(url, html);
  } catch (e) {
    // CORS / network error — can't inspect directly
  }
  return empty;
}

// ── EMAIL FINDER ──────────────────────────────────────────────────────────────
// Google Places does not return emails, so the Worker reads the business's
// website (home page, then contact/about pages) and returns any emails it finds.
async function findEmails(url) {
  if (!url || !INSPECTOR_WORKER_URL) return { reachable: false, emails: [] };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(`${INSPECTOR_WORKER_URL}?emails=1&url=${encodeURIComponent(url)}`, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return { reachable: false, emails: [] };
    const data = await res.json();
    // An older Worker ignores ?emails=1 and sends no "emails" field
    if (!Array.isArray(data.emails)) return { unsupported: true, reachable: !!data.reachable, emails: [] };
    return { reachable: !!data.reachable, emails: data.emails };
  } catch {
    return { reachable: false, emails: [] };
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase() || "??";
}
function scoreColor(s) {
  if (s >= 85) return "#A07828";
  if (s >= 65) return "#7A5C1A";
  return "#5A5248";
}
function downloadFile(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
}

// Quote-aware CSV parser — handles commas/quotes inside fields (e.g. addresses),
// which a naive text.split(",") would break on.
function parseCSVFile(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\r") { /* skip */ }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length > 1 || r[0]).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (r[i] || "").trim());
    return obj;
  });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ msg, visible }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      background: "#C9A84C", color: "#1A1712",
      fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 13,
      padding: "10px 20px", borderRadius: 5,
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-10px)",
      transition: "all 0.25s", pointerEvents: "none",
    }}>{msg}</div>
  );
}
function useToast() {
  const [state, setState] = useState({ msg: "", visible: false });
  const show = useCallback((msg) => {
    setState({ msg, visible: true });
    setTimeout(() => setState(s => ({ ...s, visible: false })), 2300);
  }, []);
  return { ...state, show };
}

// ── PHONE CHIP ────────────────────────────────────────────────────────────────
function PhoneChip({ phone, onCopied }) {
  const [copied, setCopied] = useState(false);
  const handle = (e) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopied(true);
    onCopied?.("Phone copied ✓");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span onClick={handle} title="Click to copy" style={{
      fontFamily: "'Montserrat', sans-serif", fontSize: 12,
      color: copied ? "#A07828" : "#A07828",
      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
      transition: "color 0.2s", userSelect: "none",
    }}>
      📞 {copied ? "Copied!" : phone}
    </span>
  );
}

// ── WHATSAPP BUTTON ───────────────────────────────────────────────────────────
function WhatsAppButton({ phone, onToast }) {
  if (!phone) return null;
  // Strip to digits only, then normalise to international format
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  const url = `https://wa.me/${digits}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title="Message on WhatsApp"
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.28)",
        color: "#25D366", borderRadius: 5, padding: "5px 10px",
        fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
        textDecoration: "none", transition: "background 0.15s", whiteSpace: "nowrap",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(37,211,102,0.18)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(37,211,102,0.1)"}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.864L.057 23.428a.5.5 0 0 0 .611.612l5.648-1.457A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.946 0-3.775-.523-5.348-1.432l-.383-.228-3.352.865.893-3.261-.247-.397A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
      WhatsApp
    </a>
  );
}

// ── SCORE BAR ─────────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const c = scoreColor(score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, background: "rgba(160,120,40,0.06)", borderRadius: 2 }}>
        <div style={{ width: `${score}%`, height: "100%", background: c, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, color: c, minWidth: 28 }}>{score}</span>
    </div>
  );
}

// ── STAGE BADGE ───────────────────────────────────────────────────────────────
function StageBadge({ stage }) {
  const s = STAGE_COLORS[stage] || STAGE_COLORS["New"];
  return (
    <span style={{
      fontFamily: "'Montserrat', sans-serif", fontSize: 9, fontWeight: 600,
      padding: "2px 8px", borderRadius: 32, background: s.bg, color: s.color,
      letterSpacing: "0.5px", whiteSpace: "nowrap",
    }}>{stage.toUpperCase()}</span>
  );
}

// ── GOOGLE PLACES CARD ────────────────────────────────────────────────────────
function getPlacePhotoUrl(photo, maxWidth = 400) {
  // Photos are not requested (they cost extra and need the Google key in the browser)
  return null;
}


// ── EMAIL CHIP ────────────────────────────────────────────────────────────────
function EmailChip({ lookup, onCopied }) {
  const [copied, setCopied] = useState(null);
  const chipStyle = { fontFamily: "'Montserrat', sans-serif", fontSize: 11, padding: "4px 10px", borderRadius: 32, border: "1px solid rgba(160,120,40,0.18)", background: "rgba(160,120,40,0.06)", color: "#7A5C1A" };
  if (!lookup || lookup.status === "unsupported") return null;
  if (lookup.status === "checking") return <span style={{ ...chipStyle, color: "#9A9186" }}>✉ Finding email…</span>;
  if (!lookup.emails?.length) return <span style={{ ...chipStyle, color: "#9A9186", background: "transparent" }}>✉ {lookup.reachable ? "No email on site" : "Site unreachable"}</span>;
  return (
    <>
      {lookup.emails.slice(0, 3).map(email => (
        <button key={email} title="Copy email" onClick={e => {
          e.stopPropagation();
          navigator.clipboard.writeText(email);
          setCopied(email); setTimeout(() => setCopied(null), 1500);
          onCopied?.("Email copied ✓");
        }} style={{ ...chipStyle, cursor: "pointer" }}>✉ {copied === email ? "Copied!" : email}</button>
      ))}
    </>
  );
}

function SiteInspectButton({ place, onResult, onToast }) {
  const [status, setStatus] = useState("idle"); // idle | checking | done
  const site = place.websiteUri;
  const run = async (e) => {
    e.stopPropagation();
    if (!site) return;
    setStatus("checking");
    const r = await inspectSite(site);
    onResult(place.id, r);
    setStatus("done");
    if (!r.reachable) {
      onToast("Couldn't fetch site (CORS) — opening it instead");
      window.open(site, "_blank");
    }
  };
  return (
    <button onClick={run} disabled={status === "checking"} style={{
      background: "rgba(160,120,40,0.05)", border: "1px solid rgba(160,120,40,0.09)",
      color: "#5A5248", padding: "6px 12px", borderRadius: 5, fontSize: 11, fontWeight: 500,
      cursor: status === "checking" ? "default" : "pointer", fontFamily: "'Montserrat', sans-serif",
    }}>
      {status === "checking" ? "Scanning…" : "↻ Re-check site"}
    </button>
  );
}

function PlaceCard({ place, index, onSave, isSaved, onToast, mode, onInspectResult }) {
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber;
  const name = place.displayName?.text || "Unnamed Business";
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent([name, place.formattedAddress].filter(Boolean).join(" "))}`;
  const rating = place.rating;
  const reviewCount = place.userRatingCount || 0;
  const ratingColor = rating >= 4.5 ? "#A07828" : rating >= 4 ? "#7A5C1A" : rating >= 3 ? "#5A5248" : "#9A9186";
  const inspection = place._inspection;

  // Pre-scan domain hint: show TLD and HTTP warning before scan runs
  const domainHint = (() => {
    if (!place.websiteUri) return null;
    const isHttp = isHttpOnly(place.websiteUri);
    try {
      const tld = new URL(place.websiteUri).hostname.split(".").slice(-2).join(".");
      return { tld, isHttp };
    } catch { return null; }
  })();

  let badge = null;
  let badgeColor = "#A07828";
  if (mode === "all") {
    badge = place.websiteUri ? null : { label: "NO WEBSITE", note: null };
  } else if (mode === "no_site") {
    badge = { label: "NO WEBSITE", note: null };
  } else if (mode === "outdated_site") {
    const signals = inspection?.outdatedSignals || [];
    if (inspection) {
      if (signals.length >= 3) { badge = { label: "LIKELY OUTDATED", note: signals.slice(0, 3).join(" · ") }; badgeColor = "#A07828"; }
      else if (signals.length > 0) { badge = { label: "SOME RED FLAGS", note: signals.join(" · ") }; badgeColor = "#A07828"; }
      else if (inspection.reachable) { badge = { label: "LOOKS CURRENT", note: null }; badgeColor = "#7A5C1A"; }
      else { badge = { label: "SITE UNREACHABLE", note: null }; badgeColor = "#9A9186"; }
    } else {
      // Pre-scan: show useful domain info instead of generic "HAS WEBSITE"
      badge = {
        label: domainHint?.isHttp ? "⚠ HTTP ONLY" : domainHint?.tld ? domainHint.tld.toUpperCase() : "HAS WEBSITE",
        note: domainHint?.isHttp ? "No HTTPS — strong pitch signal" : null,
      };
      badgeColor = domainHint?.isHttp ? "#A07828" : "#9A9186";
    }
  } else if (mode === "no_ecommerce") {
    if (inspection) {
      if (inspection.hasEcommerce) { badge = { label: "HAS ONLINE STORE", note: null }; badgeColor = "#7A5C1A"; }
      else if (inspection.reachable) { badge = { label: "NO ONLINE STORE", note: null }; badgeColor = "#A07828"; }
      else { badge = { label: "SITE UNREACHABLE", note: null }; badgeColor = "#9A9186"; }
    } else {
      badge = {
        label: domainHint?.isHttp ? "⚠ HTTP ONLY" : domainHint?.tld ? domainHint.tld.toUpperCase() : "HAS WEBSITE",
        note: domainHint?.isHttp ? "No HTTPS — easier pitch" : null,
      };
      badgeColor = domainHint?.isHttp ? "#A07828" : "#9A9186";
    }
  }

  // Pitch hints from inspection (no_ecommerce mode)
  const pitchHints = (mode === "no_ecommerce" && inspection?.reachable && !inspection?.hasEcommerce)
    ? (inspection?.pitchHints || []) : [];

  // Non-retail warning for no_ecommerce mode
  const notRetail = mode === "no_ecommerce" && !RETAIL_CATEGORIES.has(place._savedCategory || "");

  return (
    <div style={{
      background: "#F4F1EB", border: "1px solid rgba(160,120,40,0.18)", boxShadow: "0 1px 4px rgba(26,23,18,0.06)",
      borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
      animation: "fadeSlideIn 0.4s ease forwards", animationDelay: `${index * 0.05}s`, opacity: 0,
    }}>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14, color: "#1A1712", lineHeight: 1.3 }}>{name}</div>
          <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {badge && (
              <span style={{ background: `rgba(${badgeColor === "#A07828" ? "201,168,76" : badgeColor === "#A07828" ? "226,196,106" : badgeColor === "#7A5C1A" ? "138,110,42" : "90,84,76"},0.14)`, color: badgeColor, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 32, border: `1px solid ${badgeColor}44`, fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.05em" }}>{badge.label}</span>
            )}
            {place.websiteUri && mode !== "no_site" && (
              <a href={place.websiteUri} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: "#7A5C1A", fontFamily: "'Montserrat', sans-serif", textDecoration: "none" }}>
                {place.websiteUri.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
          </div>
          {badge?.note && (
            <div style={{ fontSize: 10, color: "#A07828", marginTop: 4, fontFamily: "'Montserrat', sans-serif" }}>⚠ {badge.note}</div>
          )}
          {/* Pitch hints */}
          {pitchHints.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
              {pitchHints.map(hint => (
                <span key={hint} style={{ fontSize: 9, color: "#9A9186", background: "rgba(160,120,40,0.04)", border: "1px solid rgba(160,120,40,0.07)", padding: "2px 7px", borderRadius: 32, fontFamily: "'Montserrat', sans-serif" }}>
                  {hint}
                </span>
              ))}
            </div>
          )}
          {/* Non-retail warning */}
          {notRetail && !inspection && (
            <div style={{ fontSize: 9, color: "#9A9186", marginTop: 5, fontFamily: "'Montserrat', sans-serif" }}>
              ⓘ Category may not typically sell online
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={() => window.open(googleUrl, "_blank")} title="Search on Google" style={{ background: "rgba(160,120,40,0.06)", border: "1px solid rgba(160,120,40,0.1)", color: "#5A5248", padding: "6px 9px", borderRadius: 5, fontSize: 13, cursor: "pointer" }}>🔍</button>
          {mode !== "no_site" && place.websiteUri && (
            <SiteInspectButton place={place} onResult={onInspectResult} onToast={onToast} />
          )}
          <button onClick={() => onSave(place)} disabled={isSaved} style={{
            background: isSaved ? "transparent" : "#C9A84C", color: isSaved ? "#7A5C1A" : "#1A1712",
            border: isSaved ? "1px solid #7A5C1A" : "1px solid #C9A84C",
            padding: "6px 14px", borderRadius: 5, fontSize: 11, fontWeight: 700,
            cursor: isSaved ? "default" : "pointer", fontFamily: "'Montserrat', sans-serif", transition: "all 0.2s",
          }}>{isSaved ? "✓ Saved" : "+ CRM"}</button>
        </div>
      </div>

      {/* Rating block — big and prominent */}
      {rating ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(160,120,40,0.03)", borderRadius: 5, padding: "10px 14px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 48 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: 28, color: ratingColor, lineHeight: 1 }}>{rating.toFixed(1)}</span>
            <span style={{ fontSize: 9, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", marginTop: 2 }}>RATING</span>
          </div>
          <div style={{ width: 1, height: 36, background: "rgba(160,120,40,0.07)" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: 22, color: "#1A1712", lineHeight: 1 }}>{reviewCount.toLocaleString()}</span>
            <span style={{ fontSize: 9, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", marginTop: 2 }}>REVIEWS</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 4, background: "rgba(160,120,40,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${(rating / 5) * 100}%`, height: "100%", background: ratingColor, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 10, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", marginTop: 4 }}>
              {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#9A9186", fontFamily: "'Montserrat', sans-serif" }}>No reviews yet</div>
      )}

      {place.formattedAddress && <div style={{ fontSize: 12, color: "rgba(26,23,18,0.35)" }}>📍 {place.formattedAddress}</div>}
      {phone && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <PhoneChip phone={phone} onCopied={onToast} />
          <WhatsAppButton phone={phone} />
        </div>
      )}
      {place.websiteUri && place._emailLookup && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <EmailChip lookup={place._emailLookup} onCopied={onToast} />
        </div>
      )}
      </div>
    </div>
  );
}

// ── ADD MANUAL MODAL ──────────────────────────────────────────────────────────
function AddManualModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", role: "", company: "", phone: "", email: "", location: "", source: "cold", notes: "" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const inputStyle = { width: "100%", background: "rgba(160,120,40,0.06)", border: "1px solid rgba(160,120,40,0.1)", borderRadius: 5, color: "#1A1712", padding: "10px 12px", fontFamily: "'Montserrat', sans-serif", fontSize: 13, outline: "none" };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: "rgba(26,23,18,0.3)", display: "block", marginBottom: 6, letterSpacing: "0.1em", fontFamily: "'Montserrat', sans-serif" };
  const canSubmit = form.name.trim() && form.company.trim();

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#F4F1EB", border: "1px solid rgba(160,120,40,0.2)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(160,120,40,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: "#A07828", fontSize: 14 }}>Add Lead Manually</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5A5248", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", display: "grid", gap: 14 }}>
          {[
            ["name", "Contact Name *", "e.g. John Dube"],
            ["role", "Role / Title", "e.g. Owner"],
            ["company", "Business Name *", "e.g. Dube Plumbing"],
            ["phone", "Phone Number", "e.g. +27 82 000 0000"],
            ["email", "Email Address", "email@business.co.za"],
            ["location", "Location", "e.g. Bellville, Cape Town"],
          ].map(([k, lbl, ph]) => (
            <div key={k}>
              <label style={labelStyle}>{lbl.toUpperCase()}</label>
              <input value={form[k]} onChange={set(k)} placeholder={ph} style={inputStyle} />
            </div>
          ))}

          <div>
            <label style={labelStyle}>HOW DID YOU FIND THEM?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {MANUAL_SOURCES.map(s => (
                <button key={s.id} onClick={() => setForm(f => ({ ...f, source: s.id }))} title={s.hint} style={{
                  background: form.source === s.id ? "rgba(160,120,40,0.12)" : "rgba(160,120,40,0.04)",
                  border: `1px solid ${form.source === s.id ? "rgba(160,120,40,0.4)" : "rgba(160,120,40,0.08)"}`,
                  borderRadius: 5, padding: "9px 12px", color: form.source === s.id ? "#A07828" : "#5A5248",
                  fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: "'Montserrat', sans-serif", transition: "all 0.15s",
                }}>{s.icon} {s.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea value={form.notes} onChange={set("notes")} placeholder="First impressions, pitch angle, how to approach…" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(160,120,40,0.06)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(160,120,40,0.1)", color: "#5A5248", padding: "9px 18px", borderRadius: 5, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", fontSize: 13 }}>Cancel</button>
          <button onClick={() => { if (!canSubmit) return; onAdd(form); onClose(); }} style={{ background: canSubmit ? "#C9A84C" : "rgba(160,120,40,0.08)", color: canSubmit ? "#1A1712" : "#5A5248", border: "none", padding: "9px 22px", borderRadius: 5, fontWeight: 700, cursor: canSubmit ? "pointer" : "default", fontFamily: "'Montserrat', sans-serif", fontSize: 13, transition: "all 0.2s" }}>Add Lead</button>
        </div>
      </div>
    </div>
  );
}

// ── CRM DETAIL SLIDE-OUT ──────────────────────────────────────────────────────
function CRMDetail({ lead, onUpdate, onDelete, onClose, onToast }) {
  const [notes, setNotes] = useState(lead.notes || "");
  const name = lead.displayName?.text || lead.name || "Unknown";
  const company = lead.company || lead.displayName?.text || "";
  const phone = lead.nationalPhoneNumber || lead.internationalPhoneNumber || lead.phone;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(name + (lead.location ? " " + lead.location : "") + (lead.country ? " " + lead.country : ""))}`;
  const linkedinUrl = `https://www.google.com/search?q=site:linkedin.com+${encodeURIComponent(name + " " + company)}`;
  const sourceLabel = MANUAL_SOURCES.find(s => s.id === lead.source)?.label || lead.source || "Google Maps";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 900, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 390, height: "100%", background: "#F4F1EB", borderLeft: "1px solid rgba(160,120,40,0.18)", overflow: "auto", display: "flex", flexDirection: "column" }}>

        <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 700, color: "#A07828", letterSpacing: "0.1em" }}>LEAD DETAIL</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5A5248", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(160,120,40,0.12)", border: "2px solid rgba(160,120,40,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: 17, color: "#A07828", flexShrink: 0 }}>
              {initials(name)}
            </div>
            <div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 16, color: "#1A1712" }}>{name}</div>
              {lead.role && <div style={{ fontSize: 12, color: "#5A5248", fontFamily: "'Montserrat', sans-serif", marginTop: 2 }}>{lead.role}{company && company !== name ? ` @ ${company}` : ""}</div>}
              <div style={{ fontSize: 10, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", marginTop: 3 }}>via {sourceLabel}</div>
            </div>
          </div>

          {/* Score */}
          <div>
            <div style={{ fontSize: 10, color: "#9A9186", letterSpacing: "0.1em", marginBottom: 7, fontFamily: "'Montserrat', sans-serif" }}>LEAD SCORE</div>
            <ScoreBar score={lead.score || 60} />
          </div>

          {/* Contact info */}
          <div>
            <div style={{ fontSize: 10, color: "#9A9186", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "'Montserrat', sans-serif" }}>CONTACT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <PhoneChip phone={phone} onCopied={onToast} />
                  <WhatsAppButton phone={phone} />
                </div>
              )}
              {lead.email && <a href={`mailto:${lead.email}`} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, color: "#7A5C1A", textDecoration: "none" }}>✉ {lead.email}</a>}
              {(lead.formattedAddress || lead.location) && <span style={{ fontSize: 12, color: "#5A5248" }}>📍 {lead.formattedAddress || lead.location}</span>}
              {lead.rating && <span style={{ fontSize: 12, color: "#5A5248" }}>⭐ {lead.rating} ({lead.userRatingCount || 0} reviews)</span>}
            </div>
          </div>

          {/* Google Preview */}
          <div>
            <div style={{ fontSize: 10, color: "#9A9186", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "'Montserrat', sans-serif" }}>ONLINE PROFILE</div>
            <div style={{ background: "rgba(160,120,40,0.03)", border: "1px solid rgba(160,120,40,0.06)", borderRadius: 5, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#A07828", fontWeight: 600, marginBottom: 2 }}>{name}{company && company !== name ? ` — ${company}` : ""}</div>
              <div style={{ fontSize: 10, color: "#A07828", fontFamily: "'Montserrat', sans-serif", marginBottom: 5 }}>google.com/search</div>
              <div style={{ fontSize: 11, color: "#5A5248", lineHeight: 1.5 }}>Search their digital footprint — reviews, social pages, directories.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => window.open(googleUrl, "_blank")} style={{ flex: 1, background: "rgba(160,120,40,0.05)", border: "1px solid rgba(160,120,40,0.08)", color: "#5A5248", padding: "8px 0", borderRadius: 5, fontSize: 12, cursor: "pointer" }}>🔍 Google</button>
              <button onClick={() => window.open(linkedinUrl, "_blank")} style={{ flex: 1, background: "rgba(122,92,26,0.07)", border: "1px solid rgba(122,92,26,0.18)", color: "#7A5C1A", padding: "8px 0", borderRadius: 5, fontSize: 12, cursor: "pointer" }}>in LinkedIn</button>
            </div>
          </div>

          {/* Stage */}
          <div>
            <div style={{ fontSize: 10, color: "#9A9186", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "'Montserrat', sans-serif" }}>PIPELINE STAGE</div>
            <select value={lead.status} onChange={e => onUpdate(lead.id, { status: e.target.value })} style={{ width: "100%", background: "rgba(160,120,40,0.05)", border: "1px solid rgba(160,120,40,0.1)", borderRadius: 5, color: "#1A1712", padding: "10px 12px", fontFamily: "'Montserrat', sans-serif", fontSize: 12, outline: "none" }}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#9A9186", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "'Montserrat', sans-serif" }}>NOTES</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => onUpdate(lead.id, { notes })} placeholder="Pitch angle, follow-up plan, what they need…" rows={4} style={{ width: "100%", background: "rgba(160,120,40,0.05)", border: "1px solid rgba(160,120,40,0.1)", borderRadius: 5, color: "#1A1712", padding: "10px 12px", fontFamily: "'Montserrat', sans-serif", fontSize: 12, resize: "vertical", outline: "none" }} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onDelete(lead.id); onClose(); }} style={{ flex: 1, background: "rgba(224,82,82,0.07)", border: "1px solid rgba(224,82,82,0.18)", color: "#E05252", padding: "9px 0", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>Remove</button>
            <button onClick={() => {
              const info = [
                `Name: ${name}`, lead.role ? `Role: ${lead.role}` : "",
                `Phone: ${phone || "N/A"}`, `Email: ${lead.email || "N/A"}`,
                `Location: ${lead.formattedAddress || lead.location || "N/A"}`,
                `Stage: ${lead.status}`, `Score: ${lead.score || 0}/100`,
              ].filter(Boolean).join("\n");
              navigator.clipboard.writeText(info);
              onToast("Lead info copied ✓");
            }} style={{ flex: 1, background: "rgba(160,120,40,0.08)", border: "1px solid rgba(160,120,40,0.22)", color: "#A07828", padding: "9px 0", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>⎘ Copy Info</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CRM CARD ──────────────────────────────────────────────────────────────────
function CRMCard({ lead, onUpdate, onDelete, onClick, onToast }) {
  const name = lead.displayName?.text || lead.name || "Unknown";
  const phone = lead.nationalPhoneNumber || lead.internationalPhoneNumber || lead.phone;
  const src = MANUAL_SOURCES.find(s => s.id === lead.source);
  const srcIcon = lead.source === "google" ? "📍" : (src?.icon || "✦");
  const rating = lead.rating;
  const reviewCount = lead.userRatingCount || 0;
  const ratingColor = rating >= 4.5 ? "#A07828" : rating >= 4 ? "#7A5C1A" : rating >= 3 ? "#5A5248" : "#9A9186";

  return (
    <div onClick={onClick} style={{ background: "#F4F1EB", borderRadius: 8, padding: "13px 15px", border: `1px solid rgba(160,120,40,0.18)`, borderLeft: `3px solid ${STAGE_COLORS[lead.status]?.color || "#A07828"}`, cursor: "pointer", transition: "background 0.15s", display: "flex", flexDirection: "column", gap: 7 }}
      onMouseEnter={e => e.currentTarget.style.background = "#EDE9E0"}
      onMouseLeave={e => e.currentTarget.style.background = "#F4F1EB"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1712", fontFamily: "'Montserrat', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <StageBadge stage={lead.status} />
      </div>
      {lead.role && <div style={{ fontSize: 11, color: "#5A5248", fontFamily: "'Montserrat', sans-serif" }}>{lead.role}</div>}

      {/* Category + city pills */}
      {(lead.savedCategory || lead.savedCity || lead.country) && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {lead.savedCategory && (
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9, color: "#5A5248", background: "rgba(122,92,26,0.12)", border: "1px solid rgba(122,92,26,0.2)", padding: "2px 7px", borderRadius: 32 }}>{lead.savedCategory}</span>
          )}
          {lead.savedCity && (
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9, color: "#7A5C1A", background: "rgba(122,92,26,0.08)", border: "1px solid rgba(122,92,26,0.18)", padding: "2px 7px", borderRadius: 32 }}>📍 {lead.savedCity}</span>
          )}
          {lead.country && !lead.savedCity && (
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9, color: "#7A5C1A", background: "rgba(122,92,26,0.08)", border: "1px solid rgba(122,92,26,0.18)", padding: "2px 7px", borderRadius: 32 }}>🌍 {lead.country}</span>
          )}
        </div>
      )}

      {/* Rating + reviews */}
      {rating ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(160,120,40,0.025)", borderRadius: 5, padding: "6px 10px" }}>
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: 16, color: ratingColor, lineHeight: 1 }}>⭐ {rating.toFixed(1)}</span>
          <span style={{ width: 1, height: 16, background: "rgba(160,120,40,0.07)", display: "inline-block" }} />
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, color: "#5A5248" }}>{reviewCount.toLocaleString()} reviews</span>
        </div>
      ) : null}

      {(lead.formattedAddress || lead.location) && <div style={{ fontSize: 11, color: "rgba(26,23,18,0.3)" }}>📍 {(lead.formattedAddress || lead.location || "").split(",").slice(0, 2).join(",")}</div>}
      {phone && (
        <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <PhoneChip phone={phone} onCopied={onToast} />
          <WhatsAppButton phone={phone} />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
        <select value={lead.status} onChange={e => { e.stopPropagation(); onUpdate(lead.id, { status: e.target.value }); }} onClick={e => e.stopPropagation()} style={{ flex: 1, background: "rgba(160,120,40,0.05)", color: "#888", border: "1px solid rgba(160,120,40,0.08)", fontSize: 10, padding: "5px 8px", borderRadius: 5, fontFamily: "'Montserrat', sans-serif", outline: "none" }}>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 9, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", background: "rgba(160,120,40,0.04)", padding: "3px 7px", borderRadius: 4, flexShrink: 0 }}>{srcIcon}</span>
        <button onClick={e => { e.stopPropagation(); onDelete(lead.id); }} style={{ background: "rgba(224,82,82,0.08)", border: "none", color: "#E05252", fontSize: 10, padding: "5px 9px", borderRadius: 5, cursor: "pointer" }}>✕</button>
      </div>
      <ScoreBar score={lead.score || 60} />
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
function LeadFinder({ session, profile, onLogout }) {
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("South Africa");
  const [city, setCity] = useState("Cape Town");
  const [usaState, setUsaState] = useState("California");
  const [canadaProvince, setCanadaProvince] = useState("Ontario");
  const [customCategory, setCustomCategory] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const searchStopRef = useRef(false);
  const scanStopRef = useRef(false);
  const importInputRef = useRef(null);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [fetchProgress, setFetchProgress] = useState({ fetched: 0, found: 0, running: false });
  const [sortBy, setSortBy] = useState("alpha"); // "alpha" | "reviews" | "rating"
  const [cellOnly, setCellOnly] = useState(false);
  const [crmFilter, setCrmFilter] = useState("all");
  const [crmSearch, setCrmSearch] = useState("");
  const [crmSortBy, setCrmSortBy] = useState("newest"); // "newest" | "alpha" | "reviews" | "rating"
  const [crmCellOnly, setCrmCellOnly] = useState(false);
  const [crmCategoryFilter, setCrmCategoryFilter] = useState("all");
  const [crmCountryFilter, setCrmCountryFilter] = useState("all");
  const [crmCityFilter, setCrmCityFilter] = useState("all");
  const [detailLead, setDetailLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState("finder");
  const [searchMode, setSearchMode] = useState("no_site"); // "no_site" | "outdated_site" | "no_ecommerce"
  const [inspections, setInspections] = useState({}); // place.id -> inspection result
  const [emailLookups, setEmailLookups] = useState({}); // place.id -> { status, reachable, emails }
  const emailLookupsRef = useRef({});
  const emailRunRef = useRef(0); // bumps on each new search so old lookups stop
  const [emailOnly, setEmailOnly] = useState(false);
  const [hideClean, setHideClean] = useState(false); // hide sites that scanned clean (outdated/no_ecommerce modes)

  const toast = useToast();
  const [quota, setQuota] = useState(null);
  const refreshQuota = useCallback(async () => {
    const { data } = await supabase.rpc("my_search_quota");
    if (data && data[0]) setQuota(data[0]);
  }, []);
  useEffect(() => { refreshQuota(); }, [refreshQuota]);

// ── PERSISTENCE ENGINE ────────────────────────────────────────────────────────
const [crmLeads, setCrmLeads] = useState(() => {
  try {
    const saved = localStorage.getItem("mm_empire_v2");
    // If data exists, parse and return it; otherwise start with empty array
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error("Local storage read error:", err);
    return [];
  }
});

// This effect now only runs when leads actually change, 
// and it won't overwrite with [] on startup.
useEffect(() => {
  localStorage.setItem("mm_empire_v2", JSON.stringify(crmLeads));
}, [crmLeads]);

  // Finds emails on each result's website, 4 sites at a time, in the background.
  // A new search bumps emailRunRef so lookups from an older search stop.
  const emailQueueRef = useRef([]);
  const emailActiveRef = useRef(0);
  const lookupEmails = useCallback((places) => {
    const run = emailRunRef.current;
    const todo = places.filter(p => p.websiteUri && !emailLookupsRef.current[p.id]);
    if (!todo.length) return;
    const pending = {};
    todo.forEach(p => { pending[p.id] = { status: "checking", emails: [] }; });
    emailLookupsRef.current = { ...emailLookupsRef.current, ...pending };
    setEmailLookups(prev => ({ ...prev, ...pending }));
    emailQueueRef.current.push(...todo.map(p => ({ p, run })));
    const worker = async () => {
      emailActiveRef.current++;
      while (emailQueueRef.current.length) {
        const { p, run: r } = emailQueueRef.current.shift();
        if (r !== emailRunRef.current) continue;
        const res = await findEmails(p.websiteUri);
        if (r !== emailRunRef.current) continue;
        const done = { status: res.unsupported ? "unsupported" : "done", reachable: res.reachable, emails: res.emails };
        emailLookupsRef.current = { ...emailLookupsRef.current, [p.id]: done };
        setEmailLookups(prev => ({ ...prev, [p.id]: done }));
      }
      emailActiveRef.current--;
    };
    while (emailActiveRef.current < 4) worker();
  }, []);

  // Search with multi-city pagination — bypasses Google's 60-result cap
  const searchPlaces = useCallback(async () => {
    const term = customCategory.trim() || (category !== "__keyword__" ? category : "");
    if (!term) return;
    setLoading(true); setSearchError(null); setResults([]); setSearched(false); setInspections({});
    setEmailLookups({}); emailLookupsRef.current = {}; emailRunRef.current++;
    setFetchProgress({ fetched: 0, found: 0, running: true });
    searchStopRef.current = false;

    const countryData = COUNTRIES.find(c => c.value === country);
    const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,nextPageToken";
    const PAGE_SIZE = 20;

    // Build list of location strings to search across
    let locationQueries = [];
    if (countryData?.hasSub === "sa_cities") {
      if (city === "__any__") {
        // All cities, each expanded to their suburbs
        locationQueries = SA_CITIES.flatMap(c => (SA_CITY_AREAS[c] || [c]).map(area => `${area}, South Africa`));
      } else {
        // Selected city expanded to its suburbs
        const areas = SA_CITY_AREAS[city] || [city];
        locationQueries = areas.map(area => `${area}, South Africa`);
      }
    } else if (countryData?.hasSub === "usa_states") {
      if (usaState === "__any__") {
        locationQueries = USA_STATES.map(s => s);
      } else {
        const cities = USA_STATE_CITIES[usaState] || [usaState];
        locationQueries = cities.map(c => `${c}, ${usaState}`);
      }
    } else if (countryData?.hasSub === "canada_provinces") {
      if (canadaProvince === "__any__") {
        locationQueries = CANADA_PROVINCES.flatMap(p => (CANADA_PROVINCE_CITIES[p] || [p]).map(c => `${c}, ${p}, Canada`));
      } else if (city !== "__any__" && city && CANADA_PROVINCE_CITIES[canadaProvince]?.includes(city)) {
        locationQueries = [`${city}, ${canadaProvince}, Canada`];
      } else {
        const cities = CANADA_PROVINCE_CITIES[canadaProvince] || [canadaProvince];
        locationQueries = cities.map(c => `${c}, ${canadaProvince}, Canada`);
      }
    } else {
      locationQueries = [country];
    }

    const seenIds = new Set();
    let allMatches = [];
    let totalFetched = 0;

    try {
      // One click = one search against the daily limit, however many suburbs it covers
      const { data: qd } = await supabase.rpc("my_search_quota");
      const remaining = qd?.[0]?.remaining ?? 0;
      if (remaining <= 0) throw new Error(`You have used all your searches for today (${qd?.[0]?.daily_limit ?? 0}). The limit resets at midnight.`);
      const MAX_AREAS = 25;
      if (locationQueries.length > MAX_AREAS) {
        toast.show(`This search covers ${locationQueries.length} areas. Searching the first ${MAX_AREAS}. Choose one city for a full search.`);
        locationQueries = locationQueries.slice(0, MAX_AREAS);
      }
      const searchId = crypto.randomUUID();
      for (const locationString of locationQueries) {
        if (searchStopRef.current) break;
        const { data, error } = await supabase.functions.invoke("places-search", { body: { textQuery: `${term} in ${locationString}`, searchId } });
        if (error) {
          let msg = error.message;
          try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch { /* keep default */ }
          throw new Error(msg);
        }
        if (data?.quota) setQuota(q => ({ ...(q || {}), daily_limit: data.quota.limit, used_today: data.quota.used, remaining: data.quota.remaining }));
        const places = data?.places || [];
        totalFetched += places.length;
        const matches = places.filter(p => {
          if (seenIds.has(p.id)) return false;
          if (searchMode === "all") return true;
          const wantsWebsite = searchMode !== "no_site";
          return wantsWebsite ? !!p.websiteUri : !p.websiteUri;
        });
        matches.forEach(p => seenIds.add(p.id));
        const tagged = matches.map(p => ({ ...p, _savedCategory: customCategory.trim() || (category !== "__keyword__" ? category : ""), _area: locationString.split(",")[0] }));
        allMatches = [...allMatches, ...tagged];
        const sorted = [...allMatches].sort((a, b) => (a.displayName?.text || "").localeCompare(b.displayName?.text || ""));
        setResults(sorted);
        setFetchProgress({ fetched: totalFetched, found: allMatches.length, running: true });
        // Start finding emails for this area's results while the next area loads
        lookupEmails(tagged);
      }

      setSearched(true);
    } catch (err) {
      setSearchError(err.message);
      setSearched(true);
    } finally {
      setLoading(false);
      setFetchProgress(p => ({ ...p, running: false }));
      refreshQuota();
    }
  }, [category, city, usaState, canadaProvince, country, customCategory, searchMode, toast, refreshQuota, lookupEmails]);

  const stopSearch = useCallback(() => {
    searchStopRef.current = true;
  }, []);

  // SA cell numbers start with 06x, 07x, 08x (after stripping spaces/+27 prefix)
  const isSACellNumber = (phone) => {
    if (!phone) return false;
    // Normalise: strip spaces, dashes, brackets
    let n = phone.replace(/[\s\-().]/g, "");
    // Convert +27 or 0027 prefix to local 0
    if (n.startsWith("+27")) n = "0" + n.slice(3);
    if (n.startsWith("0027")) n = "0" + n.slice(4);
    return /^0[678]/.test(n);
  };

  const filteredResults = useMemo(() => {
    let list = results;
    if (cellOnly) {
      list = list.filter(p => isSACellNumber(p.nationalPhoneNumber || p.internationalPhoneNumber));
    }
    // Attach inspection results for display
    list = list.map(p => inspections[p.id] ? { ...p, _inspection: inspections[p.id] } : p);
    list = list.map(p => {
      const lk = emailLookups[p.id];
      // A site scan also returns emails, so use those if the email lookup found none
      const scanEmails = inspections[p.id]?.emails || [];
      if (!lk && !scanEmails.length) return p;
      const emails = [...new Set([...(lk?.emails || []), ...scanEmails])];
      const status = scanEmails.length ? "done" : lk.status;
      return { ...p, _emailLookup: { ...(lk || {}), status, reachable: lk?.reachable || !!inspections[p.id]?.reachable, emails } };
    });
    if (emailOnly) list = list.filter(p => p._emailLookup?.emails?.length);
    // Once a site has been inspected, optionally hide ones that don't match the mode's intent
    if (searchMode === "outdated_site" && hideClean) {
      list = list.filter(p => {
        const insp = inspections[p.id];
        if (!insp) return true; // not yet inspected — keep visible
        return insp.outdatedSignals?.length > 0;
      });
    }
    if (searchMode === "no_ecommerce" && hideClean) {
      list = list.filter(p => {
        const insp = inspections[p.id];
        if (!insp) return true;
        return insp.reachable && !insp.hasEcommerce;
      });
    }
    // Apply the same sort order the user sees on screen, so scans run in
    // the displayed order (top-to-bottom).
    list = [...list].sort((a, b) => {
      if (sortBy === "reviews") return (b.userRatingCount || 0) - (a.userRatingCount || 0);
      if (sortBy === "fewest_reviews") return (a.userRatingCount || 0) - (b.userRatingCount || 0);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      return (a.displayName?.text || "").localeCompare(b.displayName?.text || "");
    });
    return list;
  }, [results, cellOnly, inspections, emailLookups, emailOnly, searchMode, hideClean, sortBy]);

  const onInspectResult = useCallback((placeId, result) => {
    setInspections(prev => ({ ...prev, [placeId]: result }));
  }, []);

  const inspectAllVisible = useCallback(async () => {
    // Scan in display order (as shown on screen), skip already-inspected ones
    const toCheck = filteredResults.filter(p => p.websiteUri && !inspections[p.id]);
    if (toCheck.length === 0) { toast.show("All visible sites already scanned ✓"); return; }
    scanStopRef.current = false;
    setScanning(true);
    let done = 0;
    for (const p of toCheck) {
      if (scanStopRef.current) break;
      const r = await inspectSite(p.websiteUri);
      setInspections(prev => ({ ...prev, [p.id]: r }));
      done++;
      if (scanStopRef.current) break;
      await new Promise(res => setTimeout(res, 120));
    }
    setScanning(false);
    toast.show(scanStopRef.current ? `Scan stopped (${done} scanned)` : `Scan complete — ${done} sites checked ✓`);
  }, [filteredResults, inspections, toast]);

  const stopScan = useCallback(() => {
    scanStopRef.current = true;
  }, []);

  const savePlace = useCallback(async (place) => {
    if (crmLeads.find(l => l.id === place.id)) return;
    const name = place.displayName?.text || "Unknown business";
    const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
    const { data: dupes } = await supabase.rpc("check_lead_duplicate", { p_name: name, p_phone: phone, p_website: place.websiteUri || null, p_place_id: place.id });
    const hard = (dupes || []).find(d => d.matched_on !== "name");
    if (hard) { toast.show(`Already in the CRM: ${hard.owner_name}'s lead (same ${hard.matched_on.replace("_", " ")})`); return; }
    const parts = (place.formattedAddress || "").split(",").map(x => x.trim());
    const foundEmails = place._emailLookup?.emails || emailLookupsRef.current[place.id]?.emails || [];
    const email = foundEmails[0] || null;
    const { error } = await supabase.from("leads").insert({
      business_name: name, phone, email, website: place.websiteUri || null, place_id: place.id,
      google_maps_url: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
      rating: place.rating ?? null, review_count: place.userRatingCount ?? null,
      industry: customCategory.trim() || (category !== "__keyword__" ? category : "") || null,
      suburb: place._area || (parts.length > 3 ? parts[parts.length - 4] : null),
      city: COUNTRIES.find(c => c.value === country)?.hasSub === "sa_cities" ? city : null,
      country: country === "South Africa" ? "ZA" : country,
      source: "sales_outreach", owner_id: session.user.id, next_action: "Send first message",
    });
    if (error) { toast.show(error.message.includes("leads_place_id_key") ? "Already in the CRM" : `Could not save: ${error.message}`); return; }
    const score = 55 + Math.round(Math.random() * 35);
    const savedCategory = customCategory.trim() || (category !== "__keyword__" ? category : "");
    const savedCity = COUNTRIES.find(c => c.value === country)?.hasSub === "sa_cities" ? city
      : COUNTRIES.find(c => c.value === country)?.hasSub === "usa_states" ? usaState
      : COUNTRIES.find(c => c.value === country)?.hasSub === "canada_provinces" ? canadaProvince
      : "";
    setCrmLeads(prev => [{ ...place, email: email || undefined, emails: foundEmails, status: "New", score, notes: "", source: "google", country, savedCity, savedCategory, addedAt: new Date().toISOString() }, ...prev]);
    toast.show("Saved to the Micah Mishael CRM ✓");
  }, [crmLeads, country, city, usaState, canadaProvince, category, customCategory, toast, session]);

  const addManual = useCallback((form) => {
    const id = `manual_${Date.now()}`;
    const score = 50 + Math.round(Math.random() * 40);
    setCrmLeads(prev => [{ id, ...form, status: "New", score, addedAt: new Date().toISOString() }, ...prev]);
    toast.show("Lead added ✓");
  }, [toast]);

  const updateLead = useCallback((id, changes) => {
    setCrmLeads(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l));
    setDetailLead(prev => prev?.id === id ? { ...prev, ...changes } : prev);
  }, []);

  const deleteLead = useCallback((id) => {
    setCrmLeads(prev => prev.filter(l => l.id !== id));
    toast.show("Lead removed");
  }, [toast]);

  const filteredCRM = useMemo(() => {
    let list = [...crmLeads];
    if (crmFilter !== "all") list = list.filter(l => l.status === crmFilter);
    if (crmCategoryFilter !== "all") list = list.filter(l => (l.savedCategory || "") === crmCategoryFilter);
    if (crmCountryFilter !== "all") list = list.filter(l => (l.country || "") === crmCountryFilter);
    if (crmCityFilter !== "all") list = list.filter(l => (l.savedCity || "") === crmCityFilter);
    if (crmCellOnly) list = list.filter(l => isSACellNumber(l.nationalPhoneNumber || l.internationalPhoneNumber || l.phone));
    if (crmSearch.trim()) {
      const q = crmSearch.toLowerCase();
      list = list.filter(l => {
        const n = (l.displayName?.text || l.name || "").toLowerCase();
        const c = (l.company || "").toLowerCase();
        const p = (l.nationalPhoneNumber || l.internationalPhoneNumber || l.phone || "").toLowerCase();
        const cat = (l.savedCategory || "").toLowerCase();
        const city = (l.savedCity || "").toLowerCase();
        return n.includes(q) || c.includes(q) || p.includes(q) || cat.includes(q) || city.includes(q);
      });
    }
    // Sort
    list.sort((a, b) => {
      if (crmSortBy === "reviews") return (b.userRatingCount || 0) - (a.userRatingCount || 0);
      if (crmSortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (crmSortBy === "alpha") return (a.displayName?.text || a.name || "").localeCompare(b.displayName?.text || b.name || "");
      // newest (default)
      return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
    });
    return list;
  }, [crmLeads, crmFilter, crmSearch, crmSortBy, crmCellOnly, crmCategoryFilter, crmCountryFilter, crmCityFilter]);

  const stats = useMemo(() => ({
    total: crmLeads.length,
    hot: crmLeads.filter(l => (l.score || 0) >= 80).length,
    closed: crmLeads.filter(l => l.status === "Closed").length,
    google: crmLeads.filter(l => l.source === "google").length,
    manual: crmLeads.filter(l => l.source !== "google").length,
  }), [crmLeads]);

  const crmUniqueCategories = useMemo(() => [...new Set(crmLeads.map(l => l.savedCategory).filter(Boolean))].sort(), [crmLeads]);
  const crmUniqueCountries = useMemo(() => [...new Set(crmLeads.map(l => l.country).filter(Boolean))].sort(), [crmLeads]);
  const crmUniqueCities = useMemo(() => {
    const base = crmLeads.map(l => l.savedCity).filter(Boolean);
    if (crmCountryFilter !== "all") {
      return [...new Set(crmLeads.filter(l => l.country === crmCountryFilter).map(l => l.savedCity).filter(Boolean))].sort();
    }
    return [...new Set(base)].sort();
  }, [crmLeads, crmCountryFilter]);

  const exportCSV = () => {
    const rows = crmLeads.map(l => {
      const name = l.displayName?.text || l.name || "";
      const phone = l.nationalPhoneNumber || l.internationalPhoneNumber || l.phone || "";
      return [name, l.role || "", l.company || "", l.email || "", phone, l.formattedAddress || l.location || "", l.status, l.score || "", l.source || ""].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    downloadFile("mm_leads.csv", ["Name,Role,Company,Email,Phone,Location,Stage,Score,Source", ...rows].join("\n"), "text/csv");
    toast.show("CSV exported ✓");
  };

  // Import leads from a CSV (matching this app's own export columns) or a JSON
  // export. Dedupes against existing CRM entries by name+phone so re-importing
  // the same file twice doesn't create duplicates.
  const importLeads = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let incoming = [];
      try {
        if (/\.json$/i.test(file.name)) {
          const parsed = JSON.parse(e.target.result);
          incoming = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          const rows = parseCSVFile(e.target.result);
          incoming = rows.map((r, i) => ({
            id: `import_${Date.now()}_${i}`,
            name: r.Name || "",
            role: r.Role || "",
            company: r.Company || "",
            email: r.Email || "",
            phone: r.Phone || "",
            location: r.Location || "",
            status: STAGES.includes(r.Stage) ? r.Stage : "New",
            score: r.Score !== "" && !isNaN(Number(r.Score)) ? Number(r.Score) : (50 + Math.round(Math.random() * 40)),
            source: r.Source || "import",
            notes: "",
            savedCategory: r.Role || "",
            addedAt: new Date().toISOString(),
          }));
        }
      } catch (err) {
        toast.show(`Import failed: ${err.message}`);
        return;
      }

      if (incoming.length === 0) { toast.show("No rows found in that file"); return; }

      setCrmLeads(prev => {
        const existingKeys = new Set(prev.map(l => {
          const n = (l.displayName?.text || l.name || "").toLowerCase().trim();
          const p = (l.nationalPhoneNumber || l.internationalPhoneNumber || l.phone || "").replace(/\D/g, "");
          return `${n}|${p}`;
        }));
        let added = 0;
        const toAdd = [];
        incoming.forEach(l => {
          const n = (l.displayName?.text || l.name || "").toLowerCase().trim();
          const p = (l.nationalPhoneNumber || l.internationalPhoneNumber || l.phone || "").replace(/\D/g, "");
          const key = `${n}|${p}`;
          if (!n || existingKeys.has(key)) return;
          existingKeys.add(key);
          toAdd.push({
            id: l.id || `import_${Date.now()}_${added}`,
            status: STAGES.includes(l.status) ? l.status : "New",
            addedAt: l.addedAt || new Date().toISOString(),
            ...l,
          });
          added++;
        });
        toast.show(added > 0 ? `Imported ${added} lead${added === 1 ? "" : "s"} ✓` : "No new leads — all rows already in CRM");
        return added > 0 ? [...toAdd, ...prev] : prev;
      });
    };
    reader.readAsText(file);
  }, [toast]);

  // __keyword__ = use customCategory only, no industry prefix
  const effectiveCategory = category === "__keyword__" ? "" : category;
  const activeSearchTerm = customCategory.trim() || effectiveCategory;
  const canSearch = !!(customCategory.trim() || effectiveCategory);

  const tabStyle = active => ({
    fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700,
    padding: "10px 22px", borderRadius: 5, border: "none", cursor: "pointer",
    background: active ? "#C9A84C" : "rgba(160,120,40,0.05)",
    color: active ? "#1A1712" : "#5A5248", transition: "all 0.2s",
  });
  const inputStyle = { width: "100%", background: "rgba(160,120,40,0.06)", border: "1px solid rgba(160,120,40,0.1)", borderRadius: 5, color: "#1A1712", padding: "12px 14px", fontFamily: "'Montserrat', sans-serif", fontSize: 13, outline: "none" };
  const labelStyle = { fontSize: 10, fontWeight: 700, color: "rgba(26,23,18,0.3)", display: "block", marginBottom: 7, letterSpacing: "0.1em", fontFamily: "'Montserrat', sans-serif" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #FAFAF7; min-height: 100%; font-family: 'Montserrat', sans-serif; color: #1A1712; }
        #root { min-height: 100%; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(160,120,40,0.15); border-radius: 10px; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        select option { background: #FAFAF7; color: #1A1712; }
        input::placeholder, textarea::placeholder { color: rgba(26,23,18,0.2); }
        input, select, textarea, button { font-family: inherit; }
      `}</style>

      <Toast msg={toast.msg} visible={toast.visible} />
      {showAddModal && <AddManualModal onClose={() => setShowAddModal(false)} onAdd={addManual} />}
      {detailLead && <CRMDetail lead={detailLead} onUpdate={updateLead} onDelete={deleteLead} onClose={() => setDetailLead(null)} onToast={toast.show} />}

      <div style={{ minHeight: "100vh", background: "#FAFAF7", backgroundImage: "radial-gradient(ellipse 80% 40% at 50% -5%, rgba(160,120,40,0.1) 0%, transparent 60%)", color: "#1A1712", fontFamily: "'Montserrat', sans-serif" }}>
        <div style={{ padding: "0 0 80px" }}>
        <div style={{ maxWidth: 1500, margin: "0 auto", padding: "0 24px" }}>

          {/* HEADER */}
          <header style={{ padding: "30px 0 24px", animation: "fadeSlideIn 0.5s ease forwards", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid rgba(160,120,40,0.05)", marginBottom: 28 }}>
            <div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#A07828", marginBottom: 8 }}>MICAH MISHAEL · LEAD INTELLIGENCE</div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.3px" }}>
                Lead <span style={{ background: "linear-gradient(135deg, #7A5C1A 0%, #A07828 40%, #A07828 60%, #A07828 80%, #7A5C1A 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Empire</span> <span style={{ color: "rgba(26,23,18,0.12)" }}>Pro</span>
              </h1>
              <div style={{ fontSize: 12, color: "#9A9186", marginTop: 5, fontFamily: "'Montserrat', sans-serif" }}>Find · Save · Close · Export</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div title="Searches left today. One click on Search = one search." style={{ fontSize: 11, fontWeight: 700, padding: "8px 12px", borderRadius: 5, border: "1px solid rgba(160,120,40,0.2)", color: quota && quota.remaining === 0 ? "#B23B3B" : "#5A5248" }}>
                {quota ? `${quota.remaining} of ${quota.daily_limit} searches left today` : "Checking searches…"}
              </div>
              {CRM_URL && <a href={CRM_URL} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, padding: "8px 12px", borderRadius: 5, background: "#1A1712", color: "#FAFAF7", textDecoration: "none" }}>Open CRM ↗</a>}
              <button onClick={onLogout} style={{ fontSize: 11, padding: "8px 12px", borderRadius: 5, border: "1px solid rgba(160,120,40,0.15)", background: "transparent", cursor: "pointer", color: "#5A5248" }}>Log out {profile?.full_name ? `(${profile.full_name.split(" ")[0]})` : ""}</button>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, color: "#9A9186", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A07828", animation: "pulse 2s infinite" }} />
                {stats.total} leads · {stats.closed} closed
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) importLeads(file);
                  e.target.value = "";
                }}
              />
              <button onClick={() => importInputRef.current?.click()} style={{ background: "rgba(160,120,40,0.04)", border: "1px solid rgba(160,120,40,0.09)", color: "#5A5248", padding: "8px 14px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>↑ Import</button>
              <button onClick={exportCSV} disabled={!crmLeads.length} style={{ background: "rgba(160,120,40,0.04)", border: "1px solid rgba(160,120,40,0.09)", color: crmLeads.length ? "#5A5248" : "#9A9186", padding: "8px 14px", borderRadius: 5, fontSize: 11, cursor: crmLeads.length ? "pointer" : "default", fontFamily: "'Montserrat', sans-serif" }}>↓ CSV</button>
              <button onClick={() => { downloadFile("mm_leads.json", JSON.stringify(crmLeads, null, 2), "application/json"); toast.show("JSON exported ✓"); }} disabled={!crmLeads.length} style={{ background: "rgba(160,120,40,0.04)", border: "1px solid rgba(160,120,40,0.09)", color: crmLeads.length ? "#5A5248" : "#9A9186", padding: "8px 14px", borderRadius: 5, fontSize: 11, cursor: crmLeads.length ? "pointer" : "default", fontFamily: "'Montserrat', sans-serif" }}>↓ JSON</button>
              <button onClick={() => { if (crmLeads.length === 0) return; if (window.confirm(`Delete all ${crmLeads.length} leads? This cannot be undone.`)) { setCrmLeads([]); toast.show("CRM cleared"); } }} disabled={!crmLeads.length} style={{ background: "rgba(224,82,82,0.07)", border: "1px solid rgba(224,82,82,0.18)", color: crmLeads.length ? "#E05252" : "#9A9186", padding: "8px 14px", borderRadius: 5, fontSize: 11, cursor: crmLeads.length ? "pointer" : "default", fontFamily: "'Montserrat', sans-serif" }}>✕ Clear saved list</button>
            </div>
          </header>

          {/* TABS */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
            <button style={tabStyle(activeTab === "finder")} onClick={() => setActiveTab("finder")}>🔭 Lead Finder</button>
            <button style={tabStyle(activeTab === "crm")} onClick={() => setActiveTab("crm")}>
              📋 Saved leads {crmLeads.length > 0 && <span style={{ marginLeft: 6, background: "rgba(0,0,0,0.2)", padding: "1px 7px", borderRadius: 5, fontSize: 11 }}>{crmLeads.length}</span>}
            </button>
          </div>

          {/* ════ FINDER TAB ════ */}
          {activeTab === "finder" && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 280px) 1fr", gap: 24, alignItems: "start" }}>

              {/* Controls sidebar */}
              <div style={{ position: "sticky", top: 20 }}>
                <div style={{ background: "#F4F1EB", border: "1px solid rgba(160,120,40,0.18)", boxShadow: "0 1px 4px rgba(26,23,18,0.06)", borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 700, color: "#A07828", letterSpacing: "0.15em" }}>PROSPECTING</div>

                  <div>
                    <label style={labelStyle}>LEAD TYPE</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {SEARCH_MODES.map(m => (
                        <button key={m.id} onClick={() => {
                          setSearchMode(m.id); setResults([]); setSearched(false); setInspections({});
                        }} title={m.hint} style={{
                          display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
                          background: searchMode === m.id ? "rgba(160,120,40,0.10)" : "rgba(160,120,40,0.03)",
                          border: `1px solid ${searchMode === m.id ? "rgba(160,120,40,0.4)" : "rgba(160,120,40,0.07)"}`,
                          borderRadius: 5, padding: "10px 12px", cursor: "pointer", transition: "all 0.15s",
                        }}>
                          <span style={{ fontSize: 14, color: searchMode === m.id ? "#A07828" : "#9A9186", lineHeight: 1.4 }}>{m.icon}</span>
                          <span>
                            <div style={{ fontSize: 12, fontWeight: 700, color: searchMode === m.id ? "#1A1712" : "#5A5248", fontFamily: "'Montserrat', sans-serif" }}>{m.label}</div>
                            <div style={{ fontSize: 10, color: "#9A9186", marginTop: 2, fontFamily: "'Montserrat', sans-serif", lineHeight: 1.4 }}>{m.hint}</div>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>COUNTRY</label>
                    <select value={country} onChange={e => {
                      setCountry(e.target.value);
                      setResults([]); setSearched(false);
                    }} style={inputStyle}>
                      {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  {COUNTRIES.find(c => c.value === country)?.hasSub === "sa_cities" && (
                    <div>
                      <label style={labelStyle}>CITY</label>
                      <select value={city} onChange={e => setCity(e.target.value)} style={inputStyle}>
                        <option value="__any__">🌍 Any city (search all)</option>
                        {SA_CITIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  )}

                  {COUNTRIES.find(c => c.value === country)?.hasSub === "usa_states" && (
                    <div>
                      <label style={labelStyle}>STATE</label>
                      <select value={usaState} onChange={e => setUsaState(e.target.value)} style={inputStyle}>
                        <option value="__any__">🇺🇸 Any state (search all)</option>
                        {USA_STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  {COUNTRIES.find(c => c.value === country)?.hasSub === "canada_provinces" && (
                    <div>
                      <label style={labelStyle}>PROVINCE</label>
                      <select value={canadaProvince} onChange={e => { setCanadaProvince(e.target.value); setCity("__any__"); }} style={inputStyle}>
                        <option value="__any__">🍁 Any province (search all)</option>
                        {CANADA_PROVINCES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  )}

                  {COUNTRIES.find(c => c.value === country)?.hasSub === "canada_provinces" && canadaProvince !== "__any__" && (
                    <div>
                      <label style={labelStyle}>CITY</label>
                      <select value={city} onChange={e => setCity(e.target.value)} style={inputStyle}>
                        <option value="__any__">🏙 Any city in {canadaProvince}</option>
                        {(CANADA_PROVINCE_CITIES[canadaProvince] || []).map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>INDUSTRY</label>
                    <select value={category} onChange={e => { setCategory(e.target.value); setCustomCategory(""); }} style={inputStyle}>
                      <option value="">— Select category —</option>
                      <option value="__keyword__">✏️ Use keyword only (no industry)</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{searchMode === "no_ecommerce" && RETAIL_CATEGORIES.has(c) ? `🛍️ ${c}` : c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>CUSTOM KEYWORD</label>
                    <input
                      value={customCategory}
                      onChange={e => { setCustomCategory(e.target.value); setCategory(""); }}
                      placeholder={searchMode === "no_ecommerce" ? "e.g. Bakery, Boutique, Florist…" : "e.g. Roofers, Welders…"}
                      style={inputStyle}
                      onKeyDown={e => e.key === "Enter" && canSearch && searchPlaces()}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={searchPlaces} disabled={loading || !canSearch} style={{
                      flex: 1,
                      background: (canSearch && !loading) ? "#C9A84C" : "rgba(160,120,40,0.06)",
                      color: (canSearch && !loading) ? "#1A1712" : "#9A9186",
                      border: "none", borderRadius: 5, padding: "14px 0",
                      fontWeight: 700, fontSize: 14, cursor: (loading || !canSearch) ? "default" : "pointer",
                      fontFamily: "'Montserrat', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s",
                    }}>
                      {loading
                        ? <><span style={{ width: 14, height: 14, border: "2px solid #FAFAF7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> {fetchProgress.fetched > 0 ? `Fetched ${fetchProgress.fetched}…` : "Searching…"}</>
                        : "🔍 Find Prospects"}
                    </button>
                    {loading && (
                      <button onClick={stopSearch} title="Stop searching and keep current results" style={{
                        background: "rgba(160,120,40,0.10)", border: "1px solid rgba(160,120,40,0.35)",
                        color: "#A07828", borderRadius: 5, padding: "0 18px",
                        fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
                      }}>■ Stop</button>
                    )}
                  </div>

                  {/* Divider + manual */}
                  <div style={{ borderTop: "1px solid rgba(160,120,40,0.06)", paddingTop: 16 }}>
                    <div style={{ fontSize: 10, color: "#9A9186", letterSpacing: "0.1em", marginBottom: 10, fontFamily: "'Montserrat', sans-serif" }}>OTHER LEAD SOURCES</div>
                    <button onClick={() => setShowAddModal(true)} style={{ width: "100%", background: "rgba(160,120,40,0.07)", border: "1px solid rgba(160,120,40,0.18)", color: "#A07828", borderRadius: 5, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", marginBottom: 8 }}>
                      + Add Lead Manually
                    </button>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {MANUAL_SOURCES.slice(0, 4).map(s => (
                        <button key={s.id} onClick={() => setShowAddModal(true)} title={s.hint} style={{ background: "#F4F1EB", boxShadow: "0 1px 4px rgba(26,23,18,0.06)", color: "#5A5248", borderRadius: 5, padding: "8px 6px", fontSize: 11, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", transition: "all 0.15s", textAlign: "center" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#A07828"; e.currentTarget.style.borderColor = "rgba(160,120,40,0.25)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#5A5248"; e.currentTarget.style.borderColor = "rgba(160,120,40,0.07)"; }}>
                          {s.icon}<br /><span style={{ fontSize: 10 }}>{s.label.split("/")[0].trim()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div style={{ minWidth: 0 }}>
                {searchError && (
                  <div style={{ background: "rgba(224,82,82,0.09)", border: "1px solid rgba(224,82,82,0.2)", borderRadius: 5, padding: "14px 18px", color: "#E05252", fontSize: 13, marginBottom: 16, fontFamily: "'Montserrat', sans-serif" }}>
                    ⚠ {searchError}
                  </div>
                )}

                {/* Pagination progress bar */}
                {loading && fetchProgress.fetched > 0 && (
                  <div style={{ marginBottom: 16, background: "rgba(160,120,40,0.03)", border: "1px solid rgba(160,120,40,0.06)", borderRadius: 5, padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, color: "#A07828" }}>
                        🔄 Scanning cities…
                      </span>
                      <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, color: "#5A5248" }}>
                        {fetchProgress.fetched} scanned · <span style={{ color: "#A07828" }}>{fetchProgress.found} {searchMode === "all" ? "" : searchMode === "no_site" ? "no-site " : "matching "}leads</span>
                      </span>
                    </div>
                    <div style={{ height: 3, background: "rgba(160,120,40,0.06)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${Math.min((fetchProgress.fetched / 1000) * 100, 100)}%`,
                        background: "linear-gradient(90deg, #7A5C1A, #A07828, #A07828)",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", marginTop: 7 }}>
                      Multi-city search active · results appear as each city loads
                    </div>
                  </div>
                )}

                {searched && !searchError && (
                  <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 15 }}>
                      <span style={{ color: "#A07828" }}>{filteredResults.length}</span>
                      {(cellOnly || emailOnly) && results.length !== filteredResults.length && (
                        <span style={{ fontSize: 11, color: "#5A5248", fontFamily: "'Montserrat', sans-serif" }}> of {results.length}</span>
                      )}
                      {" "}{searchMode === "all" ? "" : searchMode === "no_site" ? "website-less " : searchMode === "outdated_site" ? "websites to scan for " : "stores to scan for "}{activeSearchTerm}s in {COUNTRIES.find(c => c.value === country)?.hasSub === "usa_states" ? usaState : COUNTRIES.find(c => c.value === country)?.hasSub === "canada_provinces" ? canadaProvince : COUNTRIES.find(c => c.value === country)?.hasSub === "sa_cities" ? city : country}
                      {fetchProgress.fetched > 20 && <span style={{ fontSize: 11, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", marginLeft: 10 }}>from {fetchProgress.fetched} scanned</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      {/* Cell only toggle */}
                      <button onClick={() => setCellOnly(v => !v)} title="Show only SA cell numbers (06x / 07x / 08x)" style={{
                        fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                        background: cellOnly ? "rgba(160,120,40,0.15)" : "rgba(160,120,40,0.04)",
                        border: `1px solid ${cellOnly ? "rgba(160,120,40,0.45)" : "rgba(160,120,40,0.07)"}`,
                        color: cellOnly ? "#A07828" : "#5A5248", cursor: "pointer", transition: "all 0.15s",
                      }}>📱 Cell Only</button>
                      {searchMode !== "no_site" && (
                        <button onClick={() => setEmailOnly(v => !v)} title="Show only businesses with an email found on their website" style={{
                          fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                          background: emailOnly ? "rgba(160,120,40,0.15)" : "rgba(160,120,40,0.04)",
                          border: `1px solid ${emailOnly ? "rgba(160,120,40,0.45)" : "rgba(160,120,40,0.07)"}`,
                          color: emailOnly ? "#A07828" : "#5A5248", cursor: "pointer", transition: "all 0.15s",
                        }}>✉ Has Email{(() => { const n = Object.values(emailLookups).filter(l => l.emails?.length).length; const c = Object.values(emailLookups).filter(l => l.status === "checking").length; return ` (${n}${c ? `, ${c} checking` : ""})`; })()}</button>
                      )}
                      {(searchMode === "outdated_site" || searchMode === "no_ecommerce") && (
                        <>
                          <button onClick={() => setHideClean(v => !v)} title="Show only sites flagged as outdated / missing a store" style={{
                            fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                            background: hideClean ? "rgba(160,120,40,0.15)" : "rgba(160,120,40,0.04)",
                            border: `1px solid ${hideClean ? "rgba(160,120,40,0.45)" : "rgba(160,120,40,0.07)"}`,
                            color: hideClean ? "#A07828" : "#5A5248", cursor: "pointer", transition: "all 0.15s",
                          }}>{searchMode === "outdated_site" ? "Show Only Outdated" : "Show Only No-Store"}</button>
                          {scanning ? (
                            <button onClick={stopScan} title="Stop scanning" style={{
                              fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                              background: "rgba(160,120,40,0.10)", border: "1px solid rgba(160,120,40,0.35)",
                              color: "#A07828", cursor: "pointer", transition: "all 0.15s",
                            }}>■ Stop Scan</button>
                          ) : (
                            <button onClick={inspectAllVisible} style={{
                              fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                              background: "rgba(122,92,26,0.10)", border: "1px solid rgba(122,92,26,0.3)",
                              color: "#7A5C1A", cursor: "pointer", transition: "all 0.15s",
                            }}>⌕ Scan All Visible</button>
                          )}
                        </>
                      )}
                      {[
                        { key: "alpha", label: "A→Z" },
                        { key: "reviews", label: "Most Reviews" },
                        { key: "fewest_reviews", label: "Fewest Reviews" },
                        { key: "rating", label: "Top Rated" },
                      ].map(s => (
                        <button key={s.key} onClick={() => setSortBy(s.key)} style={{
                          fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                          background: sortBy === s.key ? "rgba(160,120,40,0.12)" : "rgba(160,120,40,0.04)",
                          border: `1px solid ${sortBy === s.key ? "rgba(160,120,40,0.4)" : "rgba(160,120,40,0.07)"}`,
                          color: sortBy === s.key ? "#A07828" : "#5A5248", cursor: "pointer", transition: "all 0.15s",
                        }}>{s.label}</button>
                      ))}
                      {filteredResults.length > 0 && (
                        <button onClick={() => { filteredResults.filter(p => !crmLeads.find(l => l.id === p.id)).forEach(p => savePlace(p)); toast.show("All saved to CRM ✓"); }} style={{ background: "rgba(160,120,40,0.09)", border: "1px solid rgba(160,120,40,0.22)", color: "#A07828", padding: "5px 16px", borderRadius: 32, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
                          Save All
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {searched && filteredResults.length === 0 && !loading && !searchError && (
                  <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(26,23,18,0.15)", border: "1px dashed rgba(160,120,40,0.05)", borderRadius: 16 }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
                      {cellOnly && results.length > 0 ? "No cell number leads in these results." : hideClean && results.length > 0 ? "No matches left after scanning." : searchMode === "all" ? "No businesses found." : searchMode === "no_site" ? "No website-less businesses found." : searchMode === "outdated_site" ? "No businesses with websites found." : "No retail businesses with websites found."}
                    </div>
                    <div style={{ fontSize: 12, color: "#9A9186", marginTop: 6, fontFamily: "'Montserrat', sans-serif" }}>
                      {cellOnly && results.length > 0 ? "Turn off Cell Only to see all leads." : hideClean && results.length > 0 ? "Turn off the hide toggle to see everything." : "Try a different category or city."}
                    </div>
                  </div>
                )}

                {!searched && !loading && (
                  <div style={{ textAlign: "center", padding: "100px 20px", color: "rgba(26,23,18,0.12)", border: "1px dashed rgba(160,120,40,0.05)", borderRadius: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>🔭</div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 500 }}>
                      {searchMode === "all" ? "Search any business — no filters" : searchMode === "no_site" ? "Find businesses without websites" : searchMode === "outdated_site" ? "Find businesses with outdated websites" : "Find retail without an online store"}
                    </div>
                    <div style={{ fontSize: 12, color: "#9A9186", marginTop: 8, fontFamily: "'Montserrat', sans-serif" }}>
                      {searchMode === "all" ? "Pick a city + category → get every match" : searchMode === "no_site" ? "Pick a city + category → pitch them a website" : searchMode === "outdated_site" ? "Search, then tap “Re-check site” or “Scan All Visible”" : "Search, then scan to flag stores with no cart / checkout"}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredResults.map((place, i) => (
                    <PlaceCard key={place.id || i} place={place} index={i} onSave={savePlace} isSaved={crmLeads.some(l => l.id === place.id)} onToast={toast.show} mode={searchMode} onInspectResult={onInspectResult} />
                  ))}
                </div>
              </div>
            </div>
          )}

          </div>{/* end maxWidth container */}

          {/* ════ CRM TAB ════ */}
          {activeTab === "crm" && (
            <div style={{ padding: "0 24px" }}>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
                {[
                  { label: "Total", value: stats.total, color: "#1A1712" },
                  { label: "Hot (80+)", value: stats.hot, color: "#A07828" },
                  { label: "Closed", value: stats.closed, color: "#A07828" },
                  { label: "From Google", value: stats.google, color: "#7A5C1A" },
                  { label: "Manual", value: stats.manual, color: "#A07828" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#F4F1EB", border: "1px solid rgba(160,120,40,0.18)", borderRadius: 8, padding: "13px 15px" }}>
                    <div style={{ fontSize: 9, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", marginBottom: 6, letterSpacing: "0.1em" }}>{s.label.toUpperCase()}</div>
                    <div style={{ fontSize: 28, fontWeight: 500, fontFamily: "'Montserrat', sans-serif", color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
                <input value={crmSearch} onChange={e => setCrmSearch(e.target.value)} placeholder="Search by name, company, phone, category…" style={{ flex: 1, minWidth: 180, background: "rgba(160,120,40,0.05)", border: "1px solid rgba(160,120,40,0.09)", borderRadius: 5, color: "#1A1712", padding: "10px 14px", fontFamily: "'Montserrat', sans-serif", fontSize: 13, outline: "none" }} />

                {/* Country filter */}
                {crmUniqueCountries.length > 0 && (
                  <select value={crmCountryFilter} onChange={e => { setCrmCountryFilter(e.target.value); setCrmCityFilter("all"); }} style={{ background: "rgba(160,120,40,0.05)", border: "1px solid rgba(160,120,40,0.09)", borderRadius: 5, color: crmCountryFilter !== "all" ? "#A07828" : "#5A5248", padding: "9px 12px", fontFamily: "'Montserrat', sans-serif", fontSize: 11, outline: "none", cursor: "pointer" }}>
                    <option value="all">🌍 All Countries</option>
                    {crmUniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}

                {/* City filter */}
                {crmUniqueCities.length > 0 && (
                  <select value={crmCityFilter} onChange={e => setCrmCityFilter(e.target.value)} style={{ background: "rgba(160,120,40,0.05)", border: "1px solid rgba(160,120,40,0.09)", borderRadius: 5, color: crmCityFilter !== "all" ? "#A07828" : "#5A5248", padding: "9px 12px", fontFamily: "'Montserrat', sans-serif", fontSize: 11, outline: "none", cursor: "pointer" }}>
                    <option value="all">📍 All Cities</option>
                    {crmUniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}

                {/* Category filter */}
                {crmUniqueCategories.length > 0 && (
                  <select value={crmCategoryFilter} onChange={e => setCrmCategoryFilter(e.target.value)} style={{ background: "rgba(160,120,40,0.05)", border: "1px solid rgba(160,120,40,0.09)", borderRadius: 5, color: crmCategoryFilter !== "all" ? "#A07828" : "#5A5248", padding: "9px 12px", fontFamily: "'Montserrat', sans-serif", fontSize: 11, outline: "none", cursor: "pointer" }}>
                    <option value="all">🏷 All Categories</option>
                    {crmUniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>

              {/* Stage filters + sort + add */}
              <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
                  {["all", ...STAGES].map(f => (
                    <button key={f} onClick={() => setCrmFilter(f)} style={{
                      fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                      background: crmFilter === f ? "rgba(160,120,40,0.12)" : "rgba(160,120,40,0.04)",
                      border: `1px solid ${crmFilter === f ? "rgba(160,120,40,0.4)" : "rgba(160,120,40,0.07)"}`,
                      color: crmFilter === f ? "#A07828" : "#5A5248", cursor: "pointer", transition: "all 0.15s",
                    }}>{f === "all" ? "All" : f}</button>
                  ))}
                </div>

                {/* Sort buttons */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9, color: "#9A9186", letterSpacing: "0.08em" }}>SORT</span>
                  {[
                    { key: "newest", label: "Newest" },
                    { key: "alpha", label: "A→Z" },
                    { key: "reviews", label: "Most Reviews" },
                    { key: "fewest_reviews", label: "Fewest Reviews" },
                    { key: "rating", label: "Top Rated" },
                  ].map(s => (
                    <button key={s.key} onClick={() => setCrmSortBy(s.key)} style={{
                      fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                      background: crmSortBy === s.key ? "rgba(160,120,40,0.12)" : "rgba(160,120,40,0.04)",
                      border: `1px solid ${crmSortBy === s.key ? "rgba(160,120,40,0.4)" : "rgba(160,120,40,0.07)"}`,
                      color: crmSortBy === s.key ? "#A07828" : "#5A5248", cursor: "pointer", transition: "all 0.15s",
                    }}>{s.label}</button>
                  ))}
                  <button onClick={() => setCrmCellOnly(v => !v)} title="Show only SA cell numbers (06x / 07x / 08x)" style={{
                    fontFamily: "'Montserrat', sans-serif", fontSize: 10, padding: "5px 12px", borderRadius: 32,
                    background: crmCellOnly ? "rgba(160,120,40,0.15)" : "rgba(160,120,40,0.04)",
                    border: `1px solid ${crmCellOnly ? "rgba(160,120,40,0.45)" : "rgba(160,120,40,0.07)"}`,
                    color: crmCellOnly ? "#A07828" : "#5A5248", cursor: "pointer", transition: "all 0.15s",
                  }}>📱 Cell Only</button>
                </div>

                <button onClick={() => setShowAddModal(true)} style={{ background: "#C9A84C", color: "#1A1712", border: "none", padding: "10px 20px", borderRadius: 5, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", whiteSpace: "nowrap" }}>+ Add Lead</button>
              </div>

              {filteredCRM.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px", color: "rgba(26,23,18,0.12)", border: "1px dashed rgba(160,120,40,0.05)", borderRadius: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
                    {crmLeads.length === 0 ? "No leads yet." : "No leads match your filter."}
                  </div>
                  <div style={{ fontSize: 12, color: "#9A9186", marginTop: 6, fontFamily: "'Montserrat', sans-serif" }}>
                    {crmLeads.length === 0 ? "Use the Lead Finder tab or add manually." : "Try clearing filters."}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 10 }}>
                  {filteredCRM.map(lead => (
                    <CRMCard key={lead.id} lead={lead} onUpdate={updateLead} onDelete={deleteLead} onClick={() => setDetailLead(lead)} onToast={toast.show} />
                  ))}
                </div>
              )}
            </div>
          )}

          <footer style={{ marginTop: 60, textAlign: "center", fontSize: 11, color: "#9A9186", fontFamily: "'Montserrat', sans-serif", padding: "0 24px" }}>
            Micah Mishael · Lead Empire Pro · Powered by Google Places API · v2.0
          </footer>
        </div>
      </div>
    </>
  );
}


// ── LOGIN GATE ────────────────────────────────────────────────────────────────
// Uses the same accounts as the CRM. Only active users can search.
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from("profiles").select("full_name, role, active, must_change_password").eq("id", session.user.id).single().then(({ data }) => setProfile(data));
  }, [session]);

  async function login(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) setErr(error.message === "Invalid login credentials" ? "The email or password is wrong." : error.message);
  }

  const box = { boxSizing: "border-box", width: "calc(100% - 32px)", maxWidth: 380, margin: "12vh auto", padding: 28, background: "#fff", border: "1px solid rgba(160,120,40,0.15)", borderRadius: 6, fontFamily: "'Montserrat', sans-serif", color: "#1A1712" };
  const inp = { boxSizing: "border-box", display: "block", width: "100%", padding: "11px 12px", border: "1px solid rgba(160,120,40,0.2)", borderRadius: 5, fontSize: 14, marginTop: 6 };
  const btn = { width: "100%", padding: "12px", background: "#1A1712", color: "#FAFAF7", border: "none", borderRadius: 5, fontWeight: 700, cursor: "pointer", marginTop: 14 };

  if (!ready) return null;
  if (!session) {
    return (
      <form style={box} onSubmit={login}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "#A07828" }}>MICAH MISHAEL · LEAD FINDER</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, margin: "8px 0 16px" }}>Log in</h1>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Email<input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
        <div style={{ height: 10 }} />
        <label style={{ fontSize: 12, fontWeight: 600 }}>Password<input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {err && <div style={{ color: "#B23B3B", fontSize: 13, marginTop: 10 }}>{err}</div>}
        <button style={btn} disabled={busy}>{busy ? "Please wait…" : "Log in"}</button>
        <p style={{ fontSize: 12, color: "#9A9186", marginTop: 12 }}>Use your Micah Mishael CRM login.</p>
      </form>
    );
  }
  if (!profile) return <div style={box}>Loading…</div>;
  if (!profile.active || profile.must_change_password) {
    return (
      <div style={box}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26 }}>{profile.active ? "Set your password first" : "Your account is not active"}</h2>
        <p style={{ fontSize: 13, color: "#5A5248", margin: "10px 0" }}>{profile.active ? "Log in to the CRM once and choose your own password, then come back." : "Ask Mishael to activate your account."}</p>
        {CRM_URL && profile.active && <a href={CRM_URL} style={{ ...btn, display: "block", textAlign: "center", textDecoration: "none" }}>Open the CRM</a>}
        <button style={{ ...btn, background: "transparent", color: "#1A1712", border: "1px solid #ccc" }} onClick={() => supabase.auth.signOut()}>Log out</button>
      </div>
    );
  }
  return <LeadFinder session={session} profile={profile} onLogout={() => supabase.auth.signOut()} />;
}
