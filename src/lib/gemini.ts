import { GoogleGenAI, Type, Modality } from "@google/genai";

export interface InterviewQuestion {
  id: number;
  text: string;
}

export interface InterviewFeedback {
  score: number;
  confidence: string;
  nervousness: string;
  strengths: string[];
  improvements: string[];
  overallSummary: string;
  answerCorrectness: string;
}

// Ensure your Vite env variable is exactly VITE_GEMINI_API_KEY
const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" 
});

export async function generateQuestions(difficulty: string, topic: string): Promise<InterviewQuestion[]> {
  const response = await ai.models.generateContent({
    // FIX: Upgraded to 2.5-flash for the latest API compatibility
    model: "gemini-2.5-flash", 
    contents: `Generate 5 ${difficulty} level interview questions about ${topic}. Return as a JSON array of objects with 'id' and 'text'.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.NUMBER },
            text: { type: Type.STRING },
          },
          required: ["id", "text"],
        },
      },
    },
  });
  return JSON.parse(response.text || "[]");
}

export async function speakQuestion(text: string): Promise<string | null> {
  const response = await ai.models.generateContent({
    // FIX: 2.5-flash is required for Modality.AUDIO
    model: "gemini-2.5-flash", 
    contents: `Read this interview question clearly: ${text}`, // Simplified syntax
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
}

export async function analyzeResponse(
  question: string,
  audioBase64: string,
  snapshots: string[]
): Promise<InterviewFeedback> {
  const limitedSnapshots = snapshots.slice(-4);

  const parts: any[] = [
    { text: `Analyze this interview response for the question: "${question}". 
    Evaluate the answer's correctness, the speaker's confidence level, signs of nervousness (like fidgeting, lack of eye contact), and provide a summary of strengths and improvements.
    Return the analysis in JSON format.` },
    { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
  ];

  limitedSnapshots.forEach((img: string) => {
    const base64Data = img.includes(",") ? img.split(",")[1] : img;
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
  });

  const response = await ai.models.generateContent({
    // FIX: Upgraded model
    model: "gemini-2.5-flash", 
    // FIX: Passed the array directly instead of wrapping it in an object
    contents: parts, 
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Score from 1 to 10" },
          confidence: { type: Type.STRING },
          nervousness: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          overallSummary: { type: Type.STRING },
          answerCorrectness: { type: Type.STRING, description: "Detailed feedback on whether the answer was right or wrong and why." },
        },
        required: ["score", "confidence", "nervousness", "strengths", "improvements", "overallSummary", "answerCorrectness"],
      },
    },
  });
  
  return JSON.parse(response.text || "{}");
}