function formatKRW(amount) {
  const rounded = Math.round(Number(amount) || 0);
  const digits = Math.abs(rounded).toLocaleString('ko-KR');
  return `${rounded < 0 ? '-' : ''}${digits}원`;
}

function formatSignedKRW(amount) {
  const rounded = Math.round(Number(amount) || 0);
  const digits = Math.abs(rounded).toLocaleString('ko-KR');
  if (rounded > 0) return `+${digits}원`;
  if (rounded < 0) return `-${digits}원`;
  return `${digits}원`;
}

function formatMan(amount) {
  const rounded = Math.round((Number(amount) || 0) / 10000);
  const digits = Math.abs(rounded).toLocaleString('ko-KR');
  return `${rounded < 0 ? '-' : ''}${digits}만`;
}

function formatShare(share) {
  return `${Number(share).toFixed(1)}%`;
}

function formatUSD(amount) {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100;
  const digits = Math.abs(rounded).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${rounded < 0 ? '-' : ''}$${digits}`;
}

function formatSignedUSD(amount) {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100;
  const digits = Math.abs(rounded).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (rounded > 0) return `+$${digits}`;
  if (rounded < 0) return `-$${digits}`;
  return `$${digits}`;
}

function formatSignedPercent(rate) {
  const rounded = Math.round((Number(rate) || 0) * 100) / 100;
  const digits = Math.abs(rounded).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (rounded > 0) return `+${digits}%`;
  if (rounded < 0) return `-${digits}%`;
  return `${digits}%`;
}

function formatQuantity(quantity) {
  const rounded = Math.round((Number(quantity) || 0) * 10000) / 10000;
  return `${rounded.toLocaleString('ko-KR', { maximumFractionDigits: 4 })}주`;
}

function formatAnnualRate(rate) {
  return `${Number(rate).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
}

function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function diffDays(fromIso, toIso) {
  const ms = parseISODate(toIso).getTime() - parseISODate(fromIso).getTime();
  return Math.round(ms / 86400000);
}

function formatDday(days) {
  if (days === 0) return 'D-Day';
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

function formatKoreanDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function formatMonthDay(iso) {
  const [, month, day] = iso.split('-').map(Number);
  return `${month}월 ${day}일`;
}

function monthStart(iso) {
  return `${iso.slice(0, 7)}-01`;
}

function shiftMonth(iso, deltaMonths) {
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1 + deltaMonths, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const clamped = Math.min(day, lastDay);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(clamped).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function toShares(amounts) {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0) return amounts.map(() => 0);
  const shares = amounts.map((amount) => Math.round((amount / total) * 1000) / 10);
  const drift = Math.round((100 - shares.reduce((sum, share) => sum + share, 0)) * 10) / 10;
  const last = shares.length - 1;
  shares[last] = Math.round((shares[last] + drift) * 10) / 10;
  return shares;
}

module.exports = {
  formatKRW,
  formatSignedKRW,
  formatUSD,
  formatSignedUSD,
  formatSignedPercent,
  formatQuantity,
  formatAnnualRate,
  formatMan,
  formatShare,
  diffDays,
  formatDday,
  formatKoreanDate,
  formatMonthDay,
  monthStart,
  shiftMonth,
  safeJson,
  toShares,
};
