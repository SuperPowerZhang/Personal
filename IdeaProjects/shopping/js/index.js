window.addEventListener('load', function () {
    console.log(1);
})
var pk = document.querySelector('.pk');
var lt = pk.querySelector('.lt');
var gt = pk.querySelector('.gt');
var lis = pk.querySelectorAll('li');
var ol = pk.querySelector('ol');
ul = pk.querySelector('ul');
//3、在ol中生成小圆圈，同时添加点击事件（点击的小圆圈雷鸣为current，变红
for (var i = 0; i < lis.length; i++) {
    li = document.createElement('li');
    li.setAttribute('index', i);
    li.addEventListener('click', function () {
        for (var j = 0; j < ol.children.length; j++) {
            ol.children[j].className = '';
        }
        this.className = 'current';
        //点击小圆圈要把索引号给num和numCir，不然圆圈点击会和左右按钮分离
        num = this.getAttribute('index');
        numCir = this.getAttribute('index');
        //4、给小圆圈添加事件，点击显示小圆圈对应图片
        var ulDis = -this.getAttribute('index') * pk.offsetWidth;
        animateslow(ul, ulDis);
    })
    ol.appendChild(li);
}
ol.children[0].className = 'current';

//1、鼠标放上，显示图片左右的按钮
pk.addEventListener('mouseenter', function () {
    lt.style.display = 'block';
    gt.style.display = 'block';
    clearInterval(timer);
    //清除定时器变量
    timer = null;
});
//2、鼠标离开，左右按钮消失
pk.addEventListener('mouseleave', function () {
    lt.style.display = 'none';
    gt.style.display = 'none';
    timer = setInterval(function () {
        gt.click();
    }, 2000);
});
//5、克隆第一章图片，放在ul的最后
var first = lis[0].cloneNode(true);
ul.appendChild(first);
//6、右边按钮点一下，图片左移一次;
var num = 0;
var numCir = 0;
//flag是节流阀
var flag = true;
var circles = ol.querySelectorAll('li');
gt.addEventListener('click', function () {
    if (flag) {
        flag = false;
        if (num == ul.children.length - 1) {
            ul.style.left = 0;
            num = 0;
        }
        num++;
        console.log(num);
        animateslow(ul, -num * pk.offsetWidth, function () {
            flag = true;
        });
        //7、右移时小圆圈也进行变化
        numCir++;
        if (numCir == ol.children.length) {
            numCir = 0;
        }
        for (var i = 0; i < ol.children.length; i++) {
            ol.children[i].className = '';
        }
        ol.children[numCir].className = 'current';
    }
})
//8、左边按钮按一次，图片右移一次
lt.addEventListener('click', function () {
    if (flag) {
        flag = false;
        if (num == 0) {
            num = ul.children.length - 1;
            //一定要记得加px
            ul.style.left = -num * pk.offsetWidth + 'px';
        }
        num--;
        numCir--;
        console.log(flag);
        animateslow(ul, -num * pk.offsetWidth, function () {
            flag = true;
        });
        console.log(flag);
        if (numCir < 0) {
            numCir = ol.children.length - 1;
        }
        for (var i = 0; i < ol.children.length; i++) {
            ol.children[i].className = '';
        }
        ol.children[numCir].className = 'current';
    }

})
//9、自动播放，相当于手动调用了
var timer = setInterval(function () {
    //手动调用点击事件
    gt.click();
}, 2000);


