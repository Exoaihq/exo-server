import { Request, Response } from "express";
import { logInfo } from "../../../utils/commandLineColors";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { CodeCompletionRequest } from "../codeCompletion/codeCompletion.types";
import { getOnlyRoleAndContentMessagesByUserAndSession } from "../message/message.service";
import { handleSearch } from "../search/search.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import { findOrCreateSession } from "../supabase/supabase.service";
import { getExpectedNextAction, getQuickAction } from "./agent.prompt";
import { expandContext, startNewObjective } from "./agent.service";
import { allTools, searchCodeTool, searchDirectoryTool } from "./tools";
import { writeCodeToScratchPadTool } from "./tools/writeCodeToScarchPad.tool";

const fs = require("fs");

export const useAgent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req;

    const { sessionId } = req.body as CodeCompletionRequest;

    const sessionMessages = await getOnlyRoleAndContentMessagesByUserAndSession(
      userId,
      sessionId
    );
    logInfo(`Session messages ${JSON.stringify(sessionMessages)}`);
    const dbSession = await findOrCreateSession(userId, sessionId);

    const account = await findOrUpdateAccount(userId);

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

    const lastMessage = sessionMessages[sessionMessages.length - 1]?.content;

    const quickActions = [
      searchDirectoryTool(),
      searchCodeTool(),
      writeCodeToScratchPadTool(),
    ];

    const quickActionPrompt = getQuickAction(lastMessage, quickActions);

    console.log("Quick action prompt", quickActionPrompt);

    // const isQuicActionRes = await createChatCompletion(
    //   [{ content: quickActionPrompt, role: ChatUserType.user }],
    //   EngineName.Turbo,
    //   0.1
    // );

    // const isQuickAction =
    //   isQuicActionRes.choices[0].message.content.toLowerCase();

    // console.log("Is quick action", isQuickAction);

    const isQuickAction = "null";

    if (isQuickAction.includes("null")) {
      const expandedContext = await expandContext(
        sessionMessages,
        account?.id,
        userId,
        sessionId
      );
      console.log("Context", expandedContext);
      await startNewObjective(
        userId,
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
        return res.status(200).json(await handleSearch(userId, sessionId));
      } else {
        tool?.use(userId, sessionId, lastMessage);
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

// User this route to test an agent in isolation
export const testAgent = async (req: Request, res: Response) => {
  try {
    const userId = "4ff416c9-4805-4adb-bfe7-ef315ae9536b";

    const sessionId = "ad536466-86b0-4f6c-8c40-2118a30a68e1";

    const output = await searchDirectoryTool().use(
      userId,
      sessionId,
      "codeFile",
      {
        description:
          "1. Use the 'search directory' tool to find the codeFile directory in the code-gen-server repo.",
      }
    );
    logInfo(`Output ${JSON.stringify(output)}`);

    // await updateExistingCodeTool().use(
    //   userId,
    //   sessionId,
    //   "Add a select statement to the updateAiWritenCode function"
    // );

    return res.status(200).json({
      data: output,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
