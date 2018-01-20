---
title: 关于Cookie和Session的几点问题
date: 2017-01-11 11:14:35
tags: [php, Cookie, Session]
category: [Tech]
---

咱做web开发的，任何时候都少不了要和Cookie以及Session打交道，我们平时主要用他们来实现用户的登陆和用户的信息存储。说到Cookie和Session，我们一般会很简单地想到他们一个是客户端的存储机制，一个是服务器端的存储机制。然而，事实是否真的仅仅是这样的呢？
<!--more-->

在聊之前，我们先一起思考如下几个问题：
1. 我们一般认为Cookie运行在客户端而Session运行在服务器端，所以当我们关闭浏览器（即将客户端和服务器端的链接断开）时，Session一般就消失了而Cookie可以保留。这是真的吗？
2. 浏览器禁止Cookie，Cookie就不能用了，但Session不会受到影响，这是真的吗？
3. Session是否真的比Cookie更加安全呢？
4. 我们发现，使用IE登陆腾讯网后，在同一台机子上使用Firefox打开腾讯的页面，发现已经有了登陆的状态，那么是否说明Cookie可以在不同浏览器之间共享呢？
5. 如果把别人的Cookie复制到我的电脑上，假设我使用一样的浏览器，那么我是否可以直接登陆别人的账号呢？

## 什么是Cookie？

cookie是存储在客户端的一小段数据，客户端通过HTTP协议和服务器端进行Cookie交互。也就是说，Cookie独立于任何语言存在，无论PHP，JSP，ASP下的Cookie，都是一样的，因为他们都能被JavaScript这种客户端脚本读取到。PHP之类的语言通过发送HTTP指令，通过浏览器等客户端实现对Cookie的操作，其本身是无法设置或操作Cookie的。
Cookie主要是参照RFC2109标准由客户端实现生成，使用等整个过程，服务器端则参照此标准实现和客户端之间的交互指令。
我们都知道PHP设置Cookie的函数setcookie()。
我们来看看其在C解释器中的函数原型：
```c
Bool setcookie(string $name[,string $value[,int $expire = 0[,string $path[,string $domain[,bool secure = false[,bool $httponly = false]]]]]])  
```
对web开发有了解的朋友应该是很熟悉前面几个参数的，即cookie对应的键，值，有效时间，有效目录，作用域名。
对于第六个参数$secure，它主要是用来设置是否对cookie进行加密传输，默认为false，若设置为ture，则只有在使用HTTPS的情况下，这个cookie才可以被设置。
第七个参数$httponly，设置是否只使用HTTP访问cookie，若设置为true，则客户端脚本（如JavaScript）将无法访问该cookie，这个参数一定程度上可以降低XSS攻击的风险，但注意不是所有浏览器都支持该参数，而且只在PHP5.2.0以上版本有效。
好，现在让我们看一段PHP代码：
```php
<?php
    $cookie_1 = setcookie("cookie1","jimmy",time()+3600,'','','',1);  
    $cookie_2 = setcookie("cookie2","home");  
    if($cookie_1 && $cookie_2)  
       print_r($_COOKIE);  
```

直接在浏览器运行这个脚本，我们发现显示了一个空数组array()
而刷新一下页面，显示如下图：
![cookie](/images/cookie-session/cookie.jpg)
这说明PHP在当前页设置的cookie不是立即生效的，需要等到下一个页面才能生效。这是由于设置在这个页面里的cookie命令由服务器传递给客户端浏览器，需要到下一个页面，即下一次连接，浏览器才能把cookie从机器里取出传递回服务器。但注意JavaScript这类客户端脚本设置的Cookie是立即生效的。
然后，我们在控制台通过JavaScript获取cookie，我们可以清楚地看到js只能获取到cookie2，这是因为cookie1把httponly设置成了ture，从而屏蔽了js脚本对cookie的读取。

## 我们下面来聊聊cookie的存储机制。

