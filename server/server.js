import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { VertexAI } from "@langchain/google-vertexai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor } from "langchain/agents";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";


dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

/*const apiKey = process.env.GOOGLE_API_KEY; // Changed from VITE_GEMINI_API_KEY
if (!apiKey) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
  process.exit(1);
}*/

app.use(express.json());

const llm = new VertexAI({
  model: 'gemini-1.5-flash',
  temperature: 0.5,
  streaming: false,
  maxOutputTokens: 2048
}).pipe(new StringOutputParser());

const magicTool = tool(
  async ({ input }) => {
    return `${input + 2}`;
  },
  {
    name: "magic_function",
    description: "Applies a magic function to an input.",
    schema: z.object({
      input: z.number(),
    }),
  }
);

// Create a simpler chat chain instead of an agent
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a stoic AI that values data. Begin each response with an approximation of how valuable the data is that is provided by the user via chat."],
  ["human", "{input}"]
]);

const tools = [magicTool];

const agent = RunnableSequence.from([
  prompt,
  llm,
  (output) => {
    return {
      response: output,
      timestamp: new Date()
    };
  }
]);

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

const chatCollection = await connectToDatabase();

app.post('/api/chat', async (req, res) => {

  try {
    const { message, walletKey } = req.body;
    console.log('Processing message for wallet:', walletKey);

    console.log("messages = ", message);
  
    // Execute the agent
    const result = await agent.invoke({
      input: message,
    });

    console.log("response = ", result);

    //console.log(model_response);
   /* await chatCollection.insertOne({
      walletKey: walletKey,
      message: message,
      response: model_response,
      timestamp: new Date()
    });*/

    res.json({
      response: result.response  // Frontend expects response as a simple string
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
  console.log(`Server is running on port ${port}`);
});