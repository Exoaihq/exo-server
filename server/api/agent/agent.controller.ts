import { Request, Response } from "express";
import { deserializeJson } from "../../../utils/deserializeJson";
import { CodeCompletionRequest } from "../codeCompletion/codeCompletion.types";
import {
  createMessageWithUser,
  getOnlyRoleAndContentMessagesByUserAndSession,
} from "../message/message.service";
import { getCompletionDefaultStopToken } from "../openAi/openai.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
} from "../supabase/supabase.service";
import { getExpectedNextAction, parseToJsonPrompt } from "./agent.prompt";
import { expandContext, run } from "./agent.service";
import {
  findCodeTool,
  findDirectoryTool,
  generateCodeTool,
  retrieveMemoryTool,
  searchCodeTool,
  searchDirectoryTool,
  setLocationToWriteCodeTool,
  storeMemoryTool,
  writeCompletedCodeTool,
} from "./agent.tools";
import { exampleRes } from "./exampleRes.";

export const useAgent = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { sessionId } = req.body as CodeCompletionRequest;

    const sessionMessages = await getOnlyRoleAndContentMessagesByUserAndSession(
      user,
      sessionId
    );

    const dbSession = await findOrCreateSession(user, sessionId);

    const account = await findOrUpdateAccount(user);

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

    const expandedContext = await expandContext(sessionMessages, account?.id);
    console.log("Context", expandedContext);

    const agentResponse = await run(
      user,
      sessionId,
      [
        generateCodeTool(),
        searchDirectoryTool(),
        writeCompletedCodeTool(),
        searchCodeTool(),
        setLocationToWriteCodeTool(),
        storeMemoryTool(),
        findCodeTool(),
        findDirectoryTool(),
        retrieveMemoryTool(),
      ],
      getExpectedNextAction(dbSession, sessionMessages, expandedContext),
      20
    );

    await createMessageWithUser(
      user,
      {
        content: agentResponse?.output,
        role: "assistant",
      },
      sessionId
    );

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
    // NEED to fix this
    const parsedToJson = await getCompletionDefaultStopToken(
      parseToJsonPrompt(exampleRes)
    );

    const parseResponse = parsedToJson.data.choices[0].text;
    console.log(">>>>>>>>>Parsed to json", parseResponse);

    const json = deserializeJson(parseResponse);

    console.log(">>>>>>>>>Json", json);

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
