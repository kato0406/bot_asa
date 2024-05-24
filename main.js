const bot = {
  exec() {
    service.setTrigger()

    // バックログと同期
    service.sync()

    // chatwork
    ChatWorkClient.factory({token: service.getProperty('CHATWORK_API_KEY')}).sendMessage({
      room_id: service.getProperty('CHATWORK_ROOM_ID'),
      body: service.generateBody()
    })
  }
}

function myFunction() {
  return bot.exec()
}
