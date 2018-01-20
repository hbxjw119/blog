---
title: 用PhantomJS抓取js渲染的网页
date: 2016-08-22 09:14:35
tags: [python, PhantomJS]
category: [Tech]
---

在用python抓取网页时，一般情况下，用urllib2，requests等库差不多够用，但是有的页面里的某些div里的元素，是由js动态渲染，或者某些div，是在window页面滑到该区域才开始加载的。对于这种网页，你直接抓取然后审查页面信息，会看到div为空，或者div的内容为”加载中…”。
那么怎么抓取这类动态页面呢，在window下，可以使用selenium，但在Linux平台，就需要用PhantomJS配合selenium来完成了。
<!--more-->

selenium是一个可以调用浏览器的自动化测试套件，它提供了一组可以操作浏览器的API，比如模拟用户打开浏览器，填写表单，提交等动作，可以很方便的完成重复的测试工作，而PhantomJS是一个无界面的浏览器，因此在Linux环境下，二者配合起来，就可以很方便的模拟浏览器浏览行为了，也就可以抓取到由JS渲染的页面元素。

## 安装PhantomJS

直接在[官网](http://phantomjs.org/download.html)下载安装包

## 安装selenium

```python
#确保你的python已经安装了pip包管理器
pip install selenium
```

安装完毕后，就可以抓动态网页了

```python
from selenium import webdriver
driver = webdriver.PhantomJS(executable_path='/bin/phantomjs/bin/phantomjs')  #这里的executable_path填你phantomJS的路径
driver.get('http://www.example.com') #对网页发请求
print driver.page_source #获取网页html代码
driver.quit()
```

上述代码中，driver对象的page_source就是该网页的内容，还有其他的属性，可以通过dir(driver)查看driver还有哪些其他方法和属性，按需求获取
