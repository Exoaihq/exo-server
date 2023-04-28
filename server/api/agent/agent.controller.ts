import { Request, Response } from "express";
import { ChatUserType } from "../../../types/chatMessage.type";
import { Element, ParsedCode } from "../../../types/parseCode.types";
import { getSubstringFromMultilineCode } from "../../../utils/getSubstringFromMultilineCode";
import { parseFile } from "../../../utils/treeSitter";
import { CodeCompletionRequest } from "../codeCompletion/codeCompletion.types";
import { findFileByAccountIdAndFullFilePath } from "../codeFile/codeFile.repository";
import {
  addCodeToSupabase,
  deleteSnippetById,
} from "../codeSnippet/codeSnippet.repository";
import { getOnlyRoleAndContentMessagesByUserAndSession } from "../message/message.service";
import { createChatCompletion } from "../openAi/openai.service";
import { handleSearch } from "../search/search.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
} from "../supabase/supabase.service";
import { getExpectedNextAction, getQuickAction } from "./agent.prompt";
import { expandContext, startNewObjective } from "./agent.service";
import { allTools, searchCodeTool, searchDirectoryTool } from "./tools";
import { updateExistingCodeTool } from "./tools/updateExistingCode.tool";
import { writeCodeToScratchPadTool } from "./tools/writeCodeToScarchPad.tool";

const fs = require("fs");

