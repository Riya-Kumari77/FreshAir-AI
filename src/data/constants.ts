import type { LocationInfo, UserProfile } from '../types/freshair';

export const PRESET_LOCATIONS: LocationInfo[] = [
  {
    id: 'preset-delhi',
    name: 'New Delhi',
    region: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'preset-gurugram',
    name: 'Gurugram',
    region: 'Haryana',
    country: 'India',
    latitude: 28.4595,
    longitude: 77.0266,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'preset-mumbai',
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'preset-bengaluru',
    name: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'preset-kolkata',
    name: 'Kolkata',
    region: 'West Bengal',
    country: 'India',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'preset-hyderabad',
    name: 'Hyderabad',
    region: 'Telangana',
    country: 'India',
    latitude: 17.385,
    longitude: 78.4867,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'preset-london',
    name: 'London',
    region: 'England',
    country: 'United Kingdom',
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: 'Europe/London',
  },
  {
    id: 'preset-sf',
    name: 'San Francisco',
    region: 'California',
    country: 'United States',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
  },
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Riya',
  language: 'en',
  temperatureUnit: 'C',
  defaultLocation: PRESET_LOCATIONS[0],
  householdGroup: 'mixed_family',
  respiratorySensitivity: 'mild',
  commuteMode: 'public_transit',
  dailyCommuteKm: 14,
  hasAirPurifier: true,
  cookingFuel: 'lpg_png',
};

export interface TransportModeFactor {
  id: string;
  label: string;
  labelHi: string;
  gramsCo2PerKm: number;
  basis: string;
}

/**
 * Transparent reference emission factors (grams CO2e per passenger-km).
 * Sources: India GHG Program (WRI India) & UK DEFRA 2024 passenger transport conversion ranges.
 */
export const BASELINE_TRANSPORT_MODES: TransportModeFactor[] = [
  {
    id: 'petrol_car',
    label: 'Solo Petrol Car',
    labelHi: 'अकेली पेट्रोल कार',
    gramsCo2PerKm: 170,
    basis: 'Average compact/mid-size urban petrol passenger car (~170 g CO2e/p-km).',
  },
  {
    id: 'diesel_suv',
    label: 'Diesel SUV / Large Car',
    labelHi: 'डीजल SUV / बड़ी कार',
    gramsCo2PerKm: 210,
    basis: 'Average urban diesel SUV single-occupancy (~210 g CO2e/p-km).',
  },
  {
    id: 'petrol_scooter',
    label: 'Petrol Two-Wheeler',
    labelHi: 'पेट्रोल दोपहिया वाहन',
    gramsCo2PerKm: 65,
    basis: 'Standard 110–150cc urban petrol scooter/motorcycle (~65 g CO2e/p-km).',
  },
];

export const ALTERNATIVE_TRANSPORT_MODES: TransportModeFactor[] = [
  {
    id: 'metro_rail',
    label: 'Metro / Urban Rail',
    labelHi: 'मेट्रो / शहरी रेल',
    gramsCo2PerKm: 35,
    basis: 'Grid-powered urban metro rail per passenger-km (~35 g CO2e/p-km).',
  },
  {
    id: 'city_bus',
    label: 'CNG / Electric City Bus',
    labelHi: 'CNG / इलेक्ट्रिक सिटी बस',
    gramsCo2PerKm: 50,
    basis: 'Shared urban CNG/electric transit bus average occupancy (~50 g CO2e/p-km).',
  },
  {
    id: 'ev_two_wheeler',
    label: 'Electric Scooter / E-Auto',
    labelHi: 'इलेक्ट्रिक स्कूटर / ई-ऑटो',
    gramsCo2PerKm: 22,
    basis: 'Grid-charged light EV per passenger-km (~22 g CO2e/p-km).',
  },
  {
    id: 'carpool_3',
    label: 'Carpool (3+ riders)',
    labelHi: 'कारपूल (3+ यात्री)',
    gramsCo2PerKm: 57,
    basis: 'Petrol car emissions split equally across 3 commuters (~57 g CO2e/p-km).',
  },
  {
    id: 'walk_cycle',
    label: 'Walking / Cycling',
    labelHi: 'पैदल चलना / साइकिल चलाना',
    gramsCo2PerKm: 0,
    basis: 'Zero direct tailpipe emissions (0 g CO2e/p-km).',
  },
];

