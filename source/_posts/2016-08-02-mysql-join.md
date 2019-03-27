---
title: MYSQL 中的 JOIN
date: 2016-08-02 09:14:35
tags: [linux, mysql]
category: [Tech]
---

在我们写 SQL 语句时，会用到多表联合查询，这时就需要用到 JOIN 关键字了，本文用图来看下 MYSQL 中几种 JOIN 的区别。
<!--more-->

首先建两个表
```sql
CREATE TABLE `studentEO` (
	`id` INT UNSIGNED,
	`age` INT UNSIGNED
	)ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `scoreEO` (
	`stu_id` INT UNSIGNED,
	`score` INT UNSIGNED
	)ENGINE=InnoDB DEFAULT CHARSET=utf8;
```
其中，表 studentEO 中的 id 字段和 socreEO 表中的 stu_id 字段相关联。

往表中插些数据
```sql
INSERT INTO studentEO(id, age) values(1,15);
INSERT INTO studentEO(id, age) values(2,16);
INSERT INTO studentEO(id, age) values(3,17);
INSERT INTO studentEO(id, age) values(4,18);

INSERT INTO scoreEO(stu_id, score) values(2,70);
INSERT INTO scoreEO(stu_id, score) values(3,80);
INSERT INTO scoreEO(stu_id, score) values(4,90);
INSERT INTO scoreEO(stu_id, score) values(5,100);
```

分别执行以下语句:
```sql
SELECT * FROM studentEO LEFT JOIN scoreEO ON studentEO.id = scoreEO.stu_id; 
```
结果:
+------+------+--------+-------+
| id   | age  | stu_id | score |
+------+------+--------+-------+
|    2 |   16 |      2 |    70 |
|    3 |   17 |      3 |    80 |
|    4 |   18 |      4 |    90 |
|    1 |   15 |   NULL |  NULL |
+------+------+--------+-------+
4 rows in set (0.00 sec)

```sql
SELECT * FROM studentEO RIGHT JOIN scoreEO ON studentEO.id = scoreEO.stu_id; 
```
结果：
+------+------+--------+-------+
| id   | age  | stu_id | score |
+------+------+--------+-------+
|    2 |   16 |      2 |    70 |
|    3 |   17 |      3 |    80 |
|    4 |   18 |      4 |    90 |
| NULL | NULL |      5 |   100 |
+------+------+--------+-------+
4 rows in set (0.00 sec)

```sql
SELECT * FROM studentEO INNER JOIN scoreEO ON studentEO.id = scoreEO.stu_id; 
```
结果：
+------+------+--------+-------+
| id   | age  | stu_id | score |
+------+------+--------+-------+
|    2 |   16 |      2 |    70 |
|    3 |   17 |      3 |    80 |
|    4 |   18 |      4 |    90 |
+------+------+--------+-------+
3 rows in set (0.00 sec)

```sql
SELECT * FROM studentEO LEFT JOIN scoreEO on studentEO.id=scoreEO.stu_id UNION SELECT * FROM studentEO RIGHT JOIN scoreEO ON studentEO.id = scoreEO.stu_id;
```
**注意，MYSQL 中，没有 FULL OUTER JOIN**
结果：
+------+------+--------+-------+
| id   | age  | stu_id | score |
+------+------+--------+-------+
|    2 |   16 |      2 |    70 |
|    3 |   17 |      3 |    80 |
|    4 |   18 |      4 |    90 |
|    1 |   15 |   NULL |  NULL |
| NULL | NULL |      5 |   100 |
+------+------+--------+-------+
5 rows in set (0.00 sec)

从以上的几条 SQL 结果来看，我们可以得到以下图示：
![内连接](https://www.wangbase.com/blogimg/asset/201901/bg2019011503.png)
![左连接](https://www.wangbase.com/blogimg/asset/201901/bg2019011501.png)
![右连接](https://www.wangbase.com/blogimg/asset/201901/bg2019011504.png)
![外连接](https://www.wangbase.com/blogimg/asset/201901/bg2019011505.png)

## 用语言总结下
* 只返回两张表匹配的记录，这叫内连接（inner join）
* 返回匹配的记录，以及表 A 多余的记录，这叫左连接（left join）
* 返回匹配的记录，以及表 B 多余的记录，这叫右连接（right join）
* 返回匹配的记录，以及表 A 和表 B 各自的多余记录，这叫全连接（full join）

#### 参考
http://www.ruanyifeng.com/blog/2019/01/table-join.html
https://blog.codinghorror.com/a-visual-explanation-of-sql-joins/
