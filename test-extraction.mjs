import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert at extracting structured product information from manufacturer spec sheets.
You specialize in camera equipment: cameras, lenses, flashes, tripods, etc.

Given raw manufacturer text, extract and return JSON with:
1. specs: Array of spec groups, each with a heading and lines of title/text pairs
2. highlights: Array of key marketing bullet points (5-8 items)
3. included: Array of what's in the box (title and optional link)
4. featured: Array of 5 key specs for quick reference (title and value)

Return only valid JSON.`;

const testSpecs = `
Canon EOS R5 Mark II

IMAGING
- 45MP Full-Frame CMOS Sensor
- DIGIC X + DIGIC Accelerator Processors
- Native ISO 100-51200 (Exp. to 102400)
- Up to 30 fps Electronic Shutter
- 8K 60p Raw Internal Recording

AUTOFOCUS
- Dual Pixel CMOS AF II
- 1053 Auto AF Zones
- Advanced Subject Detection (People, Animals, Vehicles, Aircraft)
- Eye Detection for People and Animals
- -6.5 EV Low-Light Detection

VIDEO
- 8K 60p / 4K 120p Recording
- Canon Log 2 and 3, HDR PQ
- 12-Bit Raw Internal

BODY
- 5-Axis IBIS (Up to 8.5 Stops)
- 5.76m-Dot OLED EVF, 120 fps
- 3.2" Vari-Angle Touchscreen
- Dual CFexpress/SD Card Slots

IN THE BOX
- Canon EOS R5 Mark II Body
- LP-E6P Battery
- LC-E6 Battery Charger
- USB-C Cable
- Camera Strap
`;

async function test() {
  console.log("Testing AI extraction with Canon R5 Mark II specs...\n");
  
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: "Extract structured product content from:\n\n" + testSpecs }
    ]
  });

  const result = JSON.parse(response.choices[0].message.content);
  console.log(JSON.stringify(result, null, 2));
  
  console.log("\n--- Summary ---");
  console.log(`Spec groups: ${result.specs?.length || 0}`);
  console.log(`Highlights: ${result.highlights?.length || 0}`);
  console.log(`In the box items: ${result.included?.length || 0}`);
  console.log(`Featured specs: ${result.featured?.length || 0}`);
}

test().catch(console.error);
