/**
 * Make + model lists scoped to vehicle type.
 *
 * Types that share general car/light-vehicle brands (car, suv) reuse
 * CAR_DATA from carData.ts. All specialist categories get their own
 * curated lists here so the dropdown stays relevant.
 *
 * Models are intentionally kept to common variants — the SearchableSelect
 * component already supports free-text "Use …" entry for anything not listed.
 */

export type VehicleMakeEntry = { make: string; models: string[] };

// ── Vans (light commercial) ──────────────────────────────────────────────────
export const VAN_DATA: VehicleMakeEntry[] = [
  { make: "Mercedes-Benz", models: ["Sprinter", "Vito", "V-Class", "Citan", "eSprinter", "eVito"] },
  { make: "Ford", models: ["Transit", "Transit Custom", "Transit Connect", "Transit Courier", "E-Transit"] },
  { make: "Volkswagen", models: ["Transporter", "Crafter", "Caddy", "Multivan", "ID. Buzz Cargo"] },
  { make: "Renault", models: ["Trafic", "Master", "Kangoo", "Express", "Estafette"] },
  { make: "Citroën", models: ["Jumper", "Jumpy", "Berlingo", "Dispatch"] },
  { make: "Peugeot", models: ["Boxer", "Expert", "Partner", "e-Expert"] },
  { make: "Fiat", models: ["Ducato", "Doblo", "Fiorino", "Scudo", "e-Ducato"] },
  { make: "Opel / Vauxhall", models: ["Movano", "Vivaro", "Combo"] },
  { make: "Toyota", models: ["HiAce", "Proace", "Proace City", "HiAce Commuter"] },
  { make: "Nissan", models: ["NV400", "NV300", "NV200", "Primastar", "Interstar", "Townstar"] },
  { make: "RAM", models: ["ProMaster", "ProMaster City"] },
  { make: "Iveco", models: ["Daily", "e-Daily"] },
  { make: "Maxus / LDV", models: ["Deliver 9", "Deliver 7", "EV80", "V80", "V90"] },
  { make: "Hyundai", models: ["H-1", "Staria", "iLoad"] },
  { make: "Kia", models: ["Carnival", "K2700", "Bongo"] },
  { make: "Mitsubishi", models: ["L300", "Express", "Delica"] },
  { make: "DFSK", models: ["EC35", "EC31"] },
  { make: "JAC", models: ["Sunray", "Refine"] },
  { make: "Other", models: [] },
];

// ── Pickup Trucks ────────────────────────────────────────────────────────────
export const PICKUP_DATA: VehicleMakeEntry[] = [
  { make: "Ford", models: ["F-150", "F-250", "F-350", "Ranger", "Maverick", "F-150 Lightning"] },
  { make: "RAM", models: ["1500", "2500", "3500", "1500 Classic", "1500 TRX", "ProMaster"] },
  { make: "Toyota", models: ["Hilux", "Tundra", "Tacoma", "Hilux Revo"] },
  { make: "Chevrolet", models: ["Silverado 1500", "Silverado 2500HD", "Silverado 3500HD", "Colorado", "Silverado EV"] },
  { make: "GMC", models: ["Sierra 1500", "Sierra 2500HD", "Sierra 3500HD", "Canyon", "Hummer EV"] },
  { make: "Nissan", models: ["Navara", "Frontier", "Titan", "NP300"] },
  { make: "Mitsubishi", models: ["L200", "Triton", "Strada"] },
  { make: "Isuzu", models: ["D-Max", "MU-X"] },
  { make: "Volkswagen", models: ["Amarok"] },
  { make: "Mercedes-Benz", models: ["X-Class"] },
  { make: "Jeep", models: ["Gladiator"] },
  { make: "Honda", models: ["Ridgeline"] },
  { make: "Hyundai", models: ["Santa Cruz"] },
  { make: "Rivian", models: ["R1T"] },
  { make: "Ford (Electric)", models: ["F-150 Lightning"] },
  { make: "Mazda", models: ["BT-50"] },
  { make: "Renault", models: ["Alaskan"] },
  { make: "Fiat", models: ["Fullback", "Strada"] },
  { make: "SsangYong / KGM", models: ["Musso", "Rexton Sports"] },
  { make: "Great Wall", models: ["Wingle", "Poer"] },
  { make: "JAC", models: ["T6", "T8", "T9"] },
  { make: "Foton", models: ["Tunland", "Sauvana"] },
  { make: "Other", models: [] },
];

