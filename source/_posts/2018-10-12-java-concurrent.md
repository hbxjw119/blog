---
title: Java 中的同步方法
date: 2018-10-22 16:12:40
tag: [java, 同步]
category: [Tech]
---

说到 java 中的同步，必然少不了耳熟能详的`synchronized`，`ReentrantLock`，以及可能用过但不怎么常见的`Atomic`，`volatile`，本篇即简单介绍下他们的区别和使用场景。

<!--more-->
## 三个问题

首先要明确一个事实：同步是为了解决多线程的并发问题，但并不是说只要有多线程，就一定会有并发问题。多线程环境下，如果你只是调用了一些方法，但没有访问共享的变量或内存，就不存在并发问题，注意：一定是**共享的变量或内存**。在 java 里，这样的变量一般是在堆和方法区中存在，他们可以被多个线程同时访问到。**换句话说，堆和方法区中的变量，需要考虑并发问题，比如并发访问某个对象的实例属性，静态属性，还有数组的元素等，就是典型的需要考虑并发问题场景。而方法的参数，方法体中定义的局部变量是放在栈上的，属于线程私有，可以不用考虑并发问题。**举个例子，看下面代码：
```java
public class Variables {

  private static int a;

  private String b;

  public void func(int c):
       int d;
}
```
上面定义的类，其中，a 变量是类的静态变量，属于类变量，存放在方法区，b 是成员变量，存放在堆中，而 c 和 d 是局部变量，存放在栈中，因此多线程环境下，对 a 和 b 的操作需要考虑并发问题，而 c 和 d 的操作，则不需要考虑。

那么并发问题需要解决什么呢？通常，解决的问题有三个：**原子性**，**可见性**，**有序性**
1. 原子性：
	即一个操作或者多个操作，是一个不可分割的部分，要么全部执行成功并且执行的过程不会被任何因素打断，要么就都不执行。这个很好理解，一般教科书上，都会引用银行转账的例子，来说明原子性。即扣钱操作和加钱操作应该是不可分割的，不能出现钱扣了，但对方没收到钱，或者收到钱了，但钱没扣。在数据库事务中，也会看到原子性的影子。

2. 可见性：
　　可见性是指当多个线程访问同一个变量时，一个线程修改了这个变量的值，其他线程能够立即看得到修改的值。一般计算机 CPU 都会有高速缓存，当某个线程对一个变量进行修改，修改后的值不会马上写入到主存，而是会放入到执行该线程的 CPU 高速缓存中。这样可能导致其他 CPU 上的线程看不到这个变量的修改，因为它读的仍然是自己 CPU 上的高速缓存里的值。

3. 有序性：
	即程序执行的顺序按照代码的先后顺序执行。我们在写一段代码，当 JVM 执行该代码时，并不一定会按照我们代码写的先后顺序去执行，可能会发生指令重排序。什么是指令重排序？一般来说，处理器为了提高程序运行效率，可能会对输入代码进行优化，它不保证程序中各个语句的执行先后顺序同代码中的顺序一致，但是它会保证程序最终执行结果和代码顺序执行的结果是一致的。


**要想并发程序正确地执行，必须要保证原子性、可见性以及有序性。只要有一个没有被保证，就有可能会导致程序运行不正确。**那么怎么保证这三点呢？

## 同步的方法

我们看看下面几段代码
```java
// 代码1
public class Sample {
  private static int count = 0;
  synchronized public static void increment() {
    count++;
  }
}

// 代码2
public class Sample {
  private static AtomicInteger count = new AtomicInteger(0);
  public static void increment() {
    count.getAndIncrement();
  }
}

// 代码3
public class Sample {
  private volatile int count = 0;
  public static synchronized void increment() {
    count++;
  }
}
```

以上的三个 increment 方法，均是对 count 字段做加 1 操作，哪些可以在并发场景下正确运行？看完这篇文章，相信大家能回答这个问题。

### synchronized

