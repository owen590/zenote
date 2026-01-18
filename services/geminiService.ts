import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  // First try to get API key from localStorage
  const apiKeyFromLocalStorage = localStorage.getItem('zenote_gemini_api_key');
  
  // Fallback to environment variable for backward compatibility
  const apiKey = apiKeyFromLocalStorage || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured. Please set it in the app's Gemini settings.");
    return null;
  }
  
  return new GoogleGenAI({ apiKey });
};

// Detect language of the provided text
export const detectLanguage = async (text: string): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
      // Default to English if AI not configured
      return "English";
    }
    
    const prompt = `Please detect the language of the following text. Return only the language name (e.g., English, Chinese, Spanish, etc.).
    
    Text:
    ${text.substring(0, 1000)}`; // Only use first 1000 chars for efficiency
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return (response.text || "English").trim();
  } catch (error) {
    console.error("Error detecting language:", error);
    // Default to English on error
    return "English";
  }
};

export const summarizeNote = async (content: string, language: string = "English"): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
      return "AI service not configured. Please add your Gemini API key to use this feature.";
    }
    const prompt = `Please provide a concise summary of the following note content in ${language}. Keep it within 3-5 bullet points if possible. 
    
    Note Content:
    ${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Error summarizing note:", error);
    return "Error connecting to AI service.";
  }
};

export const polishText = async (content: string, language: string = "English"): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
      return content; // Return original content if AI not configured
    }
    const prompt = `Please polish the following text to make it more professional, clear, and grammatically correct in ${language}, while maintaining the original meaning. Return only the polished text.

    Text:
    ${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || content;
  } catch (error) {
    console.error("Error polishing text:", error);
    return content; // Return original on error
  }
};

export const continueText = async (content: string, language: string = "English"): Promise<string> => {
  try {
    const ai = getClient();
    if (!ai) {
      return ""; // Return empty string if AI not configured
    }
    const prompt = `Please continue writing the following text in ${language} in a natural, coherent way. Maintain the same style and tone as the original. Continue for about 1-2 paragraphs.

    Text:
    ${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || ""; // Return empty string on error or if no continuation
  } catch (error) {
    console.error("Error continuing text:", error);
    return ""; // Return empty string on error
  }
};