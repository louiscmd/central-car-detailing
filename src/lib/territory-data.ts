export interface CityEntry {
  name: string;
  metro: string;
}

export const METRO_AREAS: Record<string, string[]> = {
  "Warsaw": ["Janki","Marki","Ząbki","Zielonka","Wołomin","Kobyłka","Radzymin","Piaseczno","Konstancin-Jeziorna","Józefów","Otwock","Pruszków","Brwinów","Grodzisk Mazowiecki","Legionowo","Łomianki","Raszyn","Michałowice"],
  "Kraków": ["Wieliczka","Skawina","Niepołomice","Zabierzów","Krzeszowice","Myślenice","Bochnia","Zielonki"],
  "Wrocław": ["Siechnice","Kąty Wrocławskie","Kobierzyce","Oława","Trzebnica","Oleśnica","Długołęka"],
  "Poznań": ["Swarzędz","Luboń","Komorniki","Mosina","Tarnowo Podgórne","Suchy Las","Czerwonak","Kórnik"],
  "Gdańsk / Tricity": ["Sopot","Gdynia","Pruszcz Gdański","Rumia","Reda","Wejherowo","Żukowo"],
  "Łódź": ["Pabianice","Zgierz","Aleksandrów Łódzki","Konstantynów Łódzki","Rzgów","Stryków"],
  "Katowice / Upper Silesia": ["Chorzów","Bytom","Gliwice","Zabrze","Tychy","Sosnowiec","Dąbrowa Górnicza","Jaworzno","Mysłowice","Siemianowice Śląskie","Ruda Śląska"],
  "Szczecin": ["Police","Goleniów","Stargard","Dobra"],
  "Lublin": ["Świdnik","Łęczna","Lubartów","Nałęczów"],
  "Bydgoszcz": ["Solec Kujawski","Koronowo","Nakło nad Notecią"],
  "Białystok": ["Choroszcz","Wasilków","Supraśl","Łapy"],
};

export const ALL_CITIES: CityEntry[] = Object.entries(METRO_AREAS).flatMap(([metro, cities]) =>
  cities.map(name => ({ name, metro }))
);

export const BUSINESS_CATEGORIES = [
  { value: "restaurant", label: "Restaurants" },
  { value: "cafe", label: "Cafés" },
  { value: "pizzeria", label: "Pizzerias" },
  { value: "hotel", label: "Hotels" },
  { value: "barbershop", label: "Barbershops" },
  { value: "hair_salon", label: "Hair Salons" },
  { value: "gym", label: "Gyms" },
  { value: "dental", label: "Dental Clinics" },
  { value: "real_estate", label: "Real Estate Agencies" },
  { value: "car_dealer", label: "Car Dealerships" },
  { value: "marketing", label: "Marketing Agencies" },
  { value: "other", label: "Other Service Businesses" },
];

export const INDUSTRIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "gym", label: "Gym" },
  { value: "salon", label: "Hair Salon" },
  { value: "barbershop", label: "Barbershop" },
  { value: "hotel", label: "Hotel" },
  { value: "dental", label: "Dental Clinic" },
  { value: "other", label: "Other Service Business" },
];

// Industry-specific conversion rate benchmarks
export const INDUSTRY_CONVERSION_RATES: Record<string, number> = {
  restaurant: 0.03,
  cafe: 0.04,
  gym: 0.015,
  salon: 0.025,
  barbershop: 0.03,
  hotel: 0.01,
  dental: 0.008,
  other: 0.02,
};
