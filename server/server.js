import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatPromptTemplate, 
  MessagesPlaceholder 
} from "@langchain/core/prompts";
import { AgentExecutor } from "langchain/agents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from 'zod';
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const config = { configurable: { thread_id: uuidv4() } };
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY;
const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;

app.use(express.json());

const tokenInfoGetter = tool( async (input) => {
  // 1. Extract contractAddress from input
  const { contractAddress } = input;

  // 2. Construct the Helius API URL
  const apiUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`; // Replace with your actual API key

  // 3. Make the API call (using fetch or Axios)
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "text",
      method: "getTokenAccounts", // Or another relevant method
      params: {
        mint: contractAddress, // Assuming you're looking up by mint address
      },
    }),
  });

  // 4. Parse the response
  const data = await response.json();

  // 5. Return the relevant token information
  return data.result; // Or extract specific fields from data.result
}, {
  name: "getTokenInfo",
  description: "Call to Helius API to retrieve token info"
}, 
z.object({
  contractAddress: z.string().describe("Solana CA to look up"),
}));

const llm = new ChatVertexAI({
  model: 'gemini-pro',
  temperature: 0,
  //apiKey: GOOGLE_API_KEY,
});

const llmWithTools = llm.bindTools(
  [tokenInfoGetter],
  {
  stop: ["\n"],
  }
  );

const toolNodeForGraph = new ToolNode([tokenInfoGetter]);

const shouldContinue = (state) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
}

/*const chain = RunnableSequence.from([
  promptTemplate,
  llm,
  new StringOutputParser(),
])*/

/*const agent = RunnableSequence.from([
  prompt,
  llm,
  (output) => {
    return {
      response: output,
      timestamp: new Date()
    };
  }
]);*/

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const dbName = 'chatstorage';
const collectionName = 'chats';

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);
    return db.collection(collectionName);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/*
//db connection
const chatCollection = await connectToDatabase();
*/

// append sys prompt
const systemPrompt = {
  role: "system",
  content: "You are a stoic AI that answers technically and to the point. You will be given a mint contract address for a solana blockchain token. You will use the tool to get as much info as possible about that token and return it in a nicely formatted manner."
};

//define call model function
const callModel = async (state) => {
  console.log("calling model");
  const messagesWithSysPrompt = [systemPrompt, ...state.messages];
  console.log("getting response");
  const response = await llmWithTools.invoke(messagesWithSysPrompt);
  console.log("response = ", response);
  return {messages: response};
};

//new graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNodeForGraph)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent")

//add mem
const memory = new MemorySaver();
const chatApp = workflow.compile({ checkpointer: memory });

app.post('/api/chat', async (req, res) => {

  try {
    const { message, walletKey } = req.body;
    console.log('Processing message for wallet:', walletKey);

    console.log("user message = ", message);
  
    const input = [
    {
      role: "user",
      content: message,
    },
  ];

    // Execute the chatapp
    console.log("invoking...");
    const result = await chatApp.invoke({ messages: input }, config);

    console.log(result.content);

    //console.log(model_response);
   /* await chatCollection.insertOne({
      walletKey: walletKey,
      message: message,
      response: model_response,
      timestamp: new Date()
    });*/

    res.json({
      response: result.messages[result.messages.length - 1].content // Frontend expects response as a simple string
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.listen(port, () => {
  //chatApp.invoke(prompt);
  //console.log(`llm invoked with prompt: ${prompt.toString()}`);
  console.log(`Server is running on port ${port}`);
});