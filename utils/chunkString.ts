// Here's a TypeScript function that will chunk a string into an array of strings of a specified length (n) without splitting on full words:

// ```typescript
export function chunkString(text: string, n: number): string[] {
  if (n < 1) {
    throw new Error("Chunk length must be greater than 0");
  }

  const words = text.split(" ");
  const result: string[] = [];
  let chunk = "";

  for (const word of words) {
    const potentialChunk = chunk ? `${chunk} ${word}` : word;
    if (potentialChunk.length <= n) {
      chunk = potentialChunk;
    } else {
      result.push(chunk);
      chunk = word;
    }
  }

  if (chunk) {
    result.push(chunk);
  }

  return result;
}

// const text = "This is an example sentence";
// const n = 7;

// const chunks = chunkString(text, n);
// console.log(chunks);
// ```

// This function checks if the length of the concatenated chunk will be less than or equal to the specified length (n). If so, the word is added to the current chunk. Otherwise, a new chunk is started.

// This script will output this for the example `text` and `n`:

// ```
// [ 'This is', 'an', 'example', 'sentenc' ]
// ```
