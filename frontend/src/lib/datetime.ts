// All match times are shown in Vietnam time (UTC+7), regardless of the
// browser/server timezone. We rely on Intl with an explicit timeZone so the
// output is deterministic everywhere (SSR + client).

const VN_TZ = 'Asia/Ho_Chi_Minh';

export function vnTime(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

export function vnDateShort(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TZ, day: '2-digit', month: '2-digit',
  }).format(new Date(iso));
}

export function vnDateTime(iso: string): string {
  return `${vnDateShort(iso)} ${vnTime(iso)}`;
}

// "yyyy-MM-dd" of the instant, evaluated in Vietnam time (en-CA → ISO order).
export function vnDateKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

export function vnTodayKey(): string {
  return vnDateKey(new Date());
}

export function vnShiftKey(key: string, days: number): string {
  // Anchor at noon VN to avoid DST/offset edge cases, then shift by days.
  const d = new Date(`${key}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return vnDateKey(d);
}

// Labels built from a "yyyy-MM-dd" key (anchored at noon VN).
function keyToDate(key: string): Date {
  return new Date(`${key}T12:00:00+07:00`);
}

export function vnWeekdayShort(key: string): string {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, weekday: 'short' }).format(keyToDate(key));
}

export function vnKeyDayMonth(key: string): string {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, day: '2-digit', month: '2-digit' }).format(keyToDate(key));
}

export function vnKeyFull(key: string): string {
  const w = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, weekday: 'long' }).format(keyToDate(key));
  const dmy = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(keyToDate(key));
  return `${w}, ${dmy}`;
}
