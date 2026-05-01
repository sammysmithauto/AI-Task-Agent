🧠⚡️ AI Task Agent (Google Workspace)
An autonomous, LLM-powered task triage engine built natively for Google Workspace.

Tired of a cluttered Google Tasks list? Do you constantly dump ideas into your phone but never get around to organizing them? This agent runs a custom React web app that transforms a messy "Brain Dump" into a prioritized, calendar-synced, and categorized workspace. It uses the Google Gemini API to analyze your raw notes, parse natural language dates, flag local holidays, and automatically sort tasks into dedicated lists.

✨ Features
LLM-Powered Triage: Automatically reads your unstructured thoughts and categorizes them into distinct lists (e.g., Personal, Career, Car Maintenance).

Smart Date Parsing: Uses Gemini to read natural language (e.g., "Call John next Tuesday") and assigns exact due dates to your Google Tasks.

Dynamic Holiday Detection: Set your specific country code (GB, SE, US, etc.) in the app, and the AI will scan official Google Calendars to warn you if a generated due date falls on a local public holiday.

Timezone-Aware Syncing: The backend utilizes universal ISO timestamping, ensuring the "Last Sync" and activity logs instantly adapt to your computer's local timezone.

Modern React Interface: A beautiful, dark-mode-ready UI built with React and Tailwind CSS that acts as your centralized command console.

100% Private & Free: Runs completely inside your own Google account. No third-party servers, no subscriptions, and your data never leaves the Google ecosystem.

## 📸 Screenshots
### Agent Console
<img width="1180" height="978" alt="Screenshot 2026-05-01 at 14 58 40" src="https://github.com/user-attachments/assets/e58f27f7-9eae-49b8-b08d-1fa58ec1eea8" />


### User Guide
<img width="1182" height="983" alt="Screenshot 2026-05-01 at 14 58 47" src="https://github.com/user-attachments/assets/ae19f11a-e1b2-49b7-945d-92f23f1ae094" />


### Configurations
<img width="1185" height="988" alt="Screenshot 2026-05-01 at 14 58 57" src="https://github.com/user-attachments/assets/64f0457c-7c16-4454-8ecd-48f86df95074" />


📋 Prerequisites & Requirements

Before you install the script, ensure you have the following ready:

A Standard Google Account: You need access to Google Tasks and Google Apps Script.

A Free Google Gemini API Key: Get one instantly from Google AI Studio.

🚀 Installation & Setup Guide

Step 1: Create the Project & Add the Code
Go to script.google.com and click New Project.

Name the project (e.g., "AI Task Agent").

In the default Code.gs file, delete all existing code and paste the full backend code from Code.gs provided in this repository.

Click the + icon next to "Files" in the left sidebar, select HTML, and name it exactly Index.

Paste the full frontend code from Index.html into this new file.

Press Cmd/Ctrl + S to save both files.

Step 2: Enable Google Services
Look at the left sidebar and click the + icon next to Services.

Scroll down and find Tasks API. Click Add.

Step 3: Securely Add Your Gemini API Key
We use Google's secure Script Properties so your API key is never hardcoded into your files.

Click the Project Settings icon (gear ⚙️) on the left sidebar.

Scroll down to Script Properties and click Add script property.

Under Property, type exactly: GEMINI_API_KEY

Under Value, paste your secret key from Google AI Studio.

Click Save script properties.

Step 4: Deploy the Web App
Look at the top right of the screen and click the blue Deploy button, then select New deployment.

Click the gear icon ⚙️ next to "Select type" and choose Web app.

Fill out the configuration:

Description: Initial Release

Execute as: Me (your email)

Who has access: Only myself

Click Deploy. (Note: Google will ask you to authorize the app to access your Tasks. Click 'Review Permissions' > choose your account > 'Advanced' > 'Go to AI Task Agent').

Copy the Web app URL. This is the link you will use to open your Agent!

💻 How to Use It

1. Initialize Your Workspace
Open your Web App URL. Navigate to the Settings tab and click Setup Workspace. The script will automatically build your default category lists inside your Google Tasks app.

2. The "Brain Dump"
Throughout your day, open the standard Google Tasks app on your phone or computer. Dump every thought, chore, or meeting into your "Brain Dump" list using natural language (e.g., "Renew car insurance before next Friday").

3. Run the Agent
Open your AI Task Agent Web App and click Run.
Watch the Activity Monitor as the AI analyzes your thoughts, parses the dates, flags any country-specific holidays, and seamlessly moves your tasks into their proper categories.

4. Global Configurations
In the Settings tab, you can customize the Agent's behavior:

Input List Name: Change "Brain Dump" to whatever you prefer to call your inbox.

Country Code: Enter your country code (e.g., GB, SE, US) to ensure the Agent warns you about local bank holidays and red days.

Soft Reset: Made a mistake? Use the Undo button to wipe the AI's memory of the last session.