`synchronized`属于 java 中的关键字，是最常用的锁，也是一种独占锁，或者称为互斥，这意味着，**当你使用`synchronized`关键字对代码进行同步后，如果有多个线程想执行这段代码，这些线程会变成串行**，即如果当前有线程在执行这段代码，其他的线程只能等待。`synchronized`可以保证并发编程中要求的原子性，可见性和有序性。

对于同步代码块，`synchronized`是通过获取对象的监视锁，即`monitor`来实现同步，java 中，每个对象都有一个`monitor`，或者称为监视器，被`synchronized`包裹的代码编译成字节码后，会在代码块前后，引入`monitorenter`和`monitorexit`的字节码来实现的，JVM 规定，当`monitor`被占用时，代码块即会处于锁定状态，其他线程无法访问。像`wait/notify`等方法也依赖于`monitor`。对于同步方法，JVM 是采用`ACC_SYNCHRONIZED`标记符来实现同步的，即一个线程想调用某方法，会检查是否有`ACC_SYNCHRONIZED`，如果有设置，则需要先获得监视器锁，然后才能执行方法。

在类的任意位置都可以使用`synchronized`对想要同步的代码进行同步，如类的实例方法，静态方法，实例对象，Class 对象，代码块等。在上例中，我们对 Sample 类的静态方法 increment() 做了同步，锁住的是当前的 Sample 类对应的 class 对象，再来看看`synchronized`在代码中不同位置的使用方法：

```java
public class SyncCounter implements Runnable {
	static int counter = 0;
  Object syncObj = new Object();

	// 同步实例方法
	public synchronized void increase() {
		counter++;
	}
	// 同步静态方法，锁住的是 SyncCounter.class对象
	public static synchronized void staticIncrease() {
		counter++;
	}

	@Override
	public void run() {
		// 同步代码块
		synchronized (syncObj) {
		// doSomething();
		}
	}
}

```
上述代码中，分别在不同的地方使用了`synchronized`。为了执行 doSomething，必须获得对象 syncObj 的锁，syncObj 可以是类实例或者是类，典型的如 this，当两个并发线程访问同一个对象 object 中的这个 synchronized(this)同步代码块时，同一时间内只能有一个线程得到执行。另一个线程必须等待当前线程执行完这个代码块以后才能执行该代码块。但仍然可以访问该 object 中的非synchronized(this)同步代码块。 

同时，`synchronized`也是一个可重入锁，即如果一个线程持有了对象锁，那么当它再次想访问锁住的临界资源时，将可以成功。

### Volatile

提到`volatile`，一般都会提到可见性，所以在处理同步问题上它大显作用，那么`volatile`是如何保证可见性的呢？ 当对`volatile`变量做写入操作时，在 JVM 字节码中，你会看到一条 lock 前缀的指令，这是告诉 CPU，请立即将这个变量写入到主内存，以保证其他 CPU 重新从内存中读取这个新值，然后放入自己的缓存，这样就保证了可见性。 

`volatile`的开销比 `synchronized`小、使用成本更低。但`volatile`只能用来修饰变量，而不能修饰方法或者代码块，可以把`volatile`看做是一个轻量级的`synchronized`，但仅此而已，`synchronized`不仅保证可见性，还能保证原子性，而`volatile`是不能保证原子性的。它不适合在对该变量的写操作依赖于变量本身自己。举个最简单的栗子：在进行计数操作时，如
```
count++
```
实际是
```
count= count + 1;
```
count 最终的值依赖于它本身的值。所以使用`volatile`修饰的变量在进行这么一系列的操作的时候，仍然会有并发的问题。而像
```
flag = true;
```
这样的语句，由于 flag 的值不会依赖自身，因此这种情况下，`volatile`可以代替`synchronized`。通常来说，如果一个变量被声明为`volatile`，仅仅是表明：
1. 保证了不同线程对这个变量进行操作时的可见性，即一个线程修改了这个变量的值，这新值对其他线程来说是立即可见的
2. 禁止进行指令重排序

