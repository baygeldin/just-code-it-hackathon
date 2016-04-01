import languages from './vendor/languages'

export default =>{
  return function (ctx) {
    let arr = []
    for(int i = 0; i < 8; i++){
      arr[i] = languages[i].title
    }
    if ( arr.indexOf(ctx.text.split(indexOf(' ')+1)) === -1){
        return false;
    } else {
    return true;
    }
  }
}
