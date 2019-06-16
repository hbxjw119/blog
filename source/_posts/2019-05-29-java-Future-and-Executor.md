
---
title: Java 中 Future 和异步任务
date: 2019-05-29 16:12:40
tag: [java, 异步任务]
category: [Tech]
---

Java 中的多线程技术一直是个热门话题，而线程池、异步任务是多线程编程中绕不开的一个技术要点，本文介绍下 java 中的 Future 相关使用方法以及任务执行框架 ExecutorService。

<!--more-->
## 一个案例

先看一个案例：用多线程输出 1 亿内的所有质数，并要求输出的质数顺序是排好序的。

如果单纯要完成质数输出，有很多方式，比如将 1 亿数字平均分为 100 份，每份 100 万个，用 100 个线程分别求解质数，每个线程的 run 函数里，打印质数。我们写下这样的代码
```java
public class PrimeDemo {

    public static void main(String[] args) {
        int start = 1;
        int end   = 100000000;

        for (int i = start; i < end; i += 1000000) {
            List<Integer> subList = new ArrayList<>();

            for (int j = i; j < i + 1000000; j++) {
                subList.add(j);
            }
            // 创建线程打印质数
            new Thread(new PrimeThread(subList)).start();
        }
    }
}

class PrimeThread implements Runnable {
    private List<Integer> list;
    public PrimeThread(List<Integer> list) {
        this.list = list;
    }

    @Override
    public void run() {
    	for (Integer i : list) {
            if (isPrime(i)) {
                System.out.println(i);
            }
        }
    }
    private boolean isPrime(Integer num) {
        if (num == 2) { return true; }
        if (num < 2 || num % 2 == 0) { return false; }

        for (int i = 3; i <= Math.sqrt(num); i += 2) {
            if (num % i == 0) { return false; }
        }
        return true;
    }

}
```

我们发现，Runnable 中的 run 返回是 void，也就是说，每个线程只能输出结果，而没办法返回结果，因此最终的输出是无序的。有没有办法把这个结果返回呢？答案是肯定的，我们可以用 Callable

Callable 和 Runnable 的功能类似，但有 3 个不同点：
1、Callable 中的 call 是泛型方法，并且有返回值，也会抛出异常，需要对异常进行处理
2、Callable 不像 Runnable 可以直接用来 new Thread(new Runnable) 开一个线程，Callable 一般配合线程池使用
3、向线程池提交一个 Callable 任务后， 线程池并不是直接给我们返回任务的结果，而是返回一个 Future，通过这个 Future，我们才可以拿到执行结果。

## Future 是什么

看了上面的描述，可能有同学还是不太理解 Future 是什么，从字面意来看，它是"将来"，但这太抽象了，事实确实如此，从 Future 的源码来看，它是一个接口，接口就是抽象的，它表示的是一个任务的执行情况。为了帮助理解，我们可以把它和**句柄**做类比，假如我们要对文件或者网络设备进行读写，通常会拿到一个句柄，文件的话，通常是文件句柄，网络的话，通常是 socket，调用句柄的 read 和 write 方法即可对文件或 socket 进行读写，类比过来，Future 就是一个表示**任务的句柄**，通过这个“句柄”，我们可以获得任务的执行情况，以及给任务发送一些指令。用一个简单例子来体会下
```java
public class FutureDemo {
    public static void main(String[] args) {
        // 创建一个固定大小的线程池
        ExecutorService executor = Executors.newFixedThreadPool(10);
        String name = "jimmy";
        // 用 submit 方法，向线程池提交一个 Callable 任务，submit 返回一个 Future，也就是标识该任务的"句柄"
        Future<String> future = executor.submit(new UpperStringTask(name));
        // get 方法，获取任务的执行结果，如果任务执行过程中出错，会抛出 ExecutionException 异常
        try {
            System.out.println(future.get());    
        } catch (ExecutionException e) {
            e.printStackTrace();
        }
    }
}

class UpperStringTask implements Callable<String> {
    private String name;

    public PrimeTask(String name) {
        this.name = name;
    }
    // 重写 call 方法，并返回 String
    @Override
    public String call() {
        return name.toUpperCase();
    }
}
```
上面的例子是一个很简单的示例，Callable 里执行的也是很简单的任务：将一个字符串转为大写，并返回。返回的结果，可以通过 future.get() 方法获得。可以看到，Callable 的使用方式和 Runnable 基本类似：Runnable 重写 run 方法，Callable 重写 call 方法。这里关键的地方在于，我们不是通过 new 一个 Thread 来启动任务，而是用 ExecutorService 的 submit 方法提交任务，submit 方法返回的也只是 Future，即一个任务的“句柄”，而不是任务结果本身。需要通过 Future 的 get 方法来获得任务结果。如果执行失败或者上面例子，就是将字符串 “jimmy” 转为大写的结果。由于任务的 call 方法返回的是 String 类型，因此 future 也应该是 String，即 `Future<String>` 。需要提醒的是，get 方法是个阻塞方法，这意味着，如果任务比较耗时，则 get 会一直等待任务执行完成才返回。

