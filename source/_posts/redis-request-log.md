---
title: 使用monitor命令查看redis请求日志
date: 2017-12-13 09:14:35
tags: [redis, monitor]
category: [Tech]
---

redis是一个高性能、使用方便的非关系型数据库，我们在使用redis时，基本只需要关注存数据，取数据的功能，即set，get，非常适合用作缓存服务器，降低后端数据库压力。有时，想确认下数据是否是从redis里读的，以及redis是怎么取得数据，这时就可以使用monitor功能了。
<!--more-->

一个典型的功能场景：前台用户请求一条数据，后端拿到用户id后，在redis缓存中查找该用户数据，没有找到，于是从db中拿，找到后，返回给前台，并在redis里存放该用户的数据，下次有请求后，就可以直接从redis里拿，返回给前台，怎么确认数据是从redis里取的？当然，如果数据量大，查询时又没索引，从数据库里取，和从redis里取的时间消耗是不一样的。从时间消耗上，就基本可以判断数据是从哪里取的。但如果数据量不大，无法从时间消耗上判断，就需要查看redis的请求日志，要注意的是，**单纯从redis.conf中配置logfile，loglevel选项，是看不到redis请求和操作日志的**，打印的都是些无关紧要的信息，这时可以用monitor命令来完成。

使用方法：
登录redis-cli命令行，输入`monitor`，即可进入到redis监控模式。
```
127.0.0.1:6379> monitor
OK
```
随后即可看到，当有请求时，redis具体都做了什么，我们另外打开一个redis-cli，随便插入一条数据，比如`set "hello" "world"`，monitor监控到
![redis-monitor](/images/redis-monitor.png)

再模拟下上面的那个用户请求数据的功能场景：
```python
def get_user_info(uuid):
    #如果redis中存在该用户的信息，则直接返回
    if REDIS.exists(uuid):  
	    return REDIS.get(uuid)

    #否则从mysql中取，并在redis中设置该信息
    try:
        info = mysql_op.query(uuid)
        assert info is not None
        REDIS.set(uuid,info,ex=3600)
    except Exception,e:
        raise e
    return info
```
首次运行后，对应到redis的监控如下，可以看到，redis里没有找到，然后从mysql中查找，并做了set操作将信息存起来，再次运行后，发现redis里存在，因此直接从redis里get数据。
![redis请求日志](/images/redis-request-log.png)
可见，monitor命令可以让我们清楚的看到redis是怎么处理每个请求的，这对于调试阶段非常方便。
当然，为了演示，上面只是一个简单的例子，并没有考虑连接性能问题，实际上，使用monitor是会降低redis的性能的，适合开发调试使用。上述例子也没有考虑数据更新，比如用户是做一个更新或者删除操作，则相应的也要把redis里的信息也同步更新。
