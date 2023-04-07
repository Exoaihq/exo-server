import { Request, Response } from "express";
import { CodeCompletionRequest } from "../codeCompletion/codeCompletion.types";
import {
  createMessageWithUser,
  getOnlyRoleAndContentMessagesByUserAndSession,
} from "../message/message.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
} from "../supabase/supabase.service";
import { getExpectedNextAction } from "./agent.prompt";
import { run } from "./agent.service";
import {
  generateCodeTool,
  searchCodeTool,
  setLocationToWriteCodeTool,
  writeCompletedCodeTool,
} from "./agent.tools";

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

    console.log("Db session", dbSession);

    const agentResponse = await run(
      user,
      sessionId,
      [
        setLocationToWriteCodeTool(),
        generateCodeTool(),
        writeCompletedCodeTool(),
        searchCodeTool(),
      ],
      getExpectedNextAction(dbSession, sessionMessages),
      10
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
        search: agentResponse?.runMetadata,
      },
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
