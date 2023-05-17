import { Response, Request } from "express";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { WebhookEvent, IssuesOpenedEvent } from "@octokit/webhooks-types";
import { Webhooks } from "@octokit/webhooks";
import { Octokit } from "@octokit/core";
import { add } from "lodash";
import {
  initOctokit,
  kgExoAppInstallationId,
  owner,
  repo,
} from "./github.repository";
import { addFileToCommit, getFilesInBranch } from "./github.service";

export const acceptWebhook = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { body } = req;
    const { pull_request, repository } = body;
    const { user, head } = pull_request;
    // console.log("Pull request", req.body);

    await getFilesInBranch({
      owner: user.login,
      repo: repository.name,
      commitSha: head.sha,
      installationId: kgExoAppInstallationId,
    });

    res.status(200).json({ data: "Ok" });
  } catch (error: any) {
    res.status(405).json({ message: error.message });
  }
};

export const addFileToRepo = async (req: Request, res: Response) => {
  try {
    const response = await addFileToCommit({
      owner,
      repo,
      branch: "kevin/testing-webhook-123",
      filePath: "dddddadf.txt",
      content: "Hello World three sdfferrsff",
      commitMessage: "Test commit",
      installationId: kgExoAppInstallationId,
    });
    res.status(200).json({ data: "Ok" });
  } catch (error: any) {
    res.status(405).json({ message: error.message });
  }
};

export async function testApp(req: Request, res: Response) {
  try {
    // Instantiate new Octokit client

    res.status(200).json({ data: "ok" });
  } catch (error: any) {
    console.log(error);
  }
}

export async function getCodeFilesFromRepo(owner: string, repo: string) {
  const octokit = initOctokit(kgExoAppInstallationId);

  try {
    const codeFiles = [];
    let page = 1;

    while (true) {
      const response = await octokit.request(
        "GET /repos/{owner}/{repo}/contents",
        {
          owner,
          repo,
        }
      );

      console.log(response);

      // Filter the response to only include code files (e.g., .js, .py, .cpp, etc.)
      const files = response.data.filter(
        (file: { type: string; name: string }) => {
          const isFile = file.type === "file";
          const isCodeFile = /\.(js|py|cpp|java|rb|php|html|css|ts|tsx)$/.test(
            file.name
          );
          return isFile && isCodeFile;
        }
      );

      codeFiles.push(...files);

      if (response.data.length === 0 || page > 10) {
        // If the response contains fewer items than the per_page value,
        // it means we have reached the last page and can stop pagination.
        break;
      }

      page++;
    }

    return codeFiles;
  } catch (error) {
    console.error("Error retrieving code files from the repository:", error);
    throw error;
  }
}

export function getGitHubCommits() {}

const octokit = new Octokit();
const webhooks = new Webhooks({
  secret: "hgjpoq19xn7lowyxds8f43kapsl10fvno010124",
});

function listenForPullRequests() {
  webhooks.on("pull_request.opened", async ({ id, name, payload }) => {
    const { action, number, repository, pull_request } = payload;

    console.log(
      `Received pull request event - Action: ${action}, PR number: ${number}`
    );

    // TODO: Implement your webhook logic here
    // You can access information about the pull request, repository, etc., from the `payload` object

    // Example: Push a webhook
    try {
      const response = await octokit.request(
        "POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries",
        {
          owner: repository.owner.login,
          repo: repository.name,
          hook_id: "your_webhook_id",
          event_type: "pull_request_opened",
          client_payload: {
            pr_number: number,
            pr_title: pull_request.title,
            pr_author: pull_request.user.login,
          },
        }
      );

      console.log("Webhook pushed successfully:", response);
    } catch (error) {
      console.error("Error pushing webhook:", error);
    }
  });

  // // Start the server to listen for incoming webhook events
  // webhooks.listen({ path: "/webhook-endpoint", port: 3000 }, () => {
  //   console.log("Webhook server is running!");
  // });
}

// Start listening for pull request events
// listenForPullRequests();