export interface QuickSustainableAction {
  id: string;
  label: string;
  labelHi: string;
  category: 'transport' | 'energy' | 'household';
  co2SavedKg: number;
  assumptionNote: string;
}

export const QUICK_SUSTAINABLE_ACTIONS: QuickSustainableAction[] = [
  {
    id: 'metro-commute-12',
    label: 'Took Metro instead of solo car (12 km round trip)',
    labelHi: 'कार की जगह मेट्रो से यात्रा की (12 किमी)',
    category: 'transport',
    co2SavedKg: 1.62,
    assumptionNote: '12 km × (170 - 35) g CO2e/km = 1.62 kg CO2e avoided (estimate).',
  },
  {
    id: 'work-from-home',
    label: 'Worked or studied remotely instead of driving (16 km)',
    labelHi: 'ड्राइविंग के बजाय घर से काम/पढ़ाई की (16 किमी)',
    category: 'transport',
    co2SavedKg: 2.72,
    assumptionNote: '16 km × 170 g CO2e/km petrol car baseline avoided (estimate).',
  },
  {
    id: 'walk-errands',
    label: 'Walked or cycled for local errands (4 km)',
    labelHi: 'स्थानीय कामों के लिए पैदल या साइकिल का उपयोग (4 किमी)',
    category: 'transport',
    co2SavedKg: 0.68,
    assumptionNote: '4 km × 170 g CO2e/km solo car trip avoided (estimate).',
  },
  {
    id: 'ac-heater-setback',
    label: 'Adjusted AC/heater thermostat by 2°C for 6 hours',
    labelHi: 'AC/हीटर का तापमान 2°C किफायती रखा (6 घंटे)',
    category: 'energy',
    co2SavedKg: 1.15,
    assumptionNote: '~1.6 kWh saved × 0.72 kg CO2e/kWh regional grid average (estimate).',
  },
  {
    id: 'line-dry-laundry',
    label: 'Air-dried laundry instead of electric dryer',
    labelHi: 'इलेक्ट्रिक ड्रायर के बजाय कपड़े धूप/हवा में सुखाए',
    category: 'energy',
    co2SavedKg: 1.8,
    assumptionNote: '~2.5 kWh dryer cycle avoided × 0.72 kg CO2e/kWh grid factor (estimate).',
  },
  {
    id: 'clean-cooking-vent',
    label: 'Used pressure cooker / lid-on induction cooking',
    labelHi: 'प्रेशर कुकर / ढक्कन के साथ कम-ऊर्जा कुकिंग',
    category: 'household',
    co2SavedKg: 0.45,
    assumptionNote: '~25% fuel/electricity reduction over standard open-pan cooking (estimate).',
  },
  {
    id: 'zero-waste-burn',
    label: 'Composted dry garden leaves instead of open burning',
    labelHi: 'सूखे पत्ते जलाने के बजाय कम्पोस्ट बनाए',
    category: 'household',
    co2SavedKg: 1.2,
    assumptionNote: 'Avoids direct PM2.5 smoke and ~1.2 kg CO2e from small biomass burn (estimate).',
  },
];

export interface IndoorGuideTopic {
  id: string;
  section: 'ventilation' | 'cooking' | 'dust' | 'purifier' | 'prevention';
  title: string;
  summary: string;
  checklist: Array<{ id: string; text: string; impact: string }>;
}

