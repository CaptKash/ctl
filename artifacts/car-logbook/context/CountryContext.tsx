import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type Country = { code: string; flag: string; name: string };

export const COUNTRIES: Country[] = [
  { code: "AF", flag: "🇦🇫", name: "Afghanistan" },
  { code: "AL", flag: "🇦🇱", name: "Albania" },
  { code: "DZ", flag: "🇩🇿", name: "Algeria" },
  { code: "AD", flag: "🇦🇩", name: "Andorra" },
  { code: "AO", flag: "🇦🇴", name: "Angola" },
  { code: "AG", flag: "🇦🇬", name: "Antigua & Barbuda" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" },
  { code: "AM", flag: "🇦🇲", name: "Armenia" },
  { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "AT", flag: "🇦🇹", name: "Austria" },
  { code: "AZ", flag: "🇦🇿", name: "Azerbaijan" },
  { code: "BS", flag: "🇧🇸", name: "Bahamas" },
  { code: "BH", flag: "🇧🇭", name: "Bahrain" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh" },
  { code: "BB", flag: "🇧🇧", name: "Barbados" },
  { code: "BY", flag: "🇧🇾", name: "Belarus" },
  { code: "BE", flag: "🇧🇪", name: "Belgium" },
  { code: "BZ", flag: "🇧🇿", name: "Belize" },
  { code: "BJ", flag: "🇧🇯", name: "Benin" },
  { code: "BT", flag: "🇧🇹", name: "Bhutan" },
  { code: "BO", flag: "🇧🇴", name: "Bolivia" },
  { code: "BA", flag: "🇧🇦", name: "Bosnia & Herzegovina" },
  { code: "BW", flag: "🇧🇼", name: "Botswana" },
  { code: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "BN", flag: "🇧🇳", name: "Brunei" },
  { code: "BG", flag: "🇧🇬", name: "Bulgaria" },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "BI", flag: "🇧🇮", name: "Burundi" },
  { code: "CV", flag: "🇨🇻", name: "Cabo Verde" },
  { code: "KH", flag: "🇰🇭", name: "Cambodia" },
  { code: "CM", flag: "🇨🇲", name: "Cameroon" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "CF", flag: "🇨🇫", name: "Central African Republic" },
  { code: "TD", flag: "🇹🇩", name: "Chad" },
  { code: "CL", flag: "🇨🇱", name: "Chile" },
  { code: "CN", flag: "🇨🇳", name: "China" },
  { code: "CO", flag: "🇨🇴", name: "Colombia" },
  { code: "KM", flag: "🇰🇲", name: "Comoros" },
  { code: "CG", flag: "🇨🇬", name: "Congo" },
  { code: "CD", flag: "🇨🇩", name: "Congo (DRC)" },
  { code: "CR", flag: "🇨🇷", name: "Costa Rica" },
  { code: "HR", flag: "🇭🇷", name: "Croatia" },
  { code: "CU", flag: "🇨🇺", name: "Cuba" },
  { code: "CY", flag: "🇨🇾", name: "Cyprus" },
  { code: "CZ", flag: "🇨🇿", name: "Czech Republic" },
  { code: "DK", flag: "🇩🇰", name: "Denmark" },
  { code: "DJ", flag: "🇩🇯", name: "Djibouti" },
  { code: "DM", flag: "🇩🇲", name: "Dominica" },
  { code: "DO", flag: "🇩🇴", name: "Dominican Republic" },
  { code: "EC", flag: "🇪🇨", name: "Ecuador" },
  { code: "EG", flag: "🇪🇬", name: "Egypt" },
  { code: "SV", flag: "🇸🇻", name: "El Salvador" },
  { code: "GQ", flag: "🇬🇶", name: "Equatorial Guinea" },
  { code: "ER", flag: "🇪🇷", name: "Eritrea" },
  { code: "EE", flag: "🇪🇪", name: "Estonia" },
  { code: "SZ", flag: "🇸🇿", name: "Eswatini" },
  { code: "ET", flag: "🇪🇹", name: "Ethiopia" },
  { code: "FJ", flag: "🇫🇯", name: "Fiji" },
  { code: "FI", flag: "🇫🇮", name: "Finland" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "GA", flag: "🇬🇦", name: "Gabon" },
  { code: "GM", flag: "🇬🇲", name: "Gambia" },
  { code: "GE", flag: "🇬🇪", name: "Georgia" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "GH", flag: "🇬🇭", name: "Ghana" },
  { code: "GR", flag: "🇬🇷", name: "Greece" },
  { code: "GD", flag: "🇬🇩", name: "Grenada" },
  { code: "GT", flag: "🇬🇹", name: "Guatemala" },
  { code: "GN", flag: "🇬🇳", name: "Guinea" },
  { code: "GW", flag: "🇬🇼", name: "Guinea-Bissau" },
  { code: "GY", flag: "🇬🇾", name: "Guyana" },
  { code: "HT", flag: "🇭🇹", name: "Haiti" },
  { code: "HN", flag: "🇭🇳", name: "Honduras" },
  { code: "HU", flag: "🇭🇺", name: "Hungary" },
  { code: "IS", flag: "🇮🇸", name: "Iceland" },
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia" },
  { code: "IR", flag: "🇮🇷", name: "Iran" },
  { code: "IQ", flag: "🇮🇶", name: "Iraq" },
  { code: "IE", flag: "🇮🇪", name: "Ireland" },
  { code: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "JM", flag: "🇯🇲", name: "Jamaica" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "JO", flag: "🇯🇴", name: "Jordan" },
  { code: "KZ", flag: "🇰🇿", name: "Kazakhstan" },
  { code: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "KI", flag: "🇰🇮", name: "Kiribati" },
  { code: "KW", flag: "🇰🇼", name: "Kuwait" },
  { code: "KG", flag: "🇰🇬", name: "Kyrgyzstan" },
  { code: "LA", flag: "🇱🇦", name: "Laos" },
  { code: "LV", flag: "🇱🇻", name: "Latvia" },
  { code: "LB", flag: "🇱🇧", name: "Lebanon" },
  { code: "LS", flag: "🇱🇸", name: "Lesotho" },
  { code: "LR", flag: "🇱🇷", name: "Liberia" },
  { code: "LY", flag: "🇱🇾", name: "Libya" },
  { code: "LI", flag: "🇱🇮", name: "Liechtenstein" },
  { code: "LT", flag: "🇱🇹", name: "Lithuania" },
  { code: "LU", flag: "🇱🇺", name: "Luxembourg" },
  { code: "MG", flag: "🇲🇬", name: "Madagascar" },
  { code: "MW", flag: "🇲🇼", name: "Malawi" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia" },
  { code: "MV", flag: "🇲🇻", name: "Maldives" },
  { code: "ML", flag: "🇲🇱", name: "Mali" },
  { code: "MT", flag: "🇲🇹", name: "Malta" },
  { code: "MH", flag: "🇲🇭", name: "Marshall Islands" },
  { code: "MR", flag: "🇲🇷", name: "Mauritania" },
  { code: "MU", flag: "🇲🇺", name: "Mauritius" },
  { code: "MX", flag: "🇲🇽", name: "Mexico" },
  { code: "FM", flag: "🇫🇲", name: "Micronesia" },
  { code: "MD", flag: "🇲🇩", name: "Moldova" },
  { code: "MC", flag: "🇲🇨", name: "Monaco" },
  { code: "MN", flag: "🇲🇳", name: "Mongolia" },
  { code: "ME", flag: "🇲🇪", name: "Montenegro" },
  { code: "MA", flag: "🇲🇦", name: "Morocco" },
  { code: "MZ", flag: "🇲🇿", name: "Mozambique" },
  { code: "MM", flag: "🇲🇲", name: "Myanmar" },
  { code: "NA", flag: "🇳🇦", name: "Namibia" },
  { code: "NR", flag: "🇳🇷", name: "Nauru" },
  { code: "NP", flag: "🇳🇵", name: "Nepal" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand" },
  { code: "NI", flag: "🇳🇮", name: "Nicaragua" },
  { code: "NE", flag: "🇳🇪", name: "Niger" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "MK", flag: "🇲🇰", name: "North Macedonia" },
  { code: "NO", flag: "🇳🇴", name: "Norway" },
  { code: "OM", flag: "🇴🇲", name: "Oman" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan" },
  { code: "PW", flag: "🇵🇼", name: "Palau" },
  { code: "PS", flag: "🇵🇸", name: "Palestine" },
  { code: "PA", flag: "🇵🇦", name: "Panama" },
  { code: "PG", flag: "🇵🇬", name: "Papua New Guinea" },
  { code: "PY", flag: "🇵🇾", name: "Paraguay" },
  { code: "PE", flag: "🇵🇪", name: "Peru" },
  { code: "PH", flag: "🇵🇭", name: "Philippines" },
  { code: "PL", flag: "🇵🇱", name: "Poland" },
  { code: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "QA", flag: "🇶🇦", name: "Qatar" },
  { code: "RO", flag: "🇷🇴", name: "Romania" },
  { code: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "RW", flag: "🇷🇼", name: "Rwanda" },
  { code: "KN", flag: "🇰🇳", name: "Saint Kitts & Nevis" },
  { code: "LC", flag: "🇱🇨", name: "Saint Lucia" },
  { code: "VC", flag: "🇻🇨", name: "Saint Vincent & the Grenadines" },
  { code: "WS", flag: "🇼🇸", name: "Samoa" },
  { code: "SM", flag: "🇸🇲", name: "San Marino" },
  { code: "ST", flag: "🇸🇹", name: "São Tomé & Príncipe" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "SN", flag: "🇸🇳", name: "Senegal" },
  { code: "RS", flag: "🇷🇸", name: "Serbia" },
  { code: "SC", flag: "🇸🇨", name: "Seychelles" },
  { code: "SL", flag: "🇸🇱", name: "Sierra Leone" },
  { code: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "SK", flag: "🇸🇰", name: "Slovakia" },
  { code: "SI", flag: "🇸🇮", name: "Slovenia" },
  { code: "SB", flag: "🇸🇧", name: "Solomon Islands" },
  { code: "SO", flag: "🇸🇴", name: "Somalia" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "SS", flag: "🇸🇸", name: "South Sudan" },
  { code: "ES", flag: "🇪🇸", name: "Spain" },
  { code: "LK", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "SD", flag: "🇸🇩", name: "Sudan" },
  { code: "SR", flag: "🇸🇷", name: "Suriname" },
  { code: "SE", flag: "🇸🇪", name: "Sweden" },
  { code: "CH", flag: "🇨🇭", name: "Switzerland" },
  { code: "SY", flag: "🇸🇾", name: "Syria" },
  { code: "TW", flag: "🇹🇼", name: "Taiwan" },
  { code: "TJ", flag: "🇹🇯", name: "Tajikistan" },
  { code: "TZ", flag: "🇹🇿", name: "Tanzania" },
  { code: "TH", flag: "🇹🇭", name: "Thailand" },
  { code: "TL", flag: "🇹🇱", name: "Timor-Leste" },
  { code: "TG", flag: "🇹🇬", name: "Togo" },
  { code: "TO", flag: "🇹🇴", name: "Tonga" },
  { code: "TT", flag: "🇹🇹", name: "Trinidad & Tobago" },
  { code: "TN", flag: "🇹🇳", name: "Tunisia" },
  { code: "TR", flag: "🇹🇷", name: "Turkey" },
  { code: "TM", flag: "🇹🇲", name: "Turkmenistan" },
  { code: "TV", flag: "🇹🇻", name: "Tuvalu" },
  { code: "UG", flag: "🇺🇬", name: "Uganda" },
  { code: "UA", flag: "🇺🇦", name: "Ukraine" },
  { code: "AE", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "US", flag: "🇺🇸", name: "United States" },
  { code: "UY", flag: "🇺🇾", name: "Uruguay" },
  { code: "UZ", flag: "🇺🇿", name: "Uzbekistan" },
  { code: "VU", flag: "🇻🇺", name: "Vanuatu" },
  { code: "VE", flag: "🇻🇪", name: "Venezuela" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam" },
  { code: "YE", flag: "🇾🇪", name: "Yemen" },
  { code: "ZM", flag: "🇿🇲", name: "Zambia" },
  { code: "ZW", flag: "🇿🇼", name: "Zimbabwe" },
];

export function countryOption(c: Country): string {
  return `${c.flag} ${c.name}`;
}

export function findCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function findCountryByOption(option: string): Country | undefined {
  return COUNTRIES.find((c) => countryOption(c) === option);
}

const COUNTRY_KEY = "ctl_country";

type CountryContextType = {
  country: Country | null;
  setCountry: (c: Country) => Promise<void>;
};

const CountryContext = createContext<CountryContextType>({
  country: null,
  setCountry: async () => {},
});

async function loadCountry(): Promise<Country | null> {
  try {
    const code = Platform.OS === "web"
      ? localStorage.getItem(COUNTRY_KEY)
      : await SecureStore.getItemAsync(COUNTRY_KEY);
    if (code) return findCountryByCode(code) ?? null;
  } catch {}
  return null;
}

async function saveCountry(c: Country): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(COUNTRY_KEY, c.code);
    } else {
      await SecureStore.setItemAsync(COUNTRY_KEY, c.code);
    }
  } catch {}
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<Country | null>(null);

  useEffect(() => {
    loadCountry().then(setCountryState);
  }, []);

  const setCountry = async (c: Country) => {
    setCountryState(c);
    await saveCountry(c);
  };

  return (
    <CountryContext.Provider value={{ country, setCountry }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  return useContext(CountryContext);
}
