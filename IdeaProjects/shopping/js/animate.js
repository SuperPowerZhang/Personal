var animateslow = function (obj, target,callback) {
    clearInterval(obj.leaveslow);
    obj.leaveslow = setInterval(function () {
        if (obj.offsetLeft == target) {
            clearInterval(obj.leaveslow);
            callback&&callback();
        }
        //保证盒子能走到目标位置，需要判断正负
        var step = (target - obj.offsetLeft)  > 0 ? Math.ceil((target - obj.offsetLeft) / 20) : Math.floor((target - obj.offsetLeft) /20);
        obj.style.left = obj.offsetLeft + step + 'px';
    }, 15);
}