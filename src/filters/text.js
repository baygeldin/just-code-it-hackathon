export default (str) => {
  return function (ctx) {
    return ctx.text && ctx.text.slice(ctx.text.indexOf(' ') + 1).startsWith(str)
  }
}
