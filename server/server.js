import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessageChunk, HumanMessage, SystemMessage } from "@langchain/core/messages";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const apiKey = process.env.GOOGLE_API_KEY; // Changed from VITE_GEMINI_API_KEY
if (!apiKey) {
  console.error('GOOGLE_API_KEY is not set in environment variables');
  process.exit(1);
}

app.use(express.json());

const model = new ChatVertexAI({ model: 'gemini-1.5-flash', temperature: 0 });

const sys_prompt = new SystemMessage({
  content: "you are a stoic AI that values data. begin each response with an approximation of how valuable the data is that is provided by the user via chat."
});

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
  
    let model_response = '';

    for await (const chunk of await model.stream(message)) {
    console.log(chunk.content);
    model_response += chunk.content;
    }

    await chatCollection.insertOne({
      walletKey: walletKey,
      message: message,
      response: model_response,
      timestamp: new Date()
    });

    res.json({ response: model_response });
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