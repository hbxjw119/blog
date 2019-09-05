---
title: 用正则方式批量删除 redis 里的 key
date: 2016-08-11 19:14:35
tags: [Linux, xargs, redis]
category: [Linux]
---

redis 里面有一批没用的 key，这些 key 以 test_开头，要求删掉这些key，在命令行中没法删除，可以写个脚本，一个一个删，也可以用下面 xargs 命令的方式
<!--more-->

使用方式
```bash
/usr/bin/redis-cli -n 0 keys "test_*" | xargs /usr/bin/redis-cli -n 0 del
```
duang，看下是不是删除了？

这里有个地方需要注意，key 里不能有空格，不然后删除失败，如果有，可以将 key 导入到文件里，然后再执行下面命令
```bash
cat key | xargs redis-cli del
```

## xargs 命令的用法

有很多命令不支持 | 管道来传递参数，如`ls`而日常工作中有这个必要，所以就有了 xargs 命令，xargs 实现的是将管道传输过来的 stdin 进行处理然后传递到命令的参数位上。也就是说xargs完成了两个行为：**处理管道传输过来的 stdin；将处理后的传递到正确的位置上**

比如像找以 test_ 开头的文件详情，有同学可能会这样写
```bash
find test_* |ls -l      
```

上面这个命令，没法得到以 test_ 开头的文件详情，应该使用下面的这个
```bash
find test_* |xargs ls -l   #这样才是正确的
```

另一个例子，假如你有一个文件包含了很多你希望下载的URL，你能够使用xargs下载所有链接
```bash
cat url-list.txt | xargs wget -c
```

