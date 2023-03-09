
const orientations = ["\\", "|", "/", "-"];


const twirlTimer = function (message: string = "Loading") {
  let x = 0;
  return setInterval(function () {
    const spinners = orientations[x++]
    process.stdout.write("\r" + spinners + " " + message + " " + spinners);
    x &= 3;
  }, 250);
};


export function commandLineLoading(message: string): NodeJS.Timeout {
  const intervalId = twirlTimer(message);
  return intervalId;
}


export function clearLoading(intervalId: NodeJS.Timeout, completedMessage: string = "Done! ") {
  clearInterval(intervalId);
  console.log("\n" + completedMessage + "\n")
}
