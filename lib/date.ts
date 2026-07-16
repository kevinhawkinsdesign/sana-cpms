/** Parse a `yyyy-mm-dd` date input as a LOCAL date and return an ISO string.
 *  `new Date('yyyy-mm-dd')` parses UTC midnight, which lands on the previous
 *  day for timezones behind UTC (KAB-180). `endOfDay` makes a "valid until"
 *  bound inclusive of that whole local day. */
export const localDateToISO = (dateStr: string, endOfDay = false): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return (endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d)).toISOString();
};
