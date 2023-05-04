import supertest from "supertest";
import { createServer } from "../../../../createServer";

jest.mock("../../../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const app = createServer();

describe("Search API", () => {
  describe("GET /code-file", () => {
    describe("when adding files without a session", () => {
      it("returns 403", async () => {
        await supertest(app).post("/code-file").expect(403);
      });
    });
  });
});

describe("Search API", () => {
  describe("POST /code-file/add", () => {
    describe("when uploading files without session", () => {
      it("returns 403", async () => {
        const { body, statusCode } = await supertest(app)
          .post("/code-file/add")
          .expect(403);
      });
    });
  });
});
