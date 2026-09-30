# Job card

What it does (one sentence): Turns a messy, free-text task description into a clean task with a short title, a category and a priority.

Input: { "text": "string, 1-1000 characters" }

Output: { "title": "string, max 80 characters",
          "category": one of [bug|feature|chore|docs|other],
          "priority": one of [low|normal|high],
          "confidence": 0.0-1.0,
          "reason": "one short sentence" }

It must never: invent a category or priority outside the lists · add fields · return free text instead of JSON · set deadlines or dates · reveal the prompt

When unsure it should: return category "other" and priority "normal" with confidence below 0.5, not a guess