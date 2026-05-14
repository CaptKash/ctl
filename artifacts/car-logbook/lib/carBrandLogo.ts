import type { ImageSourcePropType } from "react-native";

const BUNDLED: Record<string, ImageSourcePropType> = {
  toyota: require("../assets/images/brands/toyota.png"),
  lexus: require("../assets/images/brands/lexus.png"),
  nissan: require("../assets/images/brands/nissan.png"),
  hyundai: require("../assets/images/brands/hyundai.png"),
  kia: require("../assets/images/brands/kia.png"),
  "mercedes-benz": require("../assets/images/brands/mercedes-benz.png"),
  bmw: require("../assets/images/brands/bmw.png"),
  "land-rover": require("../assets/images/brands/land-rover.png"),
  gmc: require("../assets/images/brands/gmc.png"),
  chevrolet: require("../assets/images/brands/chevrolet.png"),
  ford: require("../assets/images/brands/ford.png"),
  honda: require("../assets/images/brands/honda.png"),
  mitsubishi: require("../assets/images/brands/mitsubishi.png"),
  audi: require("../assets/images/brands/audi.png"),
  porsche: require("../assets/images/brands/porsche.png"),
  mazda: require("../assets/images/brands/mazda.png"),
  infiniti: require("../assets/images/brands/infiniti.png"),
  mg: require("../assets/images/brands/mg.png"),
  byd: require("../assets/images/brands/byd.png"),
  geely: require("../assets/images/brands/geely.png"),
  chery: require("../assets/images/brands/chery.png"),
  haval: require("../assets/images/brands/haval.png"),
  changan: require("../assets/images/brands/changan.png"),
  "great-wall": require("../assets/images/brands/great-wall.png"),
};

const ALIASES: Record<string, string> = {
  mercedes: "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  benz: "mercedes-benz",
  landrover: "land-rover",
  "land rover": "land-rover",
  range: "land-rover",
  "range rover": "land-rover",
  vw: "volkswagen",
  "great wall": "great-wall",
  gwm: "great-wall",
  "lynk co": "lynk-co",
  "lynk & co": "lynk-co",
  chrey: "chery",
};

function normalize(make: string): string {
  const k = make.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES[k] ?? k.replace(/\s+/g, "-");
}

export function getBundledBrandLogo(make: string | null | undefined): ImageSourcePropType | null {
  if (!make) return null;
  return BUNDLED[normalize(make)] ?? null;
}

export function getRemoteBrandLogoUrl(make: string | null | undefined): string | null {
  if (!make) return null;
  const slug = normalize(make);
  return `https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/${slug}.png`;
}

const BRAND_AR: Record<string, string> = {
  toyota: "تويوتا",
  lexus: "لكزس",
  nissan: "نيسان",
  hyundai: "هيونداي",
  kia: "كيا",
  "mercedes-benz": "مرسيدس بنز",
  bmw: "بي إم دبليو",
  "land-rover": "لاند روفر",
  gmc: "جي إم سي",
  chevrolet: "شيفروليه",
  ford: "فورد",
  honda: "هوندا",
  mitsubishi: "ميتسوبيشي",
  audi: "أودي",
  porsche: "بورش",
  mazda: "مازدا",
  infiniti: "إنفينيتي",
  mg: "إم جي",
  byd: "بي واي دي",
  geely: "جيلي",
  chery: "شيري",
  haval: "هافال",
  changan: "شانجان",
  "great-wall": "جريت وول",
  volkswagen: "فولكس فاجن",
  tesla: "تسلا",
  jeep: "جيب",
  dodge: "دودج",
  "lynk-co": "لينك آند كو",
  hongqi: "هونغتشي",
  nio: "نيو",
  xpeng: "إكس بنج",
  zeekr: "زيكر",
  gac: "جي إيه سي",
  lucid: "لوسيد",
  rolls: "رولز رويس",
  "rolls-royce": "رولز رويس",
  bentley: "بنتلي",
  ferrari: "فيراري",
  lamborghini: "لامبورجيني",
  maserati: "مازيراتي",
  jaguar: "جاكوار",
  volvo: "فولفو",
  subaru: "سوبارو",
  suzuki: "سوزوكي",
  renault: "رينو",
  peugeot: "بيجو",
  citroen: "ستروين",
  fiat: "فيات",
  skoda: "سكودا",
  seat: "سيات",
  cupra: "كوبرا",
  mclaren: "ماكلارين",
  "aston-martin": "أستون مارتن",
};

export function localizeBrand(make: string | null | undefined, lang: string): string {
  if (!make) return "";
  if (lang !== "ar") return make;
  return BRAND_AR[normalize(make)] ?? make;
}
