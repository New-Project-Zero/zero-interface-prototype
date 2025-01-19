import express from 'express';
//import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
//import { ChatGoogleGenerativeAI } from "@langchain/google-vertexai";
/*import { ChatPromptTemplate, 
  MessagesPlaceholder 
} from "@langchain/core/prompts";
import { AgentExecutor } from "langchain/agents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
*/
import cors from 'cors';
import { AIMessage, HumanMessage } from "@langchain/core/messages";
//import { ToolNode } from "@langchain/langgraph/prebuilt";
//import { DynamicTool } from "@langchain/core/tools";
//import { z } from 'zod';
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph";
//import { v4 as uuidv4 } from "uuid";
//import { tavily } from '@tavily/core';
//import { GoogleCustomSearch } from "langchain/tools";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Connection, PublicKey } from '@solana/web3.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createReactAgent } from "@langchain/langgraph/prebuilt";


dotenv.config();

//const VITE_HELLOMOON_API_KEY = process.env.VITE_VITE_HELLOMOON_API_KEY;

const app = express();
const port = process.env.PORT || 3001;
//const config = { configurable: { thread_id: uuidv4() } };
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY;
const TAVILY_API_KEY = process.env.VITE_TAVILY_API_KEY;
const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;

const NEWP_MINT_ADDR = new PublicKey('2Xf4kHq69r4gh763aTGN82XvYzPMhXrRhAEJ29trpump');
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);

app.use(cors());
app.use(express.json());

const agentTools = [new TavilySearchResults({ 
  maxResults: 3,
  apiKey: TAVILY_API_KEY
 })];

/*const tokenInfoGetter = tool( async (input) => {
  // Extract contractAddress from input
  const { contractAddress } = input;

  // HELLOMOON API URL
  const apiUrl = `https://rpc.hellomoon.io/${VITE_HELLOMOON_API_KEY}`; 

  // api call
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "text",
      method: "getTokenAccounts", 
      params: {
        mint: contractAddress, // looking up by mint address
      },
    }),
  });

  // Parse response
  const data = await response.json();

  //Return token information
  return data.result; 
}, {
  name: "getTokenInfo",
  description: "Call to Helius API to retrieve token info"
}, 
z.object({
  contractAddress: z.string().describe("Solana CA to look up"),
}));

//consttruct tavily tool
const tvly = tavily({apiKey: `${TAVILY_API_KEY}`});

const tavilyTool = new DynamicTool({
  name: "web-search-tool",
  description: "Tool for getting the latest information from the web",
  func: async (searchQuery, runManager) => {
    const retriever = new TavilySearchAPIRetriever();
    const docs = await retriever.invoke(searchQuery, runManager?.getChild());
    console.log(docs.toString);
    return docs.map((doc) => doc.pageContent).join("\n-----\n");
  },
});
*/

/*
const llmWithTools = llm.bindTools(
  [tavilyTool],
  {
  tool_choice: "auto",
  stop: ["\n"],
  }
  );

const toolNodeForGraph = new ToolNode([ tavilyTool]);

const shouldContinue = (state) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
}

const chain = RunnableSequence.from([
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
/*
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


//db connection
const chatCollection = await connectToDatabase();


// append sys prompt
const systemPrompt = {
  role: "system",
  content: "You are a stoic AI that answers technically and to the point. You will be given a mint contract address for a solana blockchain token. You will use the tool to get as much info as possible about that token and return it in a nicely formatted manner. If you are asked about something not related to cryptocurrency then you will use the tavily search tool to recover some relevant information and present it to the user."
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
*/

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-flash-8b',
  temperature: 0,
  apiKey: GOOGLE_API_KEY,
});

//add mem
const memory = new MemorySaver();
//const chatApp = workflow.compile({ checkpointer: memory });

const agent = createReactAgent({
  llm: llm,
  tools: agentTools,
  checkpointSaver: memory,
})

app.post('/api/chat', async (req, res) => {

  try {
    const { message, walletKey } = req.body;
    console.log('Processing message for wallet:', walletKey);

    console.log("user message = ", message);
  
    /*
    const input = [
    {
      role: "user",
      content: message,
    },
  ];*/

    // Execute the chatapp
    console.log("invoking...");
    const result = await agent.invoke(
      { messages: [new HumanMessage(message)] },
      { configurable: {thread_id: 42 } },
  );

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

app.post('/api/check-token', async (req, res) => {
  try {

    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    const { walletKey } = req.body;  // Get publicKey from request body

    if (!walletKey) {
      return res.status(400).json({ error: 'Public key is required' });
    }

    console.log('checking with helius');
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletKey),
      { mint: NEWP_MINT_ADDR }
    );

    const hasNEWP = tokenAccounts.value.length > 0 && 
      tokenAccounts.value.some(
        (account) => account.account.data.parsed.info.tokenAmount.uiAmount > 0
      );

    return res.json({ hasToken: hasNEWP });
    //set false for test
    //return res.json({ hasToken: false });

    
  } catch (error) {
    console.error('Error checking NEWP balance:', error);
    return res.status(500).json({ error: 'Failed to check token balance' });
  }
});

// For Vercel  export app
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
}

export default app