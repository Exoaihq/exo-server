import supertest from "supertest";
import { createServer } from "../../../../createServer";

jest.mock("../../../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const app = createServer();

describe("Search API", () => {
  describe("GET /code-snippet", () => {
    describe("when requesting snippets without a session", () => {
      it("returns 403", async () => {
        await supertest(app).get("/code-snippet").expect(403);
      });
    });
  });
});
