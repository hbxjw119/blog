---
title: Java 中常用的监控和故障处理命令行工具
date: 2019-02-24 16:13:18
tags: [Java, JVM]
category: [Tech]
---

我们常常需要获取 Java 程序运行过程中的一些执行情况，如执行路径，GC 情况，堆栈信息等。JDK 给我们提供了一些简单但却很有用的命令行工具，本文介绍下这些工具的使用和参数说明，用于备忘。
<!--more-->

### jps: 虚拟机进程状况工具

这个命令和 Linux 下 ps 命令类似，可以理解为 Java 中的进程查看命令，这条命令最主要的功能就是看虚拟机的 ID 号，而这个 ID 号和操作系统中的 PID 是一致的，很多工具，都需要提供 PID 才能做进一步分析，因此，这个命令一般是查问题时第一个会用到的命令。jps 命令有以下这些参数可用：

| 参数       | 作用   | 
| --------   | -----  |
| -q         |  只输出虚拟机 ID 号，不看其他东西
| -m         |  输出虚拟机启动时传给主类 main() 函数的参数
| -l         |  输出主类的全名，如果是 jar 包，输出 jar 路径
| -v         |  输出虚拟机启动时的 JVM 参数
某次 jps 执行样例：
```
root@localhost:~ # jps -mlv
3155 sun.tools.jps.Jps -mlv -Denv.class.path=/root/apache-jmeter-5.0/lib/ext/ApacheJMeter_core.jar:/root/apache-jmeter-5.0/lib/jorphan.jar:/root/apache-jmeter-5.0/lib/logkit-2.0.jar: -Dapplication.home=/usr/lib/jvm/java-1.8.0-openjdk-1.8.0.161-2.b14.el7.x86_64 -Xms8m
25054 org.apache.catalina.startup.Bootstrap start -Djava.util.logging.config.file=/usr/local/zstack/apache-tomcat/conf/logging.properties -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager -Djava.net.preferIPv4Stack=true -Dcom.sun.management.jmxremote=true -Djava.security.egd=file:/dev/./urandom -Xms512M -Xmx4096M -agentlib:jdwp=transport=dt_socket,address=8000,server=y,suspend=n -Djava.endorsed.dirs=/usr/local/zstack/apache-tomcat/endorsed -Dcatalina.base=/usr/local/zstack/apache-tomcat -Dcatalina.home=/usr/local/zstack/apache-tomcat -Djava.io.tmpdir=/usr/local/zstack/apache-tomcat/temp
```
### jstat: 虚拟机统计信息监视工具

这个命令用于监视虚拟机各种运行状态信息，在无 GUI，只有纯命令行的服务器上，它是运行期定位虚拟机性能问题的首选工具，jstat 命令格式为：
```
jstat option vmid interval count
```
其中 interval 和 count 表示查询间隔和次数，如果省略，则只查询一次，如
```
jstat -gc 9527 250 20
```
表示每250ms 查询一次进程为 9527 的垃圾收集情况，共查询 20 次。选项 option 可以有下面这些

