---
title: 由daemon账户到ssh免密登录的一点思考
date: 2016-08-12 09:14:35
tags: [python, monitor, php]
category: [monitor]
---

最近项目上遇到一个这样的场景：
在A服务器上，我有一个监控脚本monitor.py，可以用来监控远程服务器的资源消耗情况，比如CPU,内存,IO等信息。
<!--more-->

输入参数为服务器名hostname或ip，比如执行
```bash
python monitor.py 198.111.11.11
```
即可输出该远程机器资源消耗信息

既然要获得远程服务器的资源占用情况，我的做法是事先在A服务器上生成我自己的公密钥对，然后把公钥复制到所有监控的服务器上。达到在monitor脚本中，从A服务器免密登录到所有其他监控机器的目的。既然登录到指定机器了，那获得资源消耗情况就很简单了，一个top命令，然后正则提取出来想要的信息。

现在的问题是：我要从前端一个的URL提交监控参数hostname，调用后端的监控脚本。这种情况下，监控脚本就不能正常工作了，为什么呢？来分析下流程:

前端提交URL，比如输入http://xxx.net/monitor.php?p=hostname，后端monitor.php脚本接收到hostname参数，执行了
```bash
exec(‘python monitor.py hostname’)
```

该代码执行跟在命令行中执行python monitor.py hostname是一样的，但却无法成功，**因为这行代码的执行者，是服务器而不是我本人**，如果你给apache服务器起的名字为daemon，那么执行monitor.py脚本的就是daemon，而我monitor里免密登录到远程机器，用的是我自己的账户，daemon用户是个虚拟的，远程机器根本就不存在这个用户，就算存在，你不知道daemon的密码，也是没法登录的，执行monitor会得到一个超时或者请输入daemon的密码之类的错误。这种方式是不可行。

其实这里，如果在apache配置文件中，把apache用户改为我自己的用户，也是可以的，但这样影响面就有点大，因为这会改变这台机器web目录中所有文件的所有者为你自己的名字，可能影响到其他用户涉及到权限的操作。

后来换了个思路，不直接从前端启动脚本，而是通过写文件的方式，我把前端的参数写入到一个文件里，然后监控这个文件的变化，如果文件有新内容写入，把内容提取出来，然后去执行monitor脚本，这样我在后端必须要在起一个监控脚本，该脚本在后台一直运行着，用来监测文件变化，一旦文件变化，就执行monitor，由于这个监控脚本是我本人执行的，那么最后monitor当然也就是我执行的，问题解决。
监控文件或目录变化，python中有个库，叫pyinotify，用法如下，代码一看就懂，不解释了

```python
import os
from pyinotify import WatchManager, Notifier, ProcessEvent, IN_DELETE, IN_CREATE, IN_MODIFY
  
class EventHandler(ProcessEvent):
    def process_IN_CREATE(self, event):  #监控是否有文件创建，如果有，则进入该函数
        print "Create file:%s." %os.path.join(event.path,event.name)
        os.system('cp -rf %s /tmp/bak/'%(os.path.join(event.path,event.name)))
    def process_IN_DELETE(self, event):  #监控是否有文件被删除，如果有，则进入该函数
        print "Delete file:%s." %os.path.join(event.path,event.name)
    def process_IN_MODIFY(self, event):  #监控是否有文件修改，如果有，则进入该函数
        print "Modify file:%s." %os.path.join(event.path,event.name)
        #监控文件变化，在这里执行monitor.py
        with open('/home/zhangsan/monit') as f:
            hostname = f.readlines()[-1]
        order = 'python monitor.py %s' % hostname
        os.system(order)
  
def FsMonitor(path='.'):
    wm = WatchManager()
    mask = IN_DELETE | IN_CREATE | IN_MODIFY
    notifier = Notifier(wm, EventHandler())
    wm.add_watch(path, mask, auto_add= True, rec=True)
    print "now starting monitor %s." %path
  
    while True:
        try:
            notifier.process_events()
            if notifier.check_events():
                print "check event true."
                notifier.read_events()
        except KeyboardInterrupt:
            print "keyboard Interrupt."
            notifier.stop()
            break
  
if __name__ == "__main__":
    FsMonitor("/home/zhangsan/")  #监控该目录，若该目录文件有变化，比如创建，更改，删除，则会进入到相应处理事件

```
