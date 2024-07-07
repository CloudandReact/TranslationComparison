import express from "express";
import mysql from "mysql2";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import * as deepl from "deepl-node";
import pool from "./db.js";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"], // This is the default and can be omitted
});
const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});
const authKey = process.env["DEEPL_KEY"]; // Replace with your key
const translator = new deepl.Translator(authKey);

function getLanguageCode(languageName) {
  const languageCodes = {
    english: "EN",
    french: "FR",
    italian: "IT",
    japanese: "JA",
    spanish: "ES",
    arabic: "AR", //not yet on API
    mandarin: "ZH",
    hindi: "HI", // not yet on API
    // Add more languages as needed
  };

  return languageCodes[languageName.toLowerCase()];
}

async function evaluateTranslations(translations) {
  // we are going to need to get a point score for each
  const gptModels = ["gpt-3.5-turbo"]; // "gpt-4o"];
  const claudeModels = ["claude-3-5-sonnet-20240620"]; //"claude-3-5-sonnet-20240620,claude-3-sonnet-20240229,claude-3-haiku-20240307"
  let modelEvaluations = [];
  for (const translation of translations) {
    for (const model of gptModels) {
      const evaluationResult = await evaluateModel(model, translation);
      modelEvaluations.push({
        inputModel: translation.model,
        inputText: translation.inputText,
        outputText: translation.translation,
        model: model,
        evaluation: evaluationResult,
      });
    }
    for (const model of claudeModels) {
      const evaluationResult = await evaluateModel(model, translation);
      modelEvaluations.push({
        inputModel: translation.model,
        inputText: translation.inputText,
        outputText: translation.translation,
        model: model,
        evaluation: evaluationResult,
      });
    }
  }
  return modelEvaluations;
}
async function correctGrammarAndSpelling(modelChoice, message, formData) {
  const response = await openai.chat.completions.create({
    model: modelChoice,
    messages: [
      {
        role: "user",
        content: `Please correct basic grammar and spelling errors, and make the following text clearer: ${message}.`,
      },
    ],
    temperature: parseFloat(formData.temperatureValue), // closer to 0 more serious closer to 1 less serious 0.3
    max_tokens: 100, // force it to be more concise
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  });
  return response.choices[0].message.content.trim();
}
function extractValidJson(result) {
  // Attempt to directly parse the result in case it's already valid JSON
  try {
    const parsedJson = JSON.parse(potentialValidJson);
    return JSON.stringify(parsedJson);
  } catch (error) {
    // If parsing fails, try to find the start of a valid JSON object
    let validStartIndex = result.indexOf('{');
    while (validStartIndex !== -1) {
      try {
        // Attempt to parse from the current '{' to the end of the string
        const potentialValidJson = result.substring(validStartIndex);
        const parsedJson = JSON.parse(potentialValidJson);
        return JSON.stringify(parsedJson);
      } catch (error) {
        // If parsing fails, look for the next '{' in the string
        validStartIndex = result.indexOf('{', validStartIndex + 1);
      }
    }
    // If no valid JSON object was found, return null or throw an error
    return null; // Or throw new Error("Valid JSON not found.");
  }
}

