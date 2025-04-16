import axios from "axios";
import * as vscode from "vscode";
const geminiApiKey = process.env.GEMINI_API_KEY;

const basePrompt = `
You're an expert software engineer and code reviewer. Carefully review the following code.

Respond in the following **structured format**:

## ✅ Summary:
- General overview of code quality and intent.

## 🐞 Issues & Bugs:
- For each bug:
 - the buggy code snippet (short, inline if possible)
- a short description of the issue

Each "fixes" item should include:
- the corrected version of the buggy code
- a short explanation of the fix

Return only a JSON object

Example:

// ❌ Problematic code
const sum = (a, b) => a + b

// ✅ Suggested fix
function sum(a: number, b: number): number {
  return a + b;
}
## 🚀 Optimization Suggestions:
- [List performance or readability improvements]

## 📏 Best Practices & Code Style:
- [List any deviations from common best practices, suggest improvements]

## 🧼 Clean Code & Maintainability:
- [Suggest how to improve code readability and maintainability]

## ✅ Final Verdict:
- If everything is fine, say: "No issues found. Code looks clean and well-written."

Please give specific examples and explanations. If there's nothing to improve, mention that clearly.

Here is the code to review: `;

export const makeReviewPrompt = (code: string) => {
  return `${basePrompt} ${code}`;
};

export const callLLMApi = async (prompt: string) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
  // const url = `http://localhost:3001/dummyres/`;
  const payload = {
    contents: [
      {
        parts: [{ text: `${prompt}` }],
      },
    ],
  };
  try {
    const initialResponse = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      // @ts-ignore
      // body: JSON.stringify(payload),
    });

    // const response = await initialResponse.json();
    console.log(initialResponse.data);
    return initialResponse.data;
  } catch (error) {
    console.log("error", error);
  }
};
export const findBuggyRanges = (
  document: vscode.TextDocument,
  buggySnippets: string[]
) => {
  const ranges: { snippet: string; range: vscode.Range }[] = [];

  for (let snippet of buggySnippets) {
    const lines = snippet.split("\n").map((line) => line.trim());

    for (let i = 0; i < document.lineCount; i++) {
      const lineText = document.lineAt(i).text.trim();

      if (lines.length === 1 && lineText.includes(lines[0])) {
        // Single-line bug
        ranges.push({
          snippet,
          range: new vscode.Range(
            i,
            lineText.indexOf(lines[0]),
            i,
            lineText.indexOf(lines[0]) + lines[0].length
          ),
        });
      } else if (lines.length > 1) {
        // Multi-line bug: check a range of lines
        const matchLines = document
          .getText(new vscode.Range(i, 0, i + lines.length, 0))
          .split("\n")
          .map((l) => l.trim());
        if (JSON.stringify(matchLines) === JSON.stringify(lines)) {
          ranges.push({
            snippet,
            range: new vscode.Range(i, 0, i + lines.length, 0),
          });
        }
      }
    }
  }

  return ranges;
};