| 参数        | 作用 | 
| --------   | -----  |
| -class     |  监视类装载，卸载数量，总空间以及类装载所耗费时间
| -gc        |  监视 Java 堆情况，包括 Eden 区，两个 survivor 区，老年区，永久代的容量，已用空间，GC 时间合计等信息
| -gcnew         |  监视新生代 GC 状况
| -gcold         |  监视老年代 GC 状况
| -gcpermcapacity         |  监视永久代使用的最大、最小空间
如某次 jstat 执行样例：
```
root@localhost:~ # jstat -gcutil 25054 1000 10
S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT     GCT
4.03   0.00  86.89  52.67  98.03  96.14     42   82.191     3    6.057   88.247
4.03   0.00  86.89  52.67  98.03  96.14     42   82.191     3    6.057   88.247
4.03   0.00  86.89  52.67  98.03  96.14     42   82.191     3    6.057   88.247
4.03   0.00  86.89  52.67  98.03  96.14     42   82.191     3    6.057   88.247
4.03   0.00  87.08  52.67  98.03  96.14     42   82.191     3    6.057   88.247
```
上面结果表明：新生代 Eden 区（E，表示 Eden）使用了 86.89% 的空间，Survivor0 区（S0）使用了 4.03%，Survivor1 区（S1）是空的，老年代（O）使用了 52.67%。元空间（M，表示 Metaspace，可以理解为 Java 8 以前的 P，永久代）使用了 98.03%。压缩使用比例（CCS）为 96.14%。从启动到采集时，共发生 Minor GC（YGC，表示 Young GC）42 次，总耗时（YGCT） 82.191 秒，发生 Full GC（FGC）3 次，总耗时（FGCT） 6.057 秒，所有 GC 总耗时（GCT）88.247 秒。

### jmap: 内存映像工具

这个命令用于生成堆转储快照，也称为 heapdump 或 dump 文件，当然还可以通过 -XX:+HeapDumpOnOutOfMemoryError 参数，让虚拟机在 OOM 异常时自动生成 dump 文件。jmap 命令使用方式如下：
```
jmap option vmid
```
如
```
jmap -dump:format=b,file=heapfile.bin 9527
```
表示以二进制格式，生成名为 heapfile 的 dump 文件，9527 为 JVM 的 ID，也即 PID。有了这个 dump 文件，就可以使用下面的 jhat 工具来分析了。

### jhat：堆转储快照分析工具

这个命令和上面的 jmap 配合使用，使用方式如下
```
jhat heapfile.bin
```
jhat 会起一个 server，通过浏览器就可以访问分析结果。不过，一般也很少用 jhat 来分析 dump 文件，首先是 jhat 提供的功能还相对简陋，现在有更多先进的工具，如[VisualVM](https://visualvm.github.io/) 来分析；其次分析 dump 文件是一个耗时又耗硬件资源的工作，一般会把 dump 文件从生产服务器拷贝到其他机器来分析。

### jstack：堆栈跟踪工具

这个命令用来生成虚拟机当前时刻的线程快照，也称为 threaddump 或 javacore 文件，除了 jstack 命令，还有很多其他方式也可以获取线程快照，如[这里](https://community.oracle.com/blogs/ramlakshmanan/)介绍的方法。线程快照就是当前虚拟机内每条线程正在执行的方法堆栈集合，有了线程快照，就可以定位线程出现长时间停顿的原因，如线程间死锁、死循环、请求外部资源长时间等待等，都是造成线程长时间停顿的常见原因。线程出现停顿时，通过 jstack 来查看各个线程调用堆栈，就可以知道没有响应的线程到底在后台做什么，或者等待什么。
使用方式如下
```
jstack option vmid
```

其中 option 可以有如下选项

| 参数        | 作用 | 
| --------   | -----  |
| -F         |  当 jstack vmid 无响应是，-F 强制生成thread dump
| -l         |  除堆栈信息，还打印出锁的附加信息
| -m         |  打印除 java 堆栈外，还打印本地方法的帧

jstack 命令会将堆栈信息直接返回，不会生成文件，因此一般也会把 jstack 打印的堆栈信息重定向到文件，然后直接用其他工具分析，如上文提到的 VisualVM，或一些[在线分析网站](https://fastthread.io/)。

## 总结

以上就是一些常见分析 JVM 和故障处理的工具，这些工具看似简单，但真正用好却非易事，事实上，一个线上 OOM 问题，除了熟练使用好这些工具外，还需要大量的实战经验，这些不是一朝一夕能获得的，需要日常工作中总结和锻炼。

#### 参考：
* 《深入理解 Java 虚拟机》
*  https://www.cnblogs.com/paddix/p/5309550.html
*  http://www.importnew.com/29891.html
