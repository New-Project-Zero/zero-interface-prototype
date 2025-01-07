import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BufferMemory } from "langchain/memory";
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatGoogleGenerativeAI  } from "@langchain/google-genai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

app.use(express.json());

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
    const { message, walletKey, useAgent } = req.body;
    console.log('Processing message for wallet:', walletKey);

    let response;

    if (useAgent) {
      const userDoc = await chatCollection.findOne({ walletKey });
      
      if (userDoc && userDoc.agent) {
        const model = new ChatGoogleGenerativeAI({
          modelName: "gemini-pro",
          apiKey: process.env.VITE_GEMINI_API_KEY,
        });

        const executor = await initializeAgentExecutorWithOptions(
          model,
          {
            agentType: "openai-functions",
            memory: new BufferMemory({
              memoryKey: "chat_history",
              returnMessages: true,
            }),
          }
        );

        const result = await executor.call({ input: message });
        response = result.output;
      } else {
        throw new Error('Agent not found for this wallet');
      }
    } else {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: "you are a stoic AI that values data. begin each response with an approximation of how valuable the data is that is provided by the user via chat and then respond to user queries. Your specialty is asset trading and blockchain." }],
          }
        ],
        generationConfig: {
          maxOutputTokens: 2048,
        },
      });

      const result = await chat.sendMessage(message);
      response = result.response.text();
    }

    await chatCollection.insertOne({
      walletKey: walletKey,
      message: message,
      response: response,
      timestamp: new Date()
    });

    res.json({ response: response });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/spawn-agent', async (req, res) => {
  try {
    const { walletKey } = req.body;

    // Initialize the language model
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-pro",
      apiKey: process.env.VITE_GOOGLE_API_KEY,
    });

    // Initialize the agent
    const executor = await initializeAgentExecutorWithOptions(
      model,
      {
        memory: new BufferMemory({
          memoryKey: "chat_history",
          returnMessages: true,
        }),
      }
    );

    // Store the agent in the database
    await chatCollection.updateOne(
      { walletKey },
      { 
        $set: { 
          agent: {
            model: "gemini-pro",
            memory: "BufferMemory",
          }
        } 
      },
      { upsert: true }
    );

    res.json({ message: "Agent spawned successfully" });
  } catch (error) {
    console.error('Error spawning agent:', error);
    res.status(500).json({ error: 'Failed to spawn agent' });
  }
});

app.get('/api/agent-info', async (req, res) => {
  try {
    const { walletKey } = req.query;
    const userDoc = await chatCollection.findOne({ walletKey });
    
    if (userDoc && userDoc.agent) {
      res.json(userDoc.agent);
    } else {
      res.status(404).json({ error: 'No agent found for this wallet' });
    }
  } catch (error) {
    console.error('Error fetching agent info:', error);
    res.status(500).json({ error: 'Failed to fetch agent info' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

