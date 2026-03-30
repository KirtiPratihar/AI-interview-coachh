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

// FIX: Use Vite's import.meta.env for frontend/browser compatibility
const ai = new GoogleGenAI({ 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" 
});

export async function generateQuestions(difficulty: string, topic: string): Promise<InterviewQuestion[]> {
  const response = await ai.models.generateContent({
    // FIX: Using stable 1.5-flash for reliability and speed
    model: "gemini-1.5-flash", 
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
    // FIX: Switched to 2.0-flash (stable) for text-to-speech features if available, 
    // or keep flash-preview if 2.5 is restricted in your region.
    model: "gemini-1.5-flash", 
    contents: [{ parts: [{ text: `Read this interview question clearly: ${text}` }] }],
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
  // FIX: Limit snapshots to the last 3-4 to prevent Payload Too Large errors
  const limitedSnapshots = snapshots.slice(-4);

  const parts: any[] = [
    { text: `Analyze this interview response for the question: "${question}". 
    Evaluate the answer's correctness, the speaker's confidence level, signs of nervousness (like fidgeting, lack of eye contact), and provide a summary of strengths and improvements.
    Return the analysis in JSON format.` },
    // Use whatever mimeType your MediaRecorder produced (usually webm or mp4)
    { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
  ];

  limitedSnapshots.forEach((img: string) => {
    // Ensure we only send the base64 string, not the data:image/jpeg;base64 prefix
    const base64Data = img.includes(",") ? img.split(",")[1] : img;
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
  });

  const response = await ai.models.generateContent({
    // FIX: Using stable 1.5-flash. gemini-3-flash-preview can be unstable for large uploads.
    model: "gemini-1.5-flash", 
    contents: { parts },
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