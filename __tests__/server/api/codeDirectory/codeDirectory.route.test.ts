import supertest from "supertest";
import { createServer } from "../../../../createServer";

jest.mock("../../../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const app = createServer();

describe("Search API", () => {
  describe("GET /code-directory", () => {
    describe("when requesting without a session", () => {
      it("returns 403", async () => {
        await supertest(app).get("/code-directory").expect(403);
      });
    });
  });
});

describe("Search API", () => {
  describe("POST /code-directory", () => {
    describe("when uploading directories without session", () => {
      it("returns 403", async () => {
        const { body, statusCode } = await supertest(app)
          .post("/code-directory")
          .expect(403);
      });
    });
  });
});
