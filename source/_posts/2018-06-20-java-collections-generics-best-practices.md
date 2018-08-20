---
title: Java 中集合和泛型最佳实践
date: 2018-06-20 17:08:33
tags: [Java, collection]
category: [Tech]
---

最近看 Java，读到一篇比较好的英文文章，特翻译了下记录下来。原文链接在[这里](http://www.codejava.net/java-core/collections/18-java-collections-and-generics-best-practices)

集合类和泛型是 Java 中比较常用的技术，也是面试时经常问到的点。本篇文章向大家分享的，是一个资深 Java 开发者多年的实战经验。通过本篇文章，你会了解怎么高效而优雅的使用集合、泛型，而不是仅仅停留在 “just work”。

<!--more-->

## 选择正确的集合

这是使用集合之前的第一个也是最重要的步骤。根据要解决的问题，选择最合适的集合。如果你选错了，你的程序可能仍然有效，但效率不高。如果你选择一个合适的集合，那么程序可能会简单得多，运行也快得多。

选择合适的集合就像选择一辆从东京到纽约的汽车。如果选择一条船，也许你会在几个月后到达目的地。如果你选择一架飞机，你会在一天之内到达时代广场。如果你选择一列火车，那你都到不了目的地。

要知道哪种集合（List，Set，Map，Queue等）适合于解决问题，您应该弄清楚每个集合的特点和行为以及它们之间的差异。您还需要了解每个具体实现（ArrayList，LinkedList，HashSet，TreeSet等）的优缺点。

基本上，您决定通过回答以下问题来选择一个系列：

- 它是否允许重复元素？

- 它接受null吗？

- 它允许按索引访问元素吗？

- 它提供快速添加和快速移除元素吗？

- 它支持并发吗？

- 等等

每当你不确定某个特定集合的相关信息时，也请参阅他们的 Javadocs


## 声明集合时始终使用接口类型

看看下面两条声明语句：
```java
List<String> listNames = new ArrayList<String>();   // (1)

ArrayList<String> listNames = new ArrayList <String>（）; //（2）
```
（1）和（2）之间有什么区别？
在（1）中，变量 listNames 的类型是 List，在（2）中 listNames 具有 ArrayList 的类型。通过使用接口类型声明集合，代码将更加灵活，因为您可以在需要时轻松更改具体实现，例如
```java
List<String> listNames = new LinkedList<String>();
```
当您的代码设计为依赖于 List 接口时，您可以轻松地在 List 的实现之间进行交换，而无需修改使用它的代码。在方法参数的情况下，对集合使用接口类型的灵活性更加明显。考虑以下方法：
```java
public void foo(Set<Integer> numbers){
}
```
在这里，通过声明参数编号为 Set 类型，客户端代码可以传递 Set 的任何实现，例如 HashSet 或 TreeSet：
```java
foo(TreeSet);
foo(HashSet);
```
这使您的代码更灵活，更抽象。相比之下，如果您声明参数编号为 HashSet 类型，则该方法不能接受除 HashSet（及其子类型）之外的任何内容，这样代码就少了灵活性。另外还推荐将接口用作返回集合的方法的返回类型，例如
```java
public Collection listStudents() {
    List<Student> listStudents = new ArrayList<Student>();
 
    // add students to the list
 
    return listStudents;
}
```
这无疑会增加代码的灵活性，因为您可以更改方法中的实际实现而不影响其客户端代码。所以这第二个最佳实践鼓励你使用抽象类型而不是具体类型。
 
## 使用通用类型和钻石操作符

当然可以像下面这样声明一个泛型类型的集合：
```java
List<Student> listStudents = new ArrayList<Student>();
```
自Java 7 以来，编译器可以从左侧声明的泛型类型推断右侧的泛型类型，因此您可以编写：
```java
List<Student> listStudents = new ArrayList<>();
```
<> 非正式地称为钻石操作符。这个操作符非常有用。想象一下，如果有以下集合：
```java
Map<Integer, Map<String, Student>> map = new HashMap<Integer, Map<String, Student>>();
```
没有钻石操作符，你必须重复相同的声明两次，这使得代码冗长，所以尽量使用钻石操作符声明：
```java
Map<Integer, Map<String, Student>> map = new HashMap<>();
```

## 初始化集合时，尽可能指定容量

具体的集合类几乎都具有重载构造函数，该构造函数指定集合的​​初始容量（集合在创建时可以保持的元素数量）。这意味着，如果您非常确定将向集合中添加多少元素，请在创建该集合的新实例时指定初始容量。例如：
```java
List<String> listNames = new ArrayList<String>(5000);
```
这会创建一个最初可容纳5000个元素的数组列表。如果不指定此数字，则每次超出当前容量时，数组列表本身将不得不增大其内部数组，这是低效的。因此，请查阅每个集合的Javadocs以了解其默认初始容量，以便您知道是否应明确指定初始容量。

## 使用 isEmpty() 而不是 size()

如果要检查一个集合是否为空，最好不要这样：
```java
if (listStudents.size() > 0) {
    // dos something if the list is not empty  
}
```
相反，你应该使用 isEmpty() 方法
```java
if (!listStudents.isEmpty()) {
    // dos something if the list is not empty
}
```
isEmpty() 和size() 之间并没有性能差异，使用 isEmpty() 的原因是代码的可读性。
 
## 不要在返回集合的方法中返回 null

如果一个方法被设计为返回一个集合，那么在集合中没有元素的情况下它不应该返回null。考虑以下方法：
```java
public List<Student> findStudents(String className) {
    List<Student> listStudents = null;
 
    if (//students are found//) {
        // add students to the lsit
    }
 
    return listStudents;
}
```
在这里，如果找不到学生，该方法返回 null。这里的关键是，不应该使用空值来表示没有结果。最好的做法是，返回一个空集合来表示没有结果。上述代码可以通过初始化集合来轻松更正:
```java
List<Student> listStudents = new ArrayList<>;
```
因此，请始终检查代码的逻辑以避免返回 null 而不是空集合。

## 不要使用经典 for 循环

如果您编写代码来迭代像下面这样的列表集合，没有什么不妥:
```java
for (int i = 0; i < listStudents.size(); i++) {
    Student aStudent = listStudents.get(i);
 
    // do something with aStudent
}
```
但是，这种做法不太好，因为使用计数器变量 i ，如果它在循环内部的某处被更改，那么可能会导致潜在的错误。这种循环也不是面向对象的，因为每个集合都有自己的迭代器。所以建议使用如下代码的迭代器：
```java
Iterator<Student> iterator = listStudents.iterator();
 
while (iterator.hasNext()) {
    Student nextStudent = iterator.next();
 
    // do something with nextStudent
}
```
此外，如果迭代器创建后，有另一个线程修改了集合，则该迭代器可能会抛出 ConcurrentModificationException，导致潜在错误。因此最好使用下面的增强 for 循环：
```java
for (Student aStudent : listStudents) {
    // do something with aStudent
}
```
正如你所看到的，虽然增强型for循环在后台使用迭代器，但它更简洁易读。

## 优先使用 forEach() 和 Lambda 表达式

从Java 8开始，每个集合都提供了将迭代代码封装在集合本身内部的 forEach() 方法（内部迭代），并且您只需将 Lambda 表达式传递给此方法即可。这使得迭代代码更加紧凑，更灵活，更强大。如下一个例子：
```java
List<String> fruits = Arrays.asList("Banana", "Lemon", "Orange", "Apple");
 
fruits.forEach(fruit -> System.out.println(fruit));
```
这相当于以下增强的 for 循环：
```java
for (String fruit : fruits) {
    System.out.println(fruit);
}
```
所以我鼓励你使用 forEach() 方法迭代集合，这样可以帮助你专注于代码而不是迭代。

## 正确覆盖 equals() 和 hashCode() 方法

当您使用自定义类型的集合时，如一个 Student 对象的列表，记得要正确地覆盖自定义类型中的 equals() 和 hashCode() 方法，以便允许集合有效且正确地管理元素，尤其是在基于它们的哈希代码值组织元素的 Set 集合中。

## 正确实现 Comparable 接口

请记住，当您的自定义类型的元素被添加到通过自然排序（例如 TreeSet 和 TreeMap ）对元素进行排序的集合中时，您的自定义类型会正确实现 Comparable 接口，它还有助于根据元素的自然排序对列表集合中的元素进行排序。

## 使用 Arrays 和 Collections 实用程序类

请注意，Java 集合框架提供了两个名为 Arrays 和 Collections 的实用程序类，它们为我们提供了许多有用的功能。例如，Arrays.asList() 方法返回一个包含给定元素的列表集合，如您所见，我在很多示例中使用了此方法：
```java
List<String> listFruits = Arrays.asList("Apple", "Banana", "Orange");
List<Integer> listIntegers = Arrays.asList(1, 2, 3, 4, 5, 6);
List<Double> listDoubles = Arrays.asList(0.1, 1.2, 2.3, 3.4);
```
Collections 类提供了各种有用的方法来搜索，排序，修改集合中的元素（几乎都在 lists 中）。因此，在查找其他库或编写自己的代码之前，请记住查看这两个实用程序类的可重用方法。

## 在集合上使用 Stream API

从Java 8开始，每个集合现在都有返回元素流的 stream() 方法，因此您可以利用 Stream API 轻松执行聚合函数。例如，以下代码使用 Stream API 来计算整数列表的总和:
```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6);
int sum = numbers.stream().reduce(0, (x, y) -> x + y);
System.out.println("sum = " + sum);
```
这里的关键是，总是利用集合上的 Stream API 来编写代码，以便快速方便地执行集合函数。

## 优先使用 concurrent 包代替 synchronized

当您必须在多线程应用程序中使用集合时，请考虑在 `java.util.concurrent`包中使用并发集合，而不要使用由`Collections.synchronizedXXX()`方法生成的同步集合。这是因为`concurrent`集合旨在通过实现像写时复制(CopyOnWrite)，比较和交换，以及特殊锁等不同的同步机制，在并发应用程序中提供最高性能。以下列表显示了如何选择一些并发集合（右侧），它们与正常集合（左侧）相同
- HashMap -> ConcurrentHashMap

- ArrayList -> CopyOnWriteArrayList

- TreeMap -> ConcurrentSkipListMap

- PriorityQueue -> PriorityBlockingQueue

## 使用第三方集合库

Java 集合框架并不总是满足所有需求，所以第三方集合库出现以满足我们的需求。有很多优质的第三方库，这里列举4个值得收藏的库：

- Fastutil：对于像 int 或 long 这样的原始类型集合，Fastutil 是绝佳选择。它甚至能够处理超过21亿（2 ^ 31）个元素的大型集合。

- Guava：这是用于Java 6+的 Google 核心库。它包含了很多方便的创建集合的方法，如 fluent builders，以及高级集合类型，如 HashBiMap，ArrayListMultimap 等。

- Eclipse集合：这个库包括几乎所有你可能需要的集合：原始类型集合，multimaps，bidirectional maps 等等。

- JCTools：这个库为 JVM 提供 Java 并发工具。它提供了 JDK 当前缺少的一些并发数据结构，例如高级 concurrent queues。

不要将自己锁定在JDK提供的Java Collections Framework上，并始终利用第三方集合库。
 
## 消除 unchecked 警告

当编译器发出未经检查的警告时，请不要忽略它们。最好的做法是，你应该消除未经检查的警告。考虑下面的代码：
```java
List list1 = new ArrayList();
List<String> list2 = new ArrayList<>(list1);
```
尽管上面代码仍可编译，但编译器会发出如下警告：
```
Note: ClassNam.java uses unchecked or unsafe operations
```
未经检查的警告很重要，所以不要忽视它们。这是因为每个未经检查的警告都表示运行时可能出现 ClassCastException。在上面的代码中，如果 list1 包含 Integer 元素而不是 String，那么使用 list2 的代码将在运行时抛出 ClassCastException。
尽最大努力消除这些警告。上面的代码可以这样纠正：
```java
List<String> list1 = new ArrayList<>();
List<String> list2 = new ArrayList<>(list1);
```
但是，并不是每一个警告都可以像这样轻易消除。如果您无法消除未检查的警告，请证明该代码是类型安全的，然后在尽可能最窄的范围内使用 `@SuppressWarnings(“unchecked”)`注释来禁止警告。也写注释解释为什么你压制警告。

## 使用泛型

尽可能的把已有的类型泛型化，因为泛型更安全，更易于使用。当你设计新的类型时，也要考虑它们是否可以被泛型化。同样的，Java 也鼓励您使用泛型参数编写新方法，并将现有方法转换为使用类型参数，因为泛型方法比非泛型方法更安全，更易于使用。泛型方法还可以帮助您编写更通用且可重用的 API。

## 使用有界通配符来增加 API 灵活性

在编写新的泛型方法时，请考虑在输入参数上使用通配符类型以获得最大灵活性。考虑以下方法：
```java
public double sum(Collection<Number> col) {
    double sum = 0;
 
    for (Number num : col) {
        sum += num.doubleValue();
    }
 
    return sum;
}
```
此方法的局限性是它只能接受 List<Number>，Set<Number>，但不接受 List<Integer>，List<Long> 或 Set<Double>。为了最大限度地提高灵活性，请更新方法以使用有界通配符，如下所示：
```java
public double sum(Collection<? extends Number> col)
```
现在，该方法可以接受任何类型的集合，这些类型是整数，双精度，长精度等数字的子类型。

以上就是使用 Java 中集合和泛型的最佳实践，或许有些你已经知道，但关键是，你要尽快在日常编码中，有意识的使用它。



