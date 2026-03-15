export type CarMake = {
  make: string;
  models: string[];
};

export const CAR_DATA: CarMake[] = [
  {
    make: "Acura",
    models: ["ILX","Integra","MDX","NSX","RDX","RLX","TLX","TSX","ZDX"],
  },
  {
    make: "Alfa Romeo",
    models: ["4C","Giulia","Giulietta","GTV","MiTo","Stelvio","Tonale"],
  },
  {
    make: "Aston Martin",
    models: ["DB11","DB12","DBS","DBX","Rapide","Vantage","Virage"],
  },
  {
    make: "Audi",
    models: [
      "A1","A2","A3","A4","A5","A6","A7","A8",
      "e-tron","e-tron GT","e-tron S","e-tron Sportback",
      "Q2","Q3","Q4 e-tron","Q5","Q6 e-tron","Q7","Q8","Q8 e-tron",
      "R8","RS3","RS4","RS5","RS6","RS7","RS Q3","RS Q8",
      "S3","S4","S5","S6","S7","S8","SQ5","SQ7","SQ8",
      "TT","TTS","TT RS",
    ],
  },
  {
    make: "Bentley",
    models: ["Bentayga","Continental GT","Continental GTC","Flying Spur","Mulsanne"],
  },
  {
    make: "BMW",
    models: [
      "1 Series","2 Series","3 Series","4 Series","5 Series","6 Series","7 Series","8 Series",
      "i3","i4","i5","i7","i8","iX","iX1","iX2","iX3",
      "M2","M3","M4","M5","M6","M8",
      "X1","X2","X3","X3 M","X4","X4 M","X5","X5 M","X6","X6 M","X7",
      "Z3","Z4",
    ],
  },
  {
    make: "Buick",
    models: ["Enclave","Encore","Encore GX","Envision","LaCrosse","Regal","Verano"],
  },
  {
    make: "Cadillac",
    models: [
      "ATS","CT4","CT5","CT6","Escalade","Escalade ESV",
      "LYRIQ","OPTIQ","SRX","XT4","XT5","XT6",
    ],
  },
  {
    make: "Chevrolet",
    models: [
      "Blazer","Blazer EV","Bolt EUV","Bolt EV",
      "Camaro","Captiva","Colorado",
      "Corvette","Cruze","Equinox","Equinox EV",
      "Express","HHR","Impala","Malibu",
      "Silverado 1500","Silverado 2500HD","Silverado 3500HD",
      "Silverado EV","Sonic","Spark","Suburban",
      "Tahoe","Tracker","Trailblazer","Traverse","Trax","Uplander",
    ],
  },
  {
    make: "Chrysler",
    models: ["200","300","Pacifica","Pacifica Hybrid","Town & Country","Voyager"],
  },
  {
    make: "Citroën",
    models: ["Berlingo","C1","C2","C3","C3 Aircross","C4","C4 Cactus","C5","C5 Aircross","C6","DS3","DS4","DS5"],
  },
  {
    make: "Daihatsu",
    models: ["Charade","Copen","Gran Move","Materia","Move","Rocky","Sirion","Terios","YRV"],
  },
  {
    make: "Dodge",
    models: [
      "Challenger","Charger","Dakota","Dart","Durango",
      "Grand Caravan","Hornet","Journey","Neon","Ram 1500","Viper",
    ],
  },
  {
    make: "Ferrari",
    models: [
      "296 GTB","296 GTS","488 GTB","488 Pista","488 Spider",
      "812 Competizione","812 GTS","812 Superfast",
      "California","California T","F8 Spider","F8 Tributo",
      "GTC4Lusso","Portofino","Portofino M","Purosangue",
      "Roma","Roma Spider","SF90 Spider","SF90 Stradale",
    ],
  },
  {
    make: "Fiat",
    models: ["124 Spider","500","500C","500e","500L","500X","Bravo","Doblo","Panda","Punto","Tipo"],
  },
  {
    make: "Ford",
    models: [
      "Bronco","Bronco Sport","C-Max","EcoSport",
      "Edge","Escape","Expedition","Explorer",
      "F-150","F-150 Lightning","F-250","F-350","F-450",
      "Fiesta","Flex","Focus","Fusion","Galaxy",
      "Maverick","Mondeo","Mustang","Mustang Mach-E",
      "Puma","Ranger","S-Max","Taurus","Transit","Transit Connect",
    ],
  },
  {
    make: "Genesis",
    models: ["G70","G80","G90","GV60","GV70","GV80"],
  },
  {
    make: "GMC",
    models: [
      "Acadia","Canyon","Envoy","Envoy XL","Envoy XUV",
      "Jimmy","Safari","Savana","Sierra 1500","Sierra 2500HD",
      "Sierra 3500HD","Sierra EV","Terrain","Yukon","Yukon XL",
    ],
  },
  {
    make: "Honda",
    models: [
      "Accord","Accord Hybrid","Civic","Civic Type R","Clarity",
      "CR-V","CR-V Hybrid","CR-Z","Element","Fit",
      "HR-V","Insight","Odyssey","Passport","Pilot",
      "Prologue","Ridgeline","S2000",
    ],
  },
  {
    make: "Hyundai",
    models: [
      "Accent","IONIQ","IONIQ 5","IONIQ 6","IONIQ N",
      "Elantra","Elantra N","Elantra Hybrid","Equus",
      "Genesis","Kona","Kona Electric","Kona N",
      "Nexo","Palisade","Santa Cruz","Santa Fe",
      "Santa Fe Hybrid","Sonata","Sonata Hybrid",
      "Staria","Tucson","Tucson Hybrid","Veloster","Venue",
    ],
  },
  {
    make: "Infiniti",
    models: ["G35","G37","Q30","Q40","Q50","Q60","Q70","QX30","QX50","QX55","QX60","QX80"],
  },
  {
    make: "Isuzu",
    models: ["Amigo","Axiom","D-Max","i-Series","MU-7","MU-X","Rodeo","Trooper","VehiCROSS"],
  },
  {
    make: "Jaguar",
    models: ["E-PACE","F-PACE","F-TYPE","I-PACE","S-TYPE","X-TYPE","XE","XF","XJ","XK"],
  },
  {
    make: "Jeep",
    models: [
      "Avenger","Cherokee","Commander","Compass","Gladiator",
      "Grand Cherokee","Grand Cherokee 4xe","Grand Wagoneer",
      "Renegade","Wagoneer","Wrangler","Wrangler 4xe",
    ],
  },
  {
    make: "Kia",
    models: [
      "Carnival","Ceed","Cerato","EV6","EV9",
      "Niro","Niro EV","Niro Hybrid","Niro Plug-in Hybrid",
      "Optima","Picanto","ProCeed","Rio",
      "Seltos","Sorento","Sorento Hybrid","Soul",
      "Sportage","Sportage Hybrid","Stinger","Telluride",
    ],
  },
  {
    make: "Lamborghini",
    models: ["Aventador","Gallardo","Huracán","Huracán Sterrato","Urus","Urus S","Revuelto"],
  },
  {
    make: "Land Rover",
    models: [
      "Defender","Discovery","Discovery Sport",
      "Freelander","Range Rover","Range Rover Evoque",
      "Range Rover Sport","Range Rover Velar",
    ],
  },
  {
    make: "Lexus",
    models: [
      "CT","ES","ES Hybrid","GS","GX","IS","LC","LS",
      "LX","NX","NX Hybrid","RC","RX","RX Hybrid",
      "RZ","TX","TX Hybrid","UX","UX Hybrid",
    ],
  },
  {
    make: "Lincoln",
    models: ["Aviator","Aviator Plug-in Hybrid","Continental","Corsair","MKC","MKT","MKX","MKZ","Nautilus","Navigator"],
  },
  {
    make: "Lucid",
    models: ["Air","Gravity"],
  },
  {
    make: "Maserati",
    models: ["Ghibli","GranCabrio","GranTurismo","Grecale","Levante","MC20","Quattroporte"],
  },
  {
    make: "Mazda",
    models: [
      "2","3","3 Sport","5","6",
      "CX-3","CX-30","CX-5","CX-50","CX-60","CX-70","CX-80","CX-90",
      "MX-30","MX-5 Miata","MX-5 RF","RX-7","RX-8",
    ],
  },
  {
    make: "Mercedes-Benz",
    models: [
      "A-Class","B-Class","C-Class","CLA","CLK","CLS",
      "E-Class","EQA","EQB","EQC","EQE","EQE SUV","EQS","EQS SUV",
      "G-Class","GLA","GLB","GLC","GLE","GLK","GLS",
      "S-Class","SL","SLC","SLK",
      "AMG GT","AMG GT 4-Door","Maybach GLS","Maybach S-Class","Metris","Sprinter",
    ],
  },
  {
    make: "Mini",
    models: ["Clubman","Cooper","Cooper S","Convertible","Countryman","Coupe","John Cooper Works","Paceman","Roadster"],
  },
  {
    make: "Mitsubishi",
    models: ["ASX","Eclipse Cross","Galant","Lancer","Mirage","Outlander","Outlander PHEV","Outlander Sport","Pajero","RVR","Triton"],
  },
  {
    make: "Nissan",
    models: [
      "350Z","370Z","Altima","Ariya","Armada",
      "Cube","Frontier","GT-R","Juke",
      "Kicks","Leaf","Maxima","Murano","NV",
      "Pathfinder","Qashqai","Quest","Rogue","Rogue Sport",
      "Sentra","Titan","Versa","X-Trail","Z",
    ],
  },
  {
    make: "Peugeot",
    models: ["108","208","2008","308","3008","408","4008","508","5008","Partner","Rifter","Traveller"],
  },
  {
    make: "Polestar",
    models: ["1","2","3","4"],
  },
  {
    make: "Porsche",
    models: [
      "718 Boxster","718 Cayman","911","Cayenne","Cayenne E-Hybrid",
      "Macan","Macan Electric","Panamera","Panamera E-Hybrid","Taycan","Taycan Cross Turismo",
    ],
  },
  {
    make: "RAM",
    models: ["1500","1500 Classic","2500","3500","ProMaster","ProMaster City"],
  },
  {
    make: "Renault",
    models: ["Captur","Clio","Duster","Kadjar","Koleos","Laguna","Megane","Scenic","Symbol","Talisman","Zoe"],
  },
  {
    make: "Rivian",
    models: ["R1S","R1T","R2"],
  },
  {
    make: "Rolls-Royce",
    models: ["Cullinan","Dawn","Ghost","Phantom","Spectre","Wraith"],
  },
  {
    make: "Subaru",
    models: [
      "Ascent","BRZ","Crosstrek","Crosstrek Hybrid",
      "Forester","Impreza","Legacy","Outback",
      "Solterra","WRX","XV",
    ],
  },
  {
    make: "Suzuki",
    models: ["Alto","Baleno","Celerio","Dzire","Ertiga","Grand Vitara","Ignis","Jimny","S-Presso","Swift","Vitara","Wagon R","XL7"],
  },
  {
    make: "Tesla",
    models: ["Cybertruck","Model 3","Model S","Model X","Model Y","Roadster"],
  },
  {
    make: "Toyota",
    models: [
      "4Runner","86","Alphard","Avalon","Avanza","bZ4X",
      "C-HR","Camry","Camry Hybrid","Corolla","Corolla Cross",
      "Corolla Hybrid","Crown","FJ Cruiser","Fortuner",
      "GR Corolla","GR Supra","GR86","Hiace",
      "Highlander","Highlander Hybrid","Hilux",
      "Land Cruiser","Land Cruiser Prado",
      "Mirai","Prius","Prius Prime","Prius V",
      "RAV4","RAV4 Hybrid","RAV4 Prime",
      "Sequoia","Sienna","Sienna Hybrid","Supra",
      "Tacoma","Tundra","Tundra Hybrid","Venza","Yaris","Yaris Cross",
    ],
  },
  {
    make: "Volkswagen",
    models: [
      "Amarok","Arteon","Atlas","Atlas Cross Sport",
      "Caddy","Golf","Golf GTI","Golf R","Golf Alltrack","Golf SportWagen",
      "ID.3","ID.4","ID.5","ID.6","ID.7","ID. Buzz",
      "Jetta","Jetta GLI","Passat","Polo","Sharan",
      "T-Cross","T-Roc","Taos","Tiguan","Touareg","Touran","Up!",
    ],
  },
  {
    make: "Volvo",
    models: [
      "C30","C40 Recharge","EC40","EX30","EX40","EX90",
      "S40","S60","S60 Recharge","S90","S90 Recharge",
      "V40","V60","V60 Recharge","V90","V90 Recharge",
      "XC40","XC40 Recharge","XC60","XC60 Recharge","XC90","XC90 Recharge",
    ],
  },
];

export const ALL_MAKES = CAR_DATA.map((d) => d.make).sort();

export function getModelsForMake(make: string): string[] {
  const found = CAR_DATA.find((d) => d.make.toLowerCase() === make.toLowerCase());
  return found ? found.models.sort() : [];
}
