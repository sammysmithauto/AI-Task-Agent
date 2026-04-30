function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('AI Task Agent')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// The core categories the AI looks for
const CATEGORY_TEMPLATES = ["Brain Dump", "Personal & Health", "Car Maintenance", "Professional & Career", "Outreach & Social", "Family & Home Admin"];

function setupWorkspace() {
  var existingLists = Tasks.Tasklists.list().items || [];
  var existingNames = existingLists.map(function(l) { return l.title.toLowerCase(); });
  var created = 0;
  
  CATEGORY_TEMPLATES.forEach(function(cat) {
    if (existingNames.indexOf(cat.toLowerCase()) === -1) {
      Tasks.Tasklists.insert({title: cat});
      created++;
    }
  });
  return "Workspace verified. " + created + " new lists added.";
}

function runAiAgent() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('STOP_SIGNAL', 'false');
  try {
    var apiKey = props.getProperty('GEMINI_API_KEY');
    if (!apiKey) return { status: "error", msg: "Missing Gemini API Key." };

    var taskLists = Tasks.Tasklists.list().items || [];
    var listMap = {}; 
    
    // STRICT MATCHING: Find existing lists without creating new ones
    taskLists.forEach(function(l) { 
      listMap[l.title] = l.id;
      // Also match if the list has an emoji prepended (e.g., "🧠 Brain Dump")
      CATEGORY_TEMPLATES.forEach(function(template) {
        if (l.title.includes(template)) {
          listMap[template] = l.id;
        }
      });
    });

    var queue = [];
    var detailLogs = [];
    taskLists.forEach(function(list) {
      var tasks = Tasks.Tasks.list(list.id, {showHidden: false}).items;
      if (tasks) {
        tasks.forEach(function(t) {
          if (t.status !== 'completed' && !t.parent && (!t.notes || t.notes.indexOf("[AI_PROCESSED]") === -1)) {
            queue.push({ id: t.id, listId: list.id, listName: list.title, title: t.title, notes: t.notes || "" });
          }
        });
      }
    });

    if (queue.length === 0) return { status: "success", msg: "No new tasks to process.", logs: [] };

    var batch = queue.slice(0, 10);
    var aiResults = getAiTriage(batch, apiKey);
    var processedCount = 0;

    for (var i = 0; i < aiResults.length; i++) {
      if (props.getProperty('STOP_SIGNAL') === 'true') {
        detailLogs.push("🛑 Process Aborted.");
        break;
      }
      var decision = aiResults[i];
      var original = batch.find(function(b) { return b.id === decision.id; });
      
      // Look for the target list ID. If it doesn't exist, we fallback to the original list (No auto-creation).
      var targetId = listMap[decision.targetList] || original.listId;

      if (targetId !== original.listId) {
        Tasks.Tasks.insert({
          title: decision.newTitle,
          due: decision.dueDate ? (decision.dueDate + "T10:00:00.000Z") : undefined,
          notes: (original.notes + "\n\n[AI_PROCESSED]").trim()
        }, targetId);
        Tasks.Tasks.remove(original.listId, original.id);
        detailLogs.push("➡️ Moved to [" + (decision.targetList) + "] — " + decision.newTitle);
      } else {
        var t = Tasks.Tasks.get(original.listId, original.id);
        t.title = decision.newTitle;
        if (decision.dueDate) t.due = decision.dueDate + "T10:00:00.000Z";
        t.notes = (t.notes || "") + "\n\n[AI_PROCESSED]";
        Tasks.Tasks.update(t, original.listId, original.id);
        detailLogs.push("✨ Upgraded — " + decision.newTitle);
      }
      processedCount++;
    }

    props.setProperty('LAST_SYNC', new Date().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}));
    return { status: "success", msg: "Agent processed " + processedCount + " items.", logs: detailLogs };
  } catch (e) { return { status: "error", msg: e.message }; }
}

function stopAgent() {
  PropertiesService.getScriptProperties().setProperty('STOP_SIGNAL', 'true');
  return "Stop signal sent.";
}

function getAiTriage(tasksArray, key) {
  var url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + key;
  var prompt = "Review these tasks. Output ONLY a JSON array. Pick the best category from: " + CATEGORY_TEMPLATES.join(", ") + ". Tasks: " + JSON.stringify(tasksArray);
  var res = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify({ "contents": [{ "parts": [{ "text": prompt + "\nFormat: [{\"id\": \"...\", \"targetList\": \"...\", \"newTitle\": \"...\", \"dueDate\": \"YYYY-MM-DD\"}]" }] }] }) });
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text.match(/\[[\s\S]*\]/)[0]);
}

function getSystemStats() {
  return { active: ScriptApp.getProjectTriggers().length > 0, lastSync: PropertiesService.getScriptProperties().getProperty('LAST_SYNC') || 'Never' };
}

function toggleAutomation(enable) {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  if (enable) {
    ScriptApp.newTrigger('runAiAgent').timeBased().everyHours(1).create();
    return "Autopilot Enabled.";
  }
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

function factoryReset() {
  toggleAutomation(false);
  resetAgentMemory();
  return "System Reset.";
}