前面说到，cookie是保存在客户端的一小段数据，那么它究竟保存在哪呢？
有两种情况，一种是保存在文件中，一种是保存在浏览器内存中。
对于第一种情况，不同浏览器有不同的管理机制，比如IE保存在每个域名下的文本文件，而Firefox和Chrome在SQLite数据库中进行管理。我们现在分别就第一，第二种情况进行一些讨论。
选择Chrome开发者工具中的Application，如下图
![cookie存储](/images/cookie-session/cookie-save.jpg)
可以看到刚刚生成的两条cookie。
现在重启浏览器，再次查询
![重启浏览器后的cookie](/images/cookie-session/cookie-second.jpg)
我们发现cookie1还在而cookie2不见了，这是因为我们在设置cookie参数时把失效时间设置为空，也就是当浏览器关闭时失效，这时cookie存储在内存中，当Chrome进程终止，其系统资源被回收，这时存储于内存中的cookie自然也就被注销了。很容易理解，我们如果重新运行PHP脚本则Cookie1和Cookie2都会重新生成。

再用其他的浏览器，打开cookie管理器，会发现只有缓存文件而没有cookie。现在理解了吧，cookie是由浏览器等客户端完全独立管理的。因为不同浏览器的Cookie管理机制不同，所以cookie不可能在浏览器之间共享。对于第四个问题，其实是因为我们在安装腾讯QQ时自动安装了针对不同浏览器的插件，可以识别已经登陆的QQ号码而自动登陆。朋友们可以试试把QQ完全卸载再从网页登陆腾讯网，哈哈，所以这和Cookie共享是完全没有任何关系的。
刚刚聊到存在内存中的Cookie，有的朋友可能会问，这不就是Session么？关闭浏览器就失效。

## Session又是什么呢？

从性质上讲，Session即回话，指一种持续性的，双向的连接。对于web而言，Session指用户在浏览某个网站时，从进入网站到浏览器关闭这段时间的会话。所以，Session实际上是一个特定的时间概念。

### Session是如何工作的呢？
我们知道Session是用来存储客户端状态信息的，Session通过一个称为PHPSESSID的Cookie和服务器联系。Session是通过sessionID判断客户端用户的，即文件的文件名。php开启一个Session很简单，如下：
```php
<?php
session_start();
```
刷新浏览器，如下，可以看到有个叫PHPSESSID的Cookie。
![img](/images/cookie-session/session.jpg)

SessionID实际上是在客户端和服务器端之间通过HTTP Request和HTTP Response传来传去。sessionID按照一定算法生成，必须包含在HTTP Request里面，保证唯一性和随机性，以确保Session的安全。

### 那么是不是关闭了浏览器，所有Session就都被注销了呢？

如果没有设置Session的生命周期，则SessionID存储在内存中，此时关闭浏览器Session自动注销。而我们已经知道，sessionID是通过PHPSESSID这个Cookie存储在本地的。那么在浏览器不禁用Cookie的前提下，当然可以通过setcookie()或者seession_set_cookie_params()函数设置Session的生存期，Session过期后，PHP会对其进行回收。所以，Session并非都是随着浏览器的关闭而消失的。

当然，如果你的浏览器禁用Cookie，那么所有所有Session的生存周期都是浏览器进程，关闭浏览器，再次请求页面又将重新生成Session。不过我们也有其他办法进行sessionID的传递，比如URL传参，但是这种方式极度危险，强烈不推荐。此外，还可以通过修改php.ini的session.use_trans_sid参数，实现连接时自己自己添加Session的ID这个在这里暂时不做讨论了，大家想玩就自己尝试吧。

好了，那么现在对于文章开头的几个问题，大家应该都有自己的答案了吧？

第一个问题，虽然Session的确是运行在服务器的，但是sessionID却通过Cookie保存在客户端，所以也不尽然。

第二题，禁止了Cookie，页面的SessionID将无法使用PHPSESSID进行传递，大家可以先登陆某一网站，然后删除浏览器数据，会发现刷新页面或切换页面后将丢失登陆状态，当然我们可以用其他方式替代Cookie进行Session传值，但是很明显，Session会受Cookie禁用的影响。

第三题，存在本地的Cookie确实存在一些不安全因素，但是没人会把安全验证完全放在前端，而且我们知道一般Session是通过sessionID和Cookie进行绑定的，客户端的Cookie一旦被劫持就相当与Session被劫持，服务器验证Cookie的同时将原封不动地完成对Session的验证，所以Session比Cookie安全纯属无稽之谈。

第四题前面讨论过，这里不废话了

第五题，原则上讲是可行的，我们将其称为Cookie劫持，然而我们可以通过在Cookie中加入基于IP等特定信息的参数优化Cookie的验证过程，从而避免这一危险。

转载自：http://blog.csdn.net/hjtl1992/article/details/26006867
