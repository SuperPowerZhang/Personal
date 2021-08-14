console.log(dd)
dd.addEventListener('click',()=>{
    t1()
})
const t1=ttt(()=>{
    console.log(1111)
},1000);
function ttt(fn,delay) {
    let flag=true;
    return function () {
        if(flag){
            flag=false;
            setTimeout(()=>{
                fn();
                flag=true;
            },delay)
        }
    }

}
