import express, { response } from 'express';
import { MongoClient } from 'mongodb';
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
import CryptoHandler from './cryptoHandler.js'
//const CryptoHandler = require('./cryptoHandler');

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
//  helius getTokenAccounts for holdr count. 
// use ether.js/webjs to get ERC tokens and ETH data

//conversation class (refactor this)
class Conversation {
  constructor() {
    this.conversations = [];
  }

  addConversation(input, response) {
    // Add validation to ensure input and response are not undefined or null.
    if (input === undefined || input === null || response === undefined || response === null) {
        throw new Error("Input and response cannot be undefined or null.");
    }
    
    const timestamp = new Date();
    this.conversations.push({ input, response, timestamp });
  }

  getConversations() {
    return this.conversations;
  }

  toJSON() {
    // Properly serialize the timestamp to a string representation.
    return JSON.stringify(this.conversations, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2); // Use 2 spaces for pretty printing
  }
}

// new conversation:
const conversationStore = new Conversation();

function isValidWalletAddress(address) {
  // Regular expression to match Solana wallet addresses
  const walletAddressRegex = /^[\w]{43,44}$/;

  return walletAddressRegex.test(address);
}

function isValidContractAddress(address) {
  // Regular expression to match Solana contract addresses
  const contractAddressRegex = /^[\w]{32,44}$/; 

  return contractAddressRegex.test(address);
}

async function fetchWalletInformation(pubKey) {
  try {
    const walletInfoStruct = {
      balance: 0,
      SPLholdings: [], //five max
    };
  
    //SOL balance check
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
          pubKey,
        ]
      }),
  })
  const lamportData = await walletLamportBalanceJSON.json();
 
  //fill struct
  walletInfoStruct.balance = lamportData.result.value / LAMPORTS_PER_SOL;

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
          "owner": pubKey,
    }
    }),
  });
  const SPLtokensjson = await walletSPLTokenHoldings.json();
 
  // get each token (5 max)
  for (const token of SPLtokensjson.result.token_accounts) {
    const tokenMetadata = await fetchTokenMetadata(token.mint);
    
    if (!tokenMetadata || !token.mint || !token.amount || !tokenMetadata.symbol) {
      continue; // Skip to the next token if any of these are null
      }

      //fix decimals
      //get total number of tokens held in wallet
      //console.log("symbol: ", tokenMetadata.symbol);
      //console.log("decimals:  ", tokenMetadata.decimals);
    const symbol = tokenMetadata.symbol || "Unknown";
    const tokenBalance = (token.amount / (10 ** tokenMetadata.decimals));
    const price = (tokenMetadata.price);
    const tokenBalanceValue = (price * tokenBalance || 0).toFixed(2);

    walletInfoStruct.SPLholdings.push({
      symbol: symbol,
      mint_address: token.mint,
      balance: tokenBalance,
      price: price,
      balanceValue: tokenBalanceValue
    })
    /*if (walletInfoStruct.SPLholdings.length >= 5) {
      break; // Exit the loop if we've processed 5 tokens
    }*/

  }
  return walletInfoStruct;
  } catch (error) {
    console.error('Error fetching wallet information: ', error);
    return null;
  }
}

async function fetchTokenMetadata(mintAddr) {
  try {
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
  //console.log(tokenMetaData);

  return {
    decimals: tokenMetaData?.result?.token_info?.decimals ?? null,
    price: tokenMetaData?.result?.token_info?.price_info?.price_per_token ?? null,
    symbol: tokenMetaData?.result?.token_info?.symbol ?? null,
    imageLink: tokenMetaData?.result?.content?.links?.image ?? null,
    };
  } catch (error) {
    console.error('Error fetching token metadata: ', error);
    return null;
  }
}

const tavilyTool = new TavilySearchResults({ 
  maxResults: 3,
  apiKey: TAVILY_API_KEY,
  name: "web search tool"
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
  description: "when a user inquires about NEWP, newp, New Project Zero, Zero Version Man, the plans for the future of the project, implementation or anything else related to New Project Zero you will analyze this text block and return a summary about Newp Project Zero, the 0verman or the $NEWP token."
}
);

/* need to get set up w birdeye creator
const checkCreatorToolSchema = z.object({
  mintAddr: z.string()
});

const checkCreatorTool = tool( async (mintAddr) => {

  //const otherTokenMints = []; //holds array of other tokens created by this pubkey

  const splMetaJSON = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "jsonrpc": "2.0",
      "id": "test",
      "method": "searchAssets",
      "params": {
        "supplyMint": mintAddr.mintAddr
      }
    }),
});

const tokenInfo = await splMetaJSON.json();
//const creatorWalletPubKey = tokenInfo.result.token_info;
//for (const account of tokenInfo.result.value.account) 
console.log("account json: ", tokenInfo);

return "hello";
}, {
  name: "tokenCreatorCheckTool",
  description: "this tool takes as input a SPL token mint address. It calls Helius api to retrieve the creator public key associated with that token and then determines if that public key is responsible for other token crerations. It then retrieves the information about the other tokens and determines if the wallet pubkey has participated in the creation of tokens that ended up with low liquidity or other actrivity indicating a history of scams.",
  schema: checkCreatorToolSchema,
});*/