// ── Heavy Trucks ─────────────────────────────────────────────────────────────
export const TRUCK_DATA: VehicleMakeEntry[] = [
  { make: "Volvo Trucks", models: ["FH", "FM", "FMX", "FE", "FL", "FH16", "VNL", "VNR", "VHD"] },
  { make: "Scania", models: ["R Series", "S Series", "P Series", "G Series", "L Series"] },
  { make: "MAN", models: ["TGX", "TGS", "TGM", "TGL", "TGE"] },
  { make: "Mercedes-Benz Trucks", models: ["Actros", "Arocs", "Atego", "Antos", "Axor", "eActros"] },
  { make: "DAF", models: ["XG", "XF", "XD", "XB", "LF", "CF"] },
  { make: "Iveco", models: ["S-Way", "T-Way", "X-Way", "Stralis", "Eurocargo", "Daily"] },
  { make: "Kenworth", models: ["T680", "T880", "W990", "T800", "C500", "T170", "T270", "T370"] },
  { make: "Peterbilt", models: ["579", "389", "567", "587", "520", "536", "548"] },
  { make: "Freightliner", models: ["Cascadia", "Coronado", "Columbia", "Century", "Business Class M2", "Severe Duty 108SD"] },
  { make: "International", models: ["LT", "RH", "HX", "LoneStar", "ProStar", "HV", "MV", "CV"] },
  { make: "Mack", models: ["Anthem", "Granite", "Pinnacle", "TerraPro", "LR Electric"] },
  { make: "Isuzu", models: ["N Series", "F Series", "C & E Series", "Giga"] },
  { make: "Hino", models: ["300 Series", "500 Series", "700 Series", "XL Series"] },
  { make: "UD Trucks", models: ["Quon", "Condor", "Croner", "Kuzer"] },
  { make: "Mitsubishi FUSO", models: ["Super Great", "Fighter", "Canter", "eCanter"] },
  { make: "FAW", models: ["J7", "J6", "Jiefang CA", "Tiger V"] },
  { make: "Shacman", models: ["X3000", "H3000", "F3000", "M3000"] },
  { make: "SINOTRUK", models: ["HOWO", "HOWO A7", "King Prince", "Steyr"] },
  { make: "Foton", models: ["Auman", "ETX", "EST"] },
  { make: "Dongfeng", models: ["Kinland", "Lantu", "Tianjin"] },
  { make: "JAC", models: ["K7", "K5", "HFC", "N75"] },
  { make: "Tatra", models: ["PHOENIX", "FORCE", "QUEEN"] },
  { make: "Renault Trucks", models: ["T", "C", "K", "D", "Master"] },
  { make: "Other", models: [] },
];

