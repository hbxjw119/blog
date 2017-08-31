---
title: 用正则方式批量删除redis里的key
date: 2016-08-11 19:14:35
tags: [Linux, xargs, redis]
category: [shell]
---

redis里面有一批没用的key，这些key以test_开头，要求删掉这些key，在命令行中没法删除，可以写个脚本，一个一个删，也可以用下面xargs命令的方式
<!--more-->

首先进入到redis安装程序所在目录，一般在/usr/bin目录下
然后执行
``` 
/usr/bin/redis-cli -n 0 keys "test_*" | xargs /usr/bin/redis-cli -n 0 del
```
duang，看下是不是删除了？哈哈

这里有个地方需要注意，key里不能有空格，不然后删除失败，如果有，可以将key导入到文件里，然后再
```
cat key | xargs redis-cli del
```


### 顺便看下xargs命令的用法

有很多命令不支持 | 管道来传递参数，如`ls`而日常工作中有这个必要，所以就有了xargs命令，xargs实现的是将管道传输过来的stdin进行处理然后传递到命令的参数位上。也就是说xargs完成了两个行为：**处理管道传输过来的stdin；将处理后的传递到正确的位置上。**
```
find test_* |ls -l       #这个命令是错误的
```
上面这个命令，没法得到以test_开头的文件详情，应该使用下面的这个
```
find test_* |xargs ls -l   #这样才是正确的
```

另一个例子，假如你有一个文件包含了很多你希望下载的URL，你能够使用xargs下载所有链接
```
cat url-list.txt | xargs wget -c
```

