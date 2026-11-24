function text(value, max) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > max) return null;
  return normalized;
}

function optionalText(value, max) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length > max) return null;
  return normalized;
}

function integerAmount(value) {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  if (!/^\d+$/.test(normalized)) return null;
  const number = Number(normalized);
  if (!Number.isSafeInteger(number)) return null;
  return number;
}

function decimalAmount(value, { min = 0, max = Number.POSITIVE_INFINITY, scale = 2 } = {}) {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  const factor = 10 ** scale;
  return Math.round(number * factor) / factor;
}

function isoDate(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return normalized;
}

function optionalIsoDate(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  return isoDate(normalized);
}

function oneOf(value, allowed) {
  const normalized = String(value ?? '').trim();
  return allowed.includes(normalized) ? normalized : null;
}

function dayOfMonth(value, { required = true } = {}) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return required ? null : '';
  if (!/^\d{1,2}$/.test(normalized)) return null;
  const day = Number(normalized);
  if (day < 1 || day > 31) return null;
  return day;
}

module.exports = {
  text,
  optionalText,
  integerAmount,
  decimalAmount,
  isoDate,
  optionalIsoDate,
  oneOf,
  dayOfMonth,
};
