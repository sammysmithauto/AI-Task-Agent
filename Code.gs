/**
 * AI Task Agent - Backend Engine
 * Open Source: MIT License
 */

const DEFAULT_CATEGORIES = ["🌱 Personal & Health", "🚗 Car Maintenance", "💼 Professional & Career", "💬 Outreach & Social"];

function normalizeStr(str) {
  return (str || "").replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function parseTaskMetadata(task) {
  var notes = task.notes || "";
  var startTime = null;
  var endTime = null;
  
  var startMatch = notes.match(/\[START:\s*(\d{2}:\d{2})\]/);
  var endMatch = notes.match(/\[END:\s*(\d{2}:\d{2})\]/);
  
  if (startMatch) startTime = startMatch[1];
  if (endMatch) endTime = endMatch[1];
  
  var dueDate = task.due ? task.due.substring(0, 10) : null;
  return { dueDate: dueDate, startTime: startTime, endTime: endTime };
}

function buildMetadataString(startTime, endTime) {
  var str = "";
  if (startTime) str += "[START: " + startTime + "] ";
  if (endTime) str += "[END: " + endTime + "] ";
  return str.trim();
}

function calculateClashes(allTasksObjArray, sharedListId) {
  var tasksWithTimes = allTasksObjArray.filter(function(t) {
    return t.meta.dueDate && t.meta.startTime && t.meta.endTime && !t.task.status.includes('completed');
  });
  
  var clashesMap = {}; 

  for (var i = 0; i < tasksWithTimes.length; i++) {
    for (var j = i + 1; j < tasksWithTimes.length; j++) {
      var t1 = tasksWithTimes[i];
      var t2 = tasksWithTimes[j];

      if (t1.meta.dueDate === t2.meta.dueDate) {
        if (t1.meta.startTime < t2.meta.endTime && t1.meta.endTime > t2.meta.startTime) {
          addClash(clashesMap, t1, t2, sharedListId);
          addClash(clashesMap, t2, t1, sharedListId);
        }
      }
    }
  }
  return clashesMap;
}

function addClash(map, targetObj, sourceObj, sharedListId) {
  if (!map[targetObj.task.id]) map[targetObj.task.id] = [];
  
  var sourceTitle = "Another task";
  if (sourceObj.listId === sharedListId) {
    sourceTitle = "\"" + sourceObj.task.title + "\"";
  }
  
  var msg = "Time clash: " + sourceTitle + " is already booked from " + sourceObj.meta.startTime + " to " + sourceObj.meta.endTime + ".";
  
  if (map[targetObj.task.id].indexOf(msg) === -1) {
    map[targetObj.task.id].push(msg);
  }
}

function removeDuplicates(allTasksObjArray) {
  var seen = {};
  var toKeep = [];

  allTasksObjArray.forEach(function(obj) {
    if (obj.task.status.includes('completed')) {
      toKeep.push(obj);
      return;
    }
    
    var normTitle = normalizeStr(obj.task.title);
    var date = obj.meta.dueDate || "nodate";
    var start = obj.meta.startTime || "nostart";
    var end = obj.meta.endTime || "noend";
    var key = normTitle + "_" + date + "_" + start + "_" + end + "_" + obj.listId; 

    if (!seen[key]) {
      seen[key] = true;
      toKeep.push(obj);
    } else {
      try { 
        Tasks.Tasks.remove(obj.listId, obj.task.id); 
      } catch(e) {}
    }
  });

  return toKeep;
}

function fetchAllWorkspaceTasks() {
  var taskLists = Tasks.Tasklists.list().items || [];
  var allTasksObj = [];
  
  taskLists.forEach(function(list) {
    var tasks = Tasks.Tasks.list(list.id, {showHidden: true, maxResults: 100}).items || [];
    tasks.forEach(function(t) {
      allTasksObj.push({ listId: list.id, listTitle: list.title, task: t, meta: parseTaskMetadata(t) });
    });
  });
  
  return { taskLists: taskLists, allTasksObj: allTasksObj };
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
    var allListNames = taskLists.map(function(l) { return l.title; });
    var brainDumpList = taskLists.find(function(l) { return normalizeStr(l.title) === normalizeStr(inputListName); });
    
    var brainDumpCount = 0;
    if (brainDumpList) {
      var items = Tasks.Tasks.list(brainDumpList.id, {showHidden: false, maxResults: 100}).items || [];
      brainDumpCount = items.filter(function(t) { return t.status !== 'completed'; }).length;
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
  
  var categoriesToCheck = [inputListName, sharedListName].concat(DEFAULT_CATEGORIES);
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
  var listData = taskLists.find(function(l) { return normalizeStr(l.title) === normalizeStr(sharedListName); });
  var listId = listData ? listData.id : null;
  
  if (!listId) {
    var newList = Tasks.Tasklists.insert({title: sharedListName.trim()});
    listId = newList.id;
  }
  return { id: listId, name: sharedListName };
}

function getGuestTasks() {
  var listData = getOrCreateSharedListId();
  var workspace = fetchAllWorkspaceTasks();
  
  var cleanTasks = removeDuplicates(workspace.allTasksObj);
  var clashesMap = calculateClashes(cleanTasks, listData.id);
  
  var sharedTasks = cleanTasks.filter(function(obj) { return obj.listId === listData.id; });
  
  return {
    listName: listData.name,
    tasks: sharedTasks.map(function(obj) {
      var t = obj.task;
      var meta = obj.meta;
      var notes = t.notes || "";
      var addedBy = notes.includes("👤 Added by") ? notes.split("👤 Added by")[1].split("\n")[0].trim() : "Admin";
      var completedBy = notes.includes("✅ Completed by") ? notes.split("✅ Completed by")[1].split("\n")[0].trim() : "Admin";
      
      var clashWarnings = clashesMap[t.id] || [];
      var clashStr = clashWarnings.length > 0 ? clashWarnings.join(" ") : null;
      
      return {
        id: t.id, 
        title: t.title, 
        dueDate: meta.dueDate,
        startTime: meta.startTime,
        endTime: meta.endTime,
        updated: t.updated || new Date().toISOString(),
        addedBy: addedBy,
        completedBy: completedBy,
        done: t.status === 'completed',
        clashWarning: clashStr
      };
    })
  };
}

function addGuestTask(title, dateStr, startTime, endTime, guestName) {
  var listData = getOrCreateSharedListId();
  var safeName = guestName || "Guest";
  
  if (startTime && !endTime) {
    var parts = startTime.split(':');
    var d = new Date(2000, 0, 1, parseInt(parts[0], 10), parseInt(parts[1], 10) + 30);
    endTime = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  var metaStr = buildMetadataString(startTime, endTime);
  var notes = "👤 Added by " + safeName;
  if (metaStr) notes += "\n\n" + metaStr;
  
  var newTaskObj = { title: title.trim(), notes: notes };
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

function runAiAgent() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('GEMINI_API_KEY');
  
  if (!apiKey) return { status: "error", msg: "Missing Gemini API Key.", logs: ["❌ Aborted: Script properties are missing GEMINI_API_KEY."] };

  var workspace = fetchAllWorkspaceTasks();
  var cleanTasks = removeDuplicates(workspace.allTasksObj);
  var runLog = [];
  
  var queue = cleanTasks.filter(function(obj) {
    var isProcessed = obj.task.notes && obj.task.notes.includes("[AI_PROCESSED]");
    var isCompleted = obj.task.status === 'completed';
    return !isProcessed && !isCompleted && !obj.task.parent;
  });

  if (queue.length === 0) {
    props.setProperty('LAST_SYNC', new Date().toISOString());
    return { status: "success", msg: "All collections clean. No tasks queued.", logs: ["✔ Run completed: Workspace is fully categorized."] };
  }

  var listMap = {};
  var exactCategoryNames = [];
  workspace.taskLists.forEach(function(l) { 
    listMap[normalizeStr(l.title)] = l.id; 
    exactCategoryNames.push(l.title);
  });

  var batch = queue.slice(0, 100);
  
  var payloadTasks = batch.map(function(obj) {
    return {
      id: obj.task.id,
      title: obj.task.title,
      currentList: obj.listTitle
    };
  });

  var aiResults = getAiCategoryOnly(payloadTasks, apiKey, exactCategoryNames);
  var processedCount = 0;

  aiResults.forEach(function(decision) {
    var originalObj = batch.find(function(q) { return q.task.id === decision.id; });
    if (!originalObj) return;
    
    var t = originalObj.task;
    var currentListId = originalObj.listId;
    var targetListTitle = decision.targetList || originalObj.listTitle;
    var normalizedTarget = normalizeStr(targetListTitle);
    
    var targetId = listMap[normalizedTarget];
    if (!targetId) {
      var newList = Tasks.Tasklists.insert({title: targetListTitle.trim()});
      listMap[normalizedTarget] = newList.id;
      targetId = newList.id;
      runLog.push("📁 Initialized missing structure: [" + targetListTitle.trim() + "]");
    }

    t.notes = (t.notes || "") + "\n\n[AI_PROCESSED]";
    t.notes = t.notes.trim();

    try {
      if (currentListId === targetId) {
        Tasks.Tasks.update(t, currentListId, t.id);
        runLog.push("✅ Tagged in place: \"" + t.title + "\"");
      } else {
        var copyObj = { title: t.title, notes: t.notes };
        if (t.due) copyObj.due = t.due;
        
        Tasks.Tasks.insert(copyObj, targetId);
        Tasks.Tasks.remove(currentListId, t.id);
        runLog.push("➡️ Moved task: \"" + t.title + "\" → [" + targetListTitle.trim() + "]");
      }
      processedCount++;
    } catch(err) {
      runLog.push("❌ Skipped task due to structural error: " + t.title);
    }
  });

  props.setProperty('LAST_SYNC', new Date().toISOString());
  return { status: "success", msg: "Operation finalized. Processed " + processedCount + " items.", logs: runLog };
}

function getAiCategoryOnly(tasksArray, key, categories) {
  var url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + key;
  
  var prompt = "You are an incredibly strict, literal task router. You only sort tasks into existing folders.\n\n" +
  "Available Folders: [" + categories.join(", ") + "].\n\n" +
  "CRITICAL RULES:\n" +
  "1. TARGET LISTS MUST BE REAL: 'targetList' MUST exactly match one of the Folders listed above.\n" +
  "2. If a task is ambiguous, place it into the most logical operational folder. DO NOT skip it.\n" +
  "3. DO NOT return 'Brain Dump' or 'Input List' as a target unless you are absolutely unsure. Force it into a proper category.\n" +
  "4. STRICT JSON ONLY: Do NOT output Markdown formatting.\n\n" +
  "Format strictly as JSON array:\n" +
  '[{"id": "id", "targetList": "Exact Folder Name"}]';
  
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
