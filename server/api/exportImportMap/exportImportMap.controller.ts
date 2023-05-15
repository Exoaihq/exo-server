// ```javascript
import { Request, Response } from "express";
import {
  checkSessionOrThrow,
  findOrCreateSession,
} from "../session/session.service";

export const handleGetExportImportMap = async (req: Request, res: Response) => {
  try {
    const { exportImportMapId, sessionId } = req.body;
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const dbSession = await findOrCreateSession(user.id, sessionId);

    // TODO - Add get map

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
