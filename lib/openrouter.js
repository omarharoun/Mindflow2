"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openRouterAPI = exports.OpenRouterAPI = void 0;
exports.generateFreeModelResponse = generateFreeModelResponse;
var OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
var OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
if (!OPENROUTER_API_KEY) {
    throw new Error('Missing OpenRouter API key');
}
var OpenRouterAPI = /** @class */ (function () {
    function OpenRouterAPI() {
        this.apiKey = OPENROUTER_API_KEY;
        this.baseUrl = OPENROUTER_BASE_URL;
    }
    OpenRouterAPI.prototype.generateResponse = function (messages_1) {
        return __awaiter(this, arguments, void 0, function (messages, model) {
            var response, data, error_1;
            if (model === void 0) { model = 'anthropic/claude-3.5-sonnet'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch("".concat(this.baseUrl, "/chat/completions"), {
                                method: 'POST',
                                headers: {
                                    'Authorization': "Bearer ".concat(this.apiKey),
                                    'Content-Type': 'application/json',
                                    'HTTP-Referer': 'https://mindflow-app.com',
                                    'X-Title': 'MindFlow Learning App',
                                },
                                body: JSON.stringify({
                                    model: model,
                                    messages: __spreadArray([
                                        {
                                            role: 'system',
                                            content: "You are Nova, an AI learning assistant for MindFlow, a mobile learning platform. You help users learn new topics by:\n              \n              1. Breaking down complex concepts into digestible parts\n              2. Providing clear explanations with examples\n              3. Suggesting learning paths and resources\n              4. Encouraging users and tracking their progress\n              5. Adapting to different learning styles\n              \n              Keep responses concise but helpful, and always maintain an encouraging, friendly tone. Focus on practical learning advice and actionable next steps."
                                        }
                                    ], messages, true),
                                    max_tokens: 500,
                                    temperature: 0.7,
                                    top_p: 1,
                                    frequency_penalty: 0,
                                    presence_penalty: 0,
                                }),
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("OpenRouter API error: ".concat(response.status));
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        if (!data.choices || data.choices.length === 0) {
                            throw new Error('No response from OpenRouter API');
                        }
                        return [2 /*return*/, data.choices[0].message.content];
                    case 3:
                        error_1 = _a.sent();
                        console.error('OpenRouter API error:', error_1);
                        throw new Error('Failed to generate AI response');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    OpenRouterAPI.prototype.generateLearningPath = function (topic) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.generateResponse([
                                {
                                    role: 'user',
                                    content: "Create a structured learning path for \"".concat(topic, "\". Provide 5-7 specific steps or subtopics that would help someone learn this effectively. Return only the list items, one per line.")
                                }
                            ])];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response
                                .split('\n')
                                .filter(function (line) { return line.trim(); })
                                .map(function (line) { return line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim(); })
                                .filter(function (item) { return item.length > 0; })];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Error generating learning path:', error_2);
                        return [2 /*return*/, [
                                'Start with fundamentals',
                                'Practice basic concepts',
                                'Work on intermediate topics',
                                'Apply knowledge in projects',
                                'Review and reinforce learning'
                            ]];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return OpenRouterAPI;
}());
exports.OpenRouterAPI = OpenRouterAPI;
exports.openRouterAPI = new OpenRouterAPI();
function generateFreeModelResponse(messages) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.openRouterAPI.generateResponse(messages, "deepseek/deepseek-r1-0528:free")];
        });
    });
}