### Future 中的方法
除了 get 方法获得任务执行结果，Future 还有其他方法，如 
```java
// 判断操作是否已经完成，包括了正常完成、异常抛出、取消
future.isDone()

// 取消操作，方式是中断。参数 true 说的是，即使这个任务正在执行，也会进行中断
future.cancel(true)

// 是否被取消，只有在任务正常结束之前被取消，这个方法才会返回 true
future.isCancelled()

// 上面不带参数的 get 方法是阻塞的，会一直等待任务执行完成，也可以给 get 传一个参数，设置超时时间
future.get(timeout, TimeUnit)
```
可以看到，确实可以把 Futuere 想象成任务的句柄，通过这个句柄，获得任务的状态，以及对任务做一些操作。这一点上，Callable 要比 Runnable 灵活许多。

弄明白了上面简单例子，我们就可以尝试解决文章开头的那个案例了，注释已经说明了问题
```java
public class PrimeDemo {
	public static void main(String[] args) {
        List<Integer> list = new LinkedList<>();

        // 创建一个固定大小的线程池
        ExecutorService executor = Executors.newFixedThreadPool(100);
        // 表示一批任务执行情况的 future 集合，每个任务的结果是 List<Integer>
        List<Future<List<Integer>>> futures = new ArrayList<>();

        List<PrimeTask> taskList = new ArrayList<>();

        int start = 1;
        int end   = 100000000;

        // 将 1 到 1 亿 分为 100 个区间，每个区间 1000000 个数
        for (int i = start; i < end; i += 1000000) {
        	List<Integer> subList = new ArrayList<>();
        	for (int j = i; j < i + 1000000; j++) {
        		subList.add(j);
        	}
        	// 提交一个 PrimeTask 类型的任务，返回的 future 类型是 List<Integer>
        	Future<List<Integer>> future = executor.submit(new PrimeTask(subList));
        	// 然后将 future 添加到结果集
        	futures.add(future);
        }

        // 迭代 future 集合，获取每个任务的执行结果，集合中的 future 顺序和上面提交任务的顺序是一致的，
        for (Future<List<Integer>> f : futures) {
        	try {
        		// 获取结果
        		f.get();
        	} catch (InterruptedException e) {
            	e.printStackTrace();
        	} catch (ExecutionException e) {
            	e.printStackTrace();
        	}
        }
        // 关闭线程池
        executor.shtdown();
        
    }
}

class PrimeTask implements Callable<List<Integer>> {
    private List<Integer> list;

    public PrimeTask(List<Integer> list) {
        this.list = list;
    }

    @Override
    public List<Integer> call() {
        List<Integer> result = new ArrayList<>();
        for (Integer i : list) {
            if (isPrime(i)) {
                result.add(i);
            }
        }
        return result;
    }

    private boolean isPrime(Integer num) {
        if (num == 2) { return true; }
        if (num < 2 || num % 2 == 0) { return false; }

        for (int i = 3; i <= Math.sqrt(num); i += 2) {
            if (num % i == 0) { return false; }
        }
        return true;
    }
}
```

### 执行 Runnable 任务
那么有没有可以执行 Runnable 类型任务的类呢？其实 submit 方法也可以接收一个 Runnable 类型参数，也会返回一个 Future，只不过由于 Runnable 任务没有返回值，因此你用返回的 Future 并调用 Future.get，任务完成后只能得到一个 null。所以，这里的 Future 只能用来查看任务状态，如 Future.isDone，或者取消任务，如 Future.cancel。此外，ExecutorService 继承于 Executor 接口，Executor 有个 execute 方法，这个方法就是用于接收 Runnable 类型的任务，因此我们也可以在 ExecutorService 中使用 execute 方法提交 Runnable，即
```java
// 实际是将 Runnable 任务委托给了父类 Executor 中的 execute
void ExecutorService.execute(Runnable task);
```
由于本文主要侧重点在 Future，因此执行 Runnable 的例子不打算介绍了，简单总结下：
* ExecutorService 可以接收 Callable 和 Runnable 类型的任务，使用 submit 方法提交任务，该方法返回任务句柄 Future
* Callable 任务执行完毕后，通过 Future.get 获取任务结果，Runnable 任务执行完后无结果

## ExecutorCompletionService
在绝大部分场景下，ExecutorService 都可以满足我们的需要。假设现在有这样一个场景：我们向 ExecutorService 依次提交了 4 个任务 A，B，C，D，即：
```java
ExecutorService executorService = Executors.newFixedThreadPool(4);
List<Future> futures = new ArrayList<Future<Integer>>();
futures.add(executorService.submit(A));
futures.add(executorService.submit(B));
futures.add(executorService.submit(C));
futures.add(executorService.submit(D));

// 迭代 futures 获取结果
for (Future future:futures) {
    Integer result = future.get();
    
}
```
但是，A 任务特别耗时，而 B，C，D 任务很快就完成了，由于`future.get()`是阻塞的，因此上面在迭代 future 时，我们不得不等待 A 完成后，即第一个 future.get() 返回后，才能继续拿 B，C，D的结果。这里的主要问题是，当我们提交一个任务集合时，我们事先是不知道集合中哪个任务会先执行完，因此只能拿到一个 future 集合，这个集合的顺序和我们提交任务的顺序一致，然后依次迭代 future 取结果。因此，上面我们求质数，迭代 future 集合时，可能出现这种情况：**后面某个区间的质数已经求解完毕，但前面的区间还没求解完**。由于上面案例需要顺序输出质数，因此我们对 future 顺序迭代取结果。

