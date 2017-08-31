---
title: PHP中的依赖注入是什么东西
date: 2017-01-02 19:14:35
tags: [php, design pattern]
category: [pattern, php]
---

设计模式中，有一个叫控制反转（Inversion of Control），也叫依赖注入(Dependency Injection)，这种设计模式用来减少程序间的耦合，这篇文章不讲解概念性的东西，直接上代码，如果要深追理论，要看设计模式一书
<!--more-->

### 业务场景
某网站在注册完后，要给用户发封邮件，发邮件的逻辑，你可以这么写：
```php
//Email.class.php
class Mail {
	public function send() {
		//发送邮件
	}
}
```
然后有一个注册的类
```php
//Register.class.php
class Register {
	private $_email;
	public function doRegister() {
		//注册逻辑
		$this->_email = new Mail();
		$this->_email->send();  //发邮件
    }
}
```
然后有用户开始注册了
```php
include 'Email.class.php';
include 'Register.class.php';
$reg = new Register();
$reg->doRegister();
```
很快把这个功能上线了，看起来相安无事，xxx天过后，产品说发送邮件的不好，要使用发送短信的，然后你说这简单我把'Mail'类改下...

又过了几天，产品人员说发送短信费用太高，还是改用邮件的好...  此时心中一万个草泥马奔腾而过...

以上场景的问题在于，你每次不得不对'Mail'类进行修改，代码复用性很低，高层过度依赖于底层。那么我们就考虑**依赖倒置原则，让底层继承高层制定的接口，高层依赖于接口**。修改后的逻辑如下
```php
//将mail写为接口
interface Mail
{
    public function send();
}
```
```php
class Email implements Mail()
{
    public function send()
    {
        //发送Email
    }
}
```
```php
class SmsMail implements Mail()
{
    public function send()
    {
        //发送短信
    }
}
```
```php
class Register
{
    private $_mailObj;

    public function __construct(Mail $mailObj)
    {
        $this->_mailObj = $mailObj;
    }

    public function doRegister()
    {
        /*这里是如何注册*/
        $this->_mailObj->send();//发送信息
    }
}
```
下面开始发送信息
```php
* 此处省略若干行 */
$reg = new Register();
$emailObj = new Email();
$smsObj = new SmsMail();

$reg->doRegister($emailObj);//使用email发送
$reg->doRegister($smsObj);//使用短信发送
/* 你甚至可以发完邮件再发短信 */
```

上面的代码解决了'Register'对信息发送类的依赖，使用构造函数注入的方法，使得它只依赖于发送短信的接口，只要实现其接口中的'send'方法，不管你怎么发送都可以。上例就使用了"注入"这个思想，就像注射器一样将一个类的实例注入到另一个类的实例中去，需要用什么就注入什么。当然"依赖倒置原则"也始终贯彻在里面。

### 再来看一个例子
假设我们这里有一个类，类里面需要用到数据库连接，按照最最原始的办法，我们可能是这样写这个类的
```php
class example {
    
    private $_db;
    function __construct(){
        include "./Lib/Db.php";
        $this->_db = new Db("localhost","root","123456","test");
    }
    function getList(){
        $this->_db->query("......");//这里具体sql语句就省略不写了
    }
}
```
在构造函数里先将数据库类文件include进来；然后又通过new Db并传入数据库连接信息实例化db类；之后getList方法就可以通过$this->_db来调用数据库类，实现数据库操作。

看上去我们实现了想要的功能，但是这是一个噩梦的开始，以后example1,example2,example3....越来越多的类需要用到db组件，如果都这么写的话，万一有一天数据库密码改了或者db类发生变化了，岂不是要回头修改所有类文件？
ok，为了解决这个问题，工厂模式出现了，我们创建了一个Factory方法，并通过Factory::getDb()方法来获得db组件的实例：
```php
class Factory {
    public static function getDb(){
        include "./Lib/Db.php";
        return new Db("localhost","root","123456","test");
    }
}
```
sample类变成：
```php
class example {
    
    private $_db;
    function __construct(){
        $this->_db = Factory::getDb();
    }
    function getList(){
        $this->_db->query("......");//这里具体sql语句就省略不写了
    }
}
```

这样就完美了吗？再次想想一下以后example1,example2,example3....所有的类，你都需要在构造函数里通过Factory::getDb();获的一个Db实例，实际上你由原来的直接与Db类的耦合变为了和Factory工厂类的耦合，工厂类只是帮你把数据库连接信息给包装起来了，虽然当数据库信息发生变化时只要修改Factory::getDb()方法就可以了，但是突然有一天工厂方法需要改名，或者getDb方法需要改名，你又怎么办？当然这种需求其实还是很操蛋的，但有时候确实存在这种情况，一种解决方式是，我们不从example类内部实例化Db组件，我们依靠从外部的注入，什么意思呢？看下面的例子：
```php
class example {
    private $_db;
    function getList(){
        $this->_db->query("......");//这里具体sql语句就省略不写了
    }
    //从外部注入db连接
    function setDb($connection){
        $this->_db = $connection;
    }
}
//调用
$example = new example();
$example->setDb(Factory::getDb());//注入db连接
$example->getList();
```

这样一来，example类完全与外部类解除耦合了，你可以看到example类里面已经没有工厂方法或Db类的身影了。我们通过从外部调用example类的setDb方法，将连接实例直接注入进去。这样example完全不用关心db连接怎么生成的了。
这就叫依赖注入，实现不是在代码内部创建依赖关系，而是让其作为一个参数传递，这使得我们的程序更容易维护，降低程序代码的耦合度，实现一种松耦合。

这还没完，我们再假设example类里面除了db还要用到其他外部类，我们通过：
```php
$example->setDb(Factory::getDb());//注入db连接
$example->setFile(Factory::getFile());//注入文件处理类
$example->setImage(Factory::getImage());//注入Image处理类
...
```

依赖注入也是现代PHP框架中广泛使用的思想，著名的Yii,Phalcon等框架中，都能找到依赖注入的影子

> 参考博客
> https://mengkang.net/790.html
> http://www.cnblogs.com/painsOnline/p/5138806.html
> http://www.thinkphp.cn/topic/12180.html