export const INDOOR_GUIDE_TOPICS: IndoorGuideTopic[] = [
  {
    id: 'topic-ventilation',
    section: 'ventilation',
    title: 'Ventilation Guidance',
    summary: 'Time natural cross-ventilation to outdoor PM2.5 dips rather than keeping windows open during winter smog peaks.',
    checklist: [
      {
        id: 'vent-1',
        text: 'Open opposite-side windows for 15–20 minutes only during the lowest hourly AQI window (usually mid-afternoon).',
        impact: 'Flushes indoor CO2 without importing morning/night inversion smog',
      },
      {
        id: 'vent-2',
        text: 'Keep windows and balcony doors tightly shut when outdoor US AQI exceeds 150 or PM2.5 exceeds 55 µg/m³.',
        impact: 'Reduces outdoor fine particulate infiltration by 40–60%',
      },
      {
        id: 'vent-3',
        text: 'Install inexpensive rubber weather-stripping strips around loose balcony or bedroom door gaps.',
        impact: 'Blocks winter draft smoke during overnight peak smog hours',
      },
    ],
  },
  {
    id: 'topic-cooking',
    section: 'cooking',
    title: 'Cooking Smoke Reduction',
    summary: 'Tadka, frying, and high-heat searing can spike indoor PM2.5 above 250 µg/m³ within minutes.',
    checklist: [
      {
        id: 'cook-1',
        text: 'Switch on the kitchen chimney or exhaust fan 2 minutes before lighting the stove and keep it on 10 minutes after.',
        impact: 'Captures NO2 and fine oil aerosols at the source',
      },
      {
        id: 'cook-2',
        text: 'Cook on rear burners with lids on whenever simmering or boiling; prefer induction/electric kettles when available.',
        impact: 'Improves hood capture efficiency and reduces indoor combustion NO2',
      },
      {
        id: 'cook-3',
        text: 'Keep the kitchen door closed from bedrooms while frying or tempering spices.',
        impact: 'Prevents smoke plumes from drifting into sleeping areas',
      },
    ],
  },
  {
    id: 'topic-dust',
    section: 'dust',
    title: 'Dust Management',
    summary: 'Resuspended household dust contributes heavily to indoor PM10 and allergen exposure.',
    checklist: [
      {
        id: 'dust-1',
        text: 'Replace dry brooming and feather dusting with damp microfiber cloths and wet mopping.',
        impact: 'Traps settled PM10 instead of kicking it back into breathing height',
      },
      {
        id: 'dust-2',
        text: 'Maintain a shoe-free entry zone with a washable doormat near the front door.',
        impact: 'Prevents road soot, tire particles, and soil dust from spreading indoors',
      },
      {
        id: 'dust-3',
        text: 'Wash pillowcases, curtains, and bedsheets weekly in warm water and dry indoors during high-smog days.',
        impact: 'Reduces accumulated particulate residue and dust mites',
      },
    ],
  },
  {
    id: 'topic-purifier',
    section: 'purifier',
    title: 'Air Purifier Guidance',
    summary: 'True HEPA (H13) purifiers matched to room volume reliably cut indoor PM2.5 when windows stay closed.',
    checklist: [
      {
        id: 'puri-1',
        text: 'Place the purifier at least 30 cm away from walls and curtains, ideally near the center or foot of the bed.',
        impact: 'Ensures unobstructed airflow and faster air changes per hour (ACH)',
      },
      {
        id: 'puri-2',
        text: 'Vacuum the washable mesh pre-filter every 2 weeks during winter smog season; never wash the HEPA cartridge.',
        impact: 'Preserves fan airflow and extends main HEPA filter life',
      },
      {
        id: 'puri-3',
        text: 'Avoid ionizer or ozone-generating modes; rely on mechanical True HEPA + activated carbon filtration.',
        impact: 'Prevents secondary indoor ozone creation',
      },
    ],
  },
  {
    id: 'topic-prevention',
    section: 'prevention',
    title: 'Practical Indoor Prevention Tips',
    summary: 'Small everyday household habits stop avoidable indoor smoke and volatile organic compounds (VOCs).',
    checklist: [
      {
        id: 'prev-1',
        text: 'Avoid burning incense sticks (agarbatti), dhoop, mosquito coils, or scented paraffin candles in closed rooms.',
        impact: 'Eliminates one of the largest preventable indoor PM2.5 sources',
      },
      {
        id: 'prev-2',
        text: 'Choose fragrance-free or low-VOC floor cleaners and avoid aerosol air freshener sprays.',
        impact: 'Lowers indoor VOCs that react with ozone to form ultrafine particles',
      },
      {
        id: 'prev-3',
        text: 'Check indoor humidity (target 40–55%) to discourage both mold growth and throat dryness.',
        impact: 'Supports comfortable airways during dry winter heating or monsoon humidity',
      },
    ],
  },
];

export const SUGGESTED_CHAT_QUESTIONS = {
  en: [
    'Is it safe for children and seniors to go for a walk right now?',
    'What is the best time to open windows for ventilation today?',
    'Which pollutants are highest right now and what do they mean?',
    'Suggest a low-emission commute and mask plan for today.',
  ],
  hi: [
    'क्या अभी बच्चों और बुजुर्गों के लिए बाहर टहलना सुरक्षित है?',
    'आज घर की खिड़कियाँ खोलने का सबसे सही समय क्या है?',
    'अभी कौन से प्रदूषक सबसे अधिक हैं और इसका क्या मतलब है?',
    'आज के लिए कम-प्रदूषण वाला कम्यूट और मास्क सुझाव दें।',
  ],
};
