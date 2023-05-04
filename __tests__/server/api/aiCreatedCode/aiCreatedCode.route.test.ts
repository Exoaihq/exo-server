import supertest from "supertest";
import { createServer } from "../../../../createServer";

jest.mock("../../../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const app = createServer();

describe("Search API", () => {
  describe("GET /ai-completed-code", () => {
    describe("when requesting without a session", () => {
      it("returns 403", async () => {
        await supertest(app).get("/ai-completed-code").expect(403);
      });
    });
  });
});

describe("Search API", () => {
  describe("POST /ai-completed-code", () => {
    describe("when uploading files without session", () => {
      it("returns 403", async () => {
        const { body, statusCode } = await supertest(app)
          .post("/ai-completed-code")
          .expect(403);
      });
    });
  });
});
