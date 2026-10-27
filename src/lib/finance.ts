// Satış tutarını bayi hakedişi ve şirket net gelirine böler.
// Şema Float kullandığı için sonuçlar kuruş hassasiyetine yuvarlanır.

function yuvarla(tutar: number): number {
  return Math.round((tutar + Number.EPSILON) * 100) / 100;
}

export function calculateSaleSplit(salePrice: number, commissionRate: number) {
  const partnerCommission = yuvarla((salePrice * commissionRate) / 100);
  const netCompanyRevenue = yuvarla(salePrice - partnerCommission);
  return { partnerCommission, netCompanyRevenue };
}
