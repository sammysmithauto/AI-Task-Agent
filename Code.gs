/**
 * AI Task Agent - Backend Engine v2.0
 * Designed & Built by Samuel Smith
 * Open Source: MIT License
 */

const DEFAULT_CATEGORIES = ["🌱 Personal & Health", "🚗 Car Maintenance", "💼 Professional & Career", "💬 Outreach & Social"];

function normalizeStr(str) {
  return (str || "").replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function doGet(e) {
  if (e.parameter.portal === 'family' && e.parameter.key === 'SecretPassword123') {
    var tmpl = HtmlService.createTemplateFromFile('GuestIndex');
    tmpl.guestName = e.parameter.name || 'Guest'; 
    return tmpl.evaluate()
      .setTitle('Shared Tasks')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('AI Task Agent')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getAppBaseUrl() {
  return ScriptApp.getService().getUrl();
}

function getSystemStats() {
  try {
    var props = PropertiesService.getScriptProperties();
    var inputListName = props.getProperty('INPUT_LIST_NAME') || '🧠 Brain Dump';
    var sharedListName = props.getProperty('SHARED_LIST_NAME') || '🏠 Family & Home Admin';
    
    var taskLists = Tasks.Tasklists.list().items || [];
    var allListNames = taskLists.map(l => l.title); // Feed the UI dropdowns
    var brainDumpList = taskLists.find(l => normalizeStr(l.title) === normalizeStr(inputListName));
    
    var brainDumpCount = 0;
    if (brainDumpList) {
      var items = Tasks.Tasks.list(brainDumpList.id, {showHidden: false, maxResults: 100}).items || [];
      brainDumpCount = items.filter(t => t.status !== 'completed').length;
    }

    return { 
      active: ScriptApp.getProjectTriggers().length > 0, 
      lastSync: props.getProperty('LAST_SYNC') || 'Never',
      inputList: inputListName,
      sharedList: sharedListName,
      allLists: allListNames,
      country: props.getProperty('COUNTRY_CODE') || 'SE',
      listCount: taskLists.length,
      brainDumpCount: brainDumpCount
    };
  } catch (e) {
    return { active: false, lastSync: 'Never', inputList: 'Brain Dump', sharedList: 'Shared', allLists: [], country: 'SE', listCount: 0, brainDumpCount: 0 };
  }
}

function updateGlobalSettings(listName, country, sharedList) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('INPUT_LIST_NAME', listName.trim());
  props.setProperty('COUNTRY_CODE', country.trim());
  if (sharedList) { props.setProperty('SHARED_LIST_NAME', sharedList.trim()); }
  return "Settings saved.";
}

function toggleAutomation(enable) {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  if (enable) { 
    ScriptApp.newTrigger('runAiAgent').timeBased().everyHours(1).create(); 
    return "Autopilot Enabled."; 
  }
  return "Autopilot Disabled.";
}

function setupWorkspace() {
  var props = PropertiesService.getScriptProperties();
  var inputListName = props.getProperty('INPUT_LIST_NAME') || "🧠 Brain Dump";
  var sharedListName = props.getProperty('SHARED_LIST_NAME') || "🏠 Family & Home Admin";
  var existingLists = Tasks.Tasklists.list().items || [];
  var existingNames = existingLists.map(function(l) { return normalizeStr(l.title); });
  var created = 0;
  
  var categoriesToCheck = [inputListName, sharedListName, ...DEFAULT_CATEGORIES];
  categoriesToCheck.forEach(function(cat) {
    if (existingNames.indexOf(normalizeStr(cat)) === -1) { 
      Tasks.Tasklists.insert({title: cat.trim()}); 
      existingNames.push(normalizeStr(cat)); 
      created++; 
    }
  });
  return "Workspace verified. " + created + " missing folders generated.";
}

function factoryReset() {
  toggleAutomation(false);
  PropertiesService.getScriptProperties().deleteProperty('LAST_SYNC');
  return "Memory space purged.";
}

function getOrCreateSharedListId() {
  var sharedListName = PropertiesService.getScriptProperties().getProperty('SHARED_LIST_NAME') || '🏠 Family & Home Admin';
  var taskLists = Tasks.Tasklists.list().items || [];
  var listId = taskLists.find(l => normalizeStr(l.title) === normalizeStr(sharedListName))?.id;
  
  if (!listId) {
    var newList = Tasks.Tasklists.insert({title: sharedListName.trim()});
    listId = newList.id;
  }
  return { id: listId, name: sharedListName };
}

function getGuestTasks() {
  var listData = getOrCreateSharedListId();
  var tasks = Tasks.Tasks.list(listData.id, {showHidden: true, maxResults: 100}).items || [];
  
  return {
    listName: listData.name,
    tasks: tasks.map(t => {
      var notes = t.notes || "";
      var addedBy = notes.includes("👤 Added by") ? notes.split("👤 Added by")[1].split("\n")[0].trim() : "Admin";
      var completedBy = notes.includes("✅ Completed by") ? notes.split("✅ Completed by")[1].split("\n")[0].trim() : "Admin";
      
      return {
        id: t.id, 
        title: t.title, 
        dueDate: t.due || null,
        updated: t.updated || new Date().toISOString(),
        addedBy: addedBy,
        completedBy: completedBy,
        done: t.status === 'completed'
      };
    })
  };
}

function addGuestTask(title, dateStr, guestName) {
  var listData = getOrCreateSharedListId();
  var safeName = guestName || "Guest";
  var newTaskObj = { title: title.trim(), notes: "👤 Added by " + safeName };
  
  if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) { 
    newTaskObj.due = dateStr + "T10:00:00.000Z"; 
  }

  Tasks.Tasks.insert(newTaskObj, listData.id);
  return "Task added!";
}

function completeGuestTask(taskId, guestName) {
  var listData = getOrCreateSharedListId();
  try {
    var t = Tasks.Tasks.get(listData.id, taskId);
    t.status = 'completed';
    var safeName = guestName || "Admin";
    t.notes = (t.notes || "") + "\n✅ Completed by " + safeName;
    Tasks.Tasks.update(t, listData.id, taskId);
    return "Task completed!";
  } catch (e) {
    return "Error completing task.";
  }
}

function checkHolidays(dateStr, countryCode) {
  if (!dateStr || !countryCode) return null;
  const langMap = { 'SE': 'sv.swedish', 'GB': 'en.uk', 'US': 'en.usa' };
  const calendarId = (langMap[countryCode.toUpperCase()] || 'en.uk') + "#holiday@group.v.calendar.google.com";
  try {
    const cal = CalendarApp.getCalendarById(calendarId);
    if (cal) {
      const events = cal.getEventsForDay(new Date(dateStr));
      if (events.length > 0) return events[0].getTitle();
    }
  } catch (err) {}
  return null;
}

function runAiAgent() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('GEMINI_API_KEY');
  var inputListName = props.getProperty('INPUT_LIST_NAME') || "🧠 Brain Dump";
  var countryCode = props.getProperty('COUNTRY_CODE') || "SE";

  if (!apiKey) return { status: "error", msg: "Missing Gemini API Key.", logs: ["❌ Aborted: Script properties are missing GEMINI_API_KEY."] };

  var taskLists = Tasks.Tasklists.list().items || [];
  var listMap = {}; 
  taskLists.forEach(l => listMap[normalizeStr(l.title)] = l.id);
  var inputListId = listMap[normalizeStr(inputListName)];

  if (!inputListId) return { status: "error", msg: "Target sorting pool missing.", logs: ["❌ Aborted: Could not locate the baseline input container."] };

  var queue = [];
  var isGlobalMode = false;
  var runLog = [];
  
  // UNIFIED RUN ARCHITECTURE: Check Brain Dump first
  var inputTasks = Tasks.Tasks.list(inputListId, {showHidden: false, maxResults: 100}).items;
  var hasUnsortedTasks = false;
  
  if (inputTasks) {
    inputTasks.forEach(t => {
      if (t.status !== 'completed' && !t.parent && (!t.notes || !t.notes.includes("[AI_PROCESSED]"))) {
        queue.push({ id: t.id, listId: inputListId, listName: inputListName, title: t.title, notes: t.notes || "" });
        hasUnsortedTasks = true;
      }
    });
  }

  // If Brain Dump is empty, pivot to Deep Clean Mode
  if (!hasUnsortedTasks) {
    isGlobalMode = true;
    runLog.push("ℹ️ Brain Dump is clear. Pivoting to Global Clean-Up Mode.");
    taskLists.forEach(list => {
      var listTasks = Tasks.Tasks.list(list.id, {showHidden: false, maxResults: 100}).items;
      if (listTasks) {
        listTasks.forEach(t => {
          if (t.status !== 'completed' && !t.parent && (!t.notes || !t.notes.includes("[AI_PROCESSED]"))) {
            queue.push({ id: t.id, listId: list.id, listName: list.title, title: t.title, notes: t.notes || "" });
          }
        });
      }
    });
  }

  if (queue.length === 0) {
    props.setProperty('LAST_SYNC', new Date().toISOString());
    return { status: "success", msg: "All collections clean. No tasks queued.", logs: ["✔ Run completed: Collection containers are clear."] };
  }

  var batch = queue.slice(0, 100);
  var exactCategoryNames = taskLists.map(l => l.title).filter(title => normalizeStr(title) !== normalizeStr(inputListName));

  var aiResults = getAiIntelligentTriage(batch, apiKey, exactCategoryNames, isGlobalMode);
  var processedCount = 0;

  aiResults.forEach(decision => {
    var original = batch.find(q => q.id === decision.id);
    if (!original) return;
    
    if (isGlobalMode && decision.action === 'move' && !decision.newNotes && (!decision.newTitle || decision.newTitle === original.title) && normalizeStr(decision.targetList) === normalizeStr(original.listName)) return;

    try {
      var normalizedTarget = normalizeStr(decision.targetList || original.listName);
      if (normalizedTarget.match(/^[a-zA-Z0-9_-]{15,}$/)) { normalizedTarget = normalizeStr(original.listName); }
      
      var targetId = listMap[normalizedTarget];
      if (!targetId) {
        var newList = Tasks.Tasklists.insert({title: decision.targetList.trim()});
        listMap[normalizedTarget] = newList.id;
        targetId = newList.id;
        runLog.push("📁 Initialized missing structure: [" + decision.targetList.trim() + "]");
      }

      var isValidDate = decision.dueDate && decision.dueDate.match(/^\d{4}-\d{2}-\d{2}$/);
      var holiday = isValidDate ? checkHolidays(decision.dueDate, countryCode) : null;
      if (holiday) runLog.push("⚠️ " + decision.dueDate + " overlaps with regional event: " + holiday);

      var newTaskObj = {
        title: decision.newTitle || original.title,
        due: isValidDate ? decision.dueDate + "T10:00:00.000Z" : undefined,
        notes: ((decision.newNotes || original.notes || "") + "\n\n[AI_PROCESSED]").trim()
      };

      Tasks.Tasks.insert(newTaskObj, targetId);
      
      try { Tasks.Tasks.remove(original.listId, original.id); } 
      catch (removeErr) {
        var t = Tasks.Tasks.get(original.listId, original.id);
        t.notes = (t.notes || "") + "\n\n[AI_PROCESSED]";
        Tasks.Tasks.update(t, original.listId, original.id);
      }
      
      runLog.push("➡️ Successfully triaged task: \"" + original.title + "\" → [" + (decision.targetList || original.listName).trim() + "]");
      processedCount++;
    } catch(err) {
      runLog.push("❌ Skipped task due to structural error: " + original.title);
    }
  });

  props.setProperty('LAST_SYNC', new Date().toISOString());
  return { status: "success", msg: "Triage operation finalized. Processed " + processedCount + " items.", logs: runLog };
}

