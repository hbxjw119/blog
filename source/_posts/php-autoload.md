---
title: PHP中的自动加载
date: 2017-01-08 09:14:35
tags: [linux, php]
category: [php]
---

对于21世纪的phper来说，应该或多或少听说过**自动加载器**。自动加载，就是我们在new一个class前，不需要写require来包含这个class文件，由程序自动帮我们加载进来。
<!--more-->

**自动加载器**可以说现代PHP框架的根基，基本著名的框架或者架构都会用到它。它解决了什么问题呢？就是当项目很大时，不需要再一个一个require文件。在我们安装某个PHP框架或者包时，在下载的vendor目录下，很可能会有一个叫auto_load.php的文件。追踪源码下去，基本都会看到一个叫`spl_auto_register`的函数。这个函数做的事情就是你之前需要一个一个require的事情。

### 先来看个简单的例子

如果你写了一个index.php
```php
$db = new DB();
```
如果不导入DB类，则可能会报一个class not found的错误，那我们再写个函数。
```php
$db = new DB();
function __autoload($className)
{
    echo $className;
    exit();
}
```

上述的`_autoload($class_name)` 是PHP5.2版本后加入的魔术函数，他接收的参数是类名，有了这个函数，当PHP在找不到DB类，在报错前，会调用这个函数，上面传入的参数就是DB。因此上述代码会输出DB。
由此，我们可以在_autoload函数中，写要加载的类文件了。如下：
```php
function __autoload($className)
{
    require $className . '.php';
}
```
当然前提是你事先已经写了这个类，并且也放在了当前目录。

### spl_autoload_register的产生

当项目小时，可以把所有的类文件放在一个目录下面，然后在_autoload函数中，指定这个类库目录。但如果项目过大，或者需要不同的自动加载来加载不同路径的文件，这个时候_autoload就无法胜任，原因是一个项目中仅能有一个这样的 _autoload() 函数，因为 PHP 不允许函数重名，也就是说你不能声明2个_autoload()函数文件，否则会报致命错误，那怎么办呢？放心，你想到的，PHP开发大神早已经想到。

`spl_autoload_register()`这样又一个牛逼函数诞生了，并且取而代之它。它执行效率更高，也更灵活

他的使用方式，要比_autoload函数要复杂得多。而且，该函数也是可以重复使用的。如果一个文件有多个该函数，则按照注册顺序，一个一个往下面找。
这里就不介绍spl_autoload_register函数的使用了，这个在大型的PHP框架中，都可以找到它的影子，也是学习自动加载的好机会。
