// Türkçe biçimlendirme yardımcıları

const paraBicimi = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

const sayiBicimi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

const tarihBicimi = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

export function formatTL(tutar: number): string {
  return paraBicimi.format(tutar);
}

export function formatSayi(sayi: number): string {
  return sayiBicimi.format(sayi);
}

export function formatTarih(tarih: Date | string): string {
  return tarihBicimi.format(new Date(tarih));
}

const tarihSaatBicimi = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function formatTarihSaat(tarih: Date | string): string {
  return tarihSaatBicimi.format(new Date(tarih));
}
