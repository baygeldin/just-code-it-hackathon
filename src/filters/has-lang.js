export default (session) => {
  return function (ctx) {
    return !!ctx[session].nativeLang
  }
}
