import { githubExoAppId, githubPrivateKey } from "../../../utils/envVariable";

const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/rest");

export const kgExoAppInstallationId = "37538431";
export const testPrSha = "767433f97bafe297b5849cf9091e55deff615721";
export const repo = "code-gen-server";
export const owner = "kmgrassi";
const testBranch = "kevin/testing-webhook-124";

export type ShaObject = {
  sha: string;
};

export type TreeObject = {
  sha: string;
  url: string;
  tree: any[];
  mode?: string;
  type?: string;
  content?: string;
};

export function initOctokit(installationId: string) {
  return new Octokit({
    baseUrl: "https://api.github.com",
    authStrategy: createAppAuth,
    auth: {
      appId: parseInt(githubExoAppId, 10),
      installationId: parseInt(installationId, 10),
      type: "installation",
      privateKey: githubPrivateKey,
    },
  });
}

export async function getBranchByUrl(url: string, installationId: string) {
  const octokit = initOctokit(installationId);

  const branch = await octokit.request(
    "GET /repos/{owner}/{repo}/branches/{branch}",
    {
      owner,
      repo,
      branch: testBranch,
    }
  );

  return branch;
}

export async function getReposByInstallationId(installationId: string) {
  const octokit = initOctokit(installationId);

  const response = await octokit.request("GET /installation/repositories");

  return response.data.repositories;
}

export async function createPrByRepo(repository: string, octokit: any) {
  const response = await octokit.request("POST /repos/{owner}/{repo}/pulls/", {
    owner,
    repo: repository,
    title: "Test PR",
    head: testBranch,
    base: "main",
  });

  return response;
}

export async function getRefByRepo({
  owner,
  repo,
  branch,
  octokit,
}: {
  owner: string;
  repo: string;
  branch: string;
  octokit: any;
}) {
  // Get the branch reference
  const { data: branchRef } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  return branchRef;
}

export async function getCommitByRepo({
  owner,
  repo,
  commitSha,
  octokit,
}: {
  owner: string;
  repo: string;
  commitSha: string;
  octokit: any;
}) {
  // Get the latest commit object of the branch
  const { data: latestCommit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: commitSha,
  });
  return latestCommit;
}

export async function createBlobByRepo({
  owner,
  repo,
  content,
  octokit,
}: {
  owner: string;
  repo: string;
  content: string;
  octokit: any;
}): Promise<ShaObject> {
  // Create a new blob for the file content
  const { data: newBlob } = await octokit.git.createBlob({
    owner,
    repo,
    content,
    encoding: "utf-8",
  });
  return newBlob;
}

export async function getTreeByRepo({
  owner,
  repo,
  treeSha,
  octokit,
  recursive = false,
}: {
  owner: string;
  repo: string;
  treeSha: string;
  octokit: any;
  recursive?: boolean;
}): Promise<TreeObject> {
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive,
  });
  return tree;
}

export async function createNewTreeByRepo({
  octokit,
  newTree,
  owner,
  repo,
  baseTreeSha,
}: {
  octokit: any;
  newTree: TreeObject;
  owner: string;
  repo: string;
  baseTreeSha: string;
}): Promise<TreeObject> {
  // Create the new tree
  const { data: newTreeResult } = await octokit.git.createTree({
    owner,
    repo,
    tree: newTree,
    base_tree: baseTreeSha,
  });
  return newTreeResult;
}

export async function createCommitByRepo({
  owner,
  repo,
  octokit,
  newTreeResultSha,
  message,
  latestCommitSha,
}: {
  owner: string;
  repo: string;
  octokit: any;
  newTreeResultSha: string;
  message: string;
  latestCommitSha: string;
}) {
  // Create a new commit with the updated tree
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTreeResultSha,
    parents: [latestCommitSha],
  });
  return newCommit;
}

export async function updateRefByRepo({
  owner,
  repo,
  octokit,
  newCommit,
  branch,
}: {
  owner: string;
  repo: string;
  octokit: any;
  newCommit: ShaObject;
  branch: string;
}) {
  // Update the branch reference to the new commit
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
    force: true, // Use force: true to overwrite the existing branch reference
  });
}