// ── Buses ────────────────────────────────────────────────────────────────────
export const BUS_DATA: VehicleMakeEntry[] = [
  { make: "Mercedes-Benz", models: ["Citaro", "Travego", "Tourismo", "Intouro", "eCitaro", "Conecto"] },
  { make: "Volvo Buses", models: ["7900", "8900", "9700", "9900", "BZL", "B8R", "B11R"] },
  { make: "MAN", models: ["Lion's City", "Lion's Coach", "Lion's Intercity", " Lion's City E"] },
  { make: "Yutong", models: ["ZK6180", "ZK6126", "ZK6122", "ZK6116", "E12", "E10"] },
  { make: "King Long", models: ["XMQ6127", "XMQ6900", "KLQ6109", "KLQ6129"] },
  { make: "Higer", models: ["KLQ6109", "KLQ6129", "KLQ6886"] },
  { make: "Zhongtong", models: ["LCK6120", "LCK6180", "LCK6127"] },
  { make: "Golden Dragon", models: ["XML6102", "XML6127", "XML6125"] },
  { make: "Irizar", models: ["i6", "i8", "ie tram", "Century"] },
  { make: "Neoplan", models: ["Cityliner", "Tourliner", "Starliner", "Skyliner"] },
  { make: "Setra", models: ["S 415", "S 416", "S 419", "S 531", "S 517"] },
  { make: "Van Hool", models: ["EX", "TX", "TDX", "A330", "Exqui.City"] },
  { make: "BYD", models: ["K9", "K12", "K11", "K9A", "eBus-12"] },
  { make: "Solaris", models: ["Urbino", "Trollino", "Alpino", "InterUrbino"] },
  { make: "Scania", models: ["Citywide", "Interlink", "Touring"] },
  { make: "Iveco Bus", models: ["Crossway", "Crossway LE", "Evadys", "Urbanway"] },
  { make: "Karsan", models: ["Jest", "Atak", "e-ATAK", "e-Jest"] },
  { make: "Toyota", models: ["Coaster", "HiAce Commuter"] },
  { make: "Ford", models: ["Transit Bus", "E-Transit"] },
  { make: "Other", models: [] },
];

// ── Motorcycles ──────────────────────────────────────────────────────────────
export const MOTORCYCLE_DATA: VehicleMakeEntry[] = [
  { make: "Honda", models: ["CB500F", "CB500X", "CBR500R", "CB650R", "CBR650R", "CB750 Hornet", "CB1000R", "Africa Twin", "Gold Wing", "Forza 750", "PCX 125", "Click 125i", "ADV 150"] },
  { make: "Yamaha", models: ["MT-03", "MT-07", "MT-09", "MT-10", "R3", "R6", "R7", "R1", "Tracer 700", "Tracer 9", "Ténéré 700", "XMAX 300", "TMAX 560", "NMAX 155"] },
  { make: "Kawasaki", models: ["Ninja 400", "Ninja 650", "Ninja 1000SX", "Ninja ZX-6R", "Ninja ZX-10R", "Z650", "Z900", "Z H2", "Versys 650", "Versys 1000", "KLX300"] },
  { make: "Suzuki", models: ["GSX-S750", "GSX-S950", "GSX-S1000", "GSX-R600", "GSX-R750", "GSX-R1000", "V-Strom 650", "V-Strom 1050", "Burgman 400", "SV650"] },
  { make: "Harley-Davidson", models: ["Sportster S", "Street Glide", "Road Glide", "Fat Boy", "Road King", "Pan America", "Low Rider", "Softail Standard", "Iron 883", "Nightster"] },
  { make: "BMW Motorrad", models: ["R 1250 GS", "R 1250 GS Adventure", "S 1000 RR", "S 1000 XR", "F 850 GS", "F 900 R", "G 310 R", "G 310 GS", "M 1000 RR", "K 1600 GT"] },
  { make: "Ducati", models: ["Monster", "Scrambler", "Multistrada V4", "Panigale V4", "Streetfighter V4", "Hypermotard", "SuperSport", "Diavel V4", "DesertX"] },
  { make: "KTM", models: ["390 Duke", "790 Duke", "890 Duke R", "1290 Super Duke R", "390 Adventure", "790 Adventure", "890 Adventure", "RC 390", "450 SMR"] },
  { make: "Royal Enfield", models: ["Classic 350", "Meteor 350", "Thunderbird", "Himalayan", "Interceptor 650", "Continental GT 650", "Super Meteor 650", "Bullet 350"] },
  { make: "Triumph", models: ["Street Triple", "Speed Triple", "Tiger 900", "Tiger 1200", "Bonneville", "Thruxton", "Speed Twin", "Trident 660", "Scrambler 1200"] },
  { make: "Aprilia", models: ["RS 660", "Tuono 660", "RS-V4", "Tuono V4", "Dorsoduro", "Shiver", "RSV4", "Caponord"] },
  { make: "MV Agusta", models: ["F3 800", "F4", "Brutale", "Turismo Veloce", "Superveloce", "Rush"] },
  { make: "Indian", models: ["Scout", "Chief", "Chieftain", "Roadmaster", "FTR", "Pursuit", "Challenger"] },
  { make: "Zero Motorcycles", models: ["SR/F", "SR/S", "DSR/X", "FX", "FXE", "S", "DS"] },
  { make: "Husqvarna", models: ["Vitpilen 401", "Svartpilen 401", "Norden 901"] },
  { make: "Benelli", models: ["TRK 502", "TRK 251", "Leoncino 500", "Leoncino 250", "BN 302"] },
  { make: "CF Moto", models: ["300SR", "650MT", "700CL-X", "800MT", "1250TR-G"] },
  { make: "Kymco", models: ["AK 550", "X-Town 300i", "KRV 180", "Agility 125"] },
  { make: "Piaggio / Vespa", models: ["Vespa GTS", "Vespa Primavera", "Vespa Sprint", "MP3 400", "Beverly 400"] },
  { make: "Other", models: [] },
];

