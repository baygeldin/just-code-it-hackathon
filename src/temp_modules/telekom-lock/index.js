export default (symbol) => {
  return function * (next) {
    yield this[symbol]
    yield next
  }
}
