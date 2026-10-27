import { randomInt } from "node:crypto";

// Karışabilecek karakterler (I, O, 0, 1) çıkarıldı
const ALFABE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function blokUret(uzunluk: number): string {
  let sonuc = "";
  for (let i = 0; i < uzunluk; i++) {
    sonuc += ALFABE[randomInt(ALFABE.length)];
  }
  return sonuc;
}

// Biçim: LIC-XXXX-XXXX-XXXX (kriptografik rastgelelik)
export function generateLicenseKey(): string {
  return `LIC-${blokUret(4)}-${blokUret(4)}-${blokUret(4)}`;
}
