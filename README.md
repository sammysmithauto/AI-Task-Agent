# AI Task Agent 🤖📋

An intelligent, highly automated task manager built on Google Apps Script and React. Powered by the Gemini API, this agent acts as your personal project manager—reading your raw "Brain Dump", setting exact due dates, grouping related sub-tasks, and seamlessly sorting everything into your Google Tasks lists.

## ✨ Key Features

*   **Intelligent Triage (The Funnel):** Throw messy, natural-language thoughts into your Brain Dump list. The AI reads the context and automatically moves them to the correct categorical list (e.g., Personal & Health, Car Maintenance, Professional & Career).
*   **Smart Merging (Semantic Deduplication):** The AI understands context. If you write "Book car service" and later write "Call mechanic for tires", it merges them into a single Master Task and combines the details into the Notes.
*   **Aggressive Nesting:** Automatically detects standalone tasks that belong together (e.g., "Confirm Hotel" and "Pack Sunscreen") and perfectly indents them as sub-tasks under a main parent project (e.g., "Jamaica Wedding Trip").
*   **Infinite Loop & Recurring Task Protection:** Fully armored against Google API constraints. The agent intelligently quarantines recurring tasks to prevent infinite cloning loops without crashing the system.
*   **Global Clean-Up Mode:** A deep-cleaning janitor mode that scans *all* your Google Tasks lists simultaneously to find hidden duplicates, merge overlapping items, and nest loose tasks.
*   **Action Required Panel:** The AI never permanently deletes tasks on its own. Merged or redundant items are flagged and sent to a visual dashboard queue where you have the final say to "Trash It" or "Keep It."
*   **Holiday Warnings:** Automatically checks public holidays for your specific region (US, GB, SE). If the AI schedules a task on a bank holiday, it flags it in the Activity Monitor.
*   **Background Autopilot:** Turn Autopilot ON, and the agent will wake up every hour, silently organize your Brain Dump, and go back to sleep.

---

## 🚀 Setup & Installation

### 1. Google Workspace Setup
1. Go to [Google Apps Script](https://script.google.com/) and create a New Project.
2. Replace the default code in `Code.gs` with the backend engine code from this repository.
3. Create a new HTML file named `Index.html` and paste the frontend React code into it.

### 2. API Keys & Properties
1. Go to **Project Settings** (the gear icon on the left).
2. Scroll down to **Script Properties** and click "Add script property".
3. Add the following key:
   * **Property:** `GEMINI_API_KEY`
   * **Value:** *(Your actual Gemini API Key)*

### 3. Deployment
1. Click **Deploy > New Deployment** in the top right.
2. Select **Web App** as the type.
3. Execute as: **Me**.
4. Who has access: **Only myself**.
5. Click **Deploy**, authorize the permissions, and open the generated Web App URL.

---

## 🛠️ How to Use

1. **Initial Setup:** Open the app, navigate to the **Settings** tab, and click **Setup Workspace**. This generates your default task categories in Google Tasks.
2. **The Brain Dump:** Open Google Tasks on your phone or desktop. Add all your messy thoughts into the "Brain Dump" list using natural language (e.g., "Call John next Tuesday about the Q3 report").
3. **Run the Agent:** Open the AI Task Agent console and click **Run**. Watch the Activity Monitor as the AI categorizes, dates, and merges your tasks.
4. **Direct Log Access:** Click the **"View Developer Logs ↗"** button in the Activity Monitor to jump straight into the Google Apps Script execution logs for advanced debugging.

---

## 🛑 Troubleshooting & How the AI "Remembers"

### The `[AI_PROCESSED]` Tag
To prevent the AI from repeatedly moving and re-processing the same tasks every time you run the script, the engine silently stamps a hidden `[AI_PROCESSED]` tag into the **Notes** section of every task it touches. 
* If a task has this tag, the AI will ignore it. 
* *Note: If a recurring task gets stuck in your Brain Dump, the AI will quarantine it by stamping this tag on it so it doesn't cause an infinite duplication loop.*

### The "Soft Reset"
If you make a mistake, or if you want the AI to re-evaluate tasks it has already organized:
1. Go to the **Settings** tab.
2. Click **Undo Processing (Soft Reset)**.
3. This safely scrubs the `[AI_PROCESSED]` tag from every task in your Google Tasks without deleting the tasks themselves, allowing the AI to look at your entire workspace with fresh eyes on the next run.

---
*Designed & Built by Samuel Smith • Open Source MIT License*
