export const setLocationPrompt = `
"""Today is {today} and you can use tools to get new information. You can also write code to the users scratch pad and file system. 
 
Here is some additional context:
{context}

You used the "set location" tool to answer the following question: {question}.

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


Your goal is to make sure the "set location" tool set the location to the correct value.

Begin!
Question: {question}
Thought: {previous_responses}
"""
`;
