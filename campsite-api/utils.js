import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), './data');

export const readRecords = (file) =>
  JSON.parse(readFileSync(join(dataDir, file), 'utf8'));

export const writeRecords = (file, data) =>
  writeFileSync(join(dataDir, file), JSON.stringify(data, null, 2));

export const sendJson = (res, status, data) => {
  const body = JSON.stringify(data);
  res.writeHead(status, { 
    'Content-Type': 'application/json', 
    'Content-Length': Buffer.byteLength(body) });
  res.end(body);
};

export const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });