const bot = {
  config: {
    chatworkApiKey: '255b0c3bf5bc21a7acf3a11521c83149',
    chatworkRoomId: '178143302',
    backlogApiKey: 'kX34HN14qc4h7paFqtm97AIzjB76Ugc0cZnRAFDSsQfKIsjmw7UA9IsDCaratBZz',
    backlogUrl: 'https://valeur.backlog.jp/FindIssueAllOver.action?sort=LIMIT_DATE&order=false&simpleSearch=false&allOver=true&startDate.unspecified=false&limitDate.unspecified=false&',
    meetUrl: 'https://meet.google.com/grq-auge-riw',
    agendaUrl: 'https://wollllll.github.io/asa_bot_desu/',
    workDays: [1, 2, 3, 4, 5],
    calendar: CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com')
  },
  methods: {
    isMonday() {
      return dayjs.dayjs().day() === 1
    },
    getLastRaw(sheet, column) {
      return sheet.getRange(sheet.getMaxRows(), column).getNextDataCell(SpreadsheetApp.Direction.UP).getRow()
    },
    sync() {
      const response = JSON.parse(UrlFetchApp.fetch(`https://valeur.backlog.jp/api/v2/projects?apiKey=${bot.config.backlogApiKey}`).getContentText())
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
      const projects = response.map(project => [project.id, project.name])
      const statuses = projects.map(project => {
        const [id, name] = project
        const response = JSON.parse(UrlFetchApp.fetch(`https://valeur.backlog.jp/api/v2/projects/${id}/statuses?apiKey=${bot.config.backlogApiKey}`))

        return response.map(status => {
          return [
            id,
            name,
            status.id,
            status.name
          ]
        })
      }).flat()

      spreadsheet.getSheetByName('プロジェクト一覧').getRange(`A2:B${projects.length + 1}`).setValues(projects)
      spreadsheet.getSheetByName('状態一覧').getRange(`A2:D${statuses.length + 1}`).setValues(statuses)
    },
    generateBaseBacklogUrl() {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
      const urlSheet = spreadsheet.getSheetByName('URL')
      const statusValues = urlSheet.getRange(`E2:G${bot.methods.getLastRaw(urlSheet, 5)}`)
      const projectValues = urlSheet.getRange(`A2:C${bot.methods.getLastRaw(urlSheet, 1)}`)
      const statusIds = []
      const projectIds = []
      const completeStatusIds = []

      statusValues.getValues()
        .forEach(status => {
          const [id, name, isActive] = status
          if(!isActive) return

          statusIds.push(id)
      })
      projectValues.getValues()
        .forEach(project => {
          const [id, name, isActive] = project
          if(!isActive) return

          projectIds.push(id)
      })
      statusValues.getValues()
        .forEach(status => {
          const [id, name, isActive] = status
          if(isActive) return

          completeStatusIds.push(id)
      })
      
      return {
        url: `${bot.config.backlogUrl}${projectIds.map(id => `projectId=${id}&`).join('')}${statusIds.map(id => `statusId=${id}&`).join('')}`,
        mondayUrl: `${bot.config.backlogUrl}${projectIds.map(id => `projectId=${id}&`).join('')}${completeStatusIds.map(id => `statusId=${id}&`).join('')}`
      }
    },
    formatDate(date) {
      return date.format('YYYY/MM/DD')
    },
    generateBody() {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
      const sheet = spreadsheet.getSheetByName('基本設定')
      const users = sheet.getRange(`A2:B${bot.methods.getLastRaw(sheet, 1)}`).getValues().filter(user => {
        const [name, isActive] = user

        return isActive
      })
      const [name] = bot.methods.getTargetUser(users)

      return `[toall]\n朝会bot\n部屋：${bot.config.meetUrl}\n進行：${name}\n\n朝会目次\n${bot.config.agendaUrl}`
    },
    getTargetUser(users) {
      return users[Math.floor(Math.random() * users.length)]
    },
    skipHoliday(date) {
      if (bot.config.workDays.includes(date.day())) return date

      return bot.methods.addDay(date.add(1, 'd'))
    },
    setTrigger() {
      const triggers = ScriptApp.getProjectTriggers()
      const date = new Date(bot.methods.skipHoliday(dayjs.dayjs()).add(1, 'd'))
      date.setHours(10, 10, 0, 0);

      for (const trigger in triggers) {
        ScriptApp.deleteTrigger(triggers[trigger])
      }

      ScriptApp.newTrigger('doGet')
        .timeBased()
        .at(date)
        .create();

        return
    },
  },
  exec() {
    bot.methods.setTrigger()

    // バックログと同期
    bot.methods.sync()

    // chatwork
    ChatWorkClient.factory({token: bot.config.chatworkApiKey}).sendMessage({
      room_id: bot.config.chatworkRoomId,
      body: bot.methods.generateBody()
    })
  }
}

function doGet() {
  return bot.exec()
}
