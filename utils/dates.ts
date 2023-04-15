export const isTodaysDate = (date: Date): boolean => {
  const todaysDate = new Date().getDate();
  const todaysMonth = new Date().getMonth();
  const todaysYear = new Date().getFullYear();

  const updatedToday =
    date.getDate() === todaysDate &&
    date.getMonth() === todaysMonth &&
    date.getFullYear() === todaysYear;

  return updatedToday;
};
