import fetch from 'node-fetch';
import { config } from '../config/index.js';

const BASE = 'https://api.openweathermap.org/data/2.5';

export async function getWeatherByCoords(lat, lon) {
  const url = `${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${config.openWeatherApiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenWeatherMap error ${res.status}: ${text}`);
  }

  const data = await res.json();

  return {
    temp: Math.round(data.main.temp),
    feels_like: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    description: data.weather[0].description,
    icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
    wind_speed: data.wind.speed,
    city: data.name,
  };
}

export async function getForecastByCoords(lat, lon) {
  const url = `${BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=40&appid=${config.openWeatherApiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenWeatherMap forecast error ${res.status}: ${text}`);
  }

  const data = await res.json();

  const byDay = {};
  for (const entry of data.list) {
    const date = entry.dt_txt.split(' ')[0];
    const hour = entry.dt_txt.split(' ')[1]; 
    if (!byDay[date] || hour === '12:00:00') {
      byDay[date] = {
        date,
        temp_max: Math.round(entry.main.temp_max),
        temp_min: Math.round(entry.main.temp_min),
        description: entry.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png`,
      };
    }
  }

  return Object.values(byDay).slice(0, 5); 
}

