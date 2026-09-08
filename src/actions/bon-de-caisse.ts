"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import { headers } from "next/headers";
import path from "path";

interface BonDeCaisseData {
  receiptNumber: string;
  date: string;
  fullName: string;
  cinNumber: string;
  amount: string;
  amountWords: string;
  object: string;
  description: string;
}

const CIN_NUMBERS: Record<string, string> = {
  "aaberran": "LG46216",
  "aachfenn": "J558047",
  "aaghzal": "LC382742",
  "aait-idi": "AD321467",
  "aakritah": "LG43269",
  "aamardou": "Q339222",
  "aamddah": "L684717",
  "aamohame": "LA197683",
  "aaskal": "EB203412",
  "aasselma": "K620024",
  "aatbir": "BE884296",
  "abamine": "LF65671",
  "abattagi": "AD323674",
  "abdeel-o": "HH252881",
  "abdel-ou": "IC143694",
  "abdennac": "EE680383",
  "abekkar": "WB197642",
  "abelayad": "LB222195",
  "abelechg": "BJ460826",
  "aben-chr": "BH629601",
  "aben-dhi": "TS802524",
  "aben-moh": "JE319980",
  "abenajib": "L651883",
  "abenchel": "DJ43633",
  "abenmous": "K587921",
  "abguenbo": "LC377090",
  "abmahfou": "U210163",
  "abouabra": "BL168504",
  "abounab": "L615721",
  "abouram": "JB515669",
  "abraimi": "K575651",
  "absaadan": "L686375",
  "achakkaf": "L690972",
  "achat": "L717622",
  "achoukri": "P368783",
  "adbouras": "LF52889",
  "admansar": "LE30044",
  "aech-che": "FB126797",
  "aechaoub": "BA2783",
  "ael-amin": "EA216380",
  "ael-khel": "CB345436",
  "ael-krai": "CD798821",
  "ael-krid": "CB332192",
  "ael-maar": "AA95704",
  "ael-maaz": "KB238215",
  "ael-majd": "LB241034",
  "ael-mhar": "CB353091",
  "ael-mora": "L637614",
  "ael-most": "JE314824",
  "aessaoud": "D858602",
  "aet-tale": "L662671",
  "aet-tass": "D877155",
  "agimi": "F664299",
  "ahaddadi": "JC634420",
  "ahajji": "K586492",
  "ahamdi": "GM237407",
  "ahamouda": "LG50927",
  "ahouass": "L651050",
  "ahrada": "L638866",
  "ahrahmou": "LE33935",
  "ahraich": "K582625",
  "aidnassa": "JY33140",
  "aizokkad": "L728421",
  "ajamoun": "LE34187",
  "ajbari": "KA69557",
  "ajelloul": "CN61606",
  "akaarich": "L719652",
  "akharkho": "LE32089",
  "akheired": "BB151007",
  "alakhida": "JB518204",
  "albelaiz": "LE34262",
  "alotfi": "JM89694",
  "amaaouni": "UB104959",
  "amahdiou": "CD387456",
  "amait-ou": "BB189303",
  "amdouyah": "CB343210",
  "amedina": "L703017",
  "ameirif": "L639081",
  "amejdoub": "L680725",
  "amezioun": "ZT311458",
  "amissa": "GM254817",
  "amsbai": "AD315656",
  "anktiri": "LA186665",
  "aohssine": "JH68548",
  "aouardao": "G660959",
  "aouchaad": "N451134",
  "aouchaou": "I761585",
  "aqrafi": "BA13897",
  "arekoune": "JC655250",
  "asaber": "JA188823",
  "asalmi": "KB202810",
  "asekkak": "I751679",
  "asidqi": "Q323710",
  "atoukmat": "KB208366",
  "ayaarab": "LE33828",
  "ayakoubi": "IA195751",
  "aychikhi": "AE311139",
  "ayel-imr": "L653031",
  "ayoufkir": "L644704",
  "ayousr": "BJ446496",
  "ayzahrao": "AD317922",
  "azaghlou": "L626468",
  "azarouil": "L647037",
  "azennani": "BW63286",
  "azghibat": "J561825",
  "azgor": "N441180",
  "aziyani": "CD916260",
  "azmakhlo": "LC385456",
  "bbelarra": "SH222519",
  "bbouagou": "T329236",
  "bchifour": "N436144",
  "bdebbagh": "L698403",
  "bel-abde": "K576106",
  "bel-kdio": "CD703551",
  "bel-khan": "L572658",
  "bgannoun": "FB126979",
  "bmengouc": "FJ27517",
  "bouhammo": "IC157263",
  "brel-bou": "GM224193",
  "bsalim": "SH189832",
  "bsouhar": "Q344684",
  "bzoufri": "L678287",
  "cahaik": "LC327054",
  "calmouht": "JA169633",
  "cbousset": "L628628",
  "ckannane": "N430174",
  "czghoumi": "LA158138",
  "delhajou": "DO67651",
  "doabrour": "GM251235",
  "eboulhou": "J548551",
  "eel-ansa": "J591656",
  "eel-hour": "GI11607",
  "eismail": "PB262198",
  "elakhfif": "I747010",
  "emohamed": "EE674081",
  "esalim": "JE316402",
  "esekouni": "N459750",
  "fakadjal": "L667644",
  "fbalyout": "LF65997",
  "fbelahse": "DA97991",
  "fel-aziz": "RC45681",
  "felhafid": "GM241737",
  "fhihi": "BA2995",
  "fidriss": "BE930683",
  "fzerrou": "LE33126",
  "gel-mejd": "LC332008",
  "gothmane": "AD303187",
  "haarab": "X401139",
  "haboucha": "JH48586",
  "hacharka": "LE29951",
  "hadrider": "L722877",
  "hael-mou": "JK34686",
  "haguezou": "J542687",
  "hahadiou": "P363186",
  "hait-hsa": "IC148512",
  "hait-sal": "Y490067",
  "hamine": "LF67155",
  "hanebaro": "BL156078",
  "haouky": "JC651852",
  "hasbayou": "J589523",
  "hassimi": "M626924",
  "hbelhadj": "K586832",
  "hben-bou": "EE844000",
  "hbouzian": "RB25578",
  "hbrahimi": "DA102359",
  "hchair": "LB253481",
  "hchairi": "L631260",
  "hcharia": "K528680",
  "hdagdagu": "JM83018",
  "hdargui": "LE34913",
  "hel-bouk": "KB218600",
  "hel-moue": "BH623184",
  "helarras": "L662933",
  "hhammiou": "L720369",
  "hhanane": "LF64144",
  "hkasbaou": "MD18849",
  "hlachhab": "AS14157",
  "hmeftah": "BA16624",
  "hoigag": "JK34796",
  "hrahmane": "J523421",
  "htalhaou": "JH36027",
  "htouil": "T276233",
  "ien-niou": "L692113",
  "ihaffout": "KB248572",
  "ihajouji": "L644613",
  "iizokkad": "L728420",
  "ikorchi": "BL171440",
  "ilaasri": "J532255",
  "ilabyed": "AD314996",
  "imansar": "LE33919",
  "imatouil": "KB195098",
  "imel-haj": "LE29686",
  "irfei": "LE33835",
  "isait-el": "LE32510",
  "isel-azz": "LB236257",
  "isel-mou": "CD961337",
  "jazailac": "LB258354",
  "jbelkerf": "MC300183",
  "jhamdaou": "L616221",
  "jlaazouz": "K576716",
  "jmayou": "LC337888",
  "kadam": "LA198656",
  "kaneddam": "Z667109",
  "kboughal": "C150770",
  "kchaouki": "JE313536",
  "kfouad": "UA109894",
  "khaimer": "BB167864",
  "kslik": "V364234",
  "maddou": "FH63233",
  "maeskhai": "L664397",
  "mait-taj": "JT97288",
  "mal-haou": "LC368590",
  "mamazzal": "JC625029",
  "masliman": "KB268723",
  "mayache-": "L644728",
  "mbaanni": "CD743068",
  "mbakha": "L690134",
  "mbarhoun": "LC404529",
  "mbelkass": "KB239591",
  "mbelouar": "D863507",
  "mben-cha": "KB152419",
  "mben-jad": "ZG163678",
  "mbiknoua": "JE280238",
  "mbouderr": "GN216221",
  "mboudrio": "I751241",
  "mboujama": "L674511",
  "mbousbaa": "BB176952",
  "mboutahi": "KB209580",
  "mbouyahy": "CD406704",
  "mchaouac": "SB31459",
  "mcharrad": "BH637864",
  "mdaghouj": "KB138645",
  "mdakni": "KB222626",
  "mdenguir": "JH48451",
  "mdouzi": "CD610822",
  "med-dahr": "AE272792",
  "mel-adna": "GM218849",
  "mel-akhd": "K565854",
  "mel-bakh": "KB237115",
  "mel-gand": "FJ24246",
  "mel-hime": "EC58000",
  "mel-mora": "LE34952",
  "mel-moun": "M653090",
  "mel-yazi": "LF65946",
  "mguerraf": "KB237068",
  "mhayyoun": "K577527",
  "mhoumman": "L693639",
  "mizem": "G794890",
  "mjadid": "CD668082",
  "mkhairou": "L633824",
  "mlagrini": "AA74078",
  "mlalama": "AS23342",
  "mmaarafi": "BA9287",
  "mmounsif": "DN33043",
  "mn-miass": "D866026",
  "mnahli": "SH166726",
  "moamzil": "WA303416",
  "moben-ta": "L622451",
  "moel-amr": "L599437",
  "moel-idr": "LA180098",
  "moelalj": "LA189722",
  "moguenia": "L698466",
  "mohaben-": "L649868",
  "mohael-g": "LG47895",
  "mohaouar": "EE930864",
  "mohchaib": "AD324523",
  "mohkhald": "ZT221953",
  "molahrac": "K639866",
  "moouali": "U202229",
  "morekaz": "L661748",
  "mosalhi": "R384304",
  "mourhouc": "LG50483",
  "mozahnou": "SH214572",
  "mrian": "L632875",
  "mrital-": "GJ69467",
  "msaadaou": "L693179",
  "msidry": "J542467",
  "mskhairi": "L634244",
  "msodor": "LE26095",
  "msuiar": "LF65218",
  "mtahalla": "BB218213",
  "mtaib": "BA5006",
  "mtarrih": "AD330086",
  "mzeroual": "CD694783",
  "mzoheir": "BE836375",
  "nachab": "K557340",
  "naessgui": "LE32449",
  "namorgha": "K567745",
  "nbenyahy": "LE30952",
  "nbouhali": "JK27986",
  "nchaknan": "L661728",
  "ndahib": "BL167588",
  "nel-khal": "Z666496",
  "nel-mous": "LE21884",
  "nelallao": "BL168255",
  "ner-roui": "GM242618",
  "nettalha": "N440343",
  "nhayoun": "L633619",
  "nhimad": "GM213852",
  "nikhtib": "FH63184",
  "nmotie-": "N467573",
  "noben-ai": "AD327293",
  "nouakhro": "JY45138",
  "oakerkao": "BW2687",
  "oamazgha": "L697737",
  "obouhrir": "CD781900",
  "ochouati": "K576027",
  "oeddamou": "LG49757",
  "oel-mado": "CD618333",
  "oel-mest": "EE911339",
  "oel-mora": "LG50128",
  "oelbouha": "Y440295",
  "oelhasso": "L713188",
  "oessobhi": "L700134",
  "oezzaou": "Y477526",
  "ogorfti": "GM231512",
  "ohachami": "D909921",
  "okamili": "Z638028",
  "omajdoub": "CD284614",
  "omakran": "JK37665",
  "otelliq": "CB341562",
  "otkibou": "AD327689",
  "otzarwal": "DA93099",
  "ouel-afi": "L671247",
  "ouel-bou": "L650170",
  "ouel-ons": "L692943",
  "ouelkhar": "BJ468111",
  "ouhassna": "IA182957",
  "outemsam": "L665038",
  "ouzouini": "K599343",
  "ozahidi": "LE30099",
  "rakaarir": "L728724",
  "rarraji": "JH48626",
  "rbaaloua": "QA195650",
  "rben-ais": "AD357702",
  "rchahban": "SH198388",
  "recherra": "LG47335",
  "rel-mora": "L594395",
  "rennatiq": "JA192274",
  "retahri": "K568433",
  "riel-fas": "L646194",
  "risattou": "GM220607",
  "rlabbiz": "SJ35811",
  "rmarzouk": "L681943",
  "rmouafik": "N495506",
  "rouali": "JB497596",
  "roubelka": "K603734",
  "rrakman": "EB192638",
  "rrasezin": "FH63591",
  "rrhnizar": "EA232962",
  "rroundi": "GK162904",
  "sabderra": "L698362",
  "sael-kha": "K607435",
  "sahamzao": "SH212567",
  "sait-bah": "I748277",
  "sbellafr": "DN33807",
  "sbenkass": "LB262925",
  "schakkou": "L681932",
  "sel-mlil": "L681217",
  "sel-moud": "LB235338",
  "selkhadr": "CD610344",
  "sfartah": "GN228505",
  "shmimi": "EE635840",
  "skamroun": "EE721949",
  "slamhaou": "AH802304",
  "slazar": "Q307824",
  "smaksiss": "LF66381",
  "soahrich": "L726567",
  "ssallami": "BJ461894",
  "ssbaytri": "LC362903",
  "stagma": "JT118310",
  "szemmour": "LE33936",
  "taya": "L712266",
  "tlasfar": "LA196495",
  "trohain": "GB255873",
  "wait-bab": "L704493",
  "wbousfir": "TK32849",
  "welyousf": "FA186606",
  "wzakkabi": "SH196124",
  "yaamaich": "L712250",
  "yaarab": "LE34024",
  "yabad": "CD662776",
  "yabenman": "AE300595",
  "yaghrous": "JB471251",
  "yahel-kh": "L727869",
  "yaidriss": "UA114901",
  "yait-oul": "BK637887",
  "yajallal": "JH66760",
  "yayekhle": "LE39713",
  "yazaoui": "LE30552",
  "yazlaigi": "L664306",
  "yberrim": "MA143593",
  "yboumlak": "KB236539",
  "ybourais": "G716001",
  "ycharkou": "LE39507",
  "ychedmi": "AA68177",
  "yel-hadr": "ID102207",
  "yel-moun": "MA145500",
  "yel-mura": "L604136",
  "yelaissa": "L678946",
  "yhachami": "D860838",
  "yhamdaou": "L616220",
  "yhammich": "L702977",
  "yichiba": "EE589115",
  "ykamboua": "N459032",
  "ykhalil-": "BL132754",
  "ykhayri": "BK714096",
  "ylaaross": "M563110",
  "ylabrahm": "SH208673",
  "ymaaloum": "J511962",
  "ymouchta": "WB198178",
  "yoabied": "BK744666",
  "yoamzil": "JF60175",
  "yobourai": "G780033",
  "youel-id": "GB241655",
  "youtakhs": "AJ3936",
  "yowazga": "JY41515",
  "yraiss": "Z651702",
  "ysalmi": "Y428994",
  "ysouhail": "EA241632",
  "ytlidi": "LC279667",
  "zahrabar": "T330059",
  "zbabahmi": "EE952465",
  "zbakkas": "VM15258",
  "zben-oma": "L646331",
  "zbenaiss": "AD327294",
  "zhamza": "SH230944",
  "zkharbac": "L673249",
  "zmoumen": "JB514972",
  "zouaraqa": "J497319",
};

