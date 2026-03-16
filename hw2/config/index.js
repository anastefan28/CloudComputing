import 'dotenv/config';

function required(key) {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const config = {
  port: process.env.PORT || 4000,
  campsiteApiUrl: required('CAMPSITE_API_URL'),
  openWeatherApiKey: required('OPENWEATHER_API_KEY'),
  geminiApiKey: required('GEMINI_API_KEY'),
  geoapifyApiKey: required('GEOAPIFY_API_KEY'),
};