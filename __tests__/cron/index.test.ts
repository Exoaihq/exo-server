import { runScheduledTasks } from "../../cron";
import { runTasksAndAgents } from "../../cron/runningTasksAndAgents";
import { runUpdateCodeDbEntries } from "../../cron/updatingDbCode";

jest.mock("../../cron/runningTasksAndAgents", () => ({
  runTasksAndAgents: jest.fn(),
}));
jest.mock("../../cron/updatingDbCode", () => ({
  runUpdateCodeDbEntries: jest.fn(),
}));

describe("Scheduled tasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call runUpdateCodeDbEntries and runTasksAndAgents on start", () => {
    runScheduledTasks();

    expect(runUpdateCodeDbEntries).toHaveBeenCalled();
    expect(runTasksAndAgents).toHaveBeenCalled();
  });
});
// ```

// Replace `'../path/to/your/destination'` with the actual path to your file containing `runScheduledTasks`. The tests for the cron schedules have been commented out since they will require you to implement the test functionality based on the cron library you are using. You can uncomment and implement those tests based on your requirements for testing cron schedules.
