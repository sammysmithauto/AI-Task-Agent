<img width="1080" height="891" alt="Screenshot 2026-05-27 at 11 22 31" src="https://github.com/user-attachments/assets/1847a8bc-0d69-4d46-aa15-8d0d30f395c7" />
<img width="1015" height="1016" alt="Screenshot 2026-05-27 at 11 23 17" src="https://github.com/user-attachments/assets/b181c122-e07f-497f-bc87-005208fb9c73" />
<img width="1022" height="739" alt="Screenshot 2026-05-27 at 11 22 41" src="https://github.com/user-attachments/assets/d99d82f1-4fa3-4063-b61c-33107b56bfd4" />
<img width="1032" height="1019" alt="Screenshot 2026-05-27 at 11 23 01" src="https://github.com/user-attachments/assets/c058ce4f-3f62-4e55-9ec4-36d3fbcc9ea6" />
<img width="602" height="716" alt="Screenshot 2026-05-27 at 11 23 54" src="https://github.com/user-attachments/assets/bf225cfe-5063-4328-8a3b-859887481ad1" />

---

# AI Task Agent 🤖📋

An intelligent, autonomous task manager built on Google Apps Script and React. Powered by the Gemini API, this agent bridges the gap between raw thought and structured execution—reading your Brain Dump, setting intelligent due dates, and sorting everything into your Google Tasks folders.

---

## ✨ Key Features

* **Unified Smart Routing:** The agent first checks your Brain Dump list. If it finds tasks, it sorts them. If your Brain Dump is empty, it pivots to a Global Deep Clean to merge duplicates across your entire workspace.
* **Intelligent Triage:** The AI understands context. Whether it's a grocery run or a business project, it routes tasks to the correct categorical folder.
* **Smart Merging:** Automatically detects semantic duplicates, merging overlapping tasks into a single master item with combined notes.
* **Guest Collaboration:** Generate secure sharing links for family or team members. Guests can add, check off, and track tasks in a simplified, dedicated portal—no Google account required.
* **Background Autopilot:** Once enabled, the agent autonomously processes your workspace every hour, keeping your lists organized without manual input.
* **Holiday-Aware Scheduling:** Automatically checks regional calendars to flag potential scheduling conflicts with public holidays.

---

## 🚀 Setup & Installation

### 1. Project Creation

1. Go to [Google Apps Script](https://script.google.com/) and click **New Project**.
2. Name the project "AI Task Agent".

### 2. Configure Files

* **`Code.gs`**: Replace the default code with the contents of `Code.gs`.
* **`Index.html`**: Create an HTML file named `Index` and paste the frontend code.
* **`GuestIndex.html`**: Create an HTML file named `GuestIndex` and paste the guest portal code.
* **`appsscript.json`**: Enable "Show 'appsscript.json' manifest file" in Project Settings (gear icon) and replace its contents.

### 3. API Authentication

1. Go to **Project Settings** (gear icon).
2. Under **Script Properties**, add a property: `GEMINI_API_KEY`.
3. Set the value to your Google Gemini API key.

### 4. Deploy

1. Click **Deploy > New deployment**.
2. Select **Web app** as the type.
3. Set **Execute as** to **Me** and **Who has access** to **Anyone**.
4. Click **Deploy**.

---

## 🛠️ Daily Workflow

1. **Dump:** Open Google Tasks and add raw thoughts to your designated Brain Dump list.
2. **Sort:** Open your AI Task Agent Web App and click **Run Agent**.
3. **Monitor:** Use the **Activity Monitor** to track how tasks are triaged and routed into their respective folders.
4. **Share:** Use the **Create a Sharing Link** feature in the Console to collaborate with family or team members instantly.

---

*Open Source MIT License*
