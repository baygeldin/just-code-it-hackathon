export default (symbol) => {
  return function * (next) {
    if (this.date > this[symbol].date) {
      this[symbol].respond = (function (msg, keyboard) {
        return this.sendMessage(this.from.id, msg, keyboard)
          .then((res) => {
            this[symbol].date = res.date
            return res
          })
      }).bind(this)
      yield next
    }
  }
}
