

export function findTextAfterString(entireString: string, startString: string): string {
  const index = entireString.indexOf(startString);
  const sub = entireString.substring(index + startString.length + 1);
  return sub
}

export function lineBreakText(text: string): string {
  const lineBreakIndex = text.indexOf('\n');
  return text.slice(lineBreakIndex + 1);
};


// TODO - doesn't work in all cases. Often the test will be after a comment: // Test
export function findAllTextAfterStringAndLineBreak(text: string, startString: string): string {
  const textAfterString = findTextAfterString(text, startString);
  return lineBreakText(textAfterString);
}

// Test
const comment = 'This is a comment.test This is the text after the comment.';
const textAfterComment = findTextAfterString(comment, '.test');
console.assert(textAfterComment === 'This is the text after the comment.');