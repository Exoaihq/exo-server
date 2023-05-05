import { findFileTool } from "../../../../../server/api/agent/tools/findFile.tool";
import { findCodeByQuery } from "../../../../../server/api/search/search.service";
import { findOrUpdateAccount } from "../../../../../server/api/supabase/account.service";
import { createServer } from "../../../../../createServer";

jest.mock("../../../../../server/api/search/search.service");
jest.mock("../../../../../server/api/supabase/account.service");
jest.mock("../../../../../server/api/agent/tools/index", () => ({
  ToolName: {
    searchCode: "searchCode",
  },
}));

jest.mock("../../../../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const app = createServer();

describe("findFileTool", () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllTimers();
  });

  it("should return file name and location when a matching file is found", async () => {
    const mockedFindCodeByQuery = findCodeByQuery as jest.MockedFunction<
      typeof findCodeByQuery
    >;
    mockedFindCodeByQuery.mockResolvedValue([
      {
        file_name: "testFile.js",
        relative_file_path: "/path/to/testFile.js",
      },
    ]);
    const mockedFindOrUpdateAccount =
      findOrUpdateAccount as jest.MockedFunction<typeof findOrUpdateAccount>;
    mockedFindOrUpdateAccount.mockResolvedValue({
      id: "accountId123",
      created_at: "2021-08-01T00:00:00.000Z",
      user_id: "userId123",
    });

    const tool = findFileTool();
    const result = await tool.use("userId123", "sessionId123", "testFile.js");

    expect(mockedFindOrUpdateAccount).toHaveBeenCalledWith("userId123");
    expect(mockedFindCodeByQuery).toHaveBeenCalledWith(
      "testFile.js",
      "accountId123"
    );
    expect(result.output).toEqual(
      "The file name that best matches this search is: testFile.js which is located at: /path/to/testFile.js."
    );
    expect(result.metadata).toEqual([
      {
        file_name: "testFile.js",
        relative_file_path: "/path/to/testFile.js",
      },
    ]);
  });

  it("should return 'No results found' when no matching file is found", async () => {
    const mockedFindCodeByQuery = findCodeByQuery as jest.MockedFunction<
      typeof findCodeByQuery
    >;
    mockedFindCodeByQuery.mockResolvedValue([]);
    const mockedFindOrUpdateAccount =
      findOrUpdateAccount as jest.MockedFunction<typeof findOrUpdateAccount>;
    mockedFindOrUpdateAccount.mockResolvedValue({
      id: "accountId123",
      created_at: "2021-08-01T00:00:00.000Z",
      user_id: "userId123",
    });

    const tool = findFileTool();
    const result = await tool.use(
      "userId123",
      "sessionId123",
      "nonExistent.js"
    );

    expect(mockedFindOrUpdateAccount).toHaveBeenCalledWith("userId123");
    expect(mockedFindCodeByQuery).toHaveBeenCalledWith(
      "nonExistent.js",
      "accountId123"
    );

    expect(result.output).toEqual(
      "No results found. Try adapting your search query."
    );
    expect(result.metadata).toEqual([]);
  });
});
