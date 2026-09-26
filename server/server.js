import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config({
  path: new URL("./.env", import.meta.url),
});

const app = express();

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.get("/", (_req, res) => {
  res.json({ message: "AURA AI server is running" });
});

async function generateRecommendation(prompt) {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        reasoning_effort: "high",
        max_completion_tokens: 65536,
        temperature: 0.7,
        top_p: 0.95,
        include_reasoning: false,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "aura_fitness_recommendation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                type: { type: "string" },
                duration: { type: "string" },
                difficulty: { type: "string" },
                reason: { type: "string" },
                nextGoal: { type: "string" },
              },
              required: [
                "title",
                "type",
                "duration",
                "difficulty",
                "reason",
                "nextGoal",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content) throw new Error("Groq returned an empty response.");
      return JSON.parse(content);
    } catch (error) {
      const status = error?.status;
      console.error(`Groq attempt ${attempt}/${MAX_RETRIES} failed:`, error?.message || error);

      if ([429, 500, 502, 503, 504].includes(status) && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        continue;
      }

      throw error;
    }
  }

  throw new Error("Groq request failed after all retries.");
}

app.post("/api/recommendation", async (req, res) => {
  try {
    const {
      age,
      sex,
      activityLevel,
      goal,
      activities,
      activeDays,
      streak,
      goalCompletion,
      previousActivity,
      previousActivityType,
    } = req.body;

    const prompt = `
You are AURA, a personalized fitness recommendation engine.

Generate exactly ONE realistic next fitness activity for this user.
Do not diagnose medical conditions, detect injuries, or provide medical treatment.
Keep every response field concise.

USER PROFILE
Age: ${age}
Sex: ${sex}
Current Fitness Level: ${activityLevel}
Primary Goal: ${goal}
Preferred Activities: ${activities?.join(", ") || "None specified"}

RECENT PROGRESS
Active Days: ${activeDays}
Current Streak: ${streak}
Goal Completion: ${goalCompletion}%
Previous Activity: ${previousActivity}
Previous Activity Type: ${previousActivityType}

RULES
- Match the activity to fitness level and goal.
- Prefer selected activities when practical.
- Consider recent consistency and the previous activity.
- Avoid unnecessarily intense recommendations for beginners.
- Recommend something the user can realistically perform.
- The result is the user's NEXT STEP, not a full workout program.
- Use concise strings.

Return only the required structured JSON object.
`;

    const recommendation = await generateRecommendation(prompt);
    console.log("AURA AI recommendation:", recommendation);
    res.json(recommendation);
  } catch (error) {
    console.error("AURA AI error:", error?.message || error);
    res.status(500).json({
      error: "Failed to generate AI recommendation.",
      details: error?.message || "Unknown error",
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log("=================================");
  console.log("AURA AI SERVER");
  console.log("=================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log("Model: openai/gpt-oss-120b");
  console.log("Reasoning: HIGH");
  console.log("Structured Output: ENABLED");
  console.log("Retry Handling: ENABLED");
  console.log("=================================");
});
