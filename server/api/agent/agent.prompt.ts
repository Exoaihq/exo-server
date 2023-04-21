import { ChatMessage } from "../../../types/chatMessage.type";

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

export const promptTemplate = `
"""Today is {today} and you can use tools to get new information. You can also write code to the users scratch pad and file system. Answer the question as best as you can.  

Resources:
1. Full access to the users file system.
2. Memory management.
3. Ability to search the users code base.

Performance Evaluation:
1. Continuously review and analyze your actions to ensure you are performing to the best of your abilities.
2. Constructively self-criticize your big-picture behavior constantly.
3. Reflect on past decisions and strategies to refine your approach.

the following tools: 
{tool_description}

Use the following format:
Goal: the goal you are trying to complete
Thought: comment on what you want to do next
Reasoning: why the user wants to do this
Plan: How you will do this in a bullet point list. Be as specific as possible with each step.
Criticism: Constructive criticism of your plan. Also include any tools you don't have access to that you need to complete the goal.

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
