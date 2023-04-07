import { ChatMessage } from "../../../types/chatMessage.type";

export const PROMPT_TEMPLATE = `
"""Today is {today} and you can use tools to get new information. You can also write code to the users scratch pad and file system. Answer the question as best as you can using the following tools: 
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
  sessionMessages: ChatMessage[]
) => {
  const expectedNextAction = dbSession.expected_next_action;

  const lastMessage = sessionMessages[sessionMessages.length - 1].content;

  const prompt = expectedNextAction
    ? `We expected the user to answer this: ${expectedNextAction}. And this was their response ${lastMessage}`
    : lastMessage;

  return prompt;
};
