export function findArray(str: string): string[] | null {
  // Match the pattern of an array: starts with a left square bracket, contains zero or more non-square-bracket characters, and ends with a right square bracket
  const regex = /\[([^\[\]]*)\]/;

  // Use the regex to find the first match of an array in the input string
  const match = str.match(regex);

  if (match) {
    // Extract the captured string containing the array
    const arrayStr = match[1];

    // Split the array string by comma and whitespace to get the individual elements
    const elements = arrayStr.split(/,\s*/);

    // Return the array as an array of strings
    return elements;
  } else {
    // Return null if no array was found in the input string
    return null;
  }
}

export function removeQuotes(str: string): string {
  // Use a regular expression to match the quotes in the string
  const regex = /"/g;

  const singleQuote = /'/g;

  // Use the replace method to remove the quotes
  return str.replace(regex, "") || str.replace(singleQuote, "") || str;
}
