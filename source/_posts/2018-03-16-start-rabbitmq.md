---
title: RabbitMQ的简单使用
date: 2018-03-16 16:13:18
tags: [消息队列]
category: [Tech]
---

在高性能，高可用，解耦的系统中，消息队列 ( Message Queue) 组件是少不了的。现在市面是有各种流行的MQ框架，比如 kafka，rabbitmq，roketmq，zeromq等。各个公司为了适应自己业务的发展，有的会自己造轮子，而有的则在开源消息队里的基础上，做了进一步的改造和优化。本文使用 rabbitmq，作为消息队列的入门使用。
<!--more-->

## 什么是消息队列

使用 rabbitmq 之前，先说说什么是消息队列。我们为什么要用消息队列呢？可以用日常网购的场景来做对比。如我们在网上下了个单，我们不会坐着等商品到达。而商家发货后，也不会坐着等我们收到商品的消息。商家会把你的商品，发给快递公司，然后继续接收其他用户的订单。对于商家来说，他的工作已经做完了。而快递公司，则会把我们的商品准确发给我们。这样的方式，使商家和我们买家之间解耦，对于商家来说，他能处理更多的订单请求，而我们消费者，则可以在收到快递到达的通知时才去取。

## rabbitmq 中的几个概念

rabbitmq 也是类似的原理，在 rabbitmq 中，有几个重要的组件，`publisher`，即生产者，是产生消息的一方，类似于商家，`exchange`，交换器，生产者会把消息发往`exchange`，作用相当于快递公司，`queue`，队列，接收`exchange`发过来的消息，相当于运输快递的交通工具，`consumer`，消费者，消息的接收方，也就是我们买家。在这个里面可以看到，生成者并不是直接将消息投到队列中的，需要经过一个交换器，交换器负责把消息路由到某个或者多个队列。

另一个比较重要的概念就是交换器类型，可以这么理解，中通快递公司，只会把商品放到中通快递的运输车上传递，而不能放到其他公司的运输车上。各个快递公司，也都只能把商品放到各自公司的车上。rabbitmq 中的交换器做的也是类似的事，它定义了一些规则，根据规则，rabbitmq就会把消息投递到指定的队列。这些规则称为路由键。交换器有四种类型：`direct`, `topic`, `fanout`，`headers`，每种类型实现了不通的路由算法。
* `direct`: 这种交换器比较简单，它的路由规则是一个完全匹配模式，当它绑定了A队列，那么以后这个交换器中的消息，都会投递到A队列中。
* `topic`: 这种交换器的路由规则，可以使来自不同源头的消息到达同一个队列。比如不同级别的日志消息(info-log, warn-log, error-log) 都投递到 log 队列。
* `fanout`: 这种交换器类似广播模式，它会把收到的信息，广播到绑定到它身上的所有队列中。
* `header`: 匹配 AMQP 消息的 header 而非路由键，不太实用，或者基本不使用。

有了以上概念，我们就可以搞一些事了。

## rabbitmq 的安装

首先是安装，在 CentOS 上安装 rabbitmq 非常简单，一行命令搞定
```bash
sudo yum install rabbitmq-server
```
安装完毕后，直接启动服务
```bash
service rabbitmq-server start
```
启动完毕，就可以使用`rabbitmqctl`命令，对 rabbitmq 进行一系列操作，如查看 rabbitmq 的状态
```bash
rabbitmqctl status
```

## 一个例子

考虑下有这样一个应用：它允许用户上传图片，当用户上传图片后，可以获得一定的积分，同时用户的好友，可以收到收到通知。你可以把这样的功能写成一个流程
upload_img -> add_user_point -> notify_others -> success
形如
![方式1](/images/rabbitmq/p1.png)

但这样带来的坏处是，当需求变更，不得不直接修改你的业务逻辑。如 pm 认为上传原始图片太占带宽，让你在上传图片前，先做压缩处理。或者在后面，添加记录日志的操作。每次修改，都不得不修改原来的代码。最终变得不可维护。另一方面就是性能问题，当有大量用户上传图片时，你的系统可能就不堪承受，最终服务不可用。问题就出在，这样的设计是强耦合的，增加积分，通知好友这些操作，不应该依赖于上传图片。需要把上传图片、增加积分、通知好友当做三个独立的服务，然后用一个桥梁，把三者再结合起来，达到解耦的目的，如下图所示。
![方式2](/images/rabbitmq/p2.png)
这样，首先可以把工作量拆分，一个人写上传图片服务，一个人写增加用户积分服务，当有其他新增服务时，简单的接入即可。另一方面，当你的某个服务压力过大时，粗暴的继续加机器部署服务即可解决。下面通过一个简单的例子，来看看如何使用 rabbitmq 来拆分完成上述上传图片的需求。
1. 首先写上传图片服务，注释已经说明了问题
```php
<?php
//命令行参数，模拟用户上传图片的请求
$image_id = $argv[1];
$user_id = $argv[2];
$image_path = $argv[3];

//连接到rabbit
$conn = new AMQPConnection(HOST, PORT, USER, PASS, VHOST);
//指定一个信道
$channel = $conn->channel();

//声明一个名为 upload-pictures 的交换器，类型是 fanout 模式, 后面的参数请参考api
$channel->exchange_declare('upload-pictures', 'fanout', false, true, false);

//将用户请求组装成一个消息
$metadata = json_encode(array(
        'image_id' => $image_id,
        'user_id' => $user_id,
        'image_path' => $image_path
        ));

$msg = new AMQPMessage($metadata,
                array('content_type' => 'application/json',
                        'delivery_mode' => 2));
//投递消息到 upload-pictures 交换器
$channel->basic_publish($msg, 'upload-pictures');

$channel->close();
$conn->close();
?>
```

