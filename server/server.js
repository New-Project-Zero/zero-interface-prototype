import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MongoClient } from 'mongodb';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Ensure API key is set
const apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

app.use(cors());
app.use(express.json());

// MongoDB connection setup
const uri = 'mongodb://localhost:27017'; // Replace with your MongoDB connection string
const client = new MongoClient(uri);
const dbName = 'chatstorage'; // Replace with your preferred database name
const collectionName = 'chats'; // Replace with your preferred collection name

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

const chatCollection = await connectToDatabase(); // Connect to the database

app.post('/api/chat', async (req, res) => {
  try {
    const { message, walletKey } = req.body;
    console.log('Processing message for wallet:', walletKey);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "you are a stoic AI that values data. begin each response with an approximation of how valuable the data is that is provided by the user via chat." }],
        }
      ],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Save the chat to MongoDB
    await chatCollection.insertOne({
      walletKey: walletKey,
      message: message,
      response: text,
      timestamp: new Date()
    });

    res.json({ response: text });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get('/api/package-chats', async (req, res) => {
  try {
    const chats = await chatCollection.find({}).toArray();
    console.log(chats);

    // Construct CSV content
    let csvData = 'input,output\n'; // Add header row
    chats.forEach(chat => {
      csvData += `"${chat.message.replace(/"/g, '""')}","${chat.response.replace(/"/g, '""')}"\n`;
    });

    fs.writeFileSync('chat_dataset.csv', csvData);

    console.log('Chat dataset packaged successfully!');
    res.download('chat_dataset.csv', 'chat_dataset.csv', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download chat dataset' });
      } else {
        fs.unlinkSync('chat_dataset.csv'); // Delete the file after download
      }
    });
  } catch (error) {
    console.error('Error packaging chat dataset:', error);
    res.status(500).json({ error: 'Failed to package chat dataset' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});