// ```javascript

import { convertToExoSuggestionFileName } from "../../utils/getFileName";

describe("convertToExoSuggestionFileName", () => {
  it("should correctly convert given file name to ExoSuggestion format", () => {
    const fileName = "sample-document.pdf";
    const expectedResult = "sample-document.exo-suggestion.pdf";

    const result = convertToExoSuggestionFileName(fileName);

    expect(result).toBe(expectedResult);
  });

  it("should handle files with multiple dots in name", () => {
    const fileName = "example.file.json";
    const expectedResult = "example.file.exo-suggestion.json";

    const result = convertToExoSuggestionFileName(fileName);

    expect(result).toBe(expectedResult);
  });

  it("should handle files without a file extension", () => {
    const fileName = "no-extension-file";
    const expectedResult = "no-extension-file.exo-suggestion";

    const result = convertToExoSuggestionFileName(fileName);

    expect(result).toBe(expectedResult);
  });

  it("should handle empty strings", () => {
    const fileName = "";
    const expectedResult = "";

    const result = convertToExoSuggestionFileName(fileName);

    expect(result).toBe(expectedResult);
  });
});
// ```
