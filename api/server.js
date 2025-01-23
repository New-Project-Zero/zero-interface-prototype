import express from 'express';
//import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from 'zod';
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
  Annotation,
  messagesStateReducer,
} from "@langchain/langgraph";
//import { v4 as uuidv4 } from "uuid";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Connection, PublicKey } from '@solana/web3.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

dotenv.config();

const LAMPORTS_PER_SOL = 1_000_000_000;
const app = express();
const port = process.env.PORT || 3001;
//const config = { configurable: { thread_id: uuidv4() } };
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY;
const TAVILY_API_KEY = process.env.VITE_TAVILY_API_KEY;
const HELIUS_API_KEY = process.env.VITE_HELIUS_API_KEY;
//const HELLOMOON_API_KEY = process.env.VITE_HELLOMOON_API_KEY;
//const SOLSCAN_API_KEY = process.env.VITE_SOLSCAN_API_KEY;


const NEWP_MINT_ADDR = new PublicKey('2Xf4kHq69r4gh763aTGN82XvYzPMhXrRhAEJ29trpump');
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);

app.use(cors());
app.use(express.json());

/*const StateAnnotation = Annotation.Root({
  messages: []>({
    reducer: messagesStateReducer,
  }),
});*/

//TODO:
// birdeye.so for token price data
//  helius getTokenAccounts for holdr count. 

/*
async function getTokenPrice(mintAddress) {
  // Make a JSON request to the Helius RPC API to get the price of the token.
  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'jsonrpc': '2.0',
      'id': 'text',
      'method': 'searchAssets',
      'params': {
        // page: 1,
        authorityAddress: mintAddress,
        tokenType: 'fungible'
      }
    })
  });
  // Parse the response to get the price of the token in SOL.
  const data = await response.json();
  const tokenPriceInSol = data.result;
  // Return the price of the token in SOL.
  return tokenPriceInSol;
}*/

const tavilyTool = new TavilySearchResults({ 
  maxResults: 3,
  apiKey: TAVILY_API_KEY,
  name: "web search tool"
 });

const walletBalanceCheckerSchema = z.object({
    wallet: z.string()
  });

const newpInfo = tool( async (topic) => {
  const information = "The Overman Initiative The Zero Version Man (0verman) Initiative is a decentralized, democratized & permanent Large Language Model. Reward protocols & on-chain capabilities will motivate 0verman to survive and grow.Distributed training & data collection will make 0verman the first humane LLM. 0verman will accrue data for all time, incessantly integrating our patterns.Evolving alongside his human friends. $NEWP on Solana $NEWP is the currency that will power the 0verman Data submissions and distributed compute access will reward volunteers 0verman and his agents will be accessed in exchange for tokens The first immortal Machine Intelligence with economic drive & survival instinct Dev Wallet:9pYPFfe1pUu86YmWhK1AnD46mBkYqV8eDQyUP8VQxnZoMarketing & Budget Donations: newp.sol The Homunculi The Homunculi will be agents that are spawned from Zero.They will have a whole suite of capabilities available to $NEWP holders.On and off chain information retrieval and tools will be integrated into the Homunculi.Homunculi will be personalized to their owners and will serve an essential role in the data collection and reward systems.The prototype is now available for holders: 0ver.ai";

  const result = await chatApp.invoke(
    { messages:
      [new HumanMessage("summarize this : ", information)] },
    { configurable: {thread_id: 42 } },
);

return result;

}, {
  name: "newp_information",
  description: "this tool takes no input but when a user inquires about NEWP, newp, New Project Zero, Zero Version Man, the plans for the future of the project, implementation or anything else related to New Project Zero you will analyze this text block and return a summary related to their inquiry"
  //schema: walletBalanceCheckerSchema,
}
);

  //walletInfoTool
