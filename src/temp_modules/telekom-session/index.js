export default (symbol, options) => {
  let users = {}

  return function * (next) {
    this[symbol] = users[this.chat.id] || {}
    yield next
    users[this.chat.id] = this[symbol]
  }
}
