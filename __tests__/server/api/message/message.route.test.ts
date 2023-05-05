import supertest from "supertest";
import { ApiRoutes, createServer } from "../../../../createServer";

jest.mock("../../../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

const app = createServer();

describe("Search API", () => {
  describe(`GET ${ApiRoutes.MESSAGES}`, () => {
    describe("when getting a message without a session", () => {
      it("returns 403", async () => {
        await supertest(app).get(ApiRoutes.MESSAGES).expect(403);
      });
    });
  });
});

describe("Search API", () => {
  describe(`POST ${ApiRoutes.MESSAGES}`, () => {
    describe("when posting a message without session", () => {
      it("returns 403", async () => {
        await supertest(app).post(ApiRoutes.MESSAGES).expect(403);
      });
    });
  });
});
