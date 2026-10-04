function meet() {
    var now = new Date().getTime();
    var start = new Date("06/25/2020 00:00:00").getTime(); // 在一起的时间
    var days = (now - start) / 1e3 / 60 / 60 / 24;
    var dnum = Math.floor(days);
    document.getElementById("contentAA").innerHTML =
        `<font size=4><b>1. 认识小猫咪已经有 ${dnum} 天 </b> <i id="heartbeat" class='fas fa-heartbeat' style='color:red'></i></font>`;
}

function together() {
    var now = new Date().getTime();
    var start = new Date("09/14/2020 00:00:00").getTime(); // 在一起的时间
    var days = (now - start) / 1e3 / 60 / 60 / 24;
    var dnum = Math.floor(days);
    document.getElementById("contentBB").innerHTML =
        `<font size=4><b>2. 和小猫咪已经在一起 ${dnum} 天 </b> <i id="heartbeat" class='fas fa-heartbeat' style='color:red'></i></font>`;
}

meet();
together();
