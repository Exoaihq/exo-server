import { Database, Json } from "../../../types/supabase";
import { getCompletionDefaultStopToken } from "../openAi/openai.service";
import { createTaskWithObjective } from "../task/task.service";
import { ToolInterface } from "./agent.service";

export const actOnPlan = async (
  objective: Database["public"]["Tables"]["objective"]["Row"],
  plan: string[],
  tools: ToolInterface[],
  user: {
    avatar_url: string | null;
    billing_address: Json;
    email: string | null;
    full_name: string | null;
    id: string;
    payment_method: Json;
  },
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
        // const { output, metadata } = await tool.use(user, sessionId, task);
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
        // const { output, metadata } = await tool.use(user, sessionId, toolInput);
        // console.log("Tool output", output);
        // planOutput.push(output);
        continue;
      }
    }
  }
  return planOutput;
};
