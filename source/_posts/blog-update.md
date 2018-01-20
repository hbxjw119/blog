title: 本博客的一些插件和使用方法
tags:
  - hexo
  - maupassant
  - 配置
category:
  - 记录
categories:
  - Blog
date: 2018-01-06 09:14:00
---
用hexo写博客已经有一段时间了，这里把本博客的一些觉得有意思的插件和优化整理出来，方便新手配置和学习。
<!--more-->

本博客使用的hexo主题为[maupassant](https://github.com/tufu9441/maupassant-hexo)，符合宣传所说，**大道至简**的定位。在此基础上，我做了一些插件补充，主要有：

* 本地搜索
* 文章字数统计，年度文章数量统计
* leadcloud增加pv统计
* 文章版权

下面分别介绍下，这几个插件的使用方法。

## 本地搜索

本地搜索是主题自带的功能，如本博客右侧栏所示，输入关键词，即可在站内搜索博文信息。要使用此功能，首先需要在主题的`_config.yml`文件中，设置
```yml
self_search: true
```
然后，安装搜索插件
```bash
npm install hexo-generator-search --save
```
这样，当你每次`hexo g`时，此插件都会在你博客的根目录，生成一个`search.xml`的文件，该插件就是根据此文件来做全文检索的。

## 字数统计

如你所见，本博客的每篇文章，都有字数统计，以及阅读时长。也是通过插件方式实现，估计此插件作者应该是受简书启发而开发的。安装插件：
```bash
npm install hexo-wordcount --save
```
安装好后，在主题的配置文件`_config.yml`中开启该功能
```yml
wordcount: true
```
然后就可以在文章中使用了，使用方法是在主题的文章模板文件：`themes/maupassant/layout/_widget/post.pug`，在该文件适当位置，加入如下代码
```jade
if theme.wordcount == true
    span= ' | '
    span
      i.fa.fa-file-word-o
    span.post-count=' ' + wordcount(page.content) + ' 字'
    span= ' | '
    span
      i.fa.fa-clock-o
    span.post-count=' 阅读约需 ' + min2read(page.content) + ' 分钟'
```
然后再部署时，就可以看到效果。此外，你还可以使用该插件的`totalcount`方法，来统计所有博文的总字数，比如：`totalcount(site, '0,0')`。

## leadcloud PV统计

对于统计功能，其实可以使用更轻量级的工具，不蒜子。我抱着不折腾就手痒的心态，自己搞的，用的是[leadcloud](https://leancloud.cn/)。leadcloud的存储产品是一个云存储的解决方案，相比于自己维护一个数据库，用云存储的好处就是省心，但缺点也显而易见：数据的安全与隐私性。不过对于博客这样的统计功能，用云存储还是比较合适，只是希望厂家不要跑路。。。
要在博客中开启统计功能，需要以下几个步骤：
1. 在leadcloud官网申请一个账号，并建立一个新应用，主要是存储产品，然后新建一个叫`total_pv`的class，然后在此class下，添加一行数据，这个数据至少有一个`pv`的number字段。这里假设你已经看过官方的sdk，所有工作已经做好。
2. 在应用的设置页面，拿到APP ID 和APP KEY，以及上面添加的数据的objectID，填入到主题的`_config.yml`文件中
```yml
## visitor-count
visitor:
  enable: true
  APP_ID: your APP ID
  APP_KEY: your APP KEY
  OBJ_ID: objectID
```
3. 在模板文件`themes/maupassant/layout/_partial/footer.pug`最后，添加
```jade
  div
    i.fa.fa-eye
      span.visitors
```
4. 在模板文件`themes/maupassant/layout/_partial/after_footer.pug`最后，添加
```jade
if theme.visitor.enable == true
    - var app_id=theme.visitor.APP_ID
    - var app_key=theme.visitor.APP_KEY
    - var obj_id=theme.visitor.OBJ_ID
    script(type='text/javascript', src='//cdn.bootcss.com/jquery/3.2.1/jquery.min.js')
    script(type='text/javascript', src='//cdn1.lncld.net/static/js/3.4.2/av-min.js')
    script(type='text/javascript', src=url_for(theme.js) + '/leandcnt.js' + '?v=' + theme.version)
    script.
       visitorCount('#{app_id}', '#{app_key}', '#{obj_id}')
```
这里要注意的是，如果你的hexo模板渲染引擎无法解析`'#{app_id}'`变量，就去掉引号和`#`。我的机器上因为无法解析`pug`引擎中的变量，因此我换成了`jade`的方式。关于`pug`和`jade`，你只要知道这是两种模板渲染引擎即可，使用方式基本相似。文末我会说为何需要换。
5. 在`themes/maupassant/source/js`目录，添加`leadcnt.js`文件
```js
var visitorCount = function(app_id, app_key, obj_id) {
    AV.init({appId:app_id, appKey: app_key});
    var cnt=AV.Object.createWithoutData('total_pv',obj_id);
    cnt.increment('pv',1);
    cnt.save();
    cnt.fetch().then(function() {
        var pv = cnt.get('pv');
        $('.visitors').html(' | ' + pv);
    }, function(error) {console.log(error);});
}
```
添加完上述步骤，应该就可以在博客的footer部位，看到有pv数据了，每刷新一次，pv+1。

## 文章版权

为了显得专(zhuang)业(bi)，我给文章末尾添加了版权说明。使用方法如下：
1. 在主题配置文件`_config.yml`中开启
```yml
copyright: 
  enable: true
  author: author_name
```
2. 在`themes/maupassant/layout/_widget/`目录下，添加`article_copyright.pug`模板文件
```jade
div.article-footer-copyright
  p= '本文由 ' + theme.copyright.author + ' 发表，采用'
    a(href='http://creativecommons.org/licenses/by-nc-nd/4.0/deed.zh') 署名-非商业性使用
-禁止演绎4.0
    | 进行许可
  p='非商业转载请注明作者及出处，商业转载请联系作者本人'
  p='本文标题: '+ page.title
  p='本文链接: '
    a(href=url)= url
```
3. 在上级目录，`post.pug`文件中，在适当位置，引入`article_copyright.pug`文件
```yml
if theme.copyright.enable == true
  include _widget/article_copyright.pug
```
4. 最后，根据审美，在`themes/maupassant/source/style.css`文件中，给版权信息添加css样式。
```css
/* article-footer-copyright */
.article-footer-copyright {
    margin-top: 0em;
    padding: 0.8em;
    margin-bottom: 1em;
    border: 1px solid #ddd;
    background-color: #f8f8f8;
}
.article-footer-copyright a {
    color: #01579f
}
```

## 总结

本博客的配置，都放在的[github](https://github.com/hbxjw119/blog)上，只要你安装了hexo，以及必要的插件，都可以运行。综合来讲，hexo的自由配置度还是很高的。由于hexo最后会根据模板引擎，生成html静态文件，因此，基本不用担心插件过多而给性能带来损耗。对普通用户来讲，自由配置的基本门槛，就是了解一点模板引擎的知识。本博客的主题引擎，最开始是采用`jade`，由于商标问题，`jade`模板在去年已经切换为`pug`，因此maupassant主题的维护者也进行了更新，但变化基本不大，用户需要做的，就是安装`pug`模板引擎，然后将模板文件后缀改为`pug`。模板中变量的使用方式，也需要做细微调整，比如`#{variable}`，现在直接用`variable`即可。
