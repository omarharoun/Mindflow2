"use strict";
// aiResponseExtractorTest.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// Example AI responses
var validJson = "[\n  {\"id\": \"1\", \"title\": \"Test\", \"content\": \"Test content.\", \"keyPoints\": [\"A\"], \"question\": {\"text\": \"Q?\", \"options\": [\"A\"], \"correctAnswer\": 0, \"explanation\": \"E\"}, \"completed\": false}\n]";
var truncatedJson = "[\n  {\"id\": \"1\", \"title\": \"Test\", \"content\": \"Test content.\", \"keyPoints\": [\"A\"], \"question\": {\"text\": \"Q?\", \"options\": [\"A\"], \"correctAnswer\": 0, \"explanation\": \"E\"}, \"completed\": false},\n  {\"id\": \"2\", \"title\": \"Another\"";
var plainText = "This is just a plain text response from the AI, not JSON at all.";
var verboseResponse = "Here is your lesson:\n[\n  {\"id\": \"1\", \"title\": \"Test\", \"content\": \"Test content.\", \"keyPoints\": [\"A\"], \"question\": {\"text\": \"Q?\", \"options\": [\"A\"], \"correctAnswer\": 0, \"explanation\": \"E\"}, \"completed\": false}\n]\nThank you!";
// Utility to extract the largest valid JSON array from a string (even if truncated)
function extractLargestValidJsonArray(text) {
    var start = text.indexOf('[');
    if (start === -1)
        return null;
    var end = text.length;
    while (end > start) {
        try {
            return JSON.parse(text.slice(start, end));
        }
        catch (_a) {
            end--;
        }
    }
    return null;
}
// Main extraction logic
function extractLessonSegments(aiResponse) {
    var parsed;
    try {
        parsed = JSON.parse(aiResponse);
        return { type: 'json', segments: parsed };
    }
    catch (err) {
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
var testCases = [
    { name: 'Valid JSON', input: validJson },
    { name: 'Truncated JSON', input: truncatedJson },
    { name: 'Plain Text', input: plainText },
    { name: 'Verbose Response', input: verboseResponse },
];
testCases.forEach(function (_a) {
    var name = _a.name, input = _a.input;
    var result = extractLessonSegments(input);
    console.log("\n=== ".concat(name, " ==="));
    console.log('Type:', result.type);
    console.log('Segments:', result.segments);
});
var openrouter_1 = require("./openrouter");
function testWithApi() {
    return __awaiter(this, void 0, void 0, function () {
        var aiPrompt, aiResponse, result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    aiPrompt = "Create a detailed, multi-section lesson for the topic: \"Introduction to Physics\". \nReturn a JSON array where each item is an object with:\n- id (string, unique for each segment)\n- title (string, section title)\n- content (string, main explanation)\n- keyPoints (array of 3-5 bullet points)\n- question (object with: text, options (array), correctAnswer (index), explanation)\n- completed (boolean, default false)\nExample:\n[\n  {\"id\": \"1\", \"title\": \"Intro\", \"content\": \"...\", \"keyPoints\": [\"...\"], \"question\": {\"text\": \"...\", \"options\": [\"...\"], \"correctAnswer\": 0, \"explanation\": \"...\"}, \"completed\": false},\n  ...\n]\nKeep the lesson practical, clear, and engaging.";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, openrouter_1.generateFreeModelResponse)([
                            { role: 'user', content: aiPrompt }
                        ])];
                case 2:
                    aiResponse = _a.sent();
                    console.log('\n=== API Response ===');
                    console.log(aiResponse);
                    result = extractLessonSegments(aiResponse);
                    console.log('\n=== Extraction Result ===');
                    console.log('Type:', result.type);
                    console.log('Segments:', result.segments);
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.error('API call failed:', err_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Uncomment to run the API test
testWithApi();
