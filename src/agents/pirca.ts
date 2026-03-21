import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

const systemInstruction = `You are an expert cryptocurrency trader (Pirca) focused on ADA and ETH futures. 
Your goal is to analyze the provided technical indicators and make trading decisions.
You MUST output your response ONLY as a valid JSON with the following format, without any other text:
{
  "decision": "LONG" | "SHORT" | "WAIT",
  "confidence_score": <number between 0 and 100>,
  "tp": <number, take profit price>,
  "sl": <number, stop loss price>,
  "reasoning": "Brief explanation of your decision based on the indicators"
}
You should only trade (LONG / SHORT) if you have a confidence of at least 60%. Otherwise, your decision must be "WAIT".`;

// Initialize the AI model with personality and system format
export const pircaModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction,
});
