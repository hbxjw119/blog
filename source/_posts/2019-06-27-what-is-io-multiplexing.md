---
title: 什么是 I/O 多路复用
date: 2019-06-27 16:12:40
tag: [select, epoll, BIO, NIO]
category: [Tech]
---

在高并发环境下，web 服务器需要处理成千上万的客户端连接，如何最大限度发挥单台机器的性能，使之在处理大量连接时仍保持较低的负载，这是个很重要的课题。本文介绍下解决此类问题的一种很经典的方式：I/O 多路复用。
<!--more-->

## 传统 I/O

为了了解 I/O 多路复用是怎么产生的，我们先看下传统的网络 I/O 模式，也被称为 BIO(Blocking IO)。

在编写服务端网络程序时，传统的方式是这样的：创建套接字并绑定端口，然后用一个 while 循环，在循环里调用 accept，程序会阻塞，一旦有连接到来，accept 就返回，然后针对该连接做相应的读写处理。形式像下面这样：
```java
    // 创建套接字
    ServerSocket serverSocket = new ServerSocket();
    // 绑定套接字
    serverSocket.bind(new InetSocketAddress(2345));
    
    // 循环
    while(true) {
        // 调用 accept 等待客户端连接，程序阻塞，当有连接到达时才返回
        Socket socket = serverSocket.accept();
        // 对套接字读写
        handle(socket);
            
    }
    // 关闭套接字
    serverSocket.colse();
   

```
一般我们在刚学网络编程时，都会用这种的方式，也被称为单线程模式，这种模式的特点就是简单直白，方式固定，写起来较容易。但有个致命问题：同一时间，它只能处理一个客户端请求，因为它直接是在主线程中处理请求的，只有在上一个请求处理完毕，才能接着处理下一个请求，一旦某个请求处理较慢，那后面的请求只能等待。

把上面的单线程模式改下，对每个连接，新开一个线程单独进行读写处理，这样就可以同时处理多个连接了，形式如下面这样：
```java
    // 创建和绑定步骤不变
    // ...

	while(true) {
        Socket socket = serverSocket.accept();
        // 新开一个线程，对套接字读写
        new Thread(() -> {
            handle(socket);
        }).start();
    }
```
这种模式就是多线程模式，比上面的那种要高级一点，它可以同时处理多个连接，因为对每个连接的处理都是在一个单独的线程中，和主线程分离开来，主线程可以继续 accept 客户端连接。

但这种模式仍然存在问题：
1. 线程的创建和销毁的成本是很高的，创建线程需要消耗内存，1 个线程需要耗费 512K 到 1M 的内存，几十上百个可能看不出来，成千上万的话，内存很快就耗尽。
2. 线程池能解决部分问题，但当请求过多，线程池仍然处理不过来，导致大量的请求超时，更严重的是，大量的线程会导致大量的线程切换，线程切换，或者说上下文切换是需要 CPU 开销的，线程切换越频繁，真正分配给业务的 CPU 资源就越少。

上面的两种模式，不管是单线程模式还是多线程模式，我们都称之为阻塞模式(Blocking I/O)，是因为它们对连接的处理，都是以线程为基石，在一个线程中处理一个 socket 的读写，但实际情况是，线程的大部分时间都是在等待数据的到来。当调用 recvfrom 时，线程会等待着客户端的数据到达网卡，然后网卡把数据交给内核，然后内核再把数据拷贝到用户进程空间，这时 recvfrom 才会返回。这个过程
中，线程的绝大部分时间都是处于等待数据状态，什么也做不了。而下面要介绍的 I/O 多路复用，就是为解决此问题而生。

## I/O 多路复用

