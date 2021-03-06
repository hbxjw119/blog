---
title: 由 lnmp 一键安装脚本所引发的错误
date: 2017-09-12 09:14:35
tags: [linux, php, lnmp]
category: [Tech]
---

在装[lnmp](https://lnmp.org/)全家桶时，有时为了方便，会直接用一键安装脚本，一条命令，就把所有的环境都装好了，简单省事，但有时出现配置错误，也不太好排查，分享一个遇到的问题。
<!--more-->


我安装好 lnmp 环境后，启动一个简单的 php 框架项目时，却报错，错误如下图所示
![报错log](/images/error-log.jpg)
大意就是 web 目录被限制，不能访问。查了下 php.ini，里面并没有配置`open_basedir`选项，按理说应该没问题。找了很久都没有找到是在哪里配置了这个。最后[grep](http://www.xujimmy.com/blog/2016/11/16/linux-grep.html)了下,发现是在装lnmp时，一键安装脚本自作主张，在两个地方，设置了该配置:
1. 脚本在web根目录新建了个`.user.ini`的隐藏文件，里面配置了`open_basedir`，如图：
![user.ini](/images/user-ini.jpg)
2. 另外一个是在nginx的fastcgi.conf中，配置了一个变量，如下：
![fastcgi.conf](/images/fastcgi-conf.jpg)

正因为这两个配置，导致出现开头所见的问题。

解决办法就是去掉这两个配置，删第二个地方的配置简单，直接删除`open_basedir`那行，然后重启fpm和nginx即可。第一个地方删除.user.ini文件时比较奇怪，我直接用root账户去删，仍然提示无权限，google查了下，发现是文件属性被改变了，具体点就是用`chattr`命令改变文件或目录的属性，使之不得以任意方式删除或更新。哪怕是root用户，这个跟`chmod`命令改变文件权限功能类似，`chmod`命令只是改变文件的读写、执行权限，而`chattr`命令则是更彻底的改变文件属性。`chattr`使用方式如下：
```bash
chattr [-RV][-v<版本编号>][+/-/=<属性>][文件或目录...]
```
参数：
　　-R 递归处理，将指定目录下的所有文件及子目录一并处理。
　　-v<版本编号> 设置文件或目录版本。
　　-V 显示指令执行过程。
　　+<属性> 开启文件或目录的该项属性。
　　-<属性> 关闭文件或目录的该项属性。
　　=<属性> 指定文件或目录的该项属性。

其中属性参数如下：
```bash
a：让文件或目录仅供附加用途。
b：不更新文件或目录的最后存取时间。
c：将文件或目录压缩后存放。
d：将文件或目录排除在倾倒操作之外。
i：不得任意更动文件或目录。
s：保密性删除文件或目录。
S：即时更新文件或目录。
u：预防以外删除。
```
举个例子
```bash
#防止系统中某个关键文件被修改
chattr +i /etc/resolv.conf
```
这样root用户都改不了resolv.conf文件了，查看下该文件的属性：
```bash
lsattr /etc/resolv.conf
```
会显示
```bash
----i-------- /etc/resolv.conf
```

回到之前的问题，查看下.user.ini文件的属性
```
lsattr .user.ini
```
返回
```
----i------e- .user.ini
```
看到文件确实是被锁定了，修改如下
```
chattr -i .user.ini
```
然后再删除就成功了。为什么该文件会被锁定？答案在lnmp安装脚本中：
![install.sh](/images/chattr.jpg)

## 总结

* 安装一个软件，要知道安装过程中，那些脚本到底是做了什么，这样出了问题才好找
* 网上的一键安装脚本，可以用，但要慎重
