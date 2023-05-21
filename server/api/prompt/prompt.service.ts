import { supabaseBaseServerClient } from "../../../server";
import { Database } from "../../../types/supabase";
import { convertToTestFileName } from "../../../utils/getFileName";
import { createAiCodeFromNewFilePrompt } from "../aiCreatedCode/aiCreatedCode.service";
import { ExpectedNextAction } from "../codeCompletion/scenerios/codeCompletion.knownNextAction";
import { handleUpdatingExistingCode } from "../codeCompletion/scenerios/codeCompletion.updateExisting";
import { createMessageWithUser } from "../message/message.service";
import { resetSession } from "../session/session.service";

export const getGlobalPromptsDb = async (): Promise<
  Database["public"]["Tables"]["prompt"]["Row"][]
> => {
  const { data, error } = await supabaseBaseServerClient
    .from("prompt")
    .select("*")
    .eq("global", true);

  return data || [];
};

export const getPromptById = async (
  promptId: string
): Promise<Database["public"]["Tables"]["prompt"]["Row"] | null> => {
  const { data, error } = await supabaseBaseServerClient
    .from("prompt")
    .select("*")
    .eq("id", promptId);

  return (data && data[0]) || null;
};

export const getMessageExamplePrompts = async (): Promise<
  Database["public"]["Tables"]["prompt"]["Row"][]
> => {
  const { data, error } = await supabaseBaseServerClient
    .from("prompt")
    .select("*")
    .eq("global", true)
    .in("name", ["Array", "Create test", "Dry code", "Inline improvements"]);

  return data || [];
};

export const createNewMessagePrompt = async (messageId: string) => {
  const prompts = await getMessageExamplePrompts();
  const { data, error } = await supabaseBaseServerClient
    .from("message_prompts")
    .insert(
      prompts.map((prompt) => {
        return {
          message_id: messageId,
          prompt_id: prompt.id,
        };
      })
    );
};

export const createPromptForLlm = ({
  promptPrefix,
  promptBody,
  promptSuffix,
}: {
  promptPrefix?: string | null;
  promptBody?: string | null;
  promptSuffix?: string | null;
}) => {
  return `
    ${promptPrefix || ""}
    ${promptBody || ""}
    ${promptSuffix || ""}
    `;
};

export const handleUsingSelectedPrompt = async (
  dbSession: {
    code_content: any;
    created_at?: string | null;
    expected_next_action: any;
    file_name: any;
    file_path: any;
    functionality?: string | null;
    id?: string;
    location: any;
    new_file?: boolean | null;
    scratch_pad_content?: string | null;
    updated_at?: string | null;
    user_id?: string | null;
  },
  sessionId: string,
  userId: string,
  prompt: {
    body?: string | null;
    created_at?: string | null;
    description?: string | null;
    global?: boolean | null;
    id?: string;
    message_id?: string | null;
    name?: string | null;
    prefix: any;
    suffix: any;
    user_id?: string | null;
  }
) => {
  // The prompts are only added to the messages when we expect the next action - existing file or new file
  if (dbSession.expected_next_action === ExpectedNextAction.EXISTING_FILE) {
    const path =
      prompt.name === "Create test"
        ? dbSession.file_path + "/" + convertToTestFileName(dbSession.file_name)
        : dbSession.file_path + "/" + dbSession.file_name;

    handleUpdatingExistingCode(
      createPromptForLlm({
        promptPrefix: prompt.prefix,
        promptSuffix: prompt.suffix,
      }),
      dbSession.code_content || "",
      path,
      sessionId,
      dbSession.location || "",
      userId
    );

    createMessageWithUser(
      {
        content: `I'm creating the code and once finished i'll write it to: ${dbSession.file_path}`,
        role: "assistant",
      },
      sessionId
    );
    resetSession(userId, sessionId);
  } else if (dbSession.expected_next_action === ExpectedNextAction.NEW_FILE) {
    createAiCodeFromNewFilePrompt(
      userId,
      createPromptForLlm({
        promptPrefix: prompt.prefix,
        promptSuffix: prompt.suffix,
        promptBody: dbSession.code_content,
      }),
      sessionId,
      dbSession.file_path || ""
    );

    createMessageWithUser(
      {
        content: `I'm creating the code and once finished i'll write it to: ${dbSession.file_path}`,
        role: "assistant",
      },
      sessionId
    );
    resetSession(userId, sessionId);
  } else {
    createMessageWithUser(
      {
        content: `Hmm, I don't know what to do with that prompt. Did you select a file to update or a location to write a new file?`,
        role: "assistant",
      },
      sessionId
    );
  }
};

export const generateFileSystemPrompt = (
  prompt: string,
  filePaths: string,
  sharedDependecies: string
) => {
  return `You are an AI developer who is trying to write a program that will generate code for the user based on their intent.
        
  the app is: ${prompt}

  the files we have decided to generate are: ${filePaths}

  the shared dependencies (like filenames and variable names) we have decided on are: ${sharedDependecies}
  
  only write valid code for the given filepath and file type, and return only the code.
  do not add any other explanation, only return valid code for that file type.
  `;
};

export const generateFileUserPrompt = (
  fileName: string,
  functionName: string,
  prompt: string,
  sharedDependencies: string,
  existingFileContent?: string
) => {
  return `
We have broken up the program into per-file generation. 
Now your job is to generate only the code for the file ${fileName} with the functions:  ${functionName}. 
Make sure to have consistent filenames if you reference other files we are also generating.

the shared dependencies (like filenames and variable names) we have decided on are: ${sharedDependencies}

${
  existingFileContent ||
  `Here is the existing code for the file ${existingFileContent}`
}

Remember that you must obey 3 things: 
   - you are generating code for the file ${fileName}
   - do not stray from the names of the files and the shared dependencies we have decided on
   - MOST IMPORTANT OF ALL - the purpose of our app is ${prompt} - every line of code you generate must be valid code. Do not include code fences in your response, for example

Bad response:
'''javascript 
console.log("hello world")
'''

Good response:
console.log("hello world")

Begin generating the code now for the file ${fileName} with the function name ${functionName}. 
`;
};

export const generateFilePathsSystemPrompt = (existingFunctions: string) => {
  return `
  You are an AI developer who is trying to write a program that will generate code for the user based on their intent.
        
    When given their intent, create a complete, exhaustive list of functions and files that the user would write to make the program.

    Here is a list of functions that already exist in the program:
    ${existingFunctions}
    
    only list the functions and files you would write, and return them as a javaScript array of objects. For example:
    [{
      "file_name": "index.js",
      "functions": [ "main", "helperFunction"]
    }]
    do not add any other explanation, only return a javaScript array of objects.
  `;
};

export const generateSharedDependenciesSystemPrompt = (
  prompt: string,
  filePaths: string
) => {
  return `
 You are an AI developer who is trying to write a program that will generate code for the user based on their intent.
                
In response to the user's prompt:

---
the app is: ${prompt}
---
            
the files we have decided to generate are: ${filePaths}

Now that we have a list of files, we need to understand what dependencies they share.
Please name and briefly describe what is shared between the files we are generating, including exported variables, data schemas, message names, and function names.
Exclusively focus on the names of the shared dependencies, and do not add any other explanation.
  `;
};

