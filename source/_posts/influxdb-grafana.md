---
title: influxdb配合grafana的监控
date: 2016-12-21 20:14:35
tags: [Linux, influxdb, grafana]
category: [monitor]
---

在大型公司，对于监管众多服务器的资源使用情况，是一项不可或缺的工作，随时了解每个服务器的运行状态，负载情况，对于发现线上问题，有着重要的参考价值。对于线上服务，监控和了解集群的工作状况，也是必不可少的环节。在机器监控方面，新兴的influxdb配合grafana，有如倚天屠龙，简单又好用。
<!--more-->

## influxdb，grafana简介
influxdb用Go语言编写的一个开源分布式时序、事件和指标数据库，和传统是数据库相比有不少不同的地方。首先它非常适合用于存储基于时序类的数据，这类数据有以下特点：

* 数据量大，基于时序
* 很少有更新和删除操作

因此，非常适合用于监控系统中的数据采集。

有了大量的数据，最好是可以把这些数据可视化的展示出来，这样我们可以观察数据的变化趋势，是升高还是降低。而且还要满足能动态的变化，如果有新的数据产生，则自动展示出来，不需要手动刷新。Grafana应运而生！

* grafana是用于可视化大型测量数据的开源程序，他提供了强大和优雅的方式去创建、共享、浏览数据。dashboard中显示了你不同metric数据源中的数据。
* grafana最常用于因特网基础设施和应用分析，但在其他领域也有机会用到，比如：工业传感器、家庭自动化、过程控制等等。
* grafana有热插拔控制面板和可扩展的数据源，目前已经支持Graphite、InfluxDB、OpenTSDB、Elasticsearch。
看下官方的demo
![demo](/images/influxdb-grafana/grafana-demo1.png)

是不是很酷炫！
个人觉得，grafana最大的好处就是，你只需要配置好数据源。不需要写一行代码，即可完成数据可视化。

## 安装
influxdb和grafana的安装灰常简单，在linux下(CentOS)，只要运行以下命令即可：
安装influxdb：
```
wget https://dl.influxdata.com/influxdb/releases/influxdb-1.1.1.x86_64.rpm
sudo yum localinstall influxdb-1.1.1.x8664.rpm
```
安装grafana：
```
wget https://grafanarel.s3.amazonaws.com/builds/grafana-3.1.1-1470047149.x86_64.rpm
sudo yum install initscripts fontconfig -y
rpm -ivh grafana-3.1.1-1470047149.x86_64.rpm
```
二者安装完毕后，就可以使用啦~

## 使用
### influxdb

在使用之前，我们需要对软件简单做下配置，首先配置influxdb，influxdb1.1.1是默认不开启web端口查询的，需要打开，修改配置，在/etc/influxdb/influxdb.conf中，
找到[admin]，将下列的注释取消即可，如图
![influxdb-conf](/images/influxdb-grafana/influxdb-conf.png)

修改完毕后，启动服务：
```
/etc/init.d/influxdb start
```
启动完毕后，即可在本机访问了influxdb了。直接命令行输入 influxdb，即可进入命令行模式
![influxdb-conf](/images/influxdb-grafana/influxdb-start.png)
接下来的操作，就跟使用mysql一样了，如show databases，use testdb….和mysql有点不同的是，influxdb语句末尾要不要分号都无所谓。插入数据时，也只需要insert，而不需要insert into…由于influxdb是基于时序型的数据库，因此里面的每条数据都会有time这个字段，如果插入时不指定，则默认会用本机的unix时间戳。其他使用方法，请查看官方文档。

influxdb还提供了可视化的web端查询和插入。前提是你已经在配置中打开的了web端口的访问权限。直接在浏览器中输入你的主机名加端口，默认8083端口：
http://127.0.0.1:8083
![influxdb-conf](/images/influxdb-grafana/influxdb-web.png)

左上角的write data，直接可以写插入语句，query输入框，可以直接写查询语句，右上角选择数据库。使用起来，是不是很方便呢？

influxdb还提供了数据的失效性策略设置。选择一个数据库，命令行或者web界面，输入SHOW RETENTION POLICIES ON testdb，即可展示testdb数据库的策略情况，
![influxdb-conf](/images/influxdb-grafana/influxdb-rp.png)

一个数据库可以有多条策略。每新建一个库，都会有一条称为autogen的默认策略，influxdb的数据实际是存在被称为shard的碎片中，在插入和查询数据时，也是根据策略名来操作的，如果你设置了多条策略，会有一条策略是默认的，当你查询和插入时，如果未指定策略，即访问的默认策略中的shard的数据。如果要查询其他策略中的数据，需要这样：SELECT * FROM “策略名”.表名。当然也可以修改默认策略为指定的策略。如ALTER RETENTION POLICY “策略名” ON “表名” DEFAULT。

关于influxdb的其他问题，可以查看官网

### grafana

学会了使用influxdb，下面我们来配置grafana，启动grafana:
```
/etc/init.d/grafana-server start
```

启动完毕后，在浏览器中输入http://hostname:3000
即可打开grafana的web页，账号名和密码默认均为admin。由于grafana只是一个读数据并显示数据的工具，因此首先要配置数据源，让它找到数据。在grafana主页面中，按照下图配置即可
#### 增加数据源，选择influxdb为数据源
![influxdb-conf](/images/influxdb-grafana/grafana-datasource.jpg)
![influxdb-conf](/images/influxdb-grafana/grafana-data-source.png)

#### 数据源连接成功后，就可以开一个dashbord
![influxdb-conf](/images/influxdb-grafana/grafana-add-dashbord.png)
#### 填写参数
![influxdb-conf](/images/influxdb-grafana/grafana-graph.png)
#### 设置刷新时间，这里必须要在quick ranges里选择一个时间长度，如Last 1 hour
![influxdb-conf](/images/influxdb-grafana/grafana-refresh.jpg)
#### 最后保存
![influxdb-conf](/images/influxdb-grafana/grafana-save.jpg)
例子：
![influxdb-conf](/images/influxdb-grafana/grafana-demo.png)
这里我展示的是本机的cpu和内存消耗情况，数据由[telegraf](https://www.influxdata.com/time-series-platform/telegraf/)采集而来