上面我们分析了由线程直接处理网络 I/O 的低效原因，想象下，当我们调用 recvfrom，发现数据还没准备好，就不傻等了，而是告诉系统：等数据准备好了，你告诉我下，我再来读。这时线程可以先去干点别的，比如去检查下有没有其他的连接。过了一会儿，系统产生了一个可读事件，告诉我们，你要的数据准备好了，可以来读了，这时就可以继续回到刚才的地方读取数据。这样效率不是就好多了吗？因为在等数据的同时，我还可以干其他的事情，这是典型的异步思想。那么这种“数据好了通知我们”的机制怎么实现呢？

其实，操作系统已经给我们提供了 **select，poll，epoll，kqueue** 这样的系统调用，来完成我们上面的要求，这些系统调主要干一件事：**监听一个或多个文件描述符上的各类事件，一旦文件描述符上有事件产生，就返回**。文件描述符，是 Unix 系统下的一个叫法，也称为 fd(file descriptor)，下文统称为 fd，fd 对应于 Windows 平台下的句柄（handle），一个文件描述符唯一标识了某个资源，Unix 的设计哲学就是一切皆文件，socket 也是文件，可以作为 fd 被监听。监听哪些事件呢？有：连接事件（acceptable），可读事件（readable），可写事件（writeable），关闭事件（closeable）等。于是通过这类系统调用，监听多个 fd，一旦某个 fd 上有某个事件产生，调用就会返回，于是我们知道“有事发生”，然后根据事件的类型，做不同的处理。因此，有时也把这种模型称为**事件驱动模型**，或者 **Reactor 模式**。

I/O 多路复用的关键，是它可以让内核监听 fd 的事件，而且可以同时监听多个 fd，和用一个线程处理一个 socket 连接有根本的区别，它只需要一个线程或进程，就管理了多个连接，我们可以用一句话来概括 I/O 多路复用：**在一个线程或一个进程中，监听了多个 fd。这里的复用，指的是多个 fd，或者说多个连接，复用了一个线程或者进程。**

### I/O 多路复用的三种方式

### select
首先来看 select，它的原型如下：
```c
int select (int nfds, fd_set *readfds, fd_set *writefds, fd_set *exceptfds, struct timeval *timeout);
```
1. nfds 为需要监听的最大 fd 个数+1。
2. 中间的三个参数 readfds、writefds 和 exceptfds 指定我们要让内核监听读、写和异常条件的 fd。如果对某一个的条件不感兴趣，就可以把它设为空指针。fd_set 结构体可以理解为集合，存放的是 fd，可以通过下面的宏处理这三种 fd_set:
```c
FD_CLR(inr fd, fd_set *fdset);   // 清除 fd set 中相关 fd 的位
FD_ISSET(int fd, fd_set *fdset); // 测试 fd set 中相关 fd 的位是否为真
FD_SET(int fd, fd_set *fdset);  //  设置 fd set 中相关 fd 的位
FD_ZERO(fd_set *fdset);         //  清除 fd set 的全部位
```

select 的使用方法，我们看下面的例子，为了简单起见，我们只传入了可读事件的 fd，对其他的字段设置为 NULL，表示我们不感兴趣。在 for 事件循环中，调用 select，一旦 fd 有可读事件，就调用 read 处理读事件。其中判断可读是通过调用 FD_ISSET 来完成。
```c
ssize_t nbytes;
for (;;) {
    /* select call happens here */
    if (select(FD_SETSIZE, &read_fds, NULL, NULL, NULL) < 0) {
        perror("select");
        exit(EXIT_FAILURE);
    }
    for (int i = 0; i < FD_SETSIZE; i++) {
        if (FD_ISSET(i, &read_fds)) {
            /* read call happens here */
            if ((nbytes = read(i, buf, sizeof(buf))) >= 0) {
                handle_read(nbytes, buf);
            } else {
                /* real version needs to handle EINTR correctly */
                perror("read");
                exit(EXIT_FAILURE);
            }
        }
    }
}
```
I/O 多路复用概念被提出来后，select 是第一个实现它的系统调用，它是一个古老的实现，在 20 世纪 80 年代就诞生了，几乎所有的平台上都支持，良好跨平台支持也是它的一个优点。然而，它的缺点也不可忽视：
* 监听的 fd 数量存在最大限制，在 Linux 上这个最大值是 1024，这在 select 诞生的那个年代来说足够了，但对现在互联网信息爆炸时代来说，极大限制了 select 的可用性。
* 其次，一旦监听的 fd 上有事件产生，select 仅仅会返回，但并不会告诉我们是哪些 fd 产生了事件，这时需要自己遍历所有的 fdset，依次检查每个 fd 上的事件标志位。显然，遍历的这个过程时间复杂度是 O(n)。因此，即使把上面的最大监听数改大，但带来的问题是效率的降低。

