---
title: 微信公众号开发初探
date: 2017-08-11 11:14:35
tags: [公众号]
category: [Tech]
---

最近利用空闲时间，申请了个微信公众号，完成一些小功能练练手，本文总结下开发公众号期间的一些步骤，心得和体会吧。
<!--more-->

## 申请微信公众号

要开发微信公众号，首先得有一个吧，直接在[官网](https://mp.weixin.qq.com/)申请，记住是新申请，不是用你原来的QQ或微信登录，申请过程中，要注意的是，我们申请的是订阅号，用于个人开发。申请完毕，并成功后，登录到公众号后台，左侧有丰富的菜单供你使用，可以选择傻瓜式，就是不用写一行代码，通过在左侧菜单配置，自己填写欢迎语，给用户发消息等，也可以选择开发者模式，在左侧最下面。
申请好后，当然是第一时间关注这个公众号，成为自己的第一个粉丝。

## 开始撸代码
在撸代码前，要明白公众号和用户打交道的流程，下图简单展示了这个流程。
![微信开发流程](/images/wx-dev.jpg)
我们要开发的，就是这个回调地址，也可以说是自己的服务，简单点的话，就是一个php脚本。接收微信后台转发过来的请求。回调地址必须是微信后台可以访问的，也就是一个外网地址，你拿个内网ip肯定是不行的。所以你得有一台有外网IP的服务器，可以去买个阿里云，腾讯云，京东云等。申请好后，装个lnmp全家桶吧，开启nginx服务，在web目录，写个main.php，main.php中的代码如下所示，这段代码也可以在[微信wiki](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421135319)上找到。
```php
function checkSignature() {    
        $signature = $_GET['signature'];
        $nonce = $_GET['nonce'];
        $timestamp = $_GET['timestamp'];
  
        $arr = [$timestamp, $nonce, TOKEN];
  
        sort($arr);            

        $arr = implode($arr);

        $m_arr = sha1($arr);
        if($m_arr == $signature) {
                return true;
        } 
        return false;
}

if (checkSignature()) {
        $echostr = $_GET['echostr'];
        if($echostr) {
                echo $echostr;
        }
}
```
然后在微信后台配置回调地址，配置方法如[微信wiki](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1472017492_58YV5)。
填好这个main.php的url,按微信提示的步骤测试回调，点击提交，如果提示成功，则说明微信后台访问到了你的地址，并认证成功，如果失败，则检查下你的代码吧。认证成功后，就可以把上面的代码删了，再写自己的服务。

## 一个简单的天气、点歌、新闻查询服务
首先写一个天气查询服务，就是你给公众号发一个城市名，公众号给你返回该城市未来三天的天气。为了简单，我用的是[心知天气](https://www.seniverse.com/doc)提供的天气api。我们分两步来进行

### 1、获得用户输入的城市名

由上图我们知道，用户的输入，最终会由微信后台转发给我们，微信后台转发给我们的数据格式如下
```
<xml>
 <ToUserName><![CDATA[toUser]]></ToUserName>
 <FromUserName><![CDATA[fromUser]]></FromUserName>
 <CreateTime>1348831860</CreateTime>
 <MsgType><![CDATA[text]]></MsgType>
 <Content><![CDATA[this is a test]]></Content>
 <MsgId>1234567890123456</MsgId>
 </xml>
```
因此，在main.php里，首先要获得这个数据，需要注意的是，如果PHP版本是5.x，可以直接使用`$GLOBALS["HTTP_RAW_POST_DATA"]`超全局变量来获得，如果是PHP7，`$GLOBALS`已经被取消，需要用下列方式来获取
```php
$wx_post = file_get_contents("php://input")
```
然后就是解析xml数据了，提取各类数据，如下
```php
$postObj = simplexml_load_string($wx_post, 'SimpleXMLElement', LIBXML_NOCDATA);
$fromUsername = $postObj->FromUserName;
$toUsername = $postObj->ToUserName;
$user_city = trim($postObj->Content);  //提取用户发送的城市名           
```

### 2、根据城市名，返回天气信息
有了城市名，就可以通过api查询城市天气信息了，但有个问题需要解决：用户发的是中文，而通过api查询，需要的是城市的拼音，因此需要写一个中文->拼音的转换函数。在github上有很多这类项目，我用的是[这个](https://github.com/AlloVince/EvaPinyin)，查询完天气后，将数据简单解析，并封装成微信需要的格式，构造响应，假如要返回给微信的天气数据为`$weather_info`，那么代码如下：
```php
$textTpl = "<xml>
       <ToUserName><![CDATA[%s]]></ToUserName>
       <FromUserName><![CDATA[%s]]></FromUserName>
       <CreateTime>%s</CreateTime>
       <MsgType><![CDATA[text]]></MsgType>
       <Content><![CDATA[%s]]></Content>
       <FuncFlag>0</FuncFlag>
       </xml>";
return sprintf($textTpl,$fromUsername,$toUsername,time(),$weather_info);
```
如果没有错误，那么会看到下面的效果。
![天气查询](/images/wx-weather.jpg)
如果微信返回类似“该公众号暂时无法提供服务”的提示，那就是说明你的代码有问题，检查下代码，或者看看nginx日志。一般都能找到原因。

## 更进一步
有了上面简单的实战，就可以再添加点其他功能，比如点歌、查快递，看新闻等，甚至是类似于小黄鸡的机器人，最终把公众号打造成一个万事通吧~

以上代码放在[github](https://github.com/hbxjw119/weixin)上，自行查看和扩展。
