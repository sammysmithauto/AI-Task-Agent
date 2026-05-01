/**
 * AI Task Agent - Backend Logic (Timezone Optimized)
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

function runAiAgent() {
  var props = PropertiesService.getScriptProperties();
  var inputListName = props.getProperty('INPUT_LIST_NAME') || "Brain Dump";
  var countryCode = props.getProperty('COUNTRY_CODE') || "GB";
  props.setProperty('STOP_SIGNAL', 'false');
  
  try {
    var apiKey = props.getProperty('GEMINI_API_KEY');
    if (!apiKey) return { status: "error", msg: "Missing Gemini API Key." };

    var taskLists = Tasks.Tasklists.list().items || [];
    var listMap = {}; 
    taskLists.forEach(function(l) { 
      listMap[l.title] = l.id;
      if (l.title.toLowerCase().includes(inputListName.toLowerCase())) listMap['INPUT'] = l.id;
      DEFAULT_CATEGORIES.forEach(function(cat) {
        if (l.title.toLowerCase().includes(cat.toLowerCase())) listMap[cat] = l.id;
      });
    });

    var queue = [];
    var detailLogs = [];
    taskLists.forEach(function(list) {
      var tasks = Tasks.Tasks.list(list.id, {showHidden: false}).items;
      if (tasks) {
        tasks.forEach(function(t) {
          if (t.status !== 'completed' && !t.parent && (!t.notes || t.notes.indexOf("[AI_PROCESSED]") === -1)) {
            queue.push({ id: t.id, listId: list.id, title: t.title, notes: t.notes || "" });
          }
        });
      }
    });

    if (queue.length === 0) {
      props.setProperty('LAST_SYNC', new Date().toISOString());
      return { status: "success", msg: "No new tasks.", logs: [] };
    }

    var batch = queue.slice(0, 10);
    var aiResults = getAiTriage(batch, apiKey, [inputListName, ...DEFAULT_CATEGORIES]);
    var processedCount = 0;

    for (var i = 0; i < aiResults.length; i++) {
      if (props.getProperty('STOP_SIGNAL') === 'true') {
        detailLogs.push("🛑 Manual Stop."); break;
      }
      var decision = aiResults[i];
      var original = batch.find(function(b) { return b.id === decision.id; });
      var targetId = listMap[decision.targetList] || original.listId;

      var holidayWarning = checkHolidays(decision.dueDate, countryCode);
      if (holidayWarning) detailLogs.push("⚠️ WARNING: " + decision.dueDate + " is " + holidayWarning);

      if (targetId !== original.listId) {
        Tasks.Tasks.insert({
          title: decision.newTitle,
          due: decision.dueDate ? (decision.dueDate + "T10:00:00.000Z") : undefined,
          notes: (original.notes + "\n\n[AI_PROCESSED]").trim()
        }, targetId);
        Tasks.Tasks.remove(original.listId, original.id);
        detailLogs.push("➡️ Moved to [" + decision.targetList + "] — " + decision.newTitle);
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

    props.setProperty('LAST_SYNC', new Date().toISOString());
    return { status: "success", msg: "Agent processed " + processedCount + " items.", logs: detailLogs };
  } catch (e) { return { status: "error", msg: e.message }; }
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
    country: props.getProperty('COUNTRY_CODE') || 'GB'
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
  return "Workspace verified. " + created + " new lists added.";
}

function getAiTriage(tasksArray, key, categories) {
  var url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + key;
  var prompt = "Review these tasks. Output ONLY a JSON array. Categories: " + categories.join(", ") + ". Tasks: " + JSON.stringify(tasksArray);
  var res = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify({ "contents": [{ "parts": [{ "text": prompt + "\nFormat: [{\"id\": \"...\", \"targetList\": \"...\", \"newTitle\": \"...\", \"dueDate\": \"YYYY-MM-DD\"}]" }] }] }) });
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text.match(/\[[\s\S]*\]/)[0]);
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
