import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { VertexAI } from "@langchain/google-vertexai";
import { ChatPromptTemplate, 
  MessagesPlaceholder 
} from "@langchain/core/prompts";
import { AgentExecutor } from "langchain/agents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
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

app.use(express.json());

const llm = new VertexAI({
  model: 'gemini-1.5-flash',
  temperature: 0
});

/*
// Create prompt template
const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", "You are a stoic AI that values data. Begin each response with an approximation of how valuable the data is that is provided by the user via chat."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"]
]);
*/

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
//define call model function
const callModel = async (state) => {
  const response = await llm.invoke(state.messages);
  return {messages: response};
};

//new graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("model", callModel)
  .addEdge(START, "model")
  .addEdge("model", END);

//add mem
const memory = new MemorySaver();
const chatApp = workflow.compile({ checkpointer: memory});

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
    const result = await chatApp.invoke({ messages: input }, config);

    console.log(result.messages[result.messages.length - 1]);

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