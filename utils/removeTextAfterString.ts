
const testStringArray = [
  "// Test",
  ".test.tsx"
]


export const removeTextAfterString = (str: string, substr: string): string => {
  const index = str.indexOf(substr);
  return index === -1 ? str : str.substring(0, index);
};


export const removeTextAfterArrayOfStrings = (str: string, substrs: string[]): string => {
  let result = "";
  for (let i = 0; i < substrs.length || !result; i++) {
    const found = str.indexOf(substrs[i]);
    if (found !== -1) {
      result = substrs[i]
    }

  }
  return result ? removeTextAfterString(str, result) : str;
}

export const removeTest = (str: string): string => {
  return removeTextAfterArrayOfStrings(str, testStringArray);
}