function getAiIntelligentTriage(tasksArray, key, categories, isGlobalMode) {
  var url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + key;
  var currentDate = new Date().toISOString();
  
  var prompt = "You are an incredibly strict, literal task sorter.\n" +
  "Current Date: " + currentDate + "\n" +
  "Available Folders: [" + categories.join(", ") + "].\n\n" +
  "CRITICAL RULES:\n" +
  "1. TARGET LISTS MUST BE REAL: 'targetList' MUST exactly match one of the Folders listed above.\n" +
  "2. If a task is ambiguous (like 'buy nappies' or 'go for a run'), place it into the most logical operational folder (e.g., Family & Home Admin or Personal & Health). DO NOT skip it.\n" +
  "3. STRICT JSON ONLY: Do NOT output Markdown formatting.\n\n" +
  "Format strictly as JSON array:\n" +
  '[{"id": "id", "action": "move", "targetList": "...", "newTitle": "...", "newNotes": "...", "dueDate": "YYYY-MM-DD"}]';
  
  if (isGlobalMode) {
    prompt += "\n\nCRITICAL: GLOBAL CLEAN-UP MODE. Identify duplicates. ONLY return tasks if you are updating a master task via 'move'. Ignore perfectly fine single tasks.";
  }
  
  prompt += "\n\nTasks: " + JSON.stringify(tasksArray);
  
  try {
    var res = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }] }) });
    var rawText = JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
    
    var firstBracket = rawText.indexOf('[');
    var lastBracket = rawText.lastIndexOf(']');
    if (firstBracket === -1 || lastBracket === -1) return [];
    
    var cleanJson = rawText.substring(firstBracket, lastBracket + 1);
    return JSON.parse(cleanJson);
  } catch(e) { return []; }
}