而要使用`volatile`，必须具备以下2个条件：
1. 对变量的写操作不依赖于当前值，如像上面那样，给一个标志变量 flag 赋值。
2. 变量不需要与其他状态变量共同参与不变约束。

其他情况下，仍然是需要用`synchronized`的。

### ReentrantLock

上面说的`synchronized`，是一个严格的排它锁，一方面，没有抢到锁的线程，会一直等待锁的释放；另一方面，当锁释放时，所有的线程都会参与争抢。如果我们需要一种遵守“先来后到”规则的公平锁，或者想给那些等待锁的线程一个超时时间，`synchronized`就无法满足需求了，这时可以使用`ReentrantLock`，在基本用法上，`ReentrantLock`和`synchronized`很相似，前者是一个实现了`Lock`接口的可重入锁，因此需要调用 lock() 和 unlock() 来完成锁的申请和释放，重要的是，`ReentrantLock`具备几个`synchronized`没有的高级功能：**等待可中断**，**公平锁**，**绑定多个条件**。而在性能上，二者却基本没有什么差别，`ReentrantLock`甚至比`synchronized`更优一点。

那么是不是说可以抛弃`synchronized`，而只用`ReentrantLock`呢？不然，首先，在使用方式上，`synchronized`更简洁紧凑，用户几乎不用关心锁的释放，即使是被同步的代码中抛出了异常，也可以自动释放锁。而`ReentrantLock`在同步结束后，需要显示的调用 unlock()，通常会在 finally 块中调用。其次，`synchronized`为许多开发者所熟悉，并且许多程序框架已经使用了它，如果将两种机制混合，既容易使人迷惑，也容易发生错误。因此，除非你有特别的理由，而`synchronized`无法满足，比如上述说的那三点。否则，还是应该优先考虑使用`synchronized`。

### Atomic

上面提的`synchronized`和`ReentrantLock`，可以认为是阻塞型同步方式，或者说悲观锁。在锁的申请，线程调度和恢复过程中，存在着很大开销。`volatile`虽然是一种更轻量级的同步机制，但如上面所说，它无法保证原子性。有没有一种类似于`volatile`，又能保证原子性的机制呢？**Atomic**类型登场了。从字面意思来讲，就知道这是一种原子类型，可以实现同步。在说`Atomic`之前，有必要复习下**CAS**的概念，CAS(compare and swap)，即**比较并交换**，这是计算机领域中很典型而又很重要的无锁思想，乐观锁通常用的就是 CAS 思想，如 MySQL 中的 MVCC，redis 中的 Watch ，都是用的 CAS 方式实现乐观锁。CAS 操作是通过将内存中的值与指定数据进行比较，当数值一样时，将内存中的数据替换为新值，它是大多数 CPU 架构直接支持的原子指令。因此，我们说 CAS 操作是原子性的，是因为 CPU 指令来保证它是原子的，它是由硬件来提供。

`Atomic`类型就是 JVM 中支持 CAS 的一种实现。如`AtomicInteger`,`AtomicLong`等。具体在 `java.util.concurrent.atomic`这个包下

在上述代码中，我们看下 `getAndIncrement()`方法的实现：
```java
    public final int getAndIncrement() {
        return unsafe.getAndAddInt(this, valueOffset, 1);
    }
```
再看看 getAndAddInt 方法：
```java
public final int getAndAddInt(Object var1, long var2, int var4) {
        int var5;
        do {
            var5 = this.getIntVolatile(var1, var2);
        } while(!this.compareAndSwapInt(var1, var2, var5, var5 + var4));

        return var5;
    }
```
其中，compareAndSawpInt 方法原型如下：
```java
// 第一和第二个参数代表对象的实例以及地址，第三个参数代表期望值，第四个参数代表更新值
public final native boolean compareAndSwapInt(Object var1, long var2, int var4, int var5);
```
注意到上面有个 unsafe，这是 sun.misc.Unsafe 类的实例，在 JDK 的并发包中，很多地方都用到了它，它提供了一些底层操作的能力，它设计出来是给 JDK 中的源码使用的，比如 AQS、ConcurrentHashMap 等，这个 Unsafe 类不是给我们的代码使用的，是给 JDK 源码使用的，最后它调用的是一个 native 方法，底层跟硬件相关，生成的指令可以保证原子性。


