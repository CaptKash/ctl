import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type Country = { code: string; flag: string; name: string; arName: string };

export const COUNTRIES: Country[] = [
  { code: "AF", flag: "🇦🇫", name: "Afghanistan", arName: "أفغانستان" },
  { code: "AL", flag: "🇦🇱", name: "Albania", arName: "ألبانيا" },
  { code: "DZ", flag: "🇩🇿", name: "Algeria", arName: "الجزائر" },
  { code: "AD", flag: "🇦🇩", name: "Andorra", arName: "أندورا" },
  { code: "AO", flag: "🇦🇴", name: "Angola", arName: "أنغولا" },
  { code: "AG", flag: "🇦🇬", name: "Antigua & Barbuda", arName: "أنتيغوا وباربودا" },
  { code: "AR", flag: "🇦🇷", name: "Argentina", arName: "الأرجنتين" },
  { code: "AM", flag: "🇦🇲", name: "Armenia", arName: "أرمينيا" },
  { code: "AU", flag: "🇦🇺", name: "Australia", arName: "أستراليا" },
  { code: "AT", flag: "🇦🇹", name: "Austria", arName: "النمسا" },
  { code: "AZ", flag: "🇦🇿", name: "Azerbaijan", arName: "أذربيجان" },
  { code: "BS", flag: "🇧🇸", name: "Bahamas", arName: "الباهاما" },
  { code: "BH", flag: "🇧🇭", name: "Bahrain", arName: "البحرين" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh", arName: "بنغلاديش" },
  { code: "BB", flag: "🇧🇧", name: "Barbados", arName: "باربادوس" },
  { code: "BY", flag: "🇧🇾", name: "Belarus", arName: "بيلاروسيا" },
  { code: "BE", flag: "🇧🇪", name: "Belgium", arName: "بلجيكا" },
  { code: "BZ", flag: "🇧🇿", name: "Belize", arName: "بليز" },
  { code: "BJ", flag: "🇧🇯", name: "Benin", arName: "بنين" },
  { code: "BT", flag: "🇧🇹", name: "Bhutan", arName: "بوتان" },
  { code: "BO", flag: "🇧🇴", name: "Bolivia", arName: "بوليفيا" },
  { code: "BA", flag: "🇧🇦", name: "Bosnia & Herzegovina", arName: "البوسنة والهرسك" },
  { code: "BW", flag: "🇧🇼", name: "Botswana", arName: "بوتسوانا" },
  { code: "BR", flag: "🇧🇷", name: "Brazil", arName: "البرازيل" },
  { code: "BN", flag: "🇧🇳", name: "Brunei", arName: "بروناي" },
  { code: "BG", flag: "🇧🇬", name: "Bulgaria", arName: "بلغاريا" },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso", arName: "بوركينا فاسو" },
  { code: "BI", flag: "🇧🇮", name: "Burundi", arName: "بوروندي" },
  { code: "CV", flag: "🇨🇻", name: "Cabo Verde", arName: "الرأس الأخضر" },
  { code: "KH", flag: "🇰🇭", name: "Cambodia", arName: "كمبوديا" },
  { code: "CM", flag: "🇨🇲", name: "Cameroon", arName: "الكاميرون" },
  { code: "CA", flag: "🇨🇦", name: "Canada", arName: "كندا" },
  { code: "CF", flag: "🇨🇫", name: "Central African Republic", arName: "جمهورية أفريقيا الوسطى" },
  { code: "TD", flag: "🇹🇩", name: "Chad", arName: "تشاد" },
  { code: "CL", flag: "🇨🇱", name: "Chile", arName: "تشيلي" },
  { code: "CN", flag: "🇨🇳", name: "China", arName: "الصين" },
  { code: "CO", flag: "🇨🇴", name: "Colombia", arName: "كولومبيا" },
  { code: "KM", flag: "🇰🇲", name: "Comoros", arName: "جزر القمر" },
  { code: "CG", flag: "🇨🇬", name: "Congo", arName: "الكونغو" },
  { code: "CD", flag: "🇨🇩", name: "Congo (DRC)", arName: "جمهورية الكونغو الديمقراطية" },
  { code: "CR", flag: "🇨🇷", name: "Costa Rica", arName: "كوستاريكا" },
  { code: "HR", flag: "🇭🇷", name: "Croatia", arName: "كرواتيا" },
  { code: "CU", flag: "🇨🇺", name: "Cuba", arName: "كوبا" },
  { code: "CY", flag: "🇨🇾", name: "Cyprus", arName: "قبرص" },
  { code: "CZ", flag: "🇨🇿", name: "Czech Republic", arName: "التشيك" },
  { code: "DK", flag: "🇩🇰", name: "Denmark", arName: "الدنمارك" },
  { code: "DJ", flag: "🇩🇯", name: "Djibouti", arName: "جيبوتي" },
  { code: "DM", flag: "🇩🇲", name: "Dominica", arName: "دومينيكا" },
  { code: "DO", flag: "🇩🇴", name: "Dominican Republic", arName: "جمهورية الدومينيكان" },
  { code: "EC", flag: "🇪🇨", name: "Ecuador", arName: "الإكوادور" },
  { code: "EG", flag: "🇪🇬", name: "Egypt", arName: "مصر" },
  { code: "SV", flag: "🇸🇻", name: "El Salvador", arName: "السلفادور" },
  { code: "GQ", flag: "🇬🇶", name: "Equatorial Guinea", arName: "غينيا الاستوائية" },
  { code: "ER", flag: "🇪🇷", name: "Eritrea", arName: "إريتريا" },
  { code: "EE", flag: "🇪🇪", name: "Estonia", arName: "إستونيا" },
  { code: "SZ", flag: "🇸🇿", name: "Eswatini", arName: "إسواتيني" },
  { code: "ET", flag: "🇪🇹", name: "Ethiopia", arName: "إثيوبيا" },
  { code: "FJ", flag: "🇫🇯", name: "Fiji", arName: "فيجي" },
  { code: "FI", flag: "🇫🇮", name: "Finland", arName: "فنلندا" },
  { code: "FR", flag: "🇫🇷", name: "France", arName: "فرنسا" },
  { code: "GA", flag: "🇬🇦", name: "Gabon", arName: "الغابون" },
  { code: "GM", flag: "🇬🇲", name: "Gambia", arName: "غامبيا" },
  { code: "GE", flag: "🇬🇪", name: "Georgia", arName: "جورجيا" },
  { code: "DE", flag: "🇩🇪", name: "Germany", arName: "ألمانيا" },
  { code: "GH", flag: "🇬🇭", name: "Ghana", arName: "غانا" },
  { code: "GR", flag: "🇬🇷", name: "Greece", arName: "اليونان" },
  { code: "GD", flag: "🇬🇩", name: "Grenada", arName: "غرينادا" },
  { code: "GT", flag: "🇬🇹", name: "Guatemala", arName: "غواتيمالا" },
  { code: "GN", flag: "🇬🇳", name: "Guinea", arName: "غينيا" },
  { code: "GW", flag: "🇬🇼", name: "Guinea-Bissau", arName: "غينيا بيساو" },
  { code: "GY", flag: "🇬🇾", name: "Guyana", arName: "غيانا" },
  { code: "HT", flag: "🇭🇹", name: "Haiti", arName: "هايتي" },
  { code: "HN", flag: "🇭🇳", name: "Honduras", arName: "هندوراس" },
  { code: "HU", flag: "🇭🇺", name: "Hungary", arName: "المجر" },
  { code: "IS", flag: "🇮🇸", name: "Iceland", arName: "آيسلندا" },
  { code: "IN", flag: "🇮🇳", name: "India", arName: "الهند" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia", arName: "إندونيسيا" },
  { code: "IR", flag: "🇮🇷", name: "Iran", arName: "إيران" },
  { code: "IQ", flag: "🇮🇶", name: "Iraq", arName: "العراق" },
  { code: "IE", flag: "🇮🇪", name: "Ireland", arName: "أيرلندا" },
  { code: "IT", flag: "🇮🇹", name: "Italy", arName: "إيطاليا" },
  { code: "JM", flag: "🇯🇲", name: "Jamaica", arName: "جامايكا" },
  { code: "JP", flag: "🇯🇵", name: "Japan", arName: "اليابان" },
  { code: "JO", flag: "🇯🇴", name: "Jordan", arName: "الأردن" },
  { code: "KZ", flag: "🇰🇿", name: "Kazakhstan", arName: "كازاخستان" },
  { code: "KE", flag: "🇰🇪", name: "Kenya", arName: "كينيا" },
  { code: "KI", flag: "🇰🇮", name: "Kiribati", arName: "كيريباتي" },
  { code: "KW", flag: "🇰🇼", name: "Kuwait", arName: "الكويت" },
  { code: "KG", flag: "🇰🇬", name: "Kyrgyzstan", arName: "قيرغيزستان" },
  { code: "LA", flag: "🇱🇦", name: "Laos", arName: "لاوس" },
  { code: "LV", flag: "🇱🇻", name: "Latvia", arName: "لاتفيا" },
  { code: "LB", flag: "🇱🇧", name: "Lebanon", arName: "لبنان" },
  { code: "LS", flag: "🇱🇸", name: "Lesotho", arName: "ليسوتو" },
  { code: "LR", flag: "🇱🇷", name: "Liberia", arName: "ليبيريا" },
  { code: "LY", flag: "🇱🇾", name: "Libya", arName: "ليبيا" },
  { code: "LI", flag: "🇱🇮", name: "Liechtenstein", arName: "ليختنشتاين" },
  { code: "LT", flag: "🇱🇹", name: "Lithuania", arName: "ليتوانيا" },
  { code: "LU", flag: "🇱🇺", name: "Luxembourg", arName: "لوكسمبورغ" },
  { code: "MG", flag: "🇲🇬", name: "Madagascar", arName: "مدغشقر" },
  { code: "MW", flag: "🇲🇼", name: "Malawi", arName: "مالاوي" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia", arName: "ماليزيا" },
  { code: "MV", flag: "🇲🇻", name: "Maldives", arName: "المالديف" },
  { code: "ML", flag: "🇲🇱", name: "Mali", arName: "مالي" },
  { code: "MT", flag: "🇲🇹", name: "Malta", arName: "مالطا" },
  { code: "MH", flag: "🇲🇭", name: "Marshall Islands", arName: "جزر مارشال" },
  { code: "MR", flag: "🇲🇷", name: "Mauritania", arName: "موريتانيا" },
  { code: "MU", flag: "🇲🇺", name: "Mauritius", arName: "موريشيوس" },
  { code: "MX", flag: "🇲🇽", name: "Mexico", arName: "المكسيك" },
  { code: "FM", flag: "🇫🇲", name: "Micronesia", arName: "ميكرونيزيا" },
  { code: "MD", flag: "🇲🇩", name: "Moldova", arName: "مولدوفا" },
  { code: "MC", flag: "🇲🇨", name: "Monaco", arName: "موناكو" },
  { code: "MN", flag: "🇲🇳", name: "Mongolia", arName: "منغوليا" },
  { code: "ME", flag: "🇲🇪", name: "Montenegro", arName: "الجبل الأسود" },
  { code: "MA", flag: "🇲🇦", name: "Morocco", arName: "المغرب" },
  { code: "MZ", flag: "🇲🇿", name: "Mozambique", arName: "موزمبيق" },
  { code: "MM", flag: "🇲🇲", name: "Myanmar", arName: "ميانمار" },
  { code: "NA", flag: "🇳🇦", name: "Namibia", arName: "ناميبيا" },
  { code: "NR", flag: "🇳🇷", name: "Nauru", arName: "ناورو" },
  { code: "NP", flag: "🇳🇵", name: "Nepal", arName: "نيبال" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands", arName: "هولندا" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand", arName: "نيوزيلندا" },
  { code: "NI", flag: "🇳🇮", name: "Nicaragua", arName: "نيكاراغوا" },
  { code: "NE", flag: "🇳🇪", name: "Niger", arName: "النيجر" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria", arName: "نيجيريا" },
  { code: "MK", flag: "🇲🇰", name: "North Macedonia", arName: "مقدونيا الشمالية" },
  { code: "NO", flag: "🇳🇴", name: "Norway", arName: "النرويج" },
  { code: "OM", flag: "🇴🇲", name: "Oman", arName: "عُمان" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan", arName: "باكستان" },
  { code: "PW", flag: "🇵🇼", name: "Palau", arName: "بالاو" },
  { code: "PS", flag: "🇵🇸", name: "Palestine", arName: "فلسطين" },
  { code: "PA", flag: "🇵🇦", name: "Panama", arName: "بنما" },
  { code: "PG", flag: "🇵🇬", name: "Papua New Guinea", arName: "بابوا غينيا الجديدة" },
  { code: "PY", flag: "🇵🇾", name: "Paraguay", arName: "باراغواي" },
  { code: "PE", flag: "🇵🇪", name: "Peru", arName: "بيرو" },
  { code: "PH", flag: "🇵🇭", name: "Philippines", arName: "الفلبين" },
  { code: "PL", flag: "🇵🇱", name: "Poland", arName: "بولندا" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", arName: "البرتغال" },
  { code: "QA", flag: "🇶🇦", name: "Qatar", arName: "قطر" },
  { code: "RO", flag: "🇷🇴", name: "Romania", arName: "رومانيا" },
  { code: "RU", flag: "🇷🇺", name: "Russia", arName: "روسيا" },
  { code: "RW", flag: "🇷🇼", name: "Rwanda", arName: "رواندا" },
  { code: "KN", flag: "🇰🇳", name: "Saint Kitts & Nevis", arName: "سانت كيتس ونيفيس" },
  { code: "LC", flag: "🇱🇨", name: "Saint Lucia", arName: "سانت لوسيا" },
  { code: "VC", flag: "🇻🇨", name: "Saint Vincent & the Grenadines", arName: "سانت فنسنت والغرينادين" },
  { code: "WS", flag: "🇼🇸", name: "Samoa", arName: "ساموا" },
  { code: "SM", flag: "🇸🇲", name: "San Marino", arName: "سان مارينو" },
  { code: "ST", flag: "🇸🇹", name: "São Tomé & Príncipe", arName: "ساو تومي وبرينسيب" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia", arName: "المملكة العربية السعودية" },
  { code: "SN", flag: "🇸🇳", name: "Senegal", arName: "السنغال" },
  { code: "RS", flag: "🇷🇸", name: "Serbia", arName: "صربيا" },
  { code: "SC", flag: "🇸🇨", name: "Seychelles", arName: "سيشل" },
  { code: "SL", flag: "🇸🇱", name: "Sierra Leone", arName: "سيراليون" },
  { code: "SG", flag: "🇸🇬", name: "Singapore", arName: "سنغافورة" },
  { code: "SK", flag: "🇸🇰", name: "Slovakia", arName: "سلوفاكيا" },
  { code: "SI", flag: "🇸🇮", name: "Slovenia", arName: "سلوفينيا" },
  { code: "SB", flag: "🇸🇧", name: "Solomon Islands", arName: "جزر سليمان" },
  { code: "SO", flag: "🇸🇴", name: "Somalia", arName: "الصومال" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa", arName: "جنوب أفريقيا" },
  { code: "SS", flag: "🇸🇸", name: "South Sudan", arName: "جنوب السودان" },
  { code: "ES", flag: "🇪🇸", name: "Spain", arName: "إسبانيا" },
  { code: "LK", flag: "🇱🇰", name: "Sri Lanka", arName: "سريلانكا" },
  { code: "SD", flag: "🇸🇩", name: "Sudan", arName: "السودان" },
  { code: "SR", flag: "🇸🇷", name: "Suriname", arName: "سورينام" },
  { code: "SE", flag: "🇸🇪", name: "Sweden", arName: "السويد" },
  { code: "CH", flag: "🇨🇭", name: "Switzerland", arName: "سويسرا" },
  { code: "SY", flag: "🇸🇾", name: "Syria", arName: "سوريا" },
  { code: "TW", flag: "🇹🇼", name: "Taiwan", arName: "تايوان" },
  { code: "TJ", flag: "🇹🇯", name: "Tajikistan", arName: "طاجيكستان" },
  { code: "TZ", flag: "🇹🇿", name: "Tanzania", arName: "تنزانيا" },
  { code: "TH", flag: "🇹🇭", name: "Thailand", arName: "تايلاند" },
  { code: "TL", flag: "🇹🇱", name: "Timor-Leste", arName: "تيمور الشرقية" },
  { code: "TG", flag: "🇹🇬", name: "Togo", arName: "توغو" },
  { code: "TO", flag: "🇹🇴", name: "Tonga", arName: "تونغا" },
  { code: "TT", flag: "🇹🇹", name: "Trinidad & Tobago", arName: "ترينيداد وتوباغو" },
  { code: "TN", flag: "🇹🇳", name: "Tunisia", arName: "تونس" },
  { code: "TR", flag: "🇹🇷", name: "Turkey", arName: "تركيا" },
  { code: "TM", flag: "🇹🇲", name: "Turkmenistan", arName: "تركمانستان" },
  { code: "TV", flag: "🇹🇻", name: "Tuvalu", arName: "توفالو" },
  { code: "UG", flag: "🇺🇬", name: "Uganda", arName: "أوغندا" },
  { code: "UA", flag: "🇺🇦", name: "Ukraine", arName: "أوكرانيا" },
  { code: "AE", flag: "🇦🇪", name: "United Arab Emirates", arName: "الإمارات العربية المتحدة" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", arName: "المملكة المتحدة" },
  { code: "US", flag: "🇺🇸", name: "United States", arName: "الولايات المتحدة" },
  { code: "UY", flag: "🇺🇾", name: "Uruguay", arName: "الأوروغواي" },
  { code: "UZ", flag: "🇺🇿", name: "Uzbekistan", arName: "أوزبكستان" },
  { code: "VU", flag: "🇻🇺", name: "Vanuatu", arName: "فانواتو" },
  { code: "VE", flag: "🇻🇪", name: "Venezuela", arName: "فنزويلا" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam", arName: "فيتنام" },
  { code: "YE", flag: "🇾🇪", name: "Yemen", arName: "اليمن" },
  { code: "ZM", flag: "🇿🇲", name: "Zambia", arName: "زامبيا" },
  { code: "ZW", flag: "🇿🇼", name: "Zimbabwe", arName: "زيمبابوي" },
];

export function countryName(c: Country, lang?: string): string {
  return lang === "ar" ? c.arName : c.name;
}

export function countryOption(c: Country, lang?: string): string {
  return `${c.flag} ${countryName(c, lang)}`;
}

export function findCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function findCountryByOption(option: string, lang?: string): Country | undefined {
  return COUNTRIES.find((c) => countryOption(c, lang) === option);
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
