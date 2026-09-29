import type { Plugin, ViteDevServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export function chromaForgeApiPlugin(): Plugin {
  return {
    name: 'chromaforge-api-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        // Helper to send JSON responses
        const sendJson = (statusCode: number, data: unknown) => {
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        // Helper to parse JSON body
        const getBody = async (): Promise<any> => {
          return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch (e) {
                reject(e);
              }
            });
            req.on('error', reject);
          });
        };

        try {
          // 1. Ollama Status Check
          if (req.url === '/api/ollama/status' && req.method === 'GET') {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 2000);
              const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
              const response = await fetch(`${ollamaUrl}/api/tags`, {
                signal: controller.signal,
              });
              clearTimeout(timeout);

              if (response.ok) {
                const data = await response.json();
                return sendJson(200, {
                  connected: true,
                  endpoint: ollamaUrl,
                  models: (data.models || []).map((m: any) => m.name || m.model),
                });
              } else {
                return sendJson(200, {
                  connected: false,
                  endpoint: ollamaUrl,
                  models: [],
                  error: `HTTP ${response.status}`,
                });
              }
            } catch (err: any) {
              return sendJson(200, {
                connected: false,
                endpoint: 'http://localhost:11434',
                models: [],
                error: err.message || 'Cannot connect to Ollama',
              });
            }
          }

          // 2. Ollama Generate Proxy (Optimized for JSON grammar & complete token output)
          if (req.url === '/api/ollama/generate' && req.method === 'POST') {
            const body = await getBody();
            const { prompt, model = 'llama3.2', system } = body;
            const ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';

            try {
              const response = await fetch(`${ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model,
                  prompt,
                  system: system || 'You are an expert 3D parametric CAD modeling and multi-material 3D printing engineer specialized in Blender Python (bpy) and Anycubic Kobra 3 ACE Pro multi-color slicing.',
                  format: 'json',
                  options: {
                    temperature: 0.2,
                    num_predict: 4096,
                  },
                  stream: false,
                }),
              });

              if (!response.ok) {
                const errText = await response.text();
                return sendJson(500, { error: `Ollama error: ${errText}` });
              }

              const data = await response.json();
              return sendJson(200, data);
            } catch (err: any) {
              return sendJson(500, { error: `Failed to reach Ollama: ${err.message}` });
            }
          }

          // 3. Gemini Server-Side Generation Endpoint
          if (req.url === '/api/ai/generate-model' && req.method === 'POST') {
            const body = await getBody();
            const { prompt, filamentSlots = [], printerType = 'kobra3' } = body;

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              return sendJson(500, {
                error: 'GEMINI_API_KEY not configured on server.',
              });
            }

            const ai = new GoogleGenAI({
              apiKey: apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const filamentInfo = filamentSlots.map((f: any) =>
              `Slot ${f.id}: "${f.name}" (${f.color}, ${f.material})`
            ).join('\n');

            const systemInstruction = `You are ChromaForge AI, an expert 3D parametric computational geometry engineer, master biological sculptor, and Anycubic multi-color 3D printing specialist.
The user wants to generate a 3D model for 3D printing on an ${printerType === 'kobra3' ? 'Anycubic Kobra 3 (with ACE Pro 4-to-8 multi-color system)' : 'Anycubic Kobra X multi-material'}.
Available Filaments:
${filamentInfo}

When the user asks for nature, biological organisms, animals, amphibians, reptiles, plants, flowers, mushrooms, fungi, insects, shells, crystals, fossils, or realistic organic objects, you MUST design highly realistic, lifelike, anatomically sculpted multi-part models using "geometryType": "organic_mesh" with specialized "organicType" values.

You must return valid JSON ONLY (without markdown fence or backticks) matching this exact JSON schema:
{
  "name": "Model Name",
  "description": "Detailed description of the lifelike anatomy and multi-material construction",
  "dimensions": { "x": number, "y": number, "z": number }, // in mm (fit inside 250x250x260mm bed)
  "segments": [
    {
      "id": "segment-1",
      "name": "Component Name (e.g. Sculpted Dorsal Torso, Amber Eye Iris, Parabolic Petal)",
      "filamentId": number (between 1 and 8),
      "geometryType": "organic_mesh" | "box" | "cylinder" | "sphere" | "torus" | "cone",
      "transform": {
        "position": [x, y, z], // center in mm
        "rotation": [rx, ry, rz], // in radians
        "scale": [sx, sy, sz]
      },
      "parameters": {
        "width": number,
        "height": number,
        "depth": number,
        "radius": number,
        "radiusTop": number,
        "radiusBottom": number,
        "tube": number,
        "organicType": "frog_body" | "frog_limb" | "butterfly_wing" | "butterfly_body" | "nautilus_shell" | "feather_plumage" | "petal" | "rock_pedestal" | "organic_eye" | "branch_bark" | "leaf_vein" | "smooth_anatomy" | "fossil_spiral" | "chameleon_tail" | "mushroom_cap" | "mushroom_stem" | "succulent_rosette" | "crystal_cluster" | "beetle_elytra" | "coral_branch" | "pinecone_scale" | "tree_trunk_bark" | "tortoise_shell",
        "finish": "organic_skin" | "matte_feather" | "glossy_chitin" | "mineral_stone" | "botanical_petal" | "fleshy_succulent" | "crystalline_quartz" | "translucent_resin"
      }
    }
  ],
  "blenderPythonScript": "Complete runnable Python script using import bpy that creates all parts, sets Principled BSDF materials with RGB matching the filaments, adds Subsurface Scattering or Clearcoat for realism, and separates them for Anycubic multi-material 3MF export.",
  "slicingOptimizationTips": [
    "Tip regarding bed contact, stability pedestal, or flush volume on Anycubic Kobra 3",
    "Tip regarding layer orientation and lifelike surface finish"
  ]
}
Design high quality, visually recognizable, cohesive multi-material assemblies (at least 5 to 8 distinct geometric components or accent layers). Always provide a flat base (pedestal rock, perch branch, or flattened base) so the print adheres securely to the print bed without detached overhangs.`;

            try {
              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: `Design a multi-color 3D printable model based on this prompt: "${prompt}". Ensure it leverages multiple filaments effectively and produces clean multi-part geometry.`,
                config: {
                  systemInstruction,
                  responseMimeType: 'application/json',
                },
              });

              const textOutput = response.text || '';
              try {
                const parsed = JSON.parse(textOutput);
                return sendJson(200, parsed);
              } catch (parseErr) {
                return sendJson(200, {
                  raw: textOutput,
                  message: 'Generation completed with raw text output.',
                });
              }
            } catch (geminiErr: any) {
              console.warn('Gemini API call returned error, enabling client-side procedural fallback:', geminiErr.message);
              return sendJson(200, {
                error: geminiErr.message,
                quotaExceeded: geminiErr.message?.includes('quota') || geminiErr.message?.includes('resource_exhausted'),
                useFallback: true,
              });
            }
          }

          // 4. Prompt Optimizer Endpoint (Refines natural language prompt into optimal Anycubic ACE Pro CAD prompt)
          if (req.url === '/api/ai/optimize-prompt' && req.method === 'POST') {
            const body = await getBody();
            const { prompt = '', filamentCount = 8 } = body;

            const apiKey = process.env.GEMINI_API_KEY;
            if (apiKey && prompt.trim()) {
              try {
                const ai = new GoogleGenAI({
                  apiKey,
                  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
                });
                const res = await ai.models.generateContent({
                  model: 'gemini-3.8-flash',
                  contents: `The user wants to 3D print: "${prompt}".
Refine and optimize this prompt into a technical, high-precision 3D CAD modeling prompt for an Anycubic Kobra 3 with ACE Pro (${filamentCount} colors).
Ensure it specifies:
1. Exact multi-material layer breakdown (up to ${filamentCount} distinct contrasting colors for body, accents, and features).
2. Broad, flat bed contact (pedestal rock, branch perch, or flattened base) for 100% bed adhesion.
3. Natural anatomical curvature or mechanical tolerances.
Keep the optimized prompt to 2-3 concise, dense sentences. Return ONLY the refined prompt text without preamble or quotes.`,
                });
                const optimizedText = (res.text || '').trim();
                if (optimizedText) {
                  return sendJson(200, { optimizedPrompt: optimizedText });
                }
              } catch (e) {
                // Fallback to local rule-based optimizer
              }
            }

            // High-speed rule-based algorithmic prompt optimization
            const isSwedish = /[åäöÅÄÖ]|och|med|på|en|ett|för|giftgroda|svamp|snäcka/i.test(prompt);
            let opt = '';
            if (isSwedish) {
              opt = `Naturtrogen parametrisk 3D-modell: "${prompt.trim()}". Detaljerad flerfärgskonstruktion för Anycubic Kobra (ACE Pro upp till ${filamentCount} färger) med bred stabil bottenplatta mot PEI-plattan, kontrasterande färgzoner för ögon och texturer samt skiktvis färgoptimering för att minimera spolspill.`;
            } else {
              opt = `Hyper-realistic parametric 3D model: "${prompt.trim()}". Sculpted multi-material assembly for Anycubic Kobra ACE Pro (${filamentCount} channels) with a broad planar bed contact pedestal, contrasting anatomical color accents, and layer-optimized color transitions to minimize purge waste.`;
            }
            return sendJson(200, { optimizedPrompt: opt });
          }

          // 5. Blender Bridge status check (checks if local Blender script is listening)
          if (req.url === '/api/blender/status' && req.method === 'GET') {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 1500);
              const response = await fetch('http://localhost:8008/status', {
                signal: controller.signal,
              });
              clearTimeout(timeout);
              if (response.ok) {
                const data = await response.json();
                return sendJson(200, { connected: true, data });
              }
            } catch (e) {
              // Blender bridge not active on localhost:8008
            }
            return sendJson(200, {
              connected: false,
              message: 'Blender listener not detected on localhost:8008. Use the 1-click Python script in Blender Scripting tab.',
            });
          }

          // 6. Blender Direct Execute Bridge (sends Python script directly into running Blender session)
          if (req.url === '/api/blender/send' && req.method === 'POST') {
            const body = await getBody();
            const { script, model } = body;

            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 3000);
              const response = await fetch('http://localhost:8008/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script, model }),
                signal: controller.signal,
              });
              clearTimeout(timeout);

              if (response.ok) {
                const data = await response.json();
                return sendJson(200, { success: true, message: 'Script executed in Blender!', result: data });
              } else {
                return sendJson(500, { error: `Blender listener returned HTTP ${response.status}` });
              }
            } catch (err: any) {
              return sendJson(200, {
                success: false,
                connected: false,
                message: 'Could not connect to Blender on localhost:8008. Paste the script directly into Blender Scripting tab or start the ChromaForge Blender Bridge listener.',
              });
            }
          }

          return next();
        } catch (error: any) {
          return sendJson(500, { error: error.message || 'Server error' });
        }
      });
    },
  };
}
