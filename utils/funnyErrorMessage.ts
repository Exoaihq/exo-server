const awayMessages = [
  "Taking a break, will be back soon!",
  "Busy with work, catch you later",
  "Stepping out for lunch, back in 30",
  "In a meeting, message me later",
  "Taking a walk, be back soon",
  "Away from keyboard, I'll get back to you",
  "Taking a power nap, will reply when I wake up",
  "Running errands, back soon",
  "Taking a mental health break, will be back soon",
  "On a short vacation, will respond when I return",
];

export const getFunnyErrorMessage = () => {
  const randomNumberOneToTen = Math.floor(Math.random() * 10) + 1;
  return awayMessages[randomNumberOneToTen];
};
