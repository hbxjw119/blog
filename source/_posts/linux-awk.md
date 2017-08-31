---
title: linux命令之--awk
date: 2016-011-16 09:14:35
tags: [linux, awk]
category: [shell]
---

`awk`命令是一个强大的文本分析工具，相对于grep的查找，sed的编辑，awk在其对数据分析并生成报告时，显得尤为强大。简单来说awk就是把文件逐行的读入，以空格为默认分隔符将每行切片，切开的部分再进行各种分析处理。
<!--more-->

### awk的基本结构

```bash
awk 'BEGIN{ print "start" } pattern{ commands } END{ print "end" }' file
```

### awk的工作流程

awk语句可以分为三部分：BEGIN、command、END，其中BEGIN和END是可选项，要不要都无所谓，执行开始时，先执行BEGING，然后读取文件，读入有\n换行符分割的一条记录，然后将记录按指定的域分隔符划分域，填充域，$0则表示所有域,$1表示第一个域,$n表示第n个域,随后开始执行模式所对应的动作action。接着开始读入第二条记录······直到所有的记录都读完，最后执行END操作。可以看出，BEGIN和END域里的只在开始和结束时执行一次，中间的command是循环执行的。因此，一般可以在BEGIN域里放一些计数器变量，在循环中累计，最后在END域打印，这样就可以完成一些统计类的工作。

### 示例

最常用的方式是在命令行中，以一个输入，配一个管道，再跟一个awk命令，如
```bash
#输出file的内容，以:为分隔符，打印第一列
cat file | awk -F ':' '{print $1}'
```

```bash
#输出file的内容，以:为分隔符，打印第一，第二列，并用\t分割
cat file | awk -F ':' '{print $1 “,” $2}'
```

```bash
#输出file的内容，只显示有gun关键字的所有列
cat file | awk '/gun/{print $1}'
```

```bash
#求1+2+...+100的和
seq 100 | awk 'BEGIN{sum=0} {sum+=$1} END{print "sum is:" sum}'
```

来个复杂点的
```bash
#统计某个目录下的文件占用的字节数,过滤4096大小的文件(一般都是文件夹):
ls -l |awk 'BEGIN {size=0} {if($5!=4096){size=size+$5;}} END{print "[end]size is ", size/1024/1024,"M"}'
```

可以看出，awk里还支持各种运算，这些运算与C语言提供的基本相同，可以放在BEGIN、command、END任意域中，再来个例子：
```bash
#统计服务器某端口在当前时刻有多少个连接，并打印时间和连接数
netstat -lanp|grep 8080|grep ESTABLISHED|awk '{print $5}'|awk -F ':' '{print $1}'|sort|uniq|wc -l|awk 'BEGIN{a="'$(date +%H:%M:%S)'";}{printf "%s,%d\n",a,$1}'
```

awk编程的内容极多，这里只罗列简单常用的用法
