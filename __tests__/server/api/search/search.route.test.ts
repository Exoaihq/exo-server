import supertest from "supertest";
import { createServer } from "../../../../createServer";

jest.mock("../../../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const app = createServer();

describe("Search API", () => {
  describe("GET /search", () => {
    describe("when the query is not present return 404", () => {
      it("returns 404", async () => {
        await supertest(app).get("/search").expect(404);
      });
    });
  });
});

describe("Search API", () => {
  describe("POST /search", () => {
    describe("when uploading files without session", () => {
      it("returns 403", async () => {
        const { body, statusCode } = await supertest(app)
          .post("/search")
          .expect(403);
      });
    });
  });
});
