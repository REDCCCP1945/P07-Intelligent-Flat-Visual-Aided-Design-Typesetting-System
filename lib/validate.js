function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function toNumber(value) {
  if (isBlank(value)) return NaN;
  const normalized = String(value).replace(/,/g, "").replace(/[¥￥元]/g, "").trim();
  return Number(normalized);
}

function isNonNegative(value) {
  const num = toNumber(value);
  return Number.isFinite(num) && num >= 0;
}

function isDate(value) {
  if (isBlank(value)) return false;
  const text = String(value).trim().replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(text + "T00:00:00");
  return !Number.isNaN(date.getTime());
}

function normalizeDate(value) {
  return String(value).trim().replace(/\//g, "-");
}

function notFuture(value) {
  const text = normalizeDate(value);
  const date = new Date(text + "T23:59:59");
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now() + 86400000;
}

function textLength(value, min, max) {
  const text = String(value === undefined || value === null ? "" : value).trim();
  return text.length >= min && text.length <= max;
}

function pick(body, keys) {
  const out = {};
  keys.forEach(function (key) {
    out[key] = body[key];
  });
  return out;
}

function round(value, digits) {
  const factor = Math.pow(10, digits === undefined ? 2 : digits);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

module.exports = {
  isBlank: isBlank,
  toNumber: toNumber,
  isNonNegative: isNonNegative,
  isDate: isDate,
  normalizeDate: normalizeDate,
  notFuture: notFuture,
  textLength: textLength,
  pick: pick,
  round: round,
  clamp: clamp
};

