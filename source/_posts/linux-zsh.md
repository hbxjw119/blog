---
title: 使用zsh，重新打造你的Linux工作环境
date: 2017-06-20 19:14:35
tags: [linux, zsh]
category: [linux, zsh]
---

对于经常在Linux环境下干活的码农们，shell可以说是我们使用频率最高的程序了，shell为我们和机器间建立了一个桥梁，它给我们提供一系列命令，我们就可以和机器进行愉快的交流了，比如写代码用`vim`命令，查找文件使用`find`,`grep`命令，版本控制使用`git`，查看机器性能使用`top`，bash就是shell的一种，也是Linux下的默认shell程序，现在让我们使用zsh，重新打造一个更加人性化的shell
<!--more-->

### zsh是什么

zsh属于shell的一种，和bash一样，但比bash更好用，zsh完全兼容bash，其强大的自动补全参数、文件名、以及自定义功能，可以提高我们的效率。


### 安装zsh

说了这么多，让我们安装个zsh尝尝鲜吧，安装zsh灰常简单，centOS用户，只用下面一条命令即可安装成功
```bash
yum install zsh
```
看下系统现在有哪些shell可以用
```bash
cat /etc/shells
```
![安装zsh成功](/images/zsh.jpg)
可以看到，zsh已经被正确安装了


### 安装oh-my-zsh

zsh虽然好用，但配置起来还比较麻烦，不过幸运的是，已经有大神给我们配置好了一个很棒的框架：[oh-my-zsh](https://github.com/robbyrussell/oh-my-zsh)，我们只需要安装使用就可以了，一条命令搞定：
```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```
没有意外的话，你会看到下面这张图字样，说明oh-my-zsh已经安装好了
![oh-my-zsh安装成功](/images/oh-my-zsh.jpg)

### 使用

接下来简单配置和学习下oh-my-zsh的使用方式，就可以愉快玩耍（带你装B带你飞）了

#### 主题

首先设置下主题吧，oh-my-zsh提供了很多主题，主题的配置文件在`~/.zshrc`文件中可以看到，找到下面这行
```
ZSH_THEME="robbyrussel"
```
可以将值改为其他类型，oh-my-zsh的主题可以在[这里](https://github.com/robbyrussell/oh-my-zsh/wiki/themes)找到，当然，如果你再狂野点，直接改为"random"也是可以的...以后每次登陆，都能换个不同的口味，下面是我个人用的`agnoster`主题。
![agnoster主题](/images/agnoster.jpg)

#### 命令补全

虽然bash下，tab是一个好用的补全命令，但oh-my-zsh提供了更加强大的命令补全工具，很多时候，你只需要输入一条命令，然后按tab，oh-my-zsh就可以自动给你补全该条命令其他的参数，比如你想进入到nginx，输入`cd /u/l/n`，按下tab，系统自动帮你补全这条命令，变为`cd /usr/local/nginx`，再比如，输入`git`，按两下tab，系统给你返回关于git的一些其他命令，具体的功能，读者可以在使用中慢慢尝试。也可以通过`alias`命令，查看所有命令的别名。

#### 在目录中穿越

我们经常会遇到先进入一个很深的目录，然后又换到另一个目录下的情况，如果要返回之前的某个目录，还会使用到`history`去查找，不过有了`d`命令，就可以简化这个步骤。`d`命令会列出你最近进入的目录，然后只需要输入对应目录的序号，即可重新进入该目录，如下图所示，`d`命令列出了我最近进入的几个目录，其中序号为3的目录是我的nginx目录，直接输入3，立马跳到nginx所在目录
![目录跳转](/images/d.jpg)

oh-my-zsh还提供很多其他便捷的跳转命令，比如`..`，等同于bash中`../`，`...`，等同于`../..`。所有的这些
当然目录跳转还可以有其他工具，比如[autojump](https://github.com/wting/autojump)，就是一个非常好用的跳转插件。

#### 关于git
用git的同学，会经常需要对写的代码进行`status`，`add`，`commit`等操作，以及审视git仓库的提交状态，oh-my-zsh天生带有git插件，如下图
![git插件](/images/git.jpg)
其中的master表示当前目录是git仓库，且是在master分支下，如果当前分支有文件改动，master背景颜色就会变化，且后面的小图标也会对应改变，如下图所示
修改了文件，但没进行`add`
![add](/images/git_not_add.jpg)
添加到暂存区，等待提交
![等待提交](/images/git_add.jpg)

### 总结

由以上可以看出，zsh配合oh-my-zsh，可以大大方便我们在Linux下敲命令的任务，以上只是zsh很少的一部分，oh-my-zsh还有很多插件和使用方法，等待大家去发掘。