2. 增加用户积分的服务，注释已经说明了问题
```php
<?
//获得rabbit连接和信道
$conn = new AMQPConnection(HOST, PORT, USER, PASS, VHOST);
$channel = $conn->channel();

//模拟增加用户积分的逻辑
function add_points_to_user($user_id){
    echo sprintf("Adding points to user: %s\n", $user_id);
}

//声明交换器
$channel->exchange_declare('upload-pictures', 'fanout', false, true, false);
//声明了一个 add-user-point 的队列
$channel->queue_declare('add-user-point', false, true, false, false);
//绑定队列到交换器
$channel->queue_bind('add-user-point', 'upload-pictures');
//创建回调函数
$consumer = function($msg){

    if($msg->body == 'quit'){
        $msg->delivery_info['channel']->
            basic_cancel($msg->delivery_info['consumer_tag']);
    }

    $meta = json_decode($msg->body, true);

    add_points_to_user($meta['user_id']);

    $msg->delivery_info['channel']->
        basic_ack($msg->delivery_info['delivery_tag']);
};
//准备消费者
$channel->basic_consume($queue,
    $consumer_tag,
    false,
    false,
    false,
    false,
    $consumer);
//等待消息到达
while(count($channel->callbacks)) {
    $channel->wait();
}
$channel->close();
$conn->close();
?>
```

3. 创建通知朋友的服务，类比于增加用户积分
```php
<?php
$conn = new AMQPConnection(HOST, PORT, USER, PASS, VHOST);
$channel = $conn->channel();
function notify_friend($user_id){
    echo sprintf("notified user's %s friend: %s\n",
        $user_id);
}

$channel->exchange_declare('upload-pictures', 'fanout', false, true, false);

$channel->queue_declare('notify-user', false, true, false, false);

$channel->queue_bind('notify-user', 'upload-pictures');

$consumer = function($msg){

    if($msg->body == 'quit'){
        $msg->delivery_info['channel']->
            basic_cancel($msg->delivery_info['consumer_tag']);
    }
    $meta = json_decode($msg->body, true);

    notify_friend($meta['user_id']);
    $msg->delivery_info['channel']->
        basic_ack($msg->delivery_info['delivery_tag']);
};
$channel->basic_consume($queue,
    $consumer_tag,
    false,
    false,
    false,
    false,
    $consumer);
while(count($channel->callbacks)) {
    $channel->wait();
}
$channel->close();
$conn->close();
?>
```
很明显，上述中，上传图片服务是生产者，增加用户积分，通知消息两个是消费者。当后续有更多的服务需要加入时，只需要依葫芦画瓢，继续添加到 rabbitmq 中消费即可。而假如某个服务负载较高，需要更多的计算能力，也不必修改代码，只需要启动更多的消费者进程即可，而 rabbitmq 会负责对消息进行分发。

## 组建 rabbitmq 集群

加入了 rabbitmq 的系统架构，系统的稳定性也同样依赖消息系统。如果消息系统挂了，整个系统也不可用，组建集群是解决方法之一。rabbitmq 组建集群也非常容易。假如有两台机器：srv01，srv02。
* 分别在两台机器上安装 rabbitmq 并成功启动
* 为了让两台机器的 rabbit 正常通信，拷贝 srv01 的 erlang cookie 到 srv02，一般在`/var/lib/rabbitmq/.erlang.cookie`，重启 srv02 上的 rabbit 进程，`sudo service rabbitmq-server restart`
* 停止 srv02 上的 rabbit ：`rabbitmqctl stop_app`
* 重设 srv02 上的元数据和状态为清空状态：`rabbitmqctl reset`
* 将 srv02 节点加入到第一个节点：`rabbitmqctl join_cluster rabbit@srv01`
* 重新启动 srv02 节点的 rabbit：`rabbitmqctl start_app`
* 查看 rabbit 集群状态：`rabbitmqctl cluster_status`，如果在 nodes 节点信息中，看到有 rabbit@srv01, rabbit@srv02 字样，说明两个节点的集群已经配置完毕。 

## 总结
由以上的简单例子可以看出，使用消息队列，可以很方便的将系统解耦，使系统有良好的扩展性。rabbitmq 是一个很简单的消息队列组件。使用和搭建集群也是非常方便的。
本文完整的实例代码，可以在[这里](https://github.com/hbxjw119/learnbylearn/tree/master/rabbitmq/php/img-upload)找到。

#### 参考
* 《RabbitMQ 实战》