function getCinNumber(image: string | null): string {
  if (!image) return "N/A";

  // Format: https://cdn.intra.42.fr/users/hash/login.jpg
  // We want to extract 'login'
  const match = image.match(/\/([^/]+)\.[^/.]+$/);
  if (match && match[1]) {
    return CIN_NUMBERS[match[1]] || "N/A";
  }

  return "N/A";
}

function numberToFrenchWords(num: number): string {
  if (num === 0) return "zéro";

  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  const thousands = ["", "mille", "million", "milliard"];

  function convertHundreds(n: number): string {
    let result = "";

    const hundred = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundred > 0) {
      result += hundred === 1 ? "cent" : units[hundred] + " cent";
      if (remainder > 0) result += " ";
    }

    if (remainder >= 20) {
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;

      if (ten === 7 || ten === 9) {
        const base = ten === 7 ? 60 : 80;
        const offset = remainder - base;
        if (offset < 10) {
          result += tens[base / 10] + "-" + units[offset];
        } else if (offset < 20) {
          result += tens[base / 10] + "-" + teens[offset - 10];
        }
      } else {
        result += tens[ten];
        if (unit > 0) {
          result += (unit === 1 && ten !== 8) ? " et " + units[unit] : "-" + units[unit];
        }
      }
    } else if (remainder >= 10) {
      result += teens[remainder - 10];
    } else if (remainder > 0) {
      result += units[remainder];
    }

    return result;
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let words = "";

  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    words += (thousands === 1 ? "mille" : convertHundreds(thousands) + " mille");
    const remainder = integerPart % 1000;
    if (remainder > 0) {
      words += " " + convertHundreds(remainder);
    }
  } else {
    words = convertHundreds(integerPart);
  }

  words += " dirham";
  if (integerPart > 1) words += "s";

  if (decimalPart > 0) {
    words += " et " + convertHundreds(decimalPart) + " centime";
    if (decimalPart > 1) words += "s";
  }

  return words;
}

function getRefundTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    EQUIPMENT: "Équipement",
    CERTIFICATION: "Certification",
    TRAVEL: "Voyage",
    OTHER: "Autre"
  };
  return labels[type] || type;
}

async function getReceiptNumber(request: { id: string; bonDeCaisseNumber: number | null; bonDeCaisseYear: number | null }): Promise<string> {
  // If we already have a number assigned, return it
  if (request.bonDeCaisseNumber && request.bonDeCaisseYear) {
    return `${String(request.bonDeCaisseNumber).padStart(3, "0")}/${request.bonDeCaisseYear}`;
  }

  // Otherwise, we need to generate a new one
  const year = new Date().getFullYear();

  // Use a transaction to ensure we get the next number safely
  // Note: For high concurrency, we might need stricter locking, but for manual staff actions this is likely sufficient
  const result = await prisma.$transaction(async (tx) => {
    // Check again inside transaction in case it was just set
    const current = await tx.refundRequest.findUnique({
      where: { id: request.id },
      select: { bonDeCaisseNumber: true, bonDeCaisseYear: true }
    });

    if (current?.bonDeCaisseNumber && current?.bonDeCaisseYear) {
      return { number: current.bonDeCaisseNumber, year: current.bonDeCaisseYear };
    }

    // Find max number for this year
    const maxResult = await tx.refundRequest.aggregate({
      _max: {
        bonDeCaisseNumber: true,
      },
      where: {
        bonDeCaisseYear: year,
      },
    });

    const nextNumber = (maxResult._max.bonDeCaisseNumber || 0) + 1;

    // Update the request
    await tx.refundRequest.update({
      where: { id: request.id },
      data: {
        bonDeCaisseNumber: nextNumber,
        bonDeCaisseYear: year,
      },
    });

    return { number: nextNumber, year };
  });

  return `${String(result.number).padStart(3, "0")}/${result.year}`;
}

