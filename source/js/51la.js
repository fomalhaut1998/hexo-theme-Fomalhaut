try {
    //51.1a
    LA.init({ id: "YOUR_51LA_ID", ck: "YOUR_51LA_CK", hashMode: true });
    //需要把上述内容换成你的id和ck

    //灵雀应用监控
    new LingQue.Monitor().init({ id: "YOUR_LINGQUE_ID", sendSpaPv: true });
    //这里同样换成你的id
} catch (err) { }