// ── Ambulances ───────────────────────────────────────────────────────────────
export const AMBULANCE_DATA: VehicleMakeEntry[] = [
  { make: "Mercedes-Benz", models: ["Sprinter Ambulance", "Vito Ambulance", "Actros Ambulance"] },
  { make: "Ford", models: ["Transit Ambulance", "F-350 Ambulance", "F-450 Ambulance"] },
  { make: "RAM", models: ["ProMaster Ambulance", "1500 Ambulance"] },
  { make: "Chevrolet", models: ["Express Ambulance", "Silverado Ambulance"] },
  { make: "Volkswagen", models: ["Crafter Ambulance", "Transporter Ambulance"] },
  { make: "Fiat", models: ["Ducato Ambulance"] },
  { make: "Toyota", models: ["HiAce Ambulance", "Land Cruiser Ambulance"] },
  { make: "Renault", models: ["Master Ambulance", "Trafic Ambulance"] },
  { make: "Peugeot", models: ["Boxer Ambulance", "Expert Ambulance"] },
  { make: "Citroën", models: ["Jumper Ambulance", "Jumpy Ambulance"] },
  { make: "Nissan", models: ["NV400 Ambulance", "NV200 Ambulance", "Patrol Ambulance"] },
  { make: "Iveco", models: ["Daily Ambulance"] },
  { make: "Other", models: [] },
];

// ── Tractors ─────────────────────────────────────────────────────────────────
export const TRACTOR_DATA: VehicleMakeEntry[] = [
  { make: "John Deere", models: ["5 Series", "6 Series", "7 Series", "8 Series", "9 Series", "5075E", "6130M", "7230R", "8370R"] },
  { make: "New Holland", models: ["T4", "T5", "T6", "T7", "T8", "T9", "TS6", "TM7"] },
  { make: "Case IH", models: ["Farmall", "Puma", "Maxxum", "Magnum", "Steiger", "Optum"] },
  { make: "Fendt", models: ["200 Vario", "300 Vario", "500 Vario", "700 Vario", "800 Vario", "900 Vario", "1000 Vario"] },
  { make: "Massey Ferguson", models: ["MF 3700", "MF 4700", "MF 5700", "MF 6700", "MF 7700", "MF 8700", "MF 4710"] },
  { make: "CLAAS", models: ["Arion", "Axion", "Axos", "Elios", "Nexos", "Xerion"] },
  { make: "Deutz-Fahr", models: ["5 Series", "6 Series", "7 Series", "8 Series", "Agrotron", "Agroplus"] },
  { make: "Kubota", models: ["B Series", "L Series", "M Series", "MX Series", "M7"] },
  { make: "Valtra", models: ["A Series", "N Series", "T Series", "S Series", "Q Series"] },
  { make: "Same", models: ["Explorer", "Iron", "Dorado", "Argon", "Virtus"] },
  { make: "Landini", models: ["5 Series", "6 Series", "7 Series", "Rex", "Powerfarm"] },
  { make: "Steyr", models: ["Expert", "Multi", "Impuls", "Terrus"] },
  { make: "McCormick", models: ["X4", "X5", "X6", "X7", "X8"] },
  { make: "Zetor", models: ["Proxima", "Forterra", "Crystal", "Major"] },
  { make: "Kioti", models: ["CS Series", "CX Series", "DK Series", "PX Series"] },
  { make: "LS Tractor", models: ["XJ Series", "XR Series", "MT Series"] },
  { make: "Other", models: [] },
];

