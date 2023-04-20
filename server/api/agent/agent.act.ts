import { Database, Json } from "../../../types/supabase";
import { getObjectiveById } from "../objective/objective.service";
import { getCompletionDefaultStopToken } from "../openAi/openai.service";
import { getSessionById } from "../supabase/supabase.service";
import { createTaskWithObjective } from "../task/task.service";
import { getToolByNames, ToolInterface } from "./agent.service";
import { allTools } from "./tools";

export const addPlansTaskListToDb = async (
  objective: Database["public"]["Tables"]["objective"]["Row"],
  plan: string[],
  tools: ToolInterface[],
  userId: string,
  sessionId: string,
  thought: string,
  question: string
) => {
  let planOutput: string[] = [];

  for (let task of plan) {
    const tool = tools.find((tool) => task.includes(tool.name));
    if (tool) {
      // Execute the tool.

      if (tool.arguments && tool.arguments.length === 0) {
        await createTaskWithObjective(
          {
            description: task,
            tool_name: tool.name,
          },
          objective.id
        );
        // const { output, metadata } = await tool.use(userId, sessionId, task);
        // console.log("Tool output", output);
        // planOutput.push(output);
        continue;
      }

      const getToolInputPrompt = `
      You need to get the argument for this tool: 
       Name: ${tool.name}. Description: ${tool.description}.

       Arguments are ${
         tool.arguments && tool.arguments.length > 0
           ? tool.arguments?.map((arg) => `<${arg}>`).join(", ")
           : "none"
       }.

       Return just the argument that will be passed into this tool based on the context above and this string: 
       
       ${task}

       Context: 
       Thought: ${thought}
        Question: ${question}

        <tool argument> = 

      `;

      const res = await getCompletionDefaultStopToken(getToolInputPrompt);

      const toolInput = res.data.choices[0].text;

      if (!toolInput) {
        console.log("No tool input");
        continue;
      } else {
        await createTaskWithObjective(
          {
            description: task,
            tool_name: tool.name,
            tool_input: toolInput,
          },
          objective.id
        );
        // const { output, metadata } = await tool.use(userId, sessionId, toolInput);
        // console.log("Tool output", output);
        // planOutput.push(output);
        continue;
      }
    }
  }
  return planOutput;
};

export const executeTask = async (
  toolName: string,
  toolInput: string,
  task: Database["public"]["Tables"]["task"]["Row"]
) => {
  const { objective_id } = task;

  if (!objective_id) {
    throw new Error("No objective id found");
  }

  const objective = await getObjectiveById(objective_id);

  if (!objective) {
    throw new Error("No objective found");
  }

  const { session_id, thought, question } = objective;

  if (!session_id) {
    throw new Error("No session id found");
  }

  const session = await getSessionById(session_id);

  if (!session || !session.user_id) {
    throw new Error("No session found");
  }

  const tool = getToolByNames(allTools);
  const { output, metadata } = await tool[toolName].use(
    session.user_id,
    session_id,
    toolInput
  );
};
