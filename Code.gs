/**
 * AI Task Agent - Backend Engine v2.0 (Intelligent Triage)
 * Designed & Built by Samuel Smith
 * Open Source: MIT License
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('AI Task Agent')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const DEFAULT_CATEGORIES = ["Personal & Health", "Car Maintenance", "Professional & Career", "Outreach & Social", "Family & Home Admin"];

function checkHolidays(dateStr, countryCode) {
  if (!dateStr || !countryCode) return null;
  const langMap = { 'SE': 'sv.swedish', 'GB': 'en.uk', 'US': 'en.usa', 'DE': 'de.german', 'FR': 'fr.french' };
  const langPrefix = langMap[countryCode.toUpperCase()] || 'en.' + countryCode.toLowerCase();
  const calendarId = langPrefix + "#holiday@group.v.calendar.google.com";
  
  let foundHolidays = [];
  try {
    const cal = CalendarApp.getCalendarById(calendarId);
    if (cal) {
      const events = cal.getEventsForDay(new Date(dateStr));
      events.forEach(e => foundHolidays.push(e.getTitle()));
    }
  } catch (err) { console.log("Calendar error"); }
  return foundHolidays.length > 0 ? foundHolidays.join(", ") : null;
}

function runAiAgent(isGlobalMode) {
  isGlobalMode = (isGlobalMode === true); 
  var props = PropertiesService.getScriptProperties();
  var inputListName = props.getProperty('INPUT_LIST_NAME') || "Brain Dump";
  var countryCode = props.getProperty('COUNTRY_CODE') || "GB";
  props.setProperty('STOP_SIGNAL', 'false');
  
  try {
    var apiKey = props.getProperty('GEMINI_API_KEY');
    if (!apiKey) return { status: "error", msg: "Missing Gemini API Key." };

    var taskLists = Tasks.Tasklists.list().items || [];
    var listMap = {}; 
    taskLists.forEach(function(l) { listMap[l.title] = l.id; });
    
    var inputListId = taskLists.find(l => l.title.toLowerCase().includes(inputListName.toLowerCase()))?.id;
    if(!inputListId) return { status: "error", msg: "Input list not found." };

    var queue = [];
    var detailLogs = [];
    var activeTitlesInOtherLists = new Set();
    
    // Build a memory of all tasks currently sitting outside the Brain Dump
    if (!isGlobalMode) {
      taskLists.forEach(function(list) {
        if (list.id !== inputListId) {
          var otherTasks = Tasks.Tasks.list(list.id, {showHidden: false, maxResults: 100}).items;
          if (otherTasks) {
            otherTasks.forEach(function(ot) {
              if (ot.status !== 'completed') {
                activeTitlesInOtherLists.add(ot.title.trim().toLowerCase());
              }
            });
          }
        }
      });
    }
    
    if (isGlobalMode) {
      taskLists.forEach(function(list) {
        var tasks = Tasks.Tasks.list(list.id, {showHidden: false, maxResults: 100}).items;
        if (tasks) {
          tasks.forEach(function(t) {
            if (t.status !== 'completed' && !t.parent && (!t.notes || t.notes.indexOf("[AI_PROCESSED]") === -1)) {
              queue.push({ id: t.id, listId: list.id, listName: list.title, title: t.title, notes: t.notes || "" });
            }
          });
        }
      });
    } else {
      var tasks = Tasks.Tasks.list(inputListId, {showHidden: false, maxResults: 100}).items;
      if (tasks) {
        tasks.forEach(function(t) {
          if (t.status !== 'completed' && !t.parent && (!t.notes || t.notes.indexOf("[AI_PROCESSED]") === -1)) {
            
            // INFINITE LOOP PROTECTION: If it's already in another list, quarantine it!
            if (activeTitlesInOtherLists.has(t.title.trim().toLowerCase())) {
              try {
                t.notes = (t.notes || "") + "\n\n[AI_PROCESSED]";
                Tasks.Tasks.update(t, inputListId, t.id);
                detailLogs.push("🛡️ Quarantined looping/recurring task: " + t.title);
              } catch(e){}
            } else {
              queue.push({ id: t.id, listId: inputListId, listName: inputListName, title: t.title, notes: t.notes || "" });
            }
          }
        });
      }
    }

    if (queue.length === 0) {
      props.setProperty('LAST_SYNC', new Date().toISOString());
      return { status: "success", msg: "No new tasks.", logs: detailLogs, flagged: [] };
    }

    // AI TIMEOUT PROTECTION: Cap batch at 100 tasks max per run.
    var batch = queue.slice(0, 100);
    var existingCategories = Object.keys(listMap).filter(k => k !== inputListName);
    var aiResults = getAiIntelligentTriage(batch, apiKey, existingCategories, isGlobalMode);
    
    var processedCount = 0;
    var flaggedItems = [];

    for (var i = 0; i < aiResults.length; i++) {
      if (props.getProperty('STOP_SIGNAL') === 'true') { detailLogs.push("🛑 Manual Stop."); break; }
      
      var decision = aiResults[i];
      var original = batch.find(function(b) { return b.id === decision.id; });
      if (!original) continue;

      // SHOCK ABSORBER: Try/Catch wrapper for each individual task
      try {
        if (decision.action === 'flag_duplicate') {
          flaggedItems.push({ id: original.id, listId: original.listId, title: original.title, reason: decision.flagReason });
          continue;
        }

        if (isGlobalMode && decision.action === 'move' && !decision.newNotes && (!decision.newTitle || decision.newTitle === original.title)) continue;

        // Prevent Database IDs from being used as Lists
        if (decision.targetList && decision.targetList.match(/^[a-zA-Z0-9_-]{15,}$/)) {
          decision.targetList = original.listName;
        }

        if (decision.targetList && !listMap[decision.targetList] && decision.targetList !== inputListName) {
          var newList = Tasks.Tasklists.insert({title: decision.targetList});
          listMap[decision.targetList] = newList.id;
          detailLogs.push("📁 Created new list: [" + decision.targetList + "]");
          Utilities.sleep(200); // API Rate Limit Protection
        }

        var targetId = listMap[decision.targetList] || original.listId;
        
        // STRICT DATE FORMAT VALIDATOR
        var isValidDate = decision.dueDate && decision.dueDate.match(/^\d{4}-\d{2}-\d{2}$/);
        var holidayWarning = isValidDate ? checkHolidays(decision.dueDate, countryCode) : null;
        if (holidayWarning) detailLogs.push("⚠️ WARNING: " + decision.dueDate + " is " + holidayWarning);

        var combinedNotes = decision.newNotes ? decision.newNotes : original.notes;

        var newTaskObj = {
          title: decision.newTitle || original.title,
          due: isValidDate ? (decision.dueDate + "T10:00:00.000Z") : undefined,
          notes: (combinedNotes + "\n\n[AI_PROCESSED]").trim()
        };
        
        // Insert the new task
        var newParentTask = Tasks.Tasks.insert(newTaskObj, targetId);
        Utilities.sleep(200); // API Rate Limit Protection
        
        // Handle Recurring Task Deletion Safely
        try {
          Tasks.Tasks.remove(original.listId, original.id);
        } catch (removeErr) {
          var t = Tasks.Tasks.get(original.listId, original.id);
          t.notes = (t.notes || "") + "\n\n[AI_PROCESSED]";
          Tasks.Tasks.update(t, original.listId, original.id);
        }
        
        var logMessage = "➡️ Moved to [" + decision.targetList + "] — " + (decision.newTitle || original.title);

        if (decision.action === 'group' && decision.subtasks && decision.subtasks.length > 0) {
          var addedSubtitles = [];
          decision.subtasks.forEach(function(subTitle) {
            if (subTitle && subTitle.length < 40 && !subTitle.match(/^[a-zA-Z0-9_-]{15,}$/)) {
              Tasks.Tasks.insert({ title: subTitle }, targetId, { parent: newParentTask.id });
              addedSubtitles.push(subTitle);
              Utilities.sleep(150); // API Rate Limit Protection
            }
          });
          logMessage = "🖇️ Grouped [" + decision.targetList + "] — " + (decision.newTitle || original.title) + " (Added: " + addedSubtitles.join(", ") + ")";
        }

        detailLogs.push(logMessage);
        processedCount++;
        
      } catch (loopErr) {
        detailLogs.push("❌ Skipped task due to error: " + original.title);
      }
    }

    props.setProperty('LAST_SYNC', new Date().toISOString());
    return { status: "success", msg: "Agent processed " + processedCount + " items.", logs: detailLogs, flagged: flaggedItems };
  } catch (e) { return { status: "error", msg: "Agent Engine Error: " + e.message }; }
}

function resolveFlaggedItem(taskId, listId, action) {
  if (action === 'delete') {
    try {
      Tasks.Tasks.remove(listId, taskId);
      return "🗑️ Deleted flagged item.";
    } catch(e) {
      return "⚠️ Could not delete (Likely a recurring task). Please delete manually.";
    }
  } else {
    var t = Tasks.Tasks.get(listId, taskId);
    t.notes = (t.notes || "") + "\n\n[AI_PROCESSED]";
    Tasks.Tasks.update(t, listId, taskId);
    return "✅ Kept flagged item.";
  }
}

function updateGlobalSettings(listName, country) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('INPUT_LIST_NAME', listName);
  props.setProperty('COUNTRY_CODE', country);
  return "Settings saved.";
}

function getSystemStats() {
  var props = PropertiesService.getScriptProperties();
  return { 
    active: ScriptApp.getProjectTriggers().length > 0, 
    lastSync: props.getProperty('LAST_SYNC') || 'Never',
    inputList: props.getProperty('INPUT_LIST_NAME') || 'Brain Dump',
    country: props.getProperty('COUNTRY_CODE') || 'GB',
    scriptId: ScriptApp.getScriptId()
  };
}

function stopAgent() { PropertiesService.getScriptProperties().setProperty('STOP_SIGNAL', 'true'); return "Stop signal sent."; }

function setupWorkspace() {
  var props = PropertiesService.getScriptProperties();
  var inputListName = props.getProperty('INPUT_LIST_NAME') || "Brain Dump";
  var existingLists = Tasks.Tasklists.list().items || [];
  var existingNames = existingLists.map(function(l) { return l.title.toLowerCase(); });
  var created = 0;
  [inputListName, ...DEFAULT_CATEGORIES].forEach(function(cat) {
    if (existingNames.indexOf(cat.toLowerCase()) === -1) { Tasks.Tasklists.insert({title: cat}); created++; }
  });
  return "Workspace verified. " + created + " default lists added.";
}

function getAiIntelligentTriage(tasksArray, key, categories, isGlobalMode) {
  var url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + key;
  var currentDate = new Date().toISOString();
  
  var prompt = `You are an incredibly strict, literal task sorter.
  Current Context Date: ${currentDate}
  Existing Categories: [${categories.join(", ")}]. 
  
  CATEGORY GUIDELINES (READ CAREFULLY):
  - Personal & Health: Strictly individual self-care, fitness (gym workouts), medical/health appointments, personal hobbies, and solo reading.
  - Family & Home Admin: Household management, bills, utilities (internet/broadband setup, parking fines), kids' schedules (dance, basketball), major family milestones (weddings, family birthdays), and family vacations/packing.
  - Professional & Career: Work tasks, career advancement, job searching, interviews, portfolio updates, and professional case studies/reports.
  - Car Maintenance: Strictly vehicle-related tasks: services, tires, workshop bookings, and car insurance claims.
  - Outreach & Social: Casual socializing, catching up with friends, returning non-urgent texts/calls, and booking casual outings (movies, spa days with friends). EXCLUDE major family events or professional networking.
  
  CRITICAL RULES:
  1. NO WEIRD IDs: You are FORBIDDEN from outputting random backend ID strings. Use human-readable text only.
  2. NO ROBOT TITLES: You MUST pick the most descriptive existing title from the input exactly as written.
  3. TARGET LISTS MUST BE REAL: "targetList" MUST be a human-readable name from the Categories listed above.
  4. STRICT JSON ONLY: Do NOT output Markdown formatting like \`\`\`json. Do NOT include conversational text. Output the raw JSON array and absolutely nothing else.
  
  ACTIONS:
  - "group": Actively search for loose tasks that belong as sub-steps to a broader task in the batch. Set "newTitle" to the exact title of the main task. Put the related sub-steps into the "subtasks" array.
  - "move": Move a single task. Use this to SMART MERGE tasks with different words but the exact same meaning.
  - "flag_duplicate": Flag obvious duplicates or tasks that you merged into a master task.
  
  Format strictly as JSON array:
  [{"id": "id", "action": "move|group|flag_duplicate", "targetList": "...", "newTitle": "...", "newNotes": "...", "dueDate": "YYYY-MM-DD", "subtasks": ["..."], "flagReason": "..."}]`;
  
  if (isGlobalMode) {
    prompt += "\n\nCRITICAL: You are in GLOBAL CLEAN-UP MODE. Aggressively scan for semantic duplicates and loose tasks that should be nested under a parent project across all tasks. ONLY return tasks if you are using action 'group', 'flag_duplicate', OR updating a master task via 'move'. Ignore perfectly fine single tasks.";
  }
  
  prompt += "\n\nTasks: " + JSON.stringify(tasksArray);
  
  try {
    var res = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }] }) });
    
    // Parse the raw response from Gemini
    var rawText = JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
    
    // STRIPPER: Remove any accidental markdown backticks just in case
    rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    // BOUNDARY FINDER: Force it to only read between the first '[' and last ']'
    var firstBracket = rawText.indexOf('[');
    var lastBracket = rawText.lastIndexOf(']');
    
    if (firstBracket === -1 || lastBracket === -1) {
      throw new Error("AI failed to generate a JSON array.");
    }
    
    var cleanJsonString = rawText.substring(firstBracket, lastBracket + 1);
    
    return JSON.parse(cleanJsonString);
    
  } catch(e) {
    throw new Error(e.message);
  }
}

function toggleAutomation(enable) {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  if (enable) { ScriptApp.newTrigger('runAiAgent').timeBased().everyHours(1).create(); return "Autopilot Enabled."; }
  return "Autopilot Disabled.";
}

function resetAgentMemory() {
  var taskLists = Tasks.Tasklists.list().items || [];
  taskLists.forEach(function(list) {
    var tasks = Tasks.Tasks.list(list.id, {showHidden: false}).items;
    if (tasks) {
      tasks.forEach(function(t) {
        if (t.notes && t.notes.indexOf("[AI_PROCESSED]") !== -1) {
          t.notes = t.notes.replace("[AI_PROCESSED]", "").trim();
          Tasks.Tasks.update(t, list.id, t.id);
        }
      });
    }
  });
  PropertiesService.getScriptProperties().deleteProperty('LAST_SYNC');
  return "Memory cleared.";
}

function factoryReset() { toggleAutomation(false); resetAgentMemory(); return "System Reset."; }
