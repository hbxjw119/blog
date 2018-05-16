---
title: tcp和http
date: 2017-09-10 19:14:35
tags: [tcp, http]
category: [Tech]
---

在经典的计算机网络ISO七层模型中，最接近用户的，是应用层，其次是传输层。应用层中，HTTP是最重要的协议之一，而TCP，则是传输层中，最重要的协议之一，这里整理下这两个协议的相关知识。
<!--more-->

## TCP

TCP在传输层中实现，它是一个面向连接的协议，面向连接是相对于UDP这种无连接而言，具体说来，就是客户端和服务端传数据之前，会经过一个称为三次握手的过程。由于TCP是传输层协议，因此三次握手也是发生在传输层，传输层利用网络层提供的功能，向上层提供可靠的服务，注意这个可靠二字。TCP通过一系列的措施，如针对丢失、超时、数据错误、重复等，保证了可靠二字。
先来看看三次握手示意图
![三次握手](/images/tcp-three-handshakes.jpg)

**第一次握手**：客户端TCP先将SYN同步序列号置1，说明这是一个连接请求，并随机选择一个初始序号（client_isn）并将其放置在起始的TCP SYN报文段的序号字段中（seq），并进入到SYN_SENT状态

**第二次握手**：服务器收到了TCP SYN报文段，会为该TCP分配TCP缓存和变量,首先，服务端也将自己的SYN置为1，然后，该TCP的首部确认字段（ACK）被置为client_isn+1，也就是告诉客户端：“我收到了，你能收到我的吗？”。最后，服务器也选择自己的初始序号（server_isn），并将其放在TCP报文段首部的序号字段中，一并发给客户端，这时服务器进入到SYN_RCVD状态。

**第三次握手**：客户端在收到SYN ACK报文段后，客户端也给该连接分配缓存和变量。客户端首先会将server_isn+1,放置到TCP报文段首部来确认服务器的允许连接（ack=server+1）。因为连接实际已经建立了，因此SYN被置0。这时，客户端和服务端都进入到ESTABLISHED状态，故第三次握手时，可以携带客户端的数据到服务器。

说完了建立连接时的三次握手，再来看下断开连接时的四次挥手,先看下图。
![四次挥手](/images/tcp-four-handshakes.jpg)

**第一次挥手**：首先客户端发送FIN=1，seq=u（相当于前面已经传过去的最后一个字节的序号+1）这时客户端进入FIN-WAIT1状态，等待服务端确认。

**第二次挥手**：服务端收到连接后立即发出确认，确认号是ack=u+1，而这个报文段自己的序号seq=v（相当于服务端前面已经传送过的最后一个字节的序号+1），随后服务端即进入CLOS-WAIT状态，即客户端已经没有数据需要发送。但服务端若发送数据，客户端还是要接收的。客户端收到来自服务端的确认后就进入了FIN-WAIT-2状态等待服务端发出的连接释放报文段。

**第三次挥手**：若此时服务端已经没有向客户端发送的数据，其应用进程就通知TCP释放连接。这时服务端使FIN=1，假定当前最后一次确认发送的序号为w（seq=w）。并且需要重复发送上次确认过的确认号ack=u+1。这时服务端就进入LAST-ACK状态，等待客户端确认。

**第四次挥手**：客户端收到服务端的连接释放信号后，在确认号中把ACK置为1，确认号是ack=w+1，而自己的序号仍然是seq=u+1，接着客户端进入TIME-WAIT状态。为了保证服务端收到报文，会等待一段时间，一般是30秒，之后进入CLOSED状态，并且释放客户端所有资源，而服务端收到ACK报文后同样进入CLOSED状态。


### 几个问题
#### 1. 为什么要4次挥手呢?
假如服务器收到FIN请求后，并不会马上关闭连接，因为服务器可能还有数据要发送，所以不能和建立连接时那样，直接发送ACK和SYN，只能先回复一个ACK，表示你的关闭请求（FIN）已经收到了，让我把剩下的东西传完。传完后，才能发送FIN报文，从而关闭TCP连接。

#### 2. 为什么TIME_WAIT状态需要等2MSL后才能到CLOSED状态？
这是因为虽然双方都同意关闭连接了，而且握手的4个报文也都协调和发送完毕，按理可以直接回到CLOSED状态（就好比从SYN_SEND状态到ESTABLISH状态那样）；但是因为我们必须要假想网络是不可靠的，你无法保证你最后发送的ACK报文会一定被对方收到，因此对方处于LAST_ACK状态下的SOCKET可能会因为超时未收到ACK报文，而重发FIN报文，所以这个TIME_WAIT状态的作用就是用来重发可能丢失的ACK报文。