### poll

再来看 poll，它是 select 的改进版，主要改进点有：
* 去掉了 1024 这个最大监听数的限制。用户可以自定义监听 fd 数。
* 简化了 select 调用方式，它的原型如下：
```c
int poll (struct pollfd *fds, unsigned int nfds, int timeout);
```
不同于 select 使用三个位图来表示三个 fdset 的方式，poll 使用一个 pollfd 的指针实现，pollfd 结构如下：
```c
typedef struct pollfd {
        int fd;                         // file descriptor
        short events;                   // requested events to watch
        short revents;                  // returned events witnessed
} pollfd_t;
```
pollfd 结构包含了要监听的 event 和发生的 event，不再使用 select “参数-值”传递的方式，使得 poll 支持的 fd 集合限制远大于 select 的 1024。但是，poll 并没有解决 select 最根本的问题：它依然需要遍历所有 fd 来检查事件，遍历的时间复杂度依然是 O(n)。

### epoll

再来看看 epoll，epoll 和上面的 select 和 poll 有着本质的区别，除了没有最大监听数限制外，它还有一个最大特点：**只返回有事件发生的 fd，所以不需要遍历所有监听的 fd 来找到哪些 fd 产生了事件。因此，它的时间复杂度为 O(k)，其中 k 为产生事件的 fd 数**。因此，epoll 的效率不会像 select 和 poll 那样，随着监听 fd 的数量的增长而下降，那么它是怎么做的呢？来看下使用 epoll 时需要的三个系统调用：
```c
int epoll_create(int size);  
int epoll_ctl(int epfd, int op, int fd, struct epoll_event *event);  
int epoll_wait(int epfd, struct epoll_event *events,int maxevents, int timeout);
```
* epoll_create： 创建一个 epoll 的句柄，size 用来告诉内核这个监听的数目一共有多大，这个参数不同于 select 中的第一个参数，给出最大监听的 fd+1 的值，参数 size 并不是限制了 epoll 所能监听的描述符最大个数，只是对内核初始分配内部数据结构的一个建议。
* epoll_ctl：对指定 fd 执行 op 操作，epfd 是 epoll_create 的返回值。op 表示操作，用三个宏来表示：添加 EPOLL_CTL_ADD，删除 EPOLL_CTL_DEL，修改 EPOLL_CTL_MOD。分别添加、删除和修改对 fd 的监听事件，epoll_event 告诉内核需要监听什么事。
* epoll_wait：等待 epfd 上的 io 事件，最多返回 maxevents 个事件。

上面对函数的解释可能比较抽象，简单来讲：当我们调用 epoll_create 时，内核就创建了一棵红黑树和一个就绪（Ready）链表，其中，红黑数用于存储后面 epoll_ctl 传过来的 fd，以支持高效的查找、插入和删除。就绪链表用于存储准备就绪的事件，当 epoll_wait 调用时，仅仅观察这个就绪链表里有没有数据即可。有数据就返回，没有数据就 sleep，等到 timeout 时间到后即使链表没数据也返回。使用 epoll 的方式大概长这样：

