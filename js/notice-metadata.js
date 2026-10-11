const titleMetadata = /^\[(\d{4}-\d{2}-\d{2})\]\s*\[(일반|행사|예배|모임|신청|정보)\]\s*/;
const noticeExtension = /\.(pdf|txt|md|docx?|hwp|hwpx|odt|rtf|png|jpe?g|webp)$/i;
const seoulDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

function validDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

function creationDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '';
  return seoulDate.format(new Date(value));
}

// Preserve legacy titles, including their bracket text, unless the whole
// required date/category prefix is valid. Only the exact third block pins.
export function parseNoticeTitle(name, createdTime = '') {
  const title = (typeof name === 'string' ? name : '').trim().replace(noticeExtension, '');
  const legacy = { title, date: creationDate(createdTime), category: '일반', pinned: false };
  const metadata = title.match(titleMetadata);
  if (!metadata || !validDate(metadata[1])) return legacy;
  let cleanTitle = title.slice(metadata[0].length);
  const pin = cleanTitle.match(/^\[고정\]\s*/);
  if (pin) cleanTitle = cleanTitle.slice(pin[0].length);
  return { title: cleanTitle.trim(), date: metadata[1], category: metadata[2], pinned: Boolean(pin) };
}

function creationTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : -Infinity;
}

export function compareNotices(a, b) {
  const byPin = Number(b.pinned === true) - Number(a.pinned === true);
  const byDate = (b.date || '').localeCompare(a.date || '');
  if (byPin || byDate) return byPin || byDate;
  const createdA = creationTimestamp(a.createdTime), createdB = creationTimestamp(b.createdTime);
  if (createdA !== createdB) return createdB > createdA ? 1 : -1;
  const byTitle = (a.title || '').localeCompare(b.title || '', 'ko');
  if (byTitle) return byTitle;
  const idA = a.id || '', idB = b.id || '';
  return idA < idB ? -1 : idA > idB ? 1 : 0;
}