## HTTP

http是一个应用层协议，它基于TCP，因此在客户端每发一次向服务器发HTTP请求之前，都需要完成上述的TCP三次握手。因此，http不用关注传输的数据的正确，顺序等。http也看不到三次握手的过程。首先看下一次完成的http请求和响应过程。
```
$ telnet www.baidu.com 80
Trying 115.239.211.112...
Connected to www.baidu.com.
Escape character is '^]'.
GET / HTTP/1.1
Host:www.baidu.com

HTTP/1.1 200 OK
Date: Thu, 19 Oct 2017 03:24:00 GMT
Content-Type: text/html
Content-Length: 14613
Last-Modified: Mon, 16 Oct 2017 03:26:00 GMT
Connection: Keep-Alive
Vary: Accept-Encoding
Set-Cookie: BAIDUID=BEC982B09B4F29890400AF959901E5DA:FG=1; expires=Thu, 31-Dec-37  domain=.baidu.com
Set-Cookie: BIDUPSID=BEC982B09B4F29890400AF959901E5DA; expires=Thu, 31-Dec-37 23:5ain=.baidu.com
Set-Cookie: PSTM=1508383440; expires=Thu, 31-Dec-37 23:55:55 GMT; max-age=21474836
P3P: CP=" OTI DSP COR IVA OUR IND COM "
Server: BWS/1.1
X-UA-Compatible: IE=Edge,chrome=1
Pragma: no-cache
Cache-control: no-cache
Accept-Ranges: bytes

<!DOCTYPE html><!--STATUS OK-->
<html>
<head>
...
```
由上面可以看到，一次完整的http过程，包括两个部分：**请求** 和**响应** 两个部分。
![请求和响应](/images/http-request-response.jpg)
### 请求
http请求由三部分构成：请求行，请求头，请求正文
##### 请求行
请求行用来说明请求类型，要访问的资源，以及使用的http版本。基本格式如下：Method URI Http-version
如上面的：
```
GET / HTTP/1.1
```

##### 请求头
紧挨这请求行（即第一行）之后的部分，用来说明服务器需要使用的附加信息，例如Host,User-Agent,Accept,Cookie等信息，每行都是以一个`k:v`的形式组成。服务器可以通过这些信息，来判断客户端的来源以及做些身份鉴别等。

##### 请求正文
在请求行和请求头完了后，空两行，就是请求正文了，包括要传递给服务器的各种参数等。

### 响应
http响应也由三部分构成：状态行，响应头，响应体
##### 状态行
状态行由HTTP协议版本号， 状态码， 状态消息 三部分组成，如上面所示：
```
HTTP/1.1 200 OK
```

##### 响应头
用来说明客户端需要的一些附加信息，如Content-Length，Date，Server等，格式也是以`k:v`形式返回。

##### 响应体
服务器返回的响应正文

综上，可以看到，请求和响应的基本格式，除了起始行有所不同外，其余的头部，正文两部分格式是相同的。

### HTTP状态码
来看下响应状态行中的状态码，状态码有三位数字组成，第一个数字定义了响应的类别，共分五种类别:

1xx：指示信息--表示请求已接收，继续处理

2xx：成功--表示请求已被成功接收、理解、接受

3xx：重定向--要完成请求必须进行更进一步的操作

4xx：客户端错误--请求有语法错误或请求无法实现

5xx：服务器端错误--服务器未能实现合法的请求

常见状态码：

>200 OK                        //客户端请求成功
>400 Bad Request               //客户端请求有语法错误，不能被服务器所理解
>401 Unauthorized              //请求未经授权，这个状态代码必须和WWW-Authenticate报头域一起使用 
>403 Forbidden                 //服务器收到请求，但是拒绝提供服务
>404 Not Found                 //请求资源不存在，eg：输入了错误的URL
>500 Internal Server Error     //服务器发生不可预期的错误
>503 Server Unavailable        //服务器当前不能处理客户端的请求，一段时间后可能恢复正常

参考
* http://blog.csdn.net/hjtl1992/article/details/68944455
* https://jiajunhuang.com/articles/2017_10_14-web_dev_part2.md.html
* 《http权威指南》
