# AI Task Agent 🤖📋

An intelligent, highly automated task manager built on Google Apps Script and React. Powered by the Gemini 2.5 Flash model, this agent acts as your personal project manager—reading your raw "Brain Dump", setting exact due dates, grouping related sub-tasks, and seamlessly sorting everything into your Google Tasks lists.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## ✨ Key Features

*   **Intelligent Triage (The Funnel):** Throw messy, natural-language thoughts into your Brain Dump list. The AI reads the context and automatically moves them to the correct categorical list (e.g., *Personal & Health*, *Car Maintenance*, *Professional & Career*).
*   **Smart Merging (Semantic Deduplication):** The AI understands context. If you write "Book car service" and later write "Call mechanic for tires", it merges them into a single Master Task and combines the details into the Notes.
*   **Aggressive Nesting:** Automatically detects standalone tasks that belong together (e.g., "Confirm Hotel" and "Pack Sunscreen") and perfectly indents them as sub-tasks under a main parent project (e.g., "Jamaica Wedding Trip").
*   **Infinite Loop & Recurring Task Protection:** Fully armored against Google API constraints. The agent intelligently quarantines recurring tasks to prevent infinite cloning loops without crashing the system.
*   **Global Clean-Up Mode:** A deep-cleaning janitor mode that scans *all* your Google Tasks lists simultaneously to find hidden duplicates, merge overlapping items, and nest loose tasks.
*   **Action Required Panel:** The AI never permanently deletes tasks on its own. Merged or redundant items are flagged and sent to a visual dashboard queue where you have the final say to "Trash It" or "Keep It."
*   **Holiday Warnings:** Automatically checks public holidays for your specific region (US, GB, SE). If the AI schedules a task on a bank holiday, it flags it in the Activity Monitor.
*   **Background Autopilot:** Turn Autopilot ON, and the agent will wake up every hour, silently organize your Brain Dump, and go back to sleep.

---

## 📦 Dependencies & Prerequisites

Before you install, ensure you have the following:
1. A **Google Account** (to use Google Tasks and Google Apps Script).
2. A **Gemini API Key**. You can get a free API key from Google AI Studio ([Get it here](https://aistudio.google.com/)).
3. (Automated via Manifest) **Google Tasks API** and **Google Calendar API** access.

---

## 🚀 Setup & Installation

Follow these steps to deploy your own instance of the AI Task Agent.

### 1. Create the Project
1. Go to [Google Apps Script](https://script.google.com/) and click **New Project**.
2. Name the project "AI Task Agent".

### 2. Add the Code Files
You will need to copy three files from this repository into your Apps Script project:

*   **`Code.gs`**: Delete the default code in your script editor and paste the contents of `Code.gs`.
*   **`Index.html`**: Click the **+** icon next to "Files", select **HTML**, name it exactly `Index`, and paste the frontend code.
*   **`appsscript.json`**: 
    * Click the **Project Settings** (gear icon) on the left menu.
    * Check the box that says **"Show 'appsscript.json' manifest file in editor"**.
    * Go back to the Editor, click `appsscript.json`, and replace its contents with the JSON file from this repo. *(This automatically enables the required Google Tasks and Calendar APIs).*

### 3. Add Your API Key
1. Go to **Project Settings** (gear icon).
2. Scroll down to **Script Properties** and click **Add script property**.
3. Set the **Property** name to exactly: `GEMINI_API_KEY`
4. Set the **Value** to your actual Gemini API key.
5. Click **Save script properties**.

### 4. Deploy the App
1. Click the blue **Deploy** button in the top right corner and select **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Only myself** (for privacy).
5. Click **Deploy**, authorize the permissions when prompted, and open the generated Web App URL!

---

## 🛠️ How to Use

### The Daily Workflow
1. **Initial Setup:** Open the Web App, navigate to the **Settings** tab, and click **Setup Workspace**. This generates your default task categories in Google Tasks.
2. **The Brain Dump:** Open Google Tasks on your phone or desktop. Add all your messy thoughts into the "Brain Dump" list using natural language (e.g., "Call John next Tuesday about the Q3 report").
3. **Run the Agent:** Open the AI Task Agent console and click **Run**. Watch the Activity Monitor as the AI categorizes, dates, and merges your tasks.
4. **Review Flags:** If the AI merged tasks together, they will appear in the orange **Action Required** panel for you to approve ("Trash It") or decline ("Keep It").

---

## 🛑 Troubleshooting & App Logic

### The `[AI_PROCESSED]` Tag
To prevent the AI from repeatedly moving and re-processing the same tasks every time you run the script, the engine silently stamps a hidden `[AI_PROCESSED]` tag into the **Notes** section of every task it touches. 
* If a task has this tag, the AI will ignore it. 
* **Recurring Tasks:** If a recurring task gets stuck in your Brain Dump, the AI will quarantine it by stamping this tag on it so it doesn't cause an infinite duplication loop. *(Note: Always create recurring tasks directly in their permanent folders, not in the Brain Dump!)*

### Undo Processing (Soft Reset)
If you make a mistake, or if you want the AI to re-evaluate tasks it has already organized:
1. Go to the **Settings** tab.
2. Click **Undo Processing (Soft Reset)**.
3. This safely scrubs the `[AI_PROCESSED]` tag from every task in your Google Tasks without deleting the tasks themselves, allowing the AI to look at your entire workspace with fresh eyes on the next run.

### Factory Reset
Found in the Settings tab, this will turn off Autopilot and wipe the memory tags from all your tasks. It acts as a hard system reboot.

---
*Designed & Built by Samuel Smith • Open Source MIT License*
