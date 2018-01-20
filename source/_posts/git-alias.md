---
title: 让你的git命令简化起来
date: 2016-10-18 09:14:35
tags: [linux, git]
category: [Tech]
---

对于写代码的搬砖工来说，版本控制软件是日常工作中必不可少的工具。git由于其强大的分布式管理、以及快速在版本间穿梭的功能，大有取代svn的趋势。对于使用svn的老一辈码农来说，那么怎么快速从svn切换到git呢？
<!--more-->

## 让我们从简化命令开始

git支持Alias别名，先在自己的目录中创建文件

```bash
touch ~/.gitconfig
```

建立好后，拷贝下面内容到上述文件

```bash
[alias]
  st = status
  ci = commit
  co = checkout
  b = branch
  cfg = config
  r = remote
  m = merge
  pl = pull
  ps = push
  l = log
  sb = show-branch
  di = diff                                                                                                                                                                  
  gl = log --graph --pretty=format:'%h%Cred%d%Creset @%Cgreen%an%Creset %s [%ar]' --abbrev-commit --color --decorate --date-order--date-order
  dc = diff --color --cached
```

保存后，以后输入git命令就方便多啦！试试吧~

## 附其他常用的git命令及解释

* `git branch` 查看本地所有分支 其中带*号的是当前所在分支
* `git branch dev` 新建dev分支
* `git checkout dev` 切换到dev分支
* `git status` 查看当前git库的状态，会指出有哪些新文件，有哪些修改过的文件
* `git add file1 file2` 将文件添加到暂存区，如果要添加所有文件，则git add .(一个点)
* `git commit -m` “提交说明” 一次性将暂存区提交到版本库
* `git remote add origin http://github.com/ask/celery.git` 如果你新建了一个远程库，可以用词命令将本地库和远程库关联起来
* `git push origin master` 将本地的master分支，提交到origin主机的master分支，一般origin即指代远程版本库
