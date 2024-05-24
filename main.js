const bot = {
  methods: {
    getLastRaw(sheet, column) {
      return sheet.getRange(sheet.getMaxRows(), column).getNextDataCell(SpreadsheetApp.Direction.UP).getRow()
    },
    sync() {
      const response = JSON.parse(UrlFetchApp.fetch(`https://valeur.backlog.jp/api/v2/projects?apiKey=${service.getProperty('BACKLOG_API_KEY')}`).getContentText())
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
      const projects = response.map(project => [project.id, project.name])
      const statuses = projects.map(project => {
        const [id, name] = project
        const response = JSON.parse(UrlFetchApp.fetch(`https://valeur.backlog.jp/api/v2/projects/${id}/statuses?apiKey=${service.getProperty('BACKLOG_API_KEY')}`))

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
    generateBody() {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
      const sheet = spreadsheet.getSheetByName('基本設定')
      const users = sheet.getRange(`A2:B${bot.methods.getLastRaw(sheet, 1)}`).getValues().filter(user => {
        const [name, isActive] = user

        return isActive
      })
      const [name] = bot.methods.getTargetUser(users)

      return `[toall]\n朝会bot\n部屋：${service.getProperty('MEET_URL')}\n進行：${name}\n\n朝会目次\n${service.getProperty('AGENDA_URL')}`
    },
    getTargetUser(users) {
      return users[Math.floor(Math.random() * users.length)]
    },
    skipHoliday(date) {
      const workDays = [1, 2, 3, 4, 5]
      if (workDays.includes(date.day())) return date

      return bot.methods.skipHoliday(date.add(1, 'd'))
    },
    setTrigger() {
      const triggers = ScriptApp.getProjectTriggers()
      const date = new Date(bot.methods.skipHoliday(dayjs.dayjs().add(1, 'd')))
     
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
    ChatWorkClient.factory({token: service.getProperty('CHATWORK_API_KEY')}).sendMessage({
      room_id: service.getProperty('CHATWORK_ROOM_ID'),
      body: bot.methods.generateBody()
    })
  }
}

function doGet() {
  return bot.exec()
}
