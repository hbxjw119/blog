---
title: git pull 和 git rebase
date: 2019-04-23 16:13:18
tags: [git]
category: [Tech]
---

git 是团队开发中常用的代码版本管理工具，我们经常会遇到这样一个场景：在 feature 分支上开发完一个新功能后，通常会做这样的操作：`git pull`，然后`git push`。但也有人喜欢在`git pull`后面再上`--rebase`参数，即`git pull --rebase`，这是什么意思呢？
<!--more-->

我们知道，**git pull = git fetch + git merge**，即首先将本地的分支信息更新以和远程保持同步，然后将再将远程分支合并到本分支。而 **git pull --rebase = git fetch + git rebase**。可以看到，`git pull`和`git pull --rebase`的区别，就是`git merge`和`git rebase` 的区别，跟`git merge`相比，`rebase`主要有下面几点不同：

* 让多个人在一个分支开发的提交点形成一条线，而不是多条线，从而保持分支的整洁
* `rebase`参数，让你的 commit 在该分支最前面，
* 分支上不会有合并的提交记录

可能有同学对上面的解释还是不明白，那我们看看下面的提交树来直观感受下（提交图形化工具为 [tig](https://github.com/jonas/tig)）
```
2019-04-22 20:12 +0800 jimmy M─┐ [master] Merge branch 'feature_dev'
2019-04-22 20:07 +0800 jimmy │ o [feature_dev] commit on feature_dev 2
2019-04-22 20:07 +0800 jimmy │ o commit on feature_dev 1
2019-04-22 20:08 +0800 jimmy o │ commit on master 4
2019-04-22 20:08 +0800 jimmy o │ commit on master 3
2019-04-22 20:06 +0800 jimmy o─┘ commit on master 2
2019-04-22 20:06 +0800 jimmy I   commit on master 1
```
上面展示的是一个 git 项目的提交记录数，该项目有两个分支：master 和 feature_dev，从下往上看，master 分支上有 4 次提交记录，分别是 commit on master 1-4，feature_dev 分支上有两次提交，分别是 commit on feature_dev 1-2，最上面的那次提交，是在 master 上执行`git merge feature_dev`产生的一次提交，从`M`标识也可以看出这是一次合并操作，可以看到，现在总共有 7 次提交记录，同时我们也注意到，虽然 master 上的第 3 次提交和第 4 次提交时间比 feature_dev 上的两次提交要晚，但合并后，feature_dev 上的提交却在上面。

如果我们使用`git rebase feature_dev`呢？
```
2019-04-22 20:08 +0800 jimmy o [master] commit on master 4
2019-04-22 20:08 +0800 jimmy o commit on master 3
2019-04-22 20:07 +0800 jimmy o [feature_dev] commit on feature_dev 2
2019-04-22 20:07 +0800 jimmy o commit on feature_dev 1
2019-04-22 20:06 +0800 jimmy o commit on master 2
2019-04-22 20:06 +0800 jimmy I commit on master 1
```
上面就是在 master 上执行了`git rebase feature_dev`后的提交记录，可以看到，此时的提交记录都在一条线上了，就像是直接把 feature_dev 上的那两次提交插入到 master 上一样，更有意思的是，现在只有 6 次提交记录了，没有因为合并而产生的提交记录，事实上，合并的提交记录通常是无意义的。再回过头来，看看上面说的 3 点区别，是不是更加明朗呢？

需要注意的是，上面的演示，并没有展示代码冲突的场景，这在实际开发过程中是很常见的，不过，即使遇到了也不要慌，git 一个很好的优点是，如果你哪一步操作有问题，都会给出友好的提示，如上面你执行`git pull --rebase`后遇到冲突，会给出类似如下提示：
```
CONFLICT (content): Merge conflict in <some-file>
```
跟之前套路一样，把冲突的文件解决下，然后执行`git add <some-file>`和 `git rebase --continue`即可，跟使用`git pull`基本一致。

总结下，`git pull`和`git pull --rebase`二者的最终目的一致，主要区别在于提交记录上，或者说执行`git log --oneline --decorate --graph --all`后，二者看到的提交树不一样，加上`--rebase`参数后，项目分支整洁了，即使有多个人在该分支上开发，最终看到的提交记录也只有一条线， 而且每个提交都是有意义的。反过来，也简化了哪里引入 Bug 的分析，如果有必要，回滚修改也可以做到对项目影响最小。

#### 参考
* https://github.com/xirong/my-git/blob/master/git-workflow-tutorial.md
* https://www.cnblogs.com/xueweihan/p/5743327.html
* https://my.oschina.net/gef/blog/2978848
