// Basit bellek içi giriş denemesi sınırlayıcı (tek konteyner için yeterli).
// Çok kopyalı çalışmaya geçilirse Redis tabanlı bir çözümle değiştirilmelidir.

type Kayit = { sayac: number; bitis: number };

const denemeler = new Map<string, Kayit>();
const MAKS_DENEME = 5;
const PENCERE_MS = 15 * 60 * 1000;

function temizle() {
  const simdi = Date.now();
  for (const [anahtar, kayit] of denemeler) {
    if (kayit.bitis <= simdi) denemeler.delete(anahtar);
  }
}

export function isBlocked(anahtar: string): boolean {
  const kayit = denemeler.get(anahtar);
  if (!kayit) return false;
  if (kayit.bitis <= Date.now()) {
    denemeler.delete(anahtar);
    return false;
  }
  return kayit.sayac >= MAKS_DENEME;
}

export function registerFailure(anahtar: string): void {
  if (denemeler.size > 1000) temizle();
  const simdi = Date.now();
  const kayit = denemeler.get(anahtar);
  if (!kayit || kayit.bitis <= simdi) {
    denemeler.set(anahtar, { sayac: 1, bitis: simdi + PENCERE_MS });
  } else {
    kayit.sayac += 1;
  }
}

export function clearFailures(anahtar: string): void {
  denemeler.delete(anahtar);
}