export const useAgent = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { sessionId } = req.body as CodeCompletionRequest;

    const sessionMessages = await getOnlyRoleAndContentMessagesByUserAndSession(
      user.id,
      sessionId
    );

    const dbSession = await findOrCreateSession(user.id, sessionId);

    const account = await findOrUpdateAccount(user.id);

    if (!account) {
      return res.status(200).json({
        data: {
          choices: [
            {
              text: "Please login to use the agent",
            },
          ],
        },
      });
    }

    // For specific actions that don't require an agent

    const lastMessage = sessionMessages[sessionMessages.length - 1].content;

    const quickActions = [
      searchDirectoryTool(),
      searchCodeTool(),
      writeCodeToScratchPadTool(),
    ];

    const quickActionPrompt = getQuickAction(lastMessage, quickActions);

    console.log("Quick action prompt", quickActionPrompt);

    const isQuicActionRes = await createChatCompletion([
      { content: quickActionPrompt, role: ChatUserType.user },
    ]);

    const isQuickAction =
      isQuicActionRes.choices[0].message.content.toLowerCase();

    console.log("Is quick action", isQuickAction);

    if (isQuickAction.includes("null")) {
      const expandedContext = await expandContext(
        sessionMessages,
        account?.id,
        user.id,
        sessionId
      );
      console.log("Context", expandedContext);
      await startNewObjective(
        user.id,
        sessionId,
        allTools,
        getExpectedNextAction(dbSession, sessionMessages, expandedContext)
      );
    } else {
      const tool = quickActions.find((tool) =>
        isQuickAction.includes(tool.name)
      );

      if (tool?.name === "search code" || tool?.name === "search directory") {
        // Consider creating separate tools for search code and search directory. This method only searches code
        return res.status(200).json(await handleSearch(user.id, sessionId));
      } else {
        tool?.use(user.id, sessionId, lastMessage);
      }
    }

    return res.status(200).json({
      data: {
        choices: [
          {
            message: {
              content:
                "We found these code snippets that might match your search:",
              role: "assistant",
            },
          },
        ],
        metadata: {
          projectDirectory: "",
          projectFile: "",
          newFile: null,
          requiredFunctionality: "",
        },
        completedCode: "",
        // search: agentResponse?.runMetadata,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const testAgent = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { sessionId } = req.body as CodeCompletionRequest;
    const account = await findOrUpdateAccount(user.id);
    if (!account) {
      return res.status(400).json({
        data: {
          choices: [
            {
              text: "Please login to use the agent",
            },
          ],
        },
      });
    }

    const path =
      "/Users/kg/Repos/code-gen-server/server/api/aiCreatedCode/aiCreatedCode.repository.ts";

    const testPath =
      "/Users/kg/Repos/code-gen-server/server/api/aiCreatedCode/test.ts";

    const fileWithSnippets = await findFileByAccountIdAndFullFilePath(
      account?.id ? account.id : "",
      path
    );

    if (
      !fileWithSnippets ||
      !fileWithSnippets.file_name ||
      !fileWithSnippets.file_path
    ) {
      return res.status(400).json({
        data: {
          choices: [
            {
              text: "You need to create the file first",
            },
          ],
        },
      });
    }

    if (!fileWithSnippets?.code_snippet) {
      // Create the snippets
    } else {
      // Check the snippets
      const { code_snippet } = fileWithSnippets;

      let codeSnippets: any[] = [];

      if (!Array.isArray(code_snippet)) {
        codeSnippets = [code_snippet];
      } else {
        codeSnippets = [...code_snippet];
      }

      const fileContent = await fs.readFileSync(path, "utf-8");

      const linesSplit = fileContent.split("\n");
      const addBackNewLine = linesSplit.map((line: any) => `${line}\n`);

      const parsed = await parseFile(fileContent);

      let numberFound = 0;
      let numberNotFound = 0;
      let matchedSnippets: any[] = [];

      let elementsToUpdate: ParsedCode[] = [];

      for await (const element of parsed.rootNode.children) {
        const { startPosition, endPosition, type }: Element = element;
        const parsedCodeSnippet = getSubstringFromMultilineCode(
          addBackNewLine,
          startPosition.row,
          startPosition.column,
          endPosition.row,
          endPosition.column
        );

        // console.log("Parsed code snippet", parsedCodeSnippet);

        const dbSnippetFound = codeSnippets.find((dbSnippet) => {
          return (
            dbSnippet.start_row === startPosition.row &&
            dbSnippet.end_row === endPosition.row &&
            dbSnippet.start_column === startPosition.column &&
            dbSnippet.end_column === endPosition.column
          );
        });
        if (!dbSnippetFound) {
          numberNotFound++;
          elementsToUpdate.push({
            code: parsedCodeSnippet,
            metadata: {
              element,
              filePath: fileWithSnippets.file_path,
              type,
              fileName: fileWithSnippets.file_name,
            },
          });
        } else {
          const match = parsedCodeSnippet === dbSnippetFound?.code_string;

          if (match) {
            numberFound++;
            matchedSnippets.push(dbSnippetFound.id);
          } else {
            numberNotFound++;
            elementsToUpdate.push({
              code: parsedCodeSnippet,
              metadata: {
                element,
                filePath: fileWithSnippets.file_path,
                type,
                fileName: fileWithSnippets.file_name,
              },
            });
          }
        }
      }
      console.log("Number found", numberFound);
      console.log("Number not found", numberNotFound);
      console.log("Matched snippets", matchedSnippets);

      const snippetsToDelete = codeSnippets.filter((snippet) => {
        return !matchedSnippets.includes(snippet.id);
      });
      // console.log(
      //   "Snippets to delete",
      //   snippetsToDelete.map((s) => s.id)
      // );

      snippetsToDelete.forEach(async (snippet) => {
        await deleteSnippetById(snippet.id);
      });

      elementsToUpdate.forEach(async (element) => {
        await addCodeToSupabase(element, account.id);
      });
    }

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const testUpdateExisting = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { sessionId } = req.body as CodeCompletionRequest;
    const account = await findOrUpdateAccount(user.id);

    const path =
      "/Users/kg/Repos/code-gen-server/server/api/aiCreatedCode/aiCreatedCode.repository.ts";

    await updateExistingCodeTool().use(
      user.id,
      sessionId,
      "Add a select statement to the updateAiWritenCode function"
    );

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