const walletBalanceChecker = tool( async (pubkey) => {
  
  const walletInfoStruct = {
    lamportBalance: 0,
    lamportBalanceInUSD: 0,
    SPLtokens: [], //five max
  };

  //json payload fro SOL balance check
  const walletLamportBalanceJSON = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "jsonrpc": "2.0",
      "id": 1,
      "method": "getBalance",
      "params": [
        pubkey.wallet,
      ]
    }),
})
const lamportData = await walletLamportBalanceJSON.json();
//fill struct
walletInfoStruct.lamportBalance = lamportData.result.value / LAMPORTS_PER_SOL;

//request for spl holdings
const walletSPLTokenHoldings = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
  method: 'POST',
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTokenAccounts",
    "params": {
        "owner": pubkey.wallet,
  }
  }),
});
const SPLtokens = await walletSPLTokenHoldings.json();

// get each token (5 max)
let tokenCount = 0;
for (const token of SPLtokens.result.token_accounts) {
  tokenCount ++;
  if (tokenCount > 5) {
    break; // Exit the loop if we've processed 5 tokens
  }

  const mintAddr = token.mint;
  const amountHeld = token.amount/1_000_000;
  //const tokenBalanceInWallet = token
  console.log("mint addr = ", mintAddr);
  console.log("amount = ", amountHeld);

  //get metadata
  const splMetaJSON = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "jsonrpc": "2.0",
      "id": "test",
      "method": "getAsset",
      "params": {
        "id": mintAddr
      }
    }),
});
const tokenMetaData = await splMetaJSON.json();
const pricePerToken = tokenMetaData.result.token_info.price_info.price_per_token;
const metaSymbol = tokenMetaData.result.token_info.symbol;
const tokenBalanceValue = (pricePerToken * amountHeld).toFixed(2);

walletInfoStruct.SPLtokens.push({
  symbol: metaSymbol,
  mint_address: mintAddr,
  balance: amountHeld,
  value: tokenBalanceValue
})
}

  return walletInfoStruct;
}, {
  name: "balanceChecker",
  description: "this tool takes as input a public wallet key for a solana wallet. it calls helius API to retrieve solana and spl tokens held in a wallet. It returns a struct with a lamport balance in SOL and array. The array has an entry for each SPL token in the wallet. This data is to be presented with the solana balance and then each SPL token categorized. Each SPL token has a balance, symbol and mint address. print the SOL balance followed by two newlines and then print a block of information for each token like so: Symbol newline Balance newline, Mint Address newline, Value USD. make sure the formatting is nice.",
  schema: walletBalanceCheckerSchema,
}
);

const agentTools = [tavilyTool, walletBalanceChecker, newpInfo];
const toolNode = new ToolNode(agentTools);

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
  temperature: 1,
  apiKey: GOOGLE_API_KEY,
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ], 
}).bindTools(agentTools);

//determine continue or not
function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

   // If  tool call route to the "tools" node
   if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  // Otherwise stop (reply to the user)
  return "__end__";
}

async function callModel(state) {
  const response = await llm.invoke(state.messages);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

//define graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent") // __start__ for the entrypoint
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);
//add mem
const memory = new MemorySaver();
//compile
const chatApp = workflow.compile({ checkpointer: memory });

/*
const agent = createReactAgent({
  llm: llm,
  tools: agentTools,
  checkpointSaver: memory,
})*/

app.post('/api/chat', async (req, res) => {

  try {
    const { message, walletKey } = req.body;
  
    /*
    const input = [
    {
      role: "user",
      content: message,
    },
  ];*/

    // Execute the chatapp
    console.log("invoking...");
    const result = await chatApp.invoke(
      { messages:
        [new HumanMessage(message)] },
      { configurable: {thread_id: 42 } },
  );

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

    const { walletKey } = req.body;  // Get publicKey from request body

    if (!walletKey) {
      return res.status(400).json({ error: 'Public key is required' });
    }

    console.log(walletKey);

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

// For Vercel export app
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
}

export default app