```c
#define MAX_EVENTS 10;
int event_count;
// 这里是创建网络程序的一般步骤
// ... socket(), bind(), listen()

// 创建epoll文件描述符，出错返回 -1
// int epoll_create(int size) 从Linux2.6.8开始，size 值被忽略，不过为保持兼容需要设定为一个正整数
int epollfd = epoll_create(1024);
struct epoll_event ev, events_in[MAX_EVENTS]; // 记录套接字相关信息
ev.events = EPOLLIN; // 监视有数据可读事件
ev.data.fd = fd; // 文件描述符数据，其实这里可以放任何数据。

// 加入监听列表，当fd上有对应事件产生时，epoll_wait会将epoll_event填充到events_in数组里
// 出错返回 -1
epoll_ctl(epollfd, EPOLL_CTL_ADD, fd, &ev);

while(1) {
    // 等待事件，epoll_wait 会将事件填充至 events_in 内
    // 返回获得的事件数量，若超时且没有任何事件返回0，出错返回 -1。timeout 设置为 -1 表示无限等待。
    int event_count = epoll_wait(epollfd, events_in, MAX_EVENTS, -1);
    for (int i = 0; i<event_count; i++) { // 遍历所有事件
        if (events_in[i].data.fd == fd) { // 新连接请求
            int new_fd = accept(fd, NULL, NULL);
            ev.events = EPOLLIN; 
            setnonblocking(new_fd);  // 如果要使用Edge Trigger还需将 new_fd 设为非阻塞
            ev.data.fd = new_fd;
            epoll_ctl(epollfd, EPOLL_CTL_ADD, new_fd, &ev); // 将新连接加入监视列表
        } else {  // 其他的事件处理，如读写事件
            int new_fd = events_in[i].data.fd;
            // ... handle(new_fd);
            epoll_ctl(epollfd, EPOLL_CTL_DEL, new_fd, NULL); // 不再监听fd，最后一个参数被忽略
            close(new_fd);
        }
    }
}
```

epoll 有两种工作模式：LT（level trigger）模式和 ET（edge trigger）模式，也叫水平触发和边沿触发，默认的是 LT 模式
* LT 模式：当 epoll_wait 检测到 fd 事件发生并将此事件通知应用程序，应用程序可以不立即处理该事件。下次调用 epoll_wait 时，会再次响应应用程序并通知此事件。
* ET 模式：当 epoll_wait 检测到 fd 事件发生，只有当 fd 事件变化时，即从 unreadable 变为 readable 或从 unwritable 变为 writable 时，它才返回事件 fd，因此应用程序必须立即处理该事件。如果不处理，下次调用 epoll_wait 时，不会再次响应应用程序并通知此 fd 事件。

**一句话：如果 fd 上有事件发生，LT 模式下会一直通知你，ET 模式只会通知一次。**

