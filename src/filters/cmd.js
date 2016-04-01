export default (str) => {
  return function (ctx) {
    return ctx.text ? ctx.text.startsWith(`/${str}`) : false
  }
}
