var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
// var xhr = new XMLHttpRequest();


function productClickHandler() {
    var xhr = new XMLHttpRequest(); // 创建xhr对象
    xhr.onreadystatechange = function() {
        if(xhr.readyState == 4) {
            if((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                // var result = JSON.parse(xhr.responseText); // 将字符串转化为对象，然后才能获取到返回字符串中的某一个值
                var result = xhr.responseText; // 将字符串转化为对象，然后才能获取到返回字符串中的某一个值
                // console.log(result.toString()); // 获取返回字符串中的某一个值
            } else {
                alert('Request was unsuccessful: ' + xhr.status);
            }
        }
    }
    var url = 'https://raw.githubusercontent.com/wangyuan249/actioTestRepo/master/userList.md'; // 获取课程列表,带参数的get请求
    xhr.open('get', url, false); // 开启一个请求，但还没有向服务器端发起请求，执行后redayState的值变为1  async false 好像是异步 响应更快一些 true不太行s
    xhr.send(null); // 向服务器端发起请求，执行后redayState的值变为2   // 补充：当服务器端开始返回请求数据的时候，浏览器端接收到这个数据，redayState的值变为3。   //      当浏览器端结束请求时，redayState的值变为4，status的值变为200（表示请求成功），responseText变为相应的返回值。
    return xhr.responseText.toString()
}
res = productClickHandler()
console.log("res\n", res)