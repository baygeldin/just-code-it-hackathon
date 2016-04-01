export default (str) => {
  return function (ctx) {
    return ctx.text.slice(ctx.text.indexOf(' ') + 1) === str
  }
}