// ── Diggers / Excavators ─────────────────────────────────────────────────────
export const DIGGER_DATA: VehicleMakeEntry[] = [
  { make: "Caterpillar", models: ["308", "310", "315", "320", "323", "330", "340", "349", "374", "395"] },
  { make: "Komatsu", models: ["PC30", "PC55", "PC88", "PC130", "PC210", "PC290", "PC360", "PC490", "PC800"] },
  { make: "JCB", models: ["JS20", "JS37", "JS81", "JS130", "JS205", "JS290", "JS370", "X Series 245X"] },
  { make: "Hitachi", models: ["ZX30", "ZX55", "ZX85", "ZX130", "ZX210", "ZX300", "ZX450", "ZX890"] },
  { make: "Volvo CE", models: ["ECR18", "EC55", "ECR88", "EC140", "EC210", "EC300", "EC380", "EC480", "EC750"] },
  { make: "Doosan", models: ["DX27", "DX55", "DX85", "DX140", "DX210", "DX300", "DX380", "DX480"] },
  { make: "Liebherr", models: ["R 9", "R 918", "R 926", "R 938", "R 950", "R 960", "R 9100"] },
  { make: "Hyundai CE", models: ["HX30A", "HX55A", "HX85A", "HX145A", "HX220A", "HX300A", "HX380A"] },
  { make: "Sany", models: ["SY16", "SY35", "SY75", "SY135", "SY215", "SY305", "SY365", "SY485"] },
  { make: "Kobelco", models: ["SK17", "SK55", "SK85", "SK140", "SK210", "SK300", "SK380", "SK500"] },
  { make: "Sumitomo", models: ["SH45", "SH80", "SH135", "SH210", "SH290", "SH350", "SH490"] },
  { make: "Takeuchi", models: ["TB230", "TB260", "TB290", "TB2150", "TB260S"] },
  { make: "Bobcat", models: ["E10", "E17", "E26", "E35", "E42", "E55", "E85", "E145"] },
  { make: "Case CE", models: ["CX18", "CX57", "CX80", "CX130", "CX210", "CX300", "CX370", "CX490"] },
  { make: "Yanmar", models: ["SV08", "SV17", "SV26", "SV40", "SV60", "SV100"] },
  { make: "Other", models: [] },
];

