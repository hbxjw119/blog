---
title: 关于redis使用总结
date: 2016-08-02 09:14:35
tags: [linux, redis]
category: [Tech]
---

最近的项目一直在使用redis，在参考前人文章的基础上，本文也对redis的使用做一个简单的归纳总结。
<!--more-->

redis是一个开源的，K-V型存储的数据库，可用于构建高性能、可扩展的web应用程序的存储解决方案。
与MySQL的这类数据库相比，Redis有如下几个特点：

* redis是完全在内存中保存数据的数据库，使用磁盘只是为了持久性目的；
* redis相比许多键值数据存储系统有相对丰富的数据类型；
* redis可以将数据复制到任意数量的从服务器中；

## redis有哪些优点？

* 快速：Redis将数据保存在内存，读写速度非常快，每秒可执行8W次读写操作，适合那种对数据读写速度有要求的业务
* 数据类型丰富：Redis可保存的数据类型非常多，如列表，集合，可排序集合，哈希等数据类型。
* 操作原子性：所有 Redis 的操作都是原子，从而确保当两个客户同时访问 Redis服务器得到的是更新后的值（最新值）。
* 数据更新：由于Redis将数据放在内存中，时间长会导致内存占用过大，因此Redis的上数据可以设置过期时间，时间到了，数据就自动删除。

## redis使用

### Linux上安装redis
```bash
$ sudo apt-get install redis #cenOS用yum install redis
```
或者直接下载redis源代码安装

### 启动redis

安装完后，就可以启动redis服务了，启动前，最好配置下redis的配置文件，一般路径在/etc/redis.conf，配置文件里写有redis启动的端口，log位置，数据备份到磁盘等常用设置，根据需要修改。为了安全，最好不要用root用户启动。并且给redis设置一个密码。执行命令
```bash
$ redis-server redis.conf
```
启动完毕，执行下面命令进入redis交互命令行：
```bash
$ redis-cli
```
### 使用redis

进入到交互命令行后，可以查看key和设置key，查看所有的key：
```bash
127.0.0.1:6379>keys *
```

设置key,value：
```
127.0.0.1:6379>set test “hello”
```
获得key的value：
```
127.0.0.1:6379>get test
```
删除key:
```
127.0.0.1:6379>del test
```

查询时，redis支持正则匹配，比如要看key为test1，test2，test3…有哪些，可以使用keys “test*” 即可

### 关闭redis，进入到redis-cli目录，执行:
```
$ ./redis-cli shutdown
```
其他命令，可以参看redis手册

## 在Python中使用redis

Python中使用redis，首先要下载一个redis扩展包，并安装，安装很简单，直接进入到解压目录，执行build，install等命令就完了。或者直接pip安装
```
pip install redis
```
按照好扩展后，可以用如下方式使用：
```python
#coding=utf-8
import redis
import json
class RedisOP:
    def __init__(self,host,port,db=0,pw='password'):
        self.host = host
        self.port = port
        self.db = db
        self.pw = pw
        self.conn = self._connect()
    def _connect(self):#建立连接
        return redis.Redis(host=self.host,port=self.port,db=self.db,password=self.pw)
    def getConn(self):#获取连接
        return self.conn
if __name__=='__main__':
    rop = RedisOP(host='127.0.0.1',port=6379)
    rconn = rop.getConn()
    rconn.set('test','value')
    rconn.set('test2','othervalue') 
    rconn.expire('test2',60*3600) #给test2设置过期时间，1小时候过期
    print reconn.get('test')
```
