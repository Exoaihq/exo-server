import { findCompletedTasksThatNeedLoops } from "../../server/api/agent/agent.context";
import { findAndExecuteTasks } from "../../server/api/task/task.service";
import cron from "node-cron";
import { runTasksAndAgents } from "../../cron/runningTasksAndAgents";
import { createServer } from "../../createServer";

jest.mock("../../server", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));
jest.mock("../../server/api/task/task.service");
jest.mock("../../server/api/agent/agent.context");

const app = createServer();

describe("runTasksAndAgents", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("schedules a cron job to run every 10 seconds", () => {
    runTasksAndAgents();

    expect(cron.schedule).toHaveBeenCalledTimes(1);
  });

  it("calls findAndExecuteTasks and findCompletedTasksThatNeedLoops inside the cron task", () => {
    const mockCronFunction = jest.fn();
    // @ts-ignore
    cron.schedule.mockImplementation((schedule, fn) => {
      mockCronFunction.mockImplementation(fn);
    });

    runTasksAndAgents();
    expect(mockCronFunction).toHaveBeenCalledTimes(0);

    mockCronFunction();
    expect(findAndExecuteTasks).toHaveBeenCalledTimes(1);
    expect(findCompletedTasksThatNeedLoops).toHaveBeenCalledTimes(1);
  });
});
