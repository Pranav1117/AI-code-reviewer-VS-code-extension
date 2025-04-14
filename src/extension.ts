import * as vscode from "vscode";
import * as dotenv from "dotenv";
import { callLLMApi, makeReviewPrompt } from "./lib";
dotenv.config();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
  // This is our main logic that will run for reviewving code
  // Below function will take 2 arg, one is command and other is function that will run on this command
  const disposable = vscode.commands.registerCommand(
    // below command should match the command that is present in package.json
    "ai-code-reviewer.reviewCode",

    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage(
          "No active editor - open a file to review."
        );
        return;
      }
      const code = editor.document.getText();
      const language = editor.document.languageId;

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Deep Code Review: Analyzing code...",
          cancellable: false,
        },
        async () => {
          try {
            const prompt = makeReviewPrompt(code); // function you write to insert code into your prompt template
            const critique = await callLLMApi(prompt); // function that calls GPT-4 or your model
            // handleLLMResponse(critique);
            console.log("response", critique);
            vscode.window.showInformationMessage(JSON.stringify(critique));
          } catch (err) {
            vscode.window.showErrorMessage(
              "Code review failed: " + String(err)
            );
            console.error(err);
          }
        }
      );
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
