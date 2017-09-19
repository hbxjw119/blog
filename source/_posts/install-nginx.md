---
title: 手动编译安装nginx
date: 2017-08-20 19:14:35
tags: [linux, nginx]
category: [linux, nginx]
---

[Nginx](https://nginx.org/)是一个高性能的HTTP和反向代理服务器，目前已经成为Web开发部署的标配了，基本拿到一台机器或者vps，都要装上nginx，但由于很多Linux发行版的包管理里面的源没有nginx，导致用`yum`或者`apt`都无法安装，需要手动配置，这里记录两种方法安装nginx
<!--more-->

### 用yum安装

既然基础的包管理中没有nginx，那么我们自己手动添加一个nginx的源，方法如下，（注意，以下是在centOS环境下测试过，其他发行版不保证成功）
#### 1. 在`/etc/yum.repos.d`目录下，新建一个配置文件nginx.repo，填写如下内容：
```bash
[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/centos/$releasever/$basearch/
gpgcheck=0
enabled=1
```
保存，这样我们就有了nginx的源
#### 2. 现在可以用yum安装了，执行：
```
yum -y install nginx
```
喝口水，nginx就已经装好了，用此种方法安装的nginx，在`/usr/sbin/nginx`下，配置在`/etc/nginx/`目录下，且已经加入到系统服务中，要启动，直接执行`service nginx start`即可。


### 手动编译安装

有时候遇到非常蛋疼的场景，公司机器不能上外网，这时候就得手动编译安装了，但你要确保有可以编译的软件源码包，如果这个都没有，又不能下，那洗洗睡吧。
编译安装nginx需要准备[pcre](http://www.pcre.org/),[zlib](http://www.zlib.net/),[openssl](https://www.openssl.org/source/)库，下完安装包侯，开始安装了，安装的方法，基本都如出一辙
```bash
tar -xzvf xxx.tar.gz
cd xxx
./configure
make && make install
```
注意的是，openssl库配置编译选项，是`./config`，而不是`./configure`
现在开始安装nginx了，一样的套路
```bash
tar -xzvf nginx-1.12.1.tar.gz
cd nginx-1.12.1
./configure --prefix=/usr/local/nginx
make && make install
```
安装完后，直接运行`./usr/local/nginx/sbin/nginx`，没意外的话，nginx已经启动，如果提示找不到libpcre.so之类的错误，如`error while loading shared libraries: libpcre.so.1: cannot open shared object file: No such file or directory`，
解决办法，则直接建个软链吧
32位系统，执行
```bash
ln -s /usr/local/lib/libpcre.so.1 /lib
```
64位系统，执行
```bash
ln -s /usr/local/lib/libpcre.so.1 /lib64
```
然后再启动，就OK了

最后，直接访问http://your_ip
没问题的话，可以看到nginx的欢迎页面

后面有时间，再整理个nginx配置的文档
