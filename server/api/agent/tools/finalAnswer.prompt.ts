export const finalAnswerPrompt = `
"""Today is {today} and you can use tools to get new information. You can also write code to the users scratch pad and file system. 
 
Here is some additional context:
{context}

You used the "final answer" tool to answer the following question: {question}.

And you got this reponse: {response}

return the response
"""
`;