// ── Forklifts ────────────────────────────────────────────────────────────────
export const FORKLIFT_DATA: VehicleMakeEntry[] = [
  { make: "Toyota", models: ["8-Series", "Tonero", "Traigo", "Shogun", "Core Electric", "BT Levio", "BT Staxio"] },
  { make: "Caterpillar", models: ["GP15N", "GP25N", "GP35N", "GC55K", "EP16CNT", "DP25N", "EC25N2"] },
  { make: "Crown", models: ["FC 5200", "FC 5700", "RR 5200", "SP 3500", "PE 4500", "RC 3000"] },
  { make: "Hyster", models: ["H2.0FT", "H2.5FT", "H3.5FT", "H4.5FT", "H5.0FT", "H7.0FT", "E1.6XN", "E2.0XN"] },
  { make: "Yale", models: ["GLP20VX", "GLP30VX", "ERP20VT", "MO20", "OS030", "MP20T"] },
  { make: "Komatsu", models: ["FG15ST", "FG20ST", "FG25ST", "FG30ST", "FD35T", "AE50"] },
  { make: "Jungheinrich", models: ["EFG 115", "EFG 120", "EFG 215", "ERE 225", "ETR 345", "EKS 312"] },
  { make: "Linde", models: ["E12", "E16", "E20", "E25", "E30", "H20", "H25", "H30", "X10", "T20"] },
  { make: "Mitsubishi", models: ["FB15KT", "FB20KT", "FD15NT", "FD20NT", "FD25NT", "FD30NT"] },
  { make: "Nissan", models: ["PL02A20PX", "FL02A25PX", "UGD02A30PX"] },
  { make: "Clark", models: ["C15", "C20", "C25", "C30", "S15", "S20", "S25", "S30"] },
  { make: "Manitou", models: ["MI 20 G", "MI 25 G", "MI 30 G", "MSI 25", "MC 18"] },
  { make: "Combilift", models: ["C Series", "CB Series", "Combi-SC", "Combi-WR", "Aisle Master"] },
  { make: "Doosan", models: ["G15G-7", "G20G-7", "G25G-7", "G30G-7", "B15X-7", "B20X-7"] },
  { make: "Other", models: [] },
];

// ── Tow Trucks ───────────────────────────────────────────────────────────────
export const TOW_TRUCK_DATA: VehicleMakeEntry[] = [
  { make: "Ford", models: ["F-350", "F-450", "F-550", "F-650", "F-750"] },
  { make: "RAM", models: ["3500", "4500", "5500"] },
  { make: "Chevrolet", models: ["Silverado 3500HD", "Kodiak"] },
  { make: "GMC", models: ["Sierra 3500HD", "TopKick"] },
  { make: "International", models: ["4300", "4400", "8600", "HV Series"] },
  { make: "Kenworth", models: ["T270", "T370", "T470", "T680"] },
  { make: "Peterbilt", models: ["337", "348", "567"] },
  { make: "Freightliner", models: ["M2 106", "Business Class M2", "114SD"] },
  { make: "Volvo Trucks", models: ["FE", "FM", "FH"] },
  { make: "Mercedes-Benz Trucks", models: ["Atego", "Axor", "Actros"] },
  { make: "Scania", models: ["P Series", "G Series", "R Series"] },
  { make: "MAN", models: ["TGM", "TGS"] },
  { make: "Isuzu", models: ["NPR", "NQR", "NRR", "FTR", "FVR"] },
  { make: "Hino", models: ["195", "258", "268", "338", "500 Series"] },
  { make: "Other", models: [] },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

import { CAR_DATA } from "./carData";

const TYPE_DATA_MAP: Record<string, VehicleMakeEntry[]> = {
  car: CAR_DATA,
  suv: CAR_DATA,
  van: VAN_DATA,
  pickup_truck: PICKUP_DATA,
  truck: TRUCK_DATA,
  bus: BUS_DATA,
  motorcycle: MOTORCYCLE_DATA,
  ambulance: AMBULANCE_DATA,
  tractor: TRACTOR_DATA,
  digger: DIGGER_DATA,
  forklift: FORKLIFT_DATA,
  tow_truck: TOW_TRUCK_DATA,
  other: CAR_DATA,
};

export function getMakeDataForType(vehicleType: string): VehicleMakeEntry[] {
  return TYPE_DATA_MAP[vehicleType] ?? CAR_DATA;
}

export function getMakesForType(vehicleType: string): string[] {
  return getMakeDataForType(vehicleType).map((d) => d.make);
}

export function getModelsForTypedMake(vehicleType: string, make: string): string[] {
  return getMakeDataForType(vehicleType).find((d) => d.make === make)?.models ?? [];
}
