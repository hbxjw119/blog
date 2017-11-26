---
title: Go语言中的数组(array)和切片(slice)
date: 2017-11-15 15:14:35
tags: [go]
category: [go]
---

刚开始学习go，里面有两个类型，常常容易让人弄混：array和slice，这里对这两个类型做个总结
<!--more-->

### 声明 
数组的声明，语法格式如下：
```go
var arr_name [size] arr_type
```
如：
```go
var age [10] int
```
而切片的声明，不需要说明长度：
```go
var sli_name []type
```
> slice和数组在声明时的区别：声明数组时，方括号内写明了数组的长度或使用...自动计算长度，而声明slice时，方括号内没有任何字符。

### 初始化
数组初始化：
```go
var age = [5]int{20,22,25,29,23}
```
切片初始化，一般有两种：
(1) 通过数组
```go
var arr [5]int = [5]int{3,5,1,4,6}
var myslice []int = arr[:3]
//或者简写
var slice := [] int {3,2,5}
```
(2) 通过make 语法：
```go
make([]T, len, capacity) //其中capacity可以省略
```
如：
```go
slice2 := make([]int 5)
```
对于切片，比较重要的特性就是，切片的长度可变，通过`append`方法完成，如：
```golang
s := []int{1, 4, 5} // [1, 4, 5]
s = append(s, 6)  // [1, 4, 5, 6]
```

### 遍历
在遍历数组和切片时，二者都类似，可以通过`for`语法，也可以通过`range`表达式
```go
for i:= 0; i < len(arr or slice); i++ {
	fmt.Println(arr[i])
	fmt.Println(slice[i])
}
```
```go
for i, v := range slice {
	fmt.Println(i, v)
}
```
#### 参考
http://blog.csdn.net/crawler_star/article/details/50354276
