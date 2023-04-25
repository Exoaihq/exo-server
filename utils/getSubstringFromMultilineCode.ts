// Loops over an array of lines of code and returns the resulting substring match based on the start and end row and column numbers
export function getSubstringFromMultilineCode(
  lines: Array<string>,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
) {
  let result = "";

  const startPosition = lines[startRow].substring(startCol);
  const endPosition = lines[endRow].substring(0, endCol);
  const numberOfRows = endRow - startRow;

  if (numberOfRows < 1) {
    return startPosition;
  } else {
    for (let i = startRow; i < endRow; i++) {
      result = result + lines[i].trim();
    }
    return result + endPosition;
  }
}
