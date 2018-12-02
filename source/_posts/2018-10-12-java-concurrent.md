---
title: Java 中的同步方法
date: 2018-10-22 16:12:40
tag: [java, 同步]
category: [Tech]
---

说到java中的同步，必然少不了耳熟能详的 synchronized，ReentrantLock，以及可能用过但不怎么常见的 Atomic，volatile，本篇即简单介绍下他们的区别和使用场景。

<!--more-->
## 三个问题

同步是为了解决多线程的并发问题，首先来说几个并发编程中的会遇到的三个问题：原子性，可见性，有序性
1. 原子性：
	即一个操作或者多个操作，要么全部执行并且执行的过程不会被任何因素打断，要么就都不执行。这个很好理解，一般教科书上，都会引用银行转账的例子，来说明原子性。在数据库事务中，也会看到原子性的影子。

2. 可见性：
　　可见性是指当多个线程访问同一个变量时，一个线程修改了这个变量的值，其他线程能够立即看得到修改的值。一般计算机 CPU 都会有高速缓存，当某个线程对一个变量进行修改，修改后的值不会马上写入到主存，而是会放入到该执行该线程的 CPU 高速缓存中。这样可能导致其他 CPU 上的线程看不到这个变量的修改，因为它读的仍然是主存中的值。

3. 有序性：
	即程序执行的顺序按照代码的先后顺序执行。我们在写一段代码，当 JVM 执行该代码时，并不一定会按照我们代码写的先后顺序去执行，可能会发生指令重排序。什么是指令重排序？一般来说，处理器为了提高程序运行效率，可能会对输入代码进行优化，它不保证程序中各个语句的执行先后顺序同代码中的顺序一致，但是它会保证程序最终执行结果和代码顺序执行的结果是一致的。


**要想并发程序正确地执行，必须要保证原子性、可见性以及有序性。只要有一个没有被保证，就有可能会导致程序运行不正确。**

## 同步的方法

