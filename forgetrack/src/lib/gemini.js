import OpenAI from 'openai';

const githubToken = import.meta.env.VITE_GITHUB_TOKEN;
const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

const isGithubModels = !!githubToken;

export const openRouter = new OpenAI({
  baseURL: isGithubModels 
    ? "https://models.inference.ai.azure.com" 
    : "https://openrouter.ai/api/v1",
  apiKey: isGithubModels 
    ? githubToken 
    : (openRouterApiKey || 'mock_key'),
  dangerouslyAllowBrowser: true,
});

export const DEFAULT_AI_MODEL = isGithubModels ? "gpt-4o-mini" : "google/gemini-2.5-flash";
