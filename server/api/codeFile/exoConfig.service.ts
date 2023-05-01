import {
  createExoConfig,
  findExoConfigFileByCodeDirectoryId,
  findFileById,
} from "./codeFile.repository";

export const getOrCreateExoConfig = async (codeFileId: number) => {
  const codeFile = await findFileById(codeFileId);
  if (!codeFile?.code_directory_id) {
    return null;
  }
  // Find the exo config for the code directory id
  const foundExoConfig = await findExoConfigFileByCodeDirectoryId(
    codeFile?.code_directory_id
  );
  if (!foundExoConfig) {
    // Create a new exo config

    return await createExoConfig(codeFile?.code_directory_id);
  } else {
    return foundExoConfig;
  }
};
