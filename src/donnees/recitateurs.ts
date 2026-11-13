import type { Lecture } from "@/domain/lectures";

/**
 * Récitateurs enregistrés verset par verset (bibliothèque EveryAyah) : le texte suit la récitation.
 * Fichiers : https://everyayah.com/data/{dossier}/{SSS}{AAA}.mp3 (numérotation de la lecture).
 * Liste choisie à partir de https://everyayah.com/data/recitations.js (meilleure qualité de chaque récitateur).
 */
export interface RecitateurVersets {
  dossier: string;
  nom: string;
  style: "Murattal" | "Mujawwad" | "Muallim";
  lecture: Lecture;
}

export const RECITATEURS_VERSETS: readonly RecitateurVersets[] = [
  { dossier: "Husary_128kbps", nom: "Mahmoud Khalil Al-Husary", style: "Murattal", lecture: "hafs" },
  { dossier: "Husary_Muallim_128kbps", nom: "Mahmoud Khalil Al-Husary", style: "Muallim", lecture: "hafs" },
  { dossier: "Husary_128kbps_Mujawwad", nom: "Mahmoud Khalil Al-Husary", style: "Mujawwad", lecture: "hafs" },
  {
    dossier: "Minshawy_Murattal_128kbps",
    nom: "Muhammad Siddiq Al-Minshawi",
    style: "Murattal",
    lecture: "hafs",
  },
  {
    dossier: "Minshawy_Mujawwad_192kbps",
    nom: "Muhammad Siddiq Al-Minshawi",
    style: "Mujawwad",
    lecture: "hafs",
  },
  {
    dossier: "Abdul_Basit_Murattal_192kbps",
    nom: "Abdul Basit Abdus-Samad",
    style: "Murattal",
    lecture: "hafs",
  },
  {
    dossier: "Abdul_Basit_Mujawwad_128kbps",
    nom: "Abdul Basit Abdus-Samad",
    style: "Mujawwad",
    lecture: "hafs",
  },
  { dossier: "Alafasy_128kbps", nom: "Mishary Rashid Alafasy", style: "Murattal", lecture: "hafs" },
  {
    dossier: "Abdurrahmaan_As-Sudais_192kbps",
    nom: "Abdurrahman As-Sudais",
    style: "Murattal",
    lecture: "hafs",
  },
  { dossier: "Saood_ash-Shuraym_128kbps", nom: "Saud Ash-Shuraym", style: "Murattal", lecture: "hafs" },
  { dossier: "MaherAlMuaiqly128kbps", nom: "Maher Al-Muaiqly", style: "Murattal", lecture: "hafs" },
  { dossier: "Ghamadi_40kbps", nom: "Saad Al-Ghamdi", style: "Murattal", lecture: "hafs" },
  {
    dossier: "Abu_Bakr_Ash-Shaatree_128kbps",
    nom: "Abu Bakr Ash-Shatri",
    style: "Murattal",
    lecture: "hafs",
  },
  { dossier: "Hudhaify_128kbps", nom: "Ali Al-Hudhaify", style: "Murattal", lecture: "hafs" },
  { dossier: "Muhammad_Ayyoub_128kbps", nom: "Muhammad Ayyoub", style: "Murattal", lecture: "hafs" },
  { dossier: "Muhammad_Jibreel_128kbps", nom: "Muhammad Jibreel", style: "Murattal", lecture: "hafs" },
  { dossier: "Abdullah_Basfar_192kbps", nom: "Abdullah Basfar", style: "Murattal", lecture: "hafs" },
  {
    dossier: "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net",
    nom: "Ahmed Al-Ajamy",
    style: "Murattal",
    lecture: "hafs",
  },
  { dossier: "Hani_Rifai_192kbps", nom: "Hani Ar-Rifai", style: "Murattal", lecture: "hafs" },
  { dossier: "Nasser_Alqatami_128kbps", nom: "Nasser Al-Qatami", style: "Murattal", lecture: "hafs" },
  { dossier: "Yasser_Ad-Dussary_128kbps", nom: "Yasser Ad-Dossari", style: "Murattal", lecture: "hafs" },
  {
    dossier: "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
    nom: "Abdullah Al-Juhany",
    style: "Murattal",
    lecture: "hafs",
  },
  { dossier: "Salah_Al_Budair_128kbps", nom: "Salah Al-Budair", style: "Murattal", lecture: "hafs" },
  { dossier: "Fares_Abbad_64kbps", nom: "Fares Abbad", style: "Murattal", lecture: "hafs" },
  { dossier: "Mohammad_al_Tablaway_128kbps", nom: "Mohammad Al-Tablawi", style: "Mujawwad", lecture: "hafs" },
  { dossier: "Mustafa_Ismail_48kbps", nom: "Mustafa Ismail", style: "Mujawwad", lecture: "hafs" },
  {
    dossier: "warsh/warsh_ibrahim_aldosary_128kbps",
    nom: "Ibrahim Al-Dosary",
    style: "Murattal",
    lecture: "warsh",
  },
  {
    dossier: "warsh/warsh_yassin_al_jazaery_64kbps",
    nom: "Yassin Al-Jazaery",
    style: "Murattal",
    lecture: "warsh",
  },
  {
    dossier: "warsh/warsh_Abdul_Basit_128kbps",
    nom: "Abdul Basit Abdus-Samad",
    style: "Mujawwad",
    lecture: "warsh",
  },
];
