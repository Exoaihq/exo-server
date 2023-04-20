import { Request, Response } from "express";
import { CodeCompletionRequest } from "../codeCompletion/codeCompletion.types";
import {
  createMessageWithUser,
  getOnlyRoleAndContentMessagesByUserAndSession,
} from "../message/message.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
} from "../supabase/supabase.service";
import { actOnPlan } from "./agent.act";
import { getExpectedNextAction } from "./agent.prompt";
import { expandContext, run } from "./agent.service";
import {
  askUserAQuestionTool,
  findFileTool,
  findDirectoryTool,
  generateNewCodeTool,
  retrieveMemoryTool,
  searchCodeTool,
  searchDirectoryTool,
  setLocationToWriteCodeTool,
  storeMemoryTool,
  writeCompletedCodeTool,
} from "./tools";
import { getExisitingCodeTool } from "./tools/getCode.tool";

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

    const expandedContext = await expandContext(
      sessionMessages,
      account?.id,
      user,
      sessionId
    );
    console.log("Context", expandedContext);

    const agentResponse = await run(
      user,
      sessionId,
      [
        searchCodeTool(),
        setLocationToWriteCodeTool(),
        storeMemoryTool(),
        searchDirectoryTool(),
        findFileTool(),
        generateNewCodeTool(),
        askUserAQuestionTool(),
        findDirectoryTool(),
        retrieveMemoryTool(),
        writeCompletedCodeTool(),
        getExisitingCodeTool(),
      ],
      getExpectedNextAction(dbSession, sessionMessages, expandedContext),
      20
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
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { sessionId } = req.body as CodeCompletionRequest;
    const tools = [
      searchCodeTool(),
      setLocationToWriteCodeTool(),
      storeMemoryTool(),
      writeCompletedCodeTool(),
      findFileTool(),
      askUserAQuestionTool(),
      searchDirectoryTool(),
      findDirectoryTool(),
      generateNewCodeTool(),
      retrieveMemoryTool(),
    ];
    const plan = [
      'Use the "set location" tool to set the location to the code-gen-server directory.',
      'Use the "generate new code" tool to generate js code to loop over a string and return the number of letters using javascript.',
      'Use the "write code" tool to write the generated code to the code-gen-server directory.',
      "Test the new controller to ensure it handles updating long term memory correctly.",
    ];

    const thought =
      "The user wants to add a new code to the code-gen-server directory that counts the number of letters in a string.";
    const question =
      "I need to generate js code for a new controller that handles counting the number of letters in a string using javascript.";
    // const act = actOnPlan(plan, tools, user, sessionId, thought, question);

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