const walletBalanceCheckerSchema = z.object({
  wallet: z.string()
});

  //walletInfoTool
const walletBalanceChecker = tool( async (pubkey) => {
  return fetchWalletInformation(pubkey.wallet);
}, {
  name: "balanceChecker",
  description: "this tool takes as input a public wallet key for a solana wallet. it calls the fetchWalletInfo function which returns a struct with information about the SOL balance and token info. present this nicely formatted.",
  schema: walletBalanceCheckerSchema,
}
);

const agentTools = [tavilyTool, walletBalanceChecker, newpInfo];
const toolNode = new ToolNode(agentTools);

//connect to db
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

/*
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

app.post('/api/load-chat', async (req, res) => {
  const conversation = [];

  //loop through and encrypt each piece and then store
  try {
    const walletKey = req.body.walletKey;

    if (typeof walletKey !== 'string') {
      return res.status(400).json({ error: 'Invalid walletKey format. Must be a string.' });
    }

    const data = await chatCollection.find({ walletKey: walletKey }, { sort: { ObjectID: -1 } }).toArray((err, docs) => {
      if (err) throw err;
      console.log(JSON.stringify(docs, null, 2));
    });

    for (const chat of data){
      const toDecrypt = chat.encryptedData;

      const decoded = await CryptoHandler.decrypt(toDecrypt, walletKey);

      conversation.push(decoded)
      }

      //console.log(conversation);
    res.json({
      conversation // send array back
    });
  } catch (error) {
  res.status(500).json({
    error: 'Failed to decrypt chat',
    details: error instanceof Error ? error.message : String(error)
  });
}
});

// take wallet pubkey and use it to save whole message history as encrypted block in db
app.post('/api/save-chat', async (req, res) => {
    //loop through and encrypt each piece and then store
    try {
      const walletKey = req.body.walletKey;

      if (typeof walletKey !== 'string') {
        return res.status(400).json({ error: 'Invalid walletKey format. Must be a string.' });
      }

      const convo = conversationStore.getConversations();

      if (!convo || !Array.isArray(convo)) {
        return res.status(400).json({ error: 'Invalid conversation data.' });
      }

      const encryptedDocs = [];
      for (const chat in convo){
        const { input, response, timestamp } = convo[chat];

        const dataToEncrypt = { input, response, timestamp };

        const encryptedData = await CryptoHandler.encrypt(
            dataToEncrypt,
            walletKey
          );

        encryptedDocs.push({
          walletKey: walletKey.toString(),
          encryptedData: encryptedData.toString(),
        });  
      }

      await chatCollection.insertMany(encryptedDocs);

      //await decode(encryptedDocs.pop().encryptedData, walletKey);

      res.json({
        response: "Chat History saved successfully!" // Frontend expects response as a simple string
      });
    } catch (error) {
    res.status(500).json({
      error: 'Failed to save encrypted chat',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/chat', async (req, res) => {

  try {
    const { message, walletKey } = req.body;

    // Execute the chatapp
    console.log("invoking...");
    const result = await chatApp.invoke(
      { messages:
        [new HumanMessage(message)] },
      { configurable: {thread_id: 42 } },
  );

  const model_response = result.messages[result.messages.length - 1].content;

  conversationStore.addConversation(message, model_response, new Date());
  
    res.json({
      response: model_response // Frontend expects response as a simple string
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/contract', async (req, res) => {
  // Sanitize input
  const mintAddr = req.body.inputValue;

  if (!isValidContractAddress(mintAddr)) {
    return res.status(400).json({error: 'invalid contract address format'});
  }

  const data = {
    mintAddr: mintAddr,
    symbol: '',
    price: 0,
    imageLink: '',
  };

  // Get metadata using the function
  const updatedData = await fetchTokenMetadata(data.mintAddr);

  // Merge the updated data with the original object
  const mergedData = { ...data, ...updatedData };

  // Return the merged data as JSON
  return res.json(mergedData);
});

app.post('/api/publicKey', async (req, res) => {
  //sanitize...
  const pubKey = req.body.inputValue;
  if (!isValidWalletAddress(pubKey)) {
    return res.status(400).json({error: 'invalid wallet public key format'});
  }
  const data = {
    pubkey: pubKey,
    balance: '',
    SPLholdings: []
  }
  const updatedData = await fetchWalletInformation(data.pubkey);
  const mergedData = { ...data, ...updatedData};
  //console.log(mergedData);
  return res.json(mergedData);
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