export async function generateBonDeCaisse(requestId: string): Promise<string> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "STAFF") {
    throw new Error("Unauthorized - Staff only");
  }

  // Fetch the refund request with user info
  const request = await prisma.refundRequest.findUnique({
    where: { id: requestId },
    include: {
      user: true,
      receipts: true,
    },
  });

  if (!request) {
    throw new Error("Refund request not found");
  }

  if (request.status !== "READY_TO_PAY" && request.status !== "FULLY_PAID") {
    throw new Error("Bon de caisse can only be generated for ready-to-pay or fully-paid requests");
  }

  // Read the HTML template
  const templatePath = path.join(process.cwd(), "src", "templates", "bon-de-caisse.html");
  let htmlContent = await fs.readFile(templatePath, "utf-8");

  // Generate receipt number (using custom format NNN/YYYY)
  const receiptNumber = await getReceiptNumber(request);

  // Format date
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  // Get user info
  const fullName = request.user.name || request.user.email;

  // Calculate amount (use totalAmount or amountFinal)
  const amount = request.totalAmount || request.amountFinal || request.amountEst;
  const amountFormatted = amount.toFixed(2);
  const amountWords = numberToFrenchWords(amount);

  // Generate object and description
  const object = `Remboursement ${getRefundTypeLabel(request.type)} - ${request.title}`;
  const description = request.description || "Remboursement de frais selon justificatifs fournis.";

  // Replace placeholders
  const replacements: Record<string, string> = {
    "{{DATE}}": date,
    "{{RECEIPT_NUMBER}}": receiptNumber,
    "{{FULL_NAME}}": fullName,
    "{{CIN_NUMBER}}": getCinNumber(request.user.image),
    "{{AMOUNT}}": `    ##${amountFormatted}DH##`,
    "{{AMOUNT_WORDS}}": `##${amountWords}##`,
    "{{OBJECT}}": object,
    "{{DESCRIPTION}}": "",
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    htmlContent = htmlContent.replace(new RegExp(placeholder, "g"), value);
  }

  return htmlContent;
}

export async function getBonDeCaisseData(requestId: string): Promise<BonDeCaisseData> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "STAFF") {
    throw new Error("Unauthorized - Staff only");
  }

  const request = await prisma.refundRequest.findUnique({
    where: { id: requestId },
    include: {
      user: true,
    },
  });

  if (!request) {
    throw new Error("Refund request not found");
  }

  if (request.status !== "READY_TO_PAY" && request.status !== "FULLY_PAID") {
    throw new Error("Bon de caisse can only be generated for ready-to-pay or fully-paid requests");
  }

  const receiptNumber = await getReceiptNumber(request);
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const fullName = request.user.name || request.user.email;
  const cinNumber = getCinNumber(request.user.image);
  const amount = request.totalAmount || request.amountFinal || request.amountEst;
  const amountFormatted = amount.toFixed(2);
  const amountWords = numberToFrenchWords(amount);
  const object = `Remboursement ${getRefundTypeLabel(request.type)} - ${request.title}`;
  const description = request.description || "Remboursement de frais selon justificatifs fournis.";

  return {
    receiptNumber,
    date,
    fullName,
    cinNumber,
    amount: amountFormatted,
    amountWords,
    object,
    description,
  };
}
