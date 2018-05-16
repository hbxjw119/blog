---
title: linux 命令之--find
date: 2017-11-19 19:14:35
tags: [linux, find]
category: [Linux]
---

`find`命令也是 linux 环境下使用频繁、功能强大的查找命令，基本每天的工作都会用到它，这里对`find`命令做个总结，作为备忘
<!--more-->

首先看下`find`命令的基本结构
```
find path -option [ -print ] [-exec -ok command] {} \;
```

其中`path`就是要查找的路径，如`~`表示在自己个人目录查找，`.`表示在当前目录查找，而且查找是递归查找的。

`option`是比较有用的一个参数，指定了查找的方式，方式可以多种多样，如按命名，按创建时间，按大小，按类型等。

`-print` 表示将匹配到的文件输出

`-exec` 表示对匹配到的文件，执行该参数后面的shell命令。相应的，后面就需要跟上`{} \;`，注意`{}`和`;`之间有空格。

`-ok` 和`-exec`作用相同，只是会让用户决定是否执行

## 常见用法

```bash
# 在家目录中查找.log结尾的文件
find ~ -name "*.log"
```

```bash
# 查找5天前的log文件，并显示
find ~ -mtime +5 -name "*.log" -exec ls -l {} \;

# 查找3天内修改过的log文件，并显示
find ~ -mtime -3 -name "*.log" -exec ls -l {} \;

# 查找1天内被访问过的文件
find ~ -atime -1

# 查找log目录下，更改时间在7天前的文件，并删除
find log/ -type f -mtime -7 -exec rm -f {} \;
```


注意`find`的时间类型，有三种，分别是`mtime`,即modified time，当对文件进行写入操作时，会改变，它跟踪的是文件中数据的改变；`atime`,即access time, 当对文件读取或被执行时，会改变；`ctime`,即change time，当对文件写入、更改所有者、权限、链接设置时，会改变。我们常常使用的`ls -l`，看的都是`mtime`，要看`atime`,`ctime`，可以分别使用`ls -lu`,`ls -lc`。

```bash
# 查找大于512k的文件
find ~ -size +512k

# 查找大于1M的文件
find ~ -size +1M

# 查找大于1G的文件，并删除
find ~ -size +1G -type -f -exec rm -f {} \;
```

```bash
# 查找属于 www 用户的文件
find /etc -user www
```

以上就是`find`命令的一些基本使用方法。
