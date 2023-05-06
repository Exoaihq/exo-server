export const searchDirectoryPrompt = `
"""Today is {today} and you can use tools to get new information. You can also write code to the users scratch pad and file system. 
 
Here is some additional context:
{context}

You used the "search directory" tool to answer the following question: {question}.

And you got this reponse: {response}

Tools:
The following tools are available to you: 
{tool_description}

Use the following format:
Question: the input question you must answer
Thought: comment on what you want to do next
Tool: the action to take, exactly one element of tool names: {tool_names}
Tool Input: the input to the action
Observation: the result of the action
... (this Thought/Tool/Tool Input/Observation repeats N times, use it until you are sure of the answer)
Thought: I now know the final answer
Final Answer: your final answer to the original input question

Try to get to the final answer. You can use the tools to help you get there.

Begin!
Question: {question}
Thought: {previous_responses}
"""
`;

export const refinementPrompt = (description: string, response: string) => `
    Here is the original task goal: ${description}
    Here is the new information gained from running the task: ${response}

    Please use the new information to better answer the original task goal.

`;
