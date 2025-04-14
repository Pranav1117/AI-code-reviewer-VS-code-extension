const geminiApiKey = process.env.GEMINI_API_KEY;

const basePrompt = `
You're an expert software engineer and code reviewer. Carefully review the following code.

Respond in the following **structured format**:

## ✅ Summary:
- General overview of code quality and intent.

## 🐞 Issues & Bugs:
- [List each issue or bug, if any, with explanation]

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

  const payload = {
    contents: [
      {
        parts: [{ text: `${prompt}` }],
      },
    ],
  };

  try {
    const initialResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const response = await initialResponse.json();
    return response;
  } catch (error) {
    console.log("error", error);
  }
};
