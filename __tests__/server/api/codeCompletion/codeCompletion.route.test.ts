import supertest from "supertest";
import { createServer } from "../../../../createServer";

jest.mock("../../../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const app = createServer();

describe("Code completion API", () => {
  describe("POST /code", () => {
    describe("when submittin without session", () => {
      it("returns 403", async () => {
        const { body, statusCode } = await supertest(app)
          .post("/code")
          .expect(403);
      });
    });
  });
});
