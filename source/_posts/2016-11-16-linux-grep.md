---
title: linux命令之--grep
date: 2016-11-16 09:14:35
tags: [linux, grep]
category: [Linux]
---

`grep`命令是linux环境下使用频繁、功能强大的查找命令，基本每天的工作都会用到它，这里对grep命令做个总结，作为备忘
<!--more-->

首先看下grep命令有哪些选项吧

### 选项

```
-a 不要忽略二进制数据。 -A<显示列数> 除了显示符合范本样式的那一行之外，并显示该行之后的内容。 
-b 在显示符合范本样式的那一行之外，并显示该行之前的内容。 
-c 计算符合范本样式的列数。 -C<显示列数>或-<显示列数> 除了显示符合范本样式的那一列之外，并显示该列之前后的内容。 
-d<进行动作> 当指定要查找的是目录而非文件时，必须使用这项参数，否则grep命令将回报信息并停止动作。 
-e<范本样式> 指定字符串作为查找文件内容的范本样式。 
-E 将范本样式为延伸的普通表示法来使用，意味着能使用扩展正则表达式。 
-f<范本文件> 指定范本文件，其内容有一个或多个范本样式，让grep查找符合范本条件的文件内容，格式为每一列的范本样式。 -F 将范本样式视为固定字符串的列表。 
-G 将范本样式视为普通的表示法来使用。 
-h 在显示符合范本样式的那一列之前，不标示该列所属的文件名称。 
-H 在显示符合范本样式的那一列之前，标示该列的文件名称。 
-i 忽略字符大小写的差别。 
-l 列出文件内容符合指定的范本样式的文件名称。 
-L 列出文件内容不符合指定的范本样式的文件名称。 
-n 在显示符合范本样式的那一列之前，标示出该列的编号。 
-q 不显示任何信息。 
-R/-r 此参数的效果和指定“-d recurse”参数相同。 
-s 不显示错误信息。 
-v 反转查找。 
-w 只显示全字符合的列。 
-x 只显示全列符合的列。 
-y 此参数效果跟“-i”相同。 
-o 只输出文件中匹配到的部分。
```

### 常见用法

```bash
#查找正在运行中的某个进程，忽略大小写
ps aux | grep -i 'some_process'
```

```bash
#支持正则查找
ps aux | grep -E '^some_process'
ps aux | grep -E 'something|otherthing'
```

```bash
#上面的命令会在结果中，混入grep进程，如果要过滤掉，则加-v参数，查找除之外的所有进程
ps aux | grep 'some_process' | grep -v 'grep'
```

```bash
#grep还可以在一个目录中，搜索含有某字符的文档，如在当前目录下，查找含有gun字符的文档，并标识出所在的行号
grep 'gun' . -r -n
```
```bash
#查找并打印目标的前后3行
cat log | grep -B3 -A3 'key' 
```

```bash
#使匹配到的字符高亮，更醒目
grep 'gun' . -r -n --color=auto
```

```bash
#只在目录中所有的.php和.html文件中递归搜索字符gun
grep "gun" . -r --include *.{php,html}
```