// Usage example with the 'result' variable
try {
  const validJson = extractValidJson(result);
  console.log("Extracted valid JSON:", validJson);
} catch (error) {
  console.error("Failed to extract valid JSON:", error.message);
}
async function evaluateModel(modelChoice, translation) {
  const language = translation.language;
  let result = {};
  const evaluationPrompt = `Evaluate the accuracy of the provided ${language} translation on a scale from 1 to 10, independently of any errors in the English text. Be generous with partial credit.Infer context and criteria from the English text.
  Provide your response in valid correct JSON,with two attributes score and comment. 
  The comment element of json should be brief , insightful and less than 15 words:
    English: ${translation.inputText}
    ${language}:${translation.translation}`;
  if (modelChoice.includes("gpt")) {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: evaluationPrompt }],
      model: modelChoice,
      temperature: parseFloat(translation.temperatureValue),
      max_tokens: 150,
      frequency_penalty: 0.0,
    });
    result = chatCompletion.choices[0].message.content;
  } else {
    const response = await anthropic.messages.create({
      max_tokens: 150,
      messages: [{ role: "user", content: evaluationPrompt }],
      model: modelChoice,
      temperature: parseFloat(translation.temperatureValue),
    });
    result = response.content[0].text;
  }
  console.log(result);
  return extractValidJson(result);
}
async function translateText(formData, model) {
  const language = formData.language;
  const correctGrammar = formData.synthesize;
  const modelChoice = model;
  var message = formData.message;
  if (correctGrammar) {
    message = correctGrammarAndSpelling(modelChoice, message, formData);
  }
  var output = "";
  const fixWeirdResponse =
    "Please correct any spelling errors in the text without mentioning them, and then translate the text.";
  const systemPrompt =
    `You are a skilled translator. Correct any typos in the English while translating it into ${language}, ensuring the translation is accurate and natural.` +
    fixWeirdResponse;
  if (modelChoice.includes("gpt")) {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: message },
      ],
      model: modelChoice,
      temperature: parseFloat(formData.temperateValue),
      max_tokens: 120,
      frequency_penalty: 0.0,
    });
    output = chatCompletion.choices[0].message.content;
  } else if (modelChoice.includes("claude")) {
    const claudeSystemPrompt = `You are a highly skilled translator with expertise in many languages. Your task is to identify the language of the text I provide and accurately translate it inferring context and tone into the target language ${language} while preserving the meaning, tone, and nuance of the original text. Please maintain proper grammar, spelling, and punctuation in the translated version. Just provide the translated text`;

    const response = await anthropic.messages.create({
      max_tokens: 120,
      messages: [{ role: "user", content: message }],
      model: modelChoice,
      system: systemPrompt,
      temperature: parseFloat(formData.temperatureValue),
    });

    output = response.content[0].text;
  } else {
    const result = await translator.translateText(
      message,
      "en",
      getLanguageCode(language.toLowerCase())
    );
    output = result.text;
  }

  const query = `
    INSERT INTO PromptData (SystemPrompt, Prompt, Output, context, model, language)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  pool.query(
    query,
    [
      systemPrompt,
      formData.message,
      output,
      JSON.stringify(formData),
      formData.modelChoice,
      language,
    ],
    (err, result) => {
      if (err) throw err;
      console.log("Data inserted successfully.");
    }
  );
  return output;
}

async function saveValidatedTranslations(validatedTranslations) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertQuery = `
      INSERT INTO validated_translations (id, input_model, input_text, output_text, model, evaluation)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;`;
    const id = uuidv4();
    for (const translation of validatedTranslations) {
      const { inputModel, inputText, outputText, model, evaluation } =
        translation;
      // Generate a new UUID for each translation
      const res = await client.query(insertQuery, [
        id,
        inputModel,
        inputText,
        outputText,
        model,
        JSON.stringify(evaluation),
      ]);
      console.log("Inserted translation with ID:", res.rows[0].id);
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
const app = express();
app.use(cors());
app.use(express.json());

app.post("/translate", async (req, res) => {
  const formData = req.body;
  const translatedText = await translateText(formData, formData.modelChoice);
  res.json({ translate: translatedText });
  console.log("sent data to frontend");
});

app.post("/compareTranslate", async (req, res) => {
  const formData = req.body;
  //console.log(formData);
  let translations = [];
  for (const model of formData.selectedModels) {
    // Simulate translation for demonstration, replace with actual translation logic
    const translatedText = await translateText(formData, model);
    const textToTranslate = formData.message;
    translations.push({
      model: model,
      inputText: textToTranslate,
      translation: translatedText,
      language: formData.language,
      temperatureValue: formData.temperatureValue,
    });
  }
  // console.log(translations);
  const validatedTranslations = await evaluateTranslations(translations);
  saveValidatedTranslations(validatedTranslations);

  res.json({ validatedTranslations: validatedTranslations });
  console.log("sent data to frontend");
});

app.listen(8800, () => {
  console.log("Connected to backend.");
});
