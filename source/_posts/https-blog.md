---
title: 给博客启用https
date: 2017-12-01 19:14:35
tags: [https, acme]
category: [Tech]
---

在几个月前，当博客放到阿里云时，就想尝试下开启https，在尝试之前，我读了几篇启用https的经验文章，发现现在有了很方便的工具：[acme.sh](https://github.com/Neilpang/acme.sh)。基本不用你做太多额外操作，即可开启https。
<!--more-->

在我严格按照acme.sh项目的[wiki](https://github.com/Neilpang/acme.sh/wiki/%E8%AF%B4%E6%98%8E)操作完成后，发现始终无法使用https访问我的博客，当时实在百思不得其解呀。奈何身边又没有玩https的同时，遂放弃了。后来过了几个月，我突然想起，会不会是端口没打开？于是登录阿里云，在安全组里，开启了443端口，再配置一遍ssl，重启nginx，访问。duang，终于出现了绿色小锁标志。看来就是这个原因了！困扰我这么久。

所以如果你的blog用的是阿里云，在开启https时，请留意下，443端口是否开启。

另外一个可能需要注意的地方是，在用acme.sh安装证书步骤中，有一个自动更新证书的命令，
```
acme.sh --reloadcmd "service nginx force-reload"
```
如果提示force-reload命令不存在，那么需要更新下nginx的操作脚本。或者直接把`force-reload`换为`restart`，效果是一样的。

这里贴上我的nginx中与https有关的配置
```nginx
server {
    listen 80;
    server_name xujimmy.com www.xujimmy.com;
    return 301 https://xujimmy.com$request_uri;

}
server {
    listen 443 ssl http2 fastopen=3 reuseport;

    server_name xujimmy.com www.xujimmy.com;
    root /home/jimmy/git_project/blog/public;
    index index.html index.htm index.shtml index.php;

    # 中间证书 + 根证书
    ssl_certificate /usr/local/nginx/ssl/fullchain.cer;

    # 创建 CSR 文件时用的秘钥
    ssl_certificate_key /usr/local/nginx/ssl/xujimmy.key;

    # openssl dhparam -out dhparams.pem 2048
	# 如果没有下面这个DHE参数，ssl评分不会到A+，证书生成过程较长
    ssl_dhparam /usr/local/nginx/ssl/dhparam.pem;

    add_header Strict-Transport-Security "max-age=15768000; includeSubDomains; preload" always;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;

    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 5m;

    # RSA + ECDSA 双证书
    ssl_ciphers "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK";

    ssl_prefer_server_ciphers on;
     
    # 其他配置
```
如果已经用acme.sh工具成功生成证书，并安装到指定位置，那么重启nginx，访问你的博客，即可看到，页面自动跳转到https，well done！

最后，你可以在[这里](https://www.ssllabs.com/ssltest/)测试下你的博客的ssl评级。填写你的博客地址，过一会儿就会出结果。经过一番折腾，我的评级为A+，如果你的配置我和一样，也应该是A+。

需要注意的是，如果博客里有采用http协议访问的静态资源，需要统一换到https。
