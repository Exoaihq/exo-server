import { ChatMessage } from "../../../types/chatMessage.type";

export const PROMPT_TEMPLATE = `
"""Today is {today} and you can use tools to get new information. You can also write code to the users scratch pad and file system. Answer the question as best as you can using 

Resources:
1. Full access to the users file system.
2. Memory management.
3. Ability to search the users code base.

Performance Evaluation:
1. Continuously review and analyze your actions to ensure you are performing to the best of your abilities.
2. Constructively self-criticize your big-picture behavior constantly.
3. Reflect on past decisions and strategies to refine your approach.
4. Every command has a cost, so be smart and efficient. Aim to complete tasks in the least number of steps.

the following tools: 
{tool_description}
Use the following format:
Question: the input question you must answer
Thought: comment on what you want to do next
Action: the action to take, exactly one element of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation repeats N times, use it until you are sure of the answer)
Thought: I now know the final answer
Final Answer: your final answer to the original input question
Begin!
Question: {question}
Thought: {previous_responses}
"""
`;

export const getExpectedNextAction = (
  dbSession: { expected_next_action: any },
  sessionMessages: ChatMessage[],
  expandedContext: string
) => {
  const expectedNextAction = dbSession.expected_next_action;

  const lastMessage = sessionMessages[sessionMessages.length - 1].content;

  const prompt = expectedNextAction
    ? `We expected the user to answer this: ${expectedNextAction}. And this was their response ${lastMessage}`
    : `\n\n Here is the expanded context: ${expandedContext}` + lastMessage;

  return prompt;
};

export const scratchTemplate = `
"""Today is {today} and you can use tools to get new information. You can also write code to the users scratch pad and file system. Answer the question as best as you can using 

Resources:
1. Full access to the users file system.
2. Memory management.
3. Ability to search the users code base.

Performance Evaluation:
1. Continuously review and analyze your actions to ensure you are performing to the best of your abilities.
2. Constructively self-criticize your big-picture behavior constantly.
3. Reflect on past decisions and strategies to refine your approach.
4. Every tool has a cost, so be smart and efficient. Aim to complete tasks in the least number of steps.

the following tools: 
{tool_description}

Use the following format:
Goal: the goal you are trying to 
Thought: comment on what you want to do next
Reasoning: why the user wants to do this
Plan: How you will do this in a short bullet point list
Critisism: Constructive criticism of your plan

Begin!
Goal: {question}
Thought: {previous_responses}
"""
`;

export const parseToJsonPrompt = (prompt: string) => {
  return `

Take this block of text and parse it into a json object. Here is an example of what the json object should look like:

{
  "question": "<the question>",
  "thought": "<the thought>",
  "reasoning": "<the reasoning>",
  "plan": ["example step one", "example step two"],
  "criticism": "<the criticism>",
}

${prompt} 

Please return the json object with the format above.

`;
};