再假设一个情况，如果我们提交的是下载任务：从不同的镜像源下载某个安装包。如 ubuntu.iso 文件，A 任务从国外官方官网下，B 任务从 163 镜像站下，C 任务从 ali 镜像站下，哪个任务先下载完就用哪个，并终止其他任务，这时用上述迭代方式就不合适了。

此时我们可以使用 **ExecutorCompletionService**。相比于 ExecutorService，ExecutorCompletionService 这个类提供了 take 方法，这个方法也会阻塞的等待任务集合执行，一旦集合中有完成的任务，take 就返回，注意，take 返回的是 future，也即已经完成的任务的“句柄”，这时调用 get 方法，即可拿到结果了。从描述来看，take 方法似乎跟 BlockingQueue 里的 take 方法类似，事实也确实如此，ExecutorCompletionService 是在 ExecutorService 的基础上，用一个 LinkedBlockingQueue 队列存 future。一旦有任务完成，就把该任务的 future 放入到 LinkedBlockingQueue 中，**如果说 
ExecutorService = incoming queue + worker threads，那么 
ExecutorCompletionService = incoming queue + worker threads + output queue**

使用上，ExecutorCompletionService 也非常容易，ExecutorCompletionService 提供了一个构造方法，可以直接把 ExecutorService 包装成 ExecutorCompletionService，如下
```java
CompletionService executorCompletionService= new ExecutorCompletionService<>(executorService);
```
上面的例子用 executorCompletionService 来改写下，注释说明了问题
```java
ExecutorService executorService = Executors.newFixedThreadPool(4);
CompletionService executorCompletionService= new ExecutorCompletionService<>(executorService);
List<Future> futures = new ArrayList<Future<Integer>>();
futures.add(executorCompletionService.submit(A));
futures.add(executorCompletionService.submit(B));
futures.add(executorCompletionService.submit(C));
futures.add(executorCompletionService.submit(D));

// 注意这里就不是迭代 futures 了，而是调用 executorCompletionService 的 take 方法，然后再 get
// 结果的顺序和提交任务的顺序可能不一致，取决于谁先执行完，就先获取谁的结果
for (int i=0; i<futures.size(); i++) {
    Integer result = executorCompletionService.take().get();
    // 拿到结果，做其他处理
    // doSomeThing()
}
```

现在再来考虑下上述那个从不同镜像源下载安装包的场景，注释已经说明了问题
```java
void solve(Executor e, Collection<Callable<Result>> solvers) throws InterruptedException {
	// 初始化一个 ExecutorCompletionService
    CompletionService<Result> ecs = new ExecutorCompletionService<Result>(e);
    // 获得任务总数
    int n = solvers.size();
    List<Future<Result>> futures = new ArrayList<Future<Result>>(n);
    Result result = null;
    try {
    	// 提交任务
        for (Callable<Result> s : solvers) {
            futures.add(ecs.submit(s));
        }
        // 依照任务完成顺序获取结果
        for (int i = 0; i < n; ++i) {
            try {
                Result r = ecs.take().get();
                // 一旦某个任务执行完，终止循环
                if (r != null) {
                    result = r;
                    break;
                }
            } catch(ExecutionException ignore) {}
        }
    }
    // 然后取消所有任务，对已经完成的任务，执行 cancel 无影响
    finally {
        for (Future<Result> f : futures)
            f.cancel(true);
    
    if (result != null)
        use(result);
}
```
需要注意的是，上面的两个案例，我们不是迭代 Future 来拿结果，而是用
```java
for (int i=0; i<task.size; i++)
```
来迭代的，由于我们对结果的顺序不关心，而且 take 方法是 ExecutorCompletionService 类的，因此不能迭代 Future，而只能迭代个数，Future 个数或者任务个数，所以这里就得小心的处理 take 方法了。如果个数弄错，可能导致队列已经没有任务，但 仍然调用 take，导致一直阻塞。我们可以继承 ExecutorCompletionService，增加一个原子变量属性，每次提交一个任务，变量加 1，最终用这个变量表示任务的个数。
## 总结
* Runnable 执行一个不返回结果的任务，Callable 执行一个有返回结果的任务
* 可以使用 Executors 的静态方法创建线程池，由线程池来执行任务
* submit 方法用于提交任务，并返回 Future，可以把它当成任务的句柄
* Future 的 get 是阻塞方法，向 ExecutorService 提交多个任务，最终迭代 Future 时，结果的顺序和任务提交的顺序一致
* ExecutorCompletionService 的 take 方法可以获取已完成的任务的 Future，是通过将任务结果放入 BlockingQueue 实现
#### 参考
* https://dzone.com/articles/executorservice-vs
* https://www.javaspecialists.eu/archive/Issue214.html
