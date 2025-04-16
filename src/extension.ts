import * as vscode from "vscode";
import * as dotenv from "dotenv";
import { callLLMApi, makeReviewPrompt } from "./lib";
dotenv.config();

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
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
      const document = editor.document;

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Deep Code Review: Analyzing code...",
          cancellable: false,
        },
        async () => {
          try {
            const prompt = makeReviewPrompt(code);
            const critique = await callLLMApi(prompt);
            // Strip Markdown code block and parse JSON
            const data = critique.candidates[0].content.parts[0].text;
            const cleaned = data.replace(/^```json\s*/, "").replace(/```$/, "");
            const parsed = JSON.parse(cleaned);
            const issues = parsed["🐞 Issues & Bugs"];

            if (!issues || !Array.isArray(issues)) {
              vscode.window.showWarningMessage(
                "No issues found in the critique."
              );
              return;
            }

            const diagnostics: vscode.Diagnostic[] = [];

            for (const issue of issues) {
              const buggyCode = issue["buggy_code"];
              console.log("critique", buggyCode);
              const description = issue.description || "Potential issue found.";

              if (!buggyCode) continue;

              const linesToFind = buggyCode
                .trim()
                .split("\n")
                .map((l) => l.trim());

              for (let i = 0; i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text.trim();

                // Single-line match
                if (
                  linesToFind.length === 1 &&
                  lineText.includes(linesToFind[0])
                ) {
                  const start = document.lineAt(i).text.indexOf(linesToFind[0]);
                  const range = new vscode.Range(
                    i,
                    start,
                    i,
                    start + linesToFind[0].length
                  );

                  const diagnostic = new vscode.Diagnostic(
                    range,
                    description,
                    vscode.DiagnosticSeverity.Warning
                  );
                  diagnostic.code = "dummyFix";
                  diagnostics.push(diagnostic);
                }

                // Multi-line match
                if (
                  linesToFind.length > 1 &&
                  i + linesToFind.length <= document.lineCount
                ) {
                  const multiLine = [];
                  for (let j = 0; j < linesToFind.length; j++) {
                    multiLine.push(document.lineAt(i + j).text.trim());
                  }

                  if (
                    JSON.stringify(multiLine) === JSON.stringify(linesToFind)
                  ) {
                    const range = new vscode.Range(
                      i,
                      0,
                      i + linesToFind.length,
                      document.lineAt(i + linesToFind.length - 1).text.length
                    );

                    const diagnostic = new vscode.Diagnostic(
                      range,
                      description,
                      vscode.DiagnosticSeverity.Warning
                    );
                    diagnostic.code = "dummyFix";
                    diagnostics.push(diagnostic);
                  }
                }
              }
            }

            const diagnosticCollection =
              vscode.languages.createDiagnosticCollection("ai-reviewer");
            diagnosticCollection.set(document.uri, diagnostics);

            vscode.window.showInformationMessage(
              "Code review complete. Hover over squiggly lines for details."
            );
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

  // Optional: register a dummy quick fix provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider("*", {
      provideCodeActions(document, range, context, token) {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
          if (diagnostic.code === "dummyFix") {
            const fix = new vscode.CodeAction(
              "🛠️ Dummy fix (does nothing)",
              vscode.CodeActionKind.QuickFix
            );
            fix.diagnostics = [diagnostic];
            fix.edit = new vscode.WorkspaceEdit(); // empty edit
            actions.push(fix);
          }
        }

        return actions;
      },
    })
  );
}

export function deactivate() {}