再来看看下面两段代码
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
```

以上的两个 increment 方法，均是对 count 字段做加 1 操作，而且都是原子的，即可以在并发场景下使用，但二者实现的方法却不太一样。

### synchronized

`synchronized`属于 java 中的关键字，是最常用的锁，也是一种独占锁，或者称为互斥，这意味着，**当你使用`synchronized`关键字对代码进行同步后，如果有多个线程想执行这段代码，这些线程会变成串行**，即如果当前有线程在执行这段代码，其他的线程只能等待。`synchronized`可以保证并发编程中要求的原子性，可见性和有序性。

在类的任意位置都可以使用`synchronized`对想要同步的代码进行同步，如类的实例方法，静态方法，实例对象，Class 对象，代码块等。在上例中，我们对 Sample 类的静态方法 increment() 做了同步，锁住的是当前的 Sample 类对应的 class 对象，再来看看`synchronized`在代码中不同位置的使用方法：

```java
public class SyncCounter implements Runnable {
	static int counter = 0;

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
上述代码中，分别在不同的地方使用了`synchronized`。为了执行 doSomething，必须获得对象 syncObj 的锁，syncObj 可以是类实例或者是类，典型的如 this，当两个并发线程访问同一个对象 object 中的这个 synchronized(this)同步代码块时，一个时间内只能有一个线程得到执行。另一个线程必须等待当前线程执行完这个代码块以后才能执行该代码块。但仍然可以访问该 object 中的非synchronized(this)同步代码块。 

同时，`synchronized`也是一个可重入锁，即如果一个线程持有了对象锁，那么当它再次想访问锁住的临界资源时，将可以成功。

### Volatile

提到 volatile，一般都会提到可见性，所以在处理同步问题上它大显作用，而且它的开销比 synchronized 小、使用成本更低。可以把 volatile 看做是一个轻量级的 synchronized。但仅此而已，synchronized 不仅保证可见性，还能保证原子性，而 volatile 是不能保证原子性的，它不适合在对该变量的写操作依赖于变量本身自己。举个最简单的栗子：在进行计数操作时 count++，实际是 count=count+1; count 最终的值依赖于它本身的值。所以使用 volatile 修饰的变量在进行这么一系列的操作的时候，就有并发的问题。
因此，如果一个变量被声明为 volatile，仅仅是表明：
1. 保证了不同线程对这个变量进行操作时的可见性，即一个线程修改了某个变量的值，这新值对其他线程来说是立即可见的
2. 禁止进行指令重排序

因此，volatile 不能替代 synchronized，因为它不保证原子性。通常来说，使用volatile必须具备以下2个条件：

　　1）对变量的写操作不依赖于当前值

　　2）该变量没有包含在具有其他变量的不变式中


### Atomic

从字面意思来讲，这也是一种原子类型，可以实现同步。在说`Atomic`之前，有必要复习下 CAS 的概念，CAS(compare and swap)，即**比较并交换**，该操作通过将内存中的值与指定数据进行比较，当数值一样时，将内存中的数据替换为新值，这是一种典型的无锁思想，也是大多数 CPU 架构直接支持的原子指令。因此，我们说 CAS 操作是原子性的，是因为 CPU 指令来保证它是原子的，它是由硬件来提供。

`Atomic`类就是 JVM 中支持 CAS 的一种实现。具体在 `java.util.concurrent.atomic`这个包下，


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
上述方法最终会调用汇编，生成一条 CPU 指令，不会被打断。从而保证原子性。


>如果是 JDK8，推荐使用 LongAdder 对象，比 AtomicLong 性能更好(减少乐观锁的重试次数)。


### ThreadLocal

再来说说`ThreadLocal`，这个类的出现并不是用来解决在多线程并发环境下资源的共享问题的，它和其它两个关键字不一样，其它两个关键字都是从线程外来保证变量的一致性，这样使得多个线程访问的变量具有一致性，可以更好的体现出资源的共享。
而 ThreadLocal 的设计，并不是解决资源共享的问题，而是用来提供线程内的局部变量，这样每个线程都自己管理自己的局部变量，别的线程操作的数据不会对我产生影响，互不影响，所以不存在解决资源共享这么一说，如果是解决资源共享，那么其它线程操作的结果必然我需要获取到，而ThreadLocal则是自己管理自己的，相当于封装在 Thread 内部了，供线程自己管理。来看个例子
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
threadLocalValue:1
threadLocalValue:3
threadLocalValue:2

**值得注意的一点**：ThreadLocal 在线程使用完毕后，我们应该手动调用remove方法，移除它内部的值，这样可以防止内存泄露，当然还有就是将 ThreadLocal 设为static。

ThreadLocal 内部有一个静态类 ThreadLocalMap，使用到 ThreadLocal 的线程会与 ThreadLocalMap 绑定，维护着这个 Map 对象，而这个 ThreadLocalMap 的作用是映射当前 ThreadLocal 对应的值，key 为当前 ThreadLocal 的弱引用。

## 总结

由以上简单分析，我们在做代码同步时，优先考虑使用 synchronized，如有特殊情况，再做优化。当满足 volatile 的使用条件时，可以用 volatile，来实现轻量级锁。
由于 `Atomic` 是通过 CAS 来实现同步，是一种非阻塞解决并发的方式，不会锁住当前线程，效率高，当然它也会存在 CAS 所带来的 ABA 问题，同时，由于存在重试机制，并发越高，失败重试的次数越多，极大增加 CPU 开销，不适合于竞争非常频繁的场景。


#### 参考：

* https://www.cnblogs.com/dolphin0520/p/3920373.html
* https://www.2cto.com/kf/201601/486898.html
* https://emacsist.github.io/2017/07/04/java-%E4%B8%AD-%E7%9A%84-synchronized-%E4%B8%8E-atomic/
