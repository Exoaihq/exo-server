import {
  createBlobByRepo,
  createCommitByRepo,
  createNewTreeByRepo,
  getCommitByRepo,
  getRefByRepo,
  getTreeByRepo,
  initOctokit,
  updateRefByRepo,
} from "./github.repository";

interface AddFileToCommitOptions {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  content: string;
  commitMessage: string;
  installationId: string;
}

export async function addFileToCommit(
  options: AddFileToCommitOptions
): Promise<void> {
  const { owner, repo, branch, filePath, content, commitMessage } = options;
  const octokit = initOctokit(options.installationId);

  const newBlob = await createBlobByRepo({
    owner,
    repo,
    content,
    octokit,
  });
  const branchRef = await getRefByRepo({
    owner,
    repo,
    branch,
    octokit,
  });
  const latestCommit = await getCommitByRepo({
    owner,
    repo,
    commitSha: branchRef.object.sha,
    octokit,
  });
  const tree = await getTreeByRepo({
    owner,
    repo,
    treeSha: latestCommit.tree.sha,
    octokit,
  });
  // Create a new tree with the added file
  const newTree = tree.tree.concat({
    path: filePath,
    mode: "100644",
    type: "blob",
    sha: newBlob.sha,
  }) as any;
  const newTreeResult = await createNewTreeByRepo({
    owner,
    repo,
    newTree,
    baseTreeSha: latestCommit.tree.sha,
    octokit,
  });
  const newCommit = await createCommitByRepo({
    owner,
    repo,
    message: commitMessage,
    newTreeResultSha: newTreeResult.sha,
    octokit,
    latestCommitSha: latestCommit.sha,
  });
  await updateRefByRepo({
    owner,
    repo,
    branch,
    newCommit,
    octokit,
  });
}

interface GetFilesInBranchOptions {
  owner: string;
  repo: string;
  commitSha: string;

  installationId: string;
}

export async function getFilesInBranch(
  options: GetFilesInBranchOptions
): Promise<string[]> {
  const { owner, repo, commitSha, installationId } = options;
  const octokit = initOctokit(installationId);

  // Get the commit object for the specified SHA
  const commit = await getCommitByRepo({
    owner,
    repo,
    commitSha,
    octokit,
  });

  const parentCommitSha = commit.parents[0].sha;
  const parentCommit = await getCommitByRepo({
    owner,
    repo,
    commitSha: parentCommitSha,
    octokit,
  });
  console.log(parentCommit);

  const parentTree = await getTreeByRepo({
    owner,
    repo,
    treeSha: parentCommit.tree.sha,
    recursive: true,
    octokit,
  });

  // Get the tree object for the commit
  const tree = await getTreeByRepo({
    owner,
    repo,
    treeSha: commit.tree.sha,
    recursive: true,
    octokit,
  });

  // Filter the files based on change type (added or modified)
  const updatedOrAddedFiles: string[] = tree.tree
    .filter((item) => {
      const parentTreeEntry = parentTree.tree.find(
        (parentItem: { path: any }) => parentItem.path === item.path
      );
      return !parentTreeEntry || parentTreeEntry.sha !== item.sha;
    })
    .map((item) => item.path);

  console.log(updatedOrAddedFiles);

  return updatedOrAddedFiles;
}
