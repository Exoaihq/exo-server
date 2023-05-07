import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import {
  createMessageWithUser,
  createMessagesWithUser,
  getOnlyRoleAndContentMessagesByUserAndSession,
} from "../message/message.service";
import { createTextCompletion } from "../openAi/openai.service";
import { handleSearch } from "../search/search.service";
import {
  findOrCreateSession,
  updateSession,
} from "../supabase/supabase.service";
import {
  createBaseClassificationPrompt,
  runBaseClassificaitonChatCompletion,
} from "./codeCompletion.classifier";
import { checkDbSession } from "./codeCompletion.service";
import { CodeCompletionRequest } from "./codeCompletion.types";
import { handleKnownNextAction } from "./scenerios/codeCompletion.knownNextAction";
import { ChatUserType } from "../../../types/chatMessage.type";

export const handleCodeCompletion = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req;

    const { sessionId, scratchPadContent } = req.body as CodeCompletionRequest;

    const sessionMessages = await getOnlyRoleAndContentMessagesByUserAndSession(
      userId,
      sessionId
    );

    const dbSession = await findOrCreateSession(userId, sessionId);

    await updateSession(userId, sessionId, {
      scratch_pad_content: scratchPadContent,
    });

    if (dbSession.expected_next_action) {
      return await handleKnownNextAction(
        sessionMessages,
        dbSession,
        userId,
        sessionId,
        res
      );
    }

    // if (scratchPadContent){
    //   return await handleScratchPadContent(
    //     sessionMessages,
    //     dbSession,
    //     userId
    //     sessionId,
    //     scratchPadContent,
    //     res
    //   );
    // }

    const classifyMessage = await createTextCompletion(
      createBaseClassificationPrompt(sessionMessages),
      0.2
    );

    const baseClassificaiton = classifyMessage.trim();

    console.log("Base classificaiton", baseClassificaiton);

    let metadata = {
      projectDirectory: "",
      projectFile: "",
      newFile: null as null | boolean,
      requiredFunctionality: "",
    };

    if (baseClassificaiton === "generalChat") {
      const choices = await await runBaseClassificaitonChatCompletion(
        sessionMessages
      );

      await createMessageWithUser(
        {
          content: choices,
          role: ChatUserType.assistant,
        },
        sessionId
      );
      return res.status(200).json({
        data: {
          choices,
          metadata,
        },
      });
    } else if (baseClassificaiton === "creatingCode") {
      const responseBasedOnDbSession = await checkDbSession(
        dbSession,
        sessionMessages,
        userId,
        sessionId
      );

      return res.status(200).json({
        data: responseBasedOnDbSession,
      });
    } else if (baseClassificaiton === "search") {
      return res.status(200).json(await handleSearch(userId, sessionId));
    } else {
      res
        .status(500)
        .json({ message: "Something went wrong with the classification" });
    }
  } catch (error: any) {
    console.log(error);

    res.status(500).json({ message: error.message });
  }
};