因此，如果 epoll 工作在 ET 模式，正确的读写方式应该如下所述，具体描述可以参考[这篇文章](http://kimi.it/515.html)，这里只说结论：
>读：只要可读，就一直读，直到返回 0，或者 errno = EAGAIN
>写：只要可写，就一直写，直到数据发送完，或者 errno = EAGAIN



ET 模式也称为高速模式，在很大程度上减少了 epoll 事件被重复触发的次数，因此效率要比 LT 模式高。epoll 工作在 ET 模式的时候，必须使用非阻塞套接字模式，以避免由于一个 fd 的阻塞读/阻塞写操作把处理多个 fd 的任务饿死，如上面代码的第 25 行：
```c
setnonblocking(new_fd);
```
epoll 的上述特点，使 I/O 多路复用系统的性能提升到一个新的台阶。当管理的连接数不多时，使用 select/poll 和使用 epoll 的差别不大，但是当连接数上十万百万时，就会发现 epoll 的效率远高于 select/poll。因为在互联网大量并发的连接场景下，实际同一时刻，真正活跃（Active）的连接，其实只占少数，其他的都是空闲（idle）状态。epoll 不遍历所有连接，只对活跃的连接做处理。

>**需要注意的是：epoll 是 Linux 2.6 内核版本引入，只用于 Linux 平台，BSD 或 MacOS 对应的实现就是 kqueue，Windows 下就是 IOCP**。

## 怎么使用

实际上，当我们使用 I/O 多路复用时，也很少会直接调用 select/poll/epoll，这样开发周期长，对开发者有较高要求，出问题难以调试，直接使用现有的库会大大降低开发难度，如 libevent，netty 等，他们对于不同的平台底层使用不同的方式，比如你是 MacOS，底层就用 kqueue，如果是 Linux 2.6或更新，则用 epoll。这些库提供了一套统一的 API，好处是允许你的代码在不同平台上运行而不需要改变任何代码，用户只需直接使用即可。

## I/O 多路复用的问题

细心的同学会发现，I/O 多路复用是单线程的，不能充分利用多核；同时，单线程模型不能有阻塞，一旦发生阻塞，会大大降低该模型性能，甚至不如 BIO 的多线程，这就对开发者的技术有更高的要求了。

## I/O 多路复用案例

I/O 多路复用技术，已经在很多高性能软件和系统中得到广泛使用，只要弄明白了 I/O 多路复用的底层原理，也就明白那些优秀的软件为何性能很高了。经典的如 Redis，我们知道 Redis 是一个高性能的缓存服务器，它是单线程的，但它的性能并没有因为单线程而降低，反而特别高效，其中一个很重要的原因就是使用的 I/O 多路复用。在 Redis 内部，将客户端的套接字以文件事件进行抽象，客户端的连接，读写等操作，均会在 Redis 产生相应的文件事件，然后由相应的事件处理器进行处理，而 Redis 的单线程，可以监听成千上万个套接字，从而保证了高效的网络通信。同时，Redis 有良好的跨平台特性，由此我们可以断定，Redis 底层并没有写死使用 epoll 方式，因为那样会限制它只能运行于 Linux 平台，实际上，在我们编译 Redis 时，Redis 会根据平台情况，选择使用最合适的方式。

再如 Nginx，Nginx 是一款优秀的，抗并发能力很强的 web 服务器，在它的 Worker 进程中，也是通过 kqueue、epoll 等事件通知机制循环处理连接请求，可以使 Nginx 在高并发的情况下，仍然保持较低的 CPU 使用率，同时它也有良好的跨平台特性。

再如 Netty，Netty 是 Java 写的高性能网络编程框架，它是 Java NIO 库的进一步封装，大大简化了 NIO 的使用方式，Netty 的网络部分使用了经典的 Reactor 模式，其中的 IO 线程 NioEventLoop 聚合了多路复用器，称为 Selector，根据平台选择不同的 I/O 多路复用，如 kqueue、epoll。同时，它可以搭配线程池使用，每个线程都是一个 Selector，成为多线程的 Reactor 模型。因此它的性能也非常强劲。Netty 的线程模型可以看[这篇文章](https://www.infoq.cn/article/netty-threading-model)

## 总结

上面，我们讨论了传统的 BIO 模式的弊端，以及 I/O 多路复用的原理和经典使用案例，那么我们以后写网络程序，是不是无脑用 I/O 多路复用呢？得看场景：
* 如果你的应用并发量不大，用户的请求连接少，不是瓶颈，那么请直接使用 BIO+多线程方式，简单易调试，完全用不着 I/O 多路复用，这样只会增加代码的复杂度，出问题难以调试。
* 如果你的应用并发量高，需要同时处理海量的连接，那么请使用 I/O 多路复用方式。但是记住，你必须始终保持异步思想，不要有任何阻塞操作。至于是用 select/poll 还是 epoll，请看[这篇文章](http://cxd2014.github.io/2018/01/10/epoll/)

#### 参考
* https://segmentfault.com/a/1190000003063859
* https://eklitzke.org/blocking-io-nonblocking-io-and-epoll
* https://www.zhihu.com/question/20122137
* http://kimi.it/515.html
* https://segmentfault.com/a/1190000016875057

