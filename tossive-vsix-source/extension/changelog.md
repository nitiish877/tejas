## 0.2.6

- Limit guest use to three messages and open sign-in after the third message.
- Remove sign-out from the extension panel; disconnect editors from Tejas settings.

## 0.2.5

- Render headings, bold text, lists and inline code in assistant replies.
- Add whole-folder project context with environment-file warnings and secret-file exclusion.
- Open sign-in directly when no Tejas browser session exists.
- Run approved setup commands in the project terminal.

## 0.2.4

- Allow four guest messages before requiring a Tejas sign-in for continued use.
- Add Tejas account linking, browser-link copy fallback, and website-controlled editor disconnection.

## 0.2.3

- Show a non-spinner activity indicator and clear status labels while the assistant thinks, reviews, plans and generates files.
- Store conversation history locally in VS Code on this computer.
- Automatically move messages older than 2 days to local restore history; restore cleared or expired chats for the following 2 days.
- Add panel controls to clear and restore conversation history.


## 0.2.2

- Route selected-file reviews and fixes through the workspace change workflow.
- Show review findings, changed-file names and added/removed line counts without rendering source code in the panel.
- Add Diff, Accept, Cancel and Undo actions for file changes.
- Keep setup guidance in the panel and prepare terminal steps without showing command text there.

## 0.2.1

- Update the chat service connection.
- Keep the service address out of the README.
- Keep the 0.2.0 project generation, file review and undo workflow.

## 0.2.0

- Move Tossive into the Secondary Side Bar on the right.
- Choose added files from the currently open VS Code workspace.
- Generate app requirements, architecture, coding style, structure, source files and run steps from a build request.
- Automatically create new files and folders; require Accept/Cancel before replacing selected existing files.
- Show changed file counts and per-file diffs, with undo for created/applied changes.
- Prepare install/run commands in the terminal without executing them automatically.

## 0.1.2

- Connect chat to the Tossive backend and stream responses.

## 0.1.1

- Add a chat-first sidebar with a bottom composer and multiple selected-file chips.
- Send selected file text and recent conversation turns to the configured Tossive backend.
- Limit selected source context to 200 KB per request.
