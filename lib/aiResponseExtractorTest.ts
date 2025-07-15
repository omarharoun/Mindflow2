import 'dotenv/config';
// aiResponseExtractorTest.ts

// Example AI responses
const validJson = `[
  {"id": "1", "title": "Test", "content": "Test content.", "keyPoints": ["A"], "question": {"text": "Q?", "options": ["A"], "correctAnswer": 0, "explanation": "E"}, "completed": false}
]`;

const truncatedJson = `[
  {"id": "1", "title": "Test", "content": "Test content.", "keyPoints": ["A"], "question": {"text": "Q?", "options": ["A"], "correctAnswer": 0, "explanation": "E"}, "completed": false},
  {"id": "2", "title": "Another"`;

const plainText = `This is just a plain text response from the AI, not JSON at all.`;

const verboseResponse = `Here is your lesson:
[
  {"id": "1", "title": "Test", "content": "Test content.", "keyPoints": ["A"], "question": {"text": "Q?", "options": ["A"], "correctAnswer": 0, "explanation": "E"}, "completed": false}
]
Thank you!`;

// Utility to extract the largest valid JSON array from a string (even if truncated)
function extractLargestValidJsonArray(text: string): any[] | null {
  const start = text.indexOf('[');
  if (start === -1) return null;
  let end = text.length;
  while (end > start) {
    try {
      return JSON.parse(text.slice(start, end));
    } catch {
      end--;
    }
  }
  return null;
}

// Utility to extract NDJSON (newline-delimited JSON objects)
function extractNDJSON(text: string): any[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('{') && line.endsWith('}'))
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(obj => obj !== null);
}

// Utility to extract a single JSON object from a string
function extractSingleObject(text: string): any | null {
  const match = text.match(/{[\s\S]*}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

// Utility to extract JSON between <output>...</output> tags
function extractJsonBetweenTags(text: string): string | null {
  const match = text.match(/<output>([\s\S]*?)<\/output>/i);
  return match ? match[1].trim() : null;
}

const ndjsonResponse = `
{"id": "1", "title": "Section 1", "content": "..."}
{"id": "2", "title": "Section 2", "content": "..."}
{"id": "3", "title": "Section 3", "content": "..."}
`;

console.log('\n=== NDJSON Test ===');
const ndjsonSegments = extractNDJSON(ndjsonResponse);
console.log('Segments:', ndjsonSegments);

const singleSectionResponse = `{
  "id": "section1",
  "title": "What Are Supernovae?",
  "content": "A supernova is a powerful explosion of a star. It marks the end of a star's life cycle and can outshine entire galaxies for a short time.",
  "keyPoints": [
    "End of a star's life",
    "Extremely bright explosion",
    "Creates heavy elements"
  ],
  "question": {
    "text": "What is a supernova?",
    "options": [
      "A new star forming",
      "A star exploding",
      "A planet being destroyed",
      "A black hole forming"
    ],
    "correctAnswer": 1,
    "explanation": "A supernova is the explosion of a star at the end of its life cycle."
  },
  "completed": false
}`;

console.log('\n=== Single Section Test ===');
const singleSection = extractSingleObject(singleSectionResponse);
console.log('Section:', singleSection);

// Main extraction logic
function extractLessonSegments(aiResponse: string) {
  let parsed;
  try {
    parsed = JSON.parse(aiResponse);
    return { type: 'json', segments: parsed };
  } catch (err) {
    parsed = extractLargestValidJsonArray(aiResponse);
    if (parsed) {
      return { type: 'partial-json', segments: parsed };
    }
    // Fallback: treat the whole response as a single lesson segment
    return {
      type: 'raw',
      segments: [
        {
          id: 'fallback',
          title: 'AI Lesson (Raw Text)',
          content: aiResponse,
          keyPoints: [],
          question: {
            text: '',
            options: [],
            correctAnswer: 0,
            explanation: ''
          },
          completed: false
        }
      ]
    };
  }
}

// Test cases
const testCases = [
  { name: 'Valid JSON', input: validJson },
  { name: 'Truncated JSON', input: truncatedJson },
  { name: 'Plain Text', input: plainText },
  { name: 'Verbose Response', input: verboseResponse },
];

testCases.forEach(({ name, input }) => {
  const result = extractLessonSegments(input);
  console.log(`\n=== ${name} ===`);
  console.log('Type:', result.type);
  console.log('Segments:', result.segments);
});

import { generateFreeModelResponse } from './openrouter';

async function testWithApi() {
  const aiPrompt = `Create a detailed, multi-section lesson for the topic: "Introduction to Physics". \nReturn a JSON array where each item is an object with:\n- id (string, unique for each segment)\n- title (string, section title)\n- content (string, main explanation)\n- keyPoints (array of 3-5 bullet points)\n- question (object with: text, options (array), correctAnswer (index), explanation)\n- completed (boolean, default false)\nExample:\n[\n  {\"id\": \"1\", \"title\": \"Intro\", \"content\": \"...\", \"keyPoints\": [\"...\"], \"question\": {\"text\": \"...\", \"options\": [\"...\"], \"correctAnswer\": 0, \"explanation\": \"...\"}, \"completed\": false},\n  ...\n]\nKeep the lesson practical, clear, and engaging.`;
  try {
    const aiResponse = await generateFreeModelResponse([
      { role: 'user', content: aiPrompt }
    ]);
    console.log('\n=== API Response ===');
    console.log(aiResponse);
    const result = extractLessonSegments(aiResponse);
    console.log('\n=== Extraction Result ===');
    console.log('Type:', result.type);
    console.log('Segments:', result.segments);
  } catch (err) {
    console.error('API call failed:', err);
  }
}

// Uncomment to run the API test
testWithApi(); 

// Test: minimal prompt AI response
const minimalPromptResponse = '<output>{"test": "hello"}</output>';
console.log('\n=== Minimal Prompt Test ===');
const minimalJson = extractJsonBetweenTags(minimalPromptResponse);
if (minimalJson) {
  try {
    const parsed = JSON.parse(minimalJson);
    console.log('Extracted JSON:', parsed);
  } catch (e) {
    console.log('Failed to parse minimal JSON:', e);
  }
} else {
  console.log('No JSON found in minimal prompt response.');
} 