const pad = (n: number) => n.toString().padStart(2, '0');

export const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseDate = (str: string): Date => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isSameDay = (a: Date, b: Date): boolean => {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
};

export const isSameMonth = (a: Date, b: Date): boolean => {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addWeeks = (date: Date, weeks: number): Date => {
  return addDays(date, weeks * 7);
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const startOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const endOfWeek = (date: Date): Date => {
  return addDays(startOfWeek(date), 6);
};

export const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const getWeekDays = (): string[] => {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
};

export const getCalendarDays = (date: Date): Date[] => {
  const start = startOfMonth(date);
  const startDay = start.getDay() === 0 ? 6 : start.getDay() - 1;
  const result: Date[] = [];

  for (let i = 0; i < startDay; i += 1) {
    result.push(addDays(start, -(startDay - i)));
  }

  const end = endOfMonth(date);
  const total = 42 - (startDay + end.getDate());

  for (let i = 0; i < end.getDate(); i += 1) {
    result.push(addDays(start, i));
  }

  for (let i = 0; i < total; i += 1) {
    result.push(addDays(end, i + 1));
  }

  return result;
};

export const formatDisplayDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseDate(date) : date;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const formatWeekRange = (date: Date): string => {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
};

export const formatMonthYear = (date: Date): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};