>如果是 JDK8，推荐使用 LongAdder 对象，比 AtomicLong 性能更好(减少乐观锁的重试次数)。

### ThreadLocal

最后我们来说说`ThreadLocal`，其实这个类的出现并不是用来解决在多线程并发环境下资源的共享问题的，它和上面几个同步方式不一样，上面的关键字都是从线程外来保证变量的一致性，这样使得多个线程访问的变量具有一致性，可以更好的体现出资源的共享。

而`ThreadLocal`的设计，并不是解决资源共享的问题，而是用来提供线程内的局部变量，这样每个线程都自己管理自己的局部变量，别的线程操作的数据不会对我产生影响，互不影响，所以不存在解决资源共享这么一说，如果是解决资源共享，那么其它线程操作的结果必然我需要获取到，而`ThreadLocal`则是自己管理自己的，相当于封装在`Thread`内部了，供线程自己管理。来看个例子
```java
public class ThreadLocalDemo {
	private static ThreadLocal<string> threadLocal = new ThreadLocal<string>(){
        @Override
        protected String initialValue() {
            return "hello";
        }
    };
    static class MyRunnable implements Runnable{
        private int num;
        public MyRunnable(int num){
            this.num = num;
        }
        @Override
        public void run() {
            threadLocal.set(String.valueOf(num));
            System.out.println("threadLocalValue:"+threadLocal.get());
        }
    }
 
    public static void main(String[] args){
        new Thread(new MyRunnable(1)).start();
        new Thread(new MyRunnable(2)).start();
        new Thread(new MyRunnable(3)).start();
    }
}
```
打印结果：
```
threadLocalValue:1
threadLocalValue:3
threadLocalValue:2
```
**值得注意的一点**：`ThreadLocal`在线程使用完毕后，我们应该手动调用`remove`方法，移除它内部的值，这样可以防止内存泄露，当然还有就是将`ThreadLocal`设为`static`。

`ThreadLocal`内部有一个静态类`ThreadLocalMap`，使用到`ThreadLocal`的线程会与`ThreadLocalMap`绑定，维护着这个`Map`对象，而这个`ThreadLocalMap`的作用是映射当前`ThreadLocal`对应的值，`key`为当前`ThreadLocal`的弱引用。

## 总结

* java 多线程需要考虑并发问题，只要是原子性，可见性，有序性没有同时得到保证，就会产生并发问题，需要做同步。
* 做同步时，优先考虑使用`synchronized`，如有特殊情况，再做优化，如考虑使用`ReentrantLock`。
* 当满足`volatile`的使用条件时，可以用`volatile`，来实现轻量级锁。
* 由于 `Atomic` 是通过 CAS 来实现同步，是一种非阻塞解决并发的方式，不会锁住当前线程，效率会更高，当然它也会存在 CAS 所带来的 ABA 问题，另一方面，由于存在重试机制，并发越高，失败重试的次数越多，极大增加 CPU 开销，不适合于竞争非常频繁的场景。
* ThreadLocal 并不解决线程间共享数据的问题，它适用于变量在线程间隔离且在方法间共享的场景。


#### 参考：

* https://www.cnblogs.com/dolphin0520/p/3920373.html
* https://www.2cto.com/kf/201601/486898.html
* https://emacsist.github.io/2017/07/04/java-%E4%B8%AD-%E7%9A%84-synchronized-%E4%B8%8E-atomic/
* http://www.hollischuang.com/archives/1883
* http://www.jasongj.com/java/threadlocal/
* 《java并发编程实战》
