# Tossive — AI Coding Assistant for VS Code

Tossive is an AI coding assistant that works inside Visual Studio Code. Describe what you want to build or change, and Tossive helps turn that request into a project plan, files, and practical next steps—all from a compact panel on the right side of the editor.

## What Tossive can do

- **Plan an app from your requirements.** Tossive summarizes the requirements, proposes a project structure and architecture, and records a consistent coding style for the generated files.
- **Create project files and folders.** New files are generated in the open VS Code workspace. Tossive creates them after it has prepared the project and its file contents.
- **Review and update selected files.** Add workspace files and request a review or change. The panel shows findings and per-file line counts; choose **Diff** to inspect changes, then **Accept** or **Cancel**. Tossive does not replace selected existing files until you accept.
- **Show a concise change summary.** See the changed file list and added/removed line counts, open a per-file diff, and undo files Tossive created or changes it applied while those files remain untouched afterward.
- **Help you run the project.** Tossive lists setup and run commands. The Terminal action places a command in the terminal for you to review; you decide whether to execute it.
- **Use files from the open workspace.** Choose files through **+ Add files** without browsing for them in a separate file picker.
- **Keep generated source out of the chat panel.** The panel focuses on the plan, progress, review findings, file changes and next steps. Code stays in workspace files; choose **Diff** to inspect changes in the editor.

## Getting started

Open the Tossive icon in VS Code's right-side Secondary Side Bar. Ask a coding question, describe an app you want Tossive to create, or use **+ Add files** to select existing files for context. For project generation, keep the request focused on the first useful version; Tossive creates up to 20 files in one generation.

## Your files and privacy

Tossive sends your prompt and the text of files you explicitly select to its configured service for model responses. The combined selected-file content limit is 200 KB per request. Unselected file contents are not sent. Do not select files containing credentials, secrets or information you do not want sent for processing.

New project files are written into the currently open workspace. Existing selected files are changed only after you choose **Accept**. Setup commands are never executed automatically.

## Requirements

Visual Studio Code 1.106 or newer is required for the right-side Secondary Side Bar.

## Conversation storage

Conversation history is stored locally in VS Code on this computer. The panel shows an animated three-dot activity cue with labels while Tossive thinks, reviews, plans or generates files. Messages older than 2 days are moved to the local restore history and can be restored for 2 more days. Use **Clear chat** to move the current conversation to restore history, or **Restore chat** to bring back the most recently cleared or expired conversation.
