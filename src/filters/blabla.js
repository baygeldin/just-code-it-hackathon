import languages from '../vendor/languages'

export default () => {
  return function (ctx) {
    let arr = []
    for(let i = 0; i < 8; i++){
      arr[i] = languages[i].title
    }
    console.log(arr.indexOf)
    if (arr.indexOf(ctx.text.slice(ctx.text.indexOf(' ')+1)) === -1){
        return false;
    } else {
    return true;
    }
  }
}
