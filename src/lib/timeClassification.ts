export function getTimeCategory(dateString: string): 'Working Hours' | 'Non-Working Hours' {
  const date = new Date(dateString);
  const hours = date.getHours();
  const day = date.getDay();

  const isWeekend = day === 0 || day === 6;
  const isWorkingHours = hours >= 9 && hours < 18;

  if (isWeekend || !isWorkingHours) {
    return 'Non-Working Hours';
  }

  return 'Working Hours';
}
