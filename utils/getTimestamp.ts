export const getTimestamp = () => {
  return Date.now();
};

export function getTimestampFunction() {
  return Date.now();
};

const getTomorrow = () => {
  return Date.now() + 86400000;
};

function getTomorrowAgain() {
  return Date.now() + 86400000;
};

(() => {
  return Date.now() + 86400000;
})()
