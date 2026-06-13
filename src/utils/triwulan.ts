export const getMonthsForTriwulan = (triwulanName: string): string[] => {
  if (!triwulanName) {
    return ['Januari', 'Februari', 'Maret'];
  }
  const name = triwulanName.toLowerCase();
  
  // Checking in reverse or specific Roman numeral matches to avoid substring overlap
  if (name.includes('triwulan iii') || name.includes('juli') || name.includes('jul-sep')) {
    return ['Juli', 'Agustus', 'September'];
  }
  if (name.includes('triwulan ii') || name.includes('april') || name.includes('apr-jun')) {
    return ['April', 'Mei', 'Juni'];
  }
  if (name.includes('triwulan iv') || name.includes('oktober') || name.includes('okt-des')) {
    return ['Oktober', 'November', 'Desember'];
  }
  if (name.includes('triwulan i') || name.includes('januari') || name.includes('jan-mar')) {
    return ['Januari', 'Februari', 'Maret'];
  }
  
  return ['Januari', 'Februari', 'Maret'];
};
