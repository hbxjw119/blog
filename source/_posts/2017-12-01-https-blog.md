---
title: 给博客启用 HTTPS
date: 2017-12-01 19:14:35
tags: [HTTPS, acme, 阿里云]
category: [Tech]
---

在几个月前，当博客放到阿里云时，就想尝试下开启 HTTPS，在尝试之前，我读了几篇启用 HTTPS 的经验文章，发现现在有了很方便的工具：[acme.sh](https://github.com/Neilpang/acme.sh)。基本不用你做太多额外操作，即可开启 HTTPS。
<!--more-->

在我严格按照 acme.sh 项目的[wiki](https://github.com/Neilpang/acme.sh/wiki/%E8%AF%B4%E6%98%8E)操作完成后，发现始终无法使用 HTTPS 访问我的博客，当时实在百思不得其解呀。奈何身边又没有玩 HTTPS的同事，遂放弃了。后来过了几个月，我突然想起，会不会是端口没打开？于是登录阿里云，在安全组里，开启了443端口，再配置一遍 ssl，重启 nginx，访问。duang，终于出现了绿色小锁标志。看来就是这个原因了！困扰我这么久。

**所以如果你的 blog 用的是阿里云，在开启 HTTPS 时，请留意下，443 端口是否开启。以及在使用其他厂商的 VPS 时，都应该注意是否有安全组，要使用指定端口，必须得在安全组中配置。**

另外一个可能需要注意的地方是，在用 acme.sh 安装证书步骤中，有一个自动更新证书的命令，
```bash
acme.sh --reloadcmd "service nginx force-reload"
```
如果提示force-reload命令不存在，那么需要更新下 nginx 的操作脚本。或者直接把`force-reload`换为`restart`，效果是一样的。

这里贴上我的 nginx 中与 HTTPS 有关的配置
```nginx
server {
    listen 80;
    server_name xujimmy.com www.xujimmy.com;
    return 301 HTTPS://xujimmy.com$request_uri;

}
server {
    listen 443 ssl http2 fastopen=3 reuseport;

    server_name xujimmy.com www.xujimmy.com;
    root /home/jimmy/git_project/blog/public;
    index index.html index.htm index.shtml index.php;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

    # 中间证书 + 根证书
    ssl_certificate /usr/local/nginx/ssl/fullchain.cer;

    # 创建 CSR 文件时用的秘钥
    ssl_certificate_key /usr/local/nginx/ssl/xujimmy.key;

    # openssl dhparam -out dhparams.pem 2048
	# 如果没有下面这个DHE参数，ssl评分不会到A+，证书生成过程较长
    ssl_dhparam /usr/local/nginx/ssl/dhparam.pem;


    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;

    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 5m;

    # RSA + ECDSA 双证书
    ssl_ciphers "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK";

    ssl_prefer_server_ciphers on;
     
    # 其他配置
```

简单解释下配置中的几个选项

### HSTS

即配置中的`Strict-Transport-Security`( HTTP 严格传输安全，简称 HSTS )，在访问网站时，用户很少直接在地址栏输入`https://`，总是通过点击链接，或者 3xx 重定向，从 HTTP 页面进入 HTTPS 页面。攻击者完全可以在用户发出 HTTP 请求时，劫持并篡改该请求。另一种情况是恶意网站使用自签名证书，冒充另一个网站，这时浏览器会给出警告，但是许多用户会忽略警告继续访问。

HSTS 的作用，就是强制浏览器只能发出 HTTPS 请求，并阻止用户接受不安全的证书。所以加上这段头信息，有以下两个作用：
1. 在接下来的一年(即31536000秒)中，浏览器只要向`xujimmy.com`或者其子域名发送 HTTP 请求时，必须采用 HTTPS 来发起连接，用户点击超链接或者直接在地址了输入`http://xujimmy.com`，浏览器将自动在本地将 HTTP 转写为 HTTPS，然后向`https://xujimmy.com`发送请求。
2. 在接下来的一年中，如果`xujimmy.com`服务器发送的证书无效，用户不能忽略浏览器警告，将无法继续访问该网站。

### 安全相关

即配置中以 ssl 开头的选项，是启用 HTTPS 后，服务器需要配置的，这样才能发挥 HTTPS 最大价值。

关于`ssl_dhparam`，可以参考这篇[文章](https://weakdh.org/sysadmin.html)。

将`ssl_prefer_server_ciphers`配置为 on，可以确保在 TLSv1 握手时，使用服务端的配置项，以增强安全性。

## 总结

如果已经用 acme.sh 工具成功生成证书，并安装到指定位置，那么重启 nginx，访问你的博客，即可看到，页面自动跳转到 HTTPS，well done！

最后，你可以在[这里](https://www.ssllabs.com/ssltest/)测试下你的博客的 ssl 评级。填写你的博客地址，过一会儿就会出结果。经过一番折腾，我的评级为A+，如果你的配置我和一样，也应该是A+。

需要注意的是，如果博客里有采用 HTTP 协议访问的静态资源，需要统一换到 HTTPS。
