const service = {
  getProperty(key) {
    return PropertiesService.getScriptProperties().getProperty(key)
  }
}