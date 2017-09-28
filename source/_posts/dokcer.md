---
title: dokcer的一些使用方法
date: 2017-04-10 16:20:35
tags: [docker, linux]
category: [docker]
---

上半年也陆续使用了docker工具做开发部署，使用的经验还比较浅显，看到屈屈大神写的一篇文章不错，特转载过来，并加了点自己的心得
<!--more-->


# 开始使用 Docker

一年前，我在《[开始使用 Vagrant](https://imququ.com/post/vagrantup.html)》一文中写到：使用虚拟化软件安装 Linux，有着「统一线下线上环境、不受升级宿主系统的影响、容易备份和恢复」等几大优点，非常适用于搭建 WEB 开发环境。

但 Vagrant 这种依赖 VirtualBox/VMWare/Parallels Desktop 等软件虚拟完整操作系统的方案有几个硬伤，例如占用大量系统资源、新建或启动虚拟机不够迅速等。Docker 是操作系统级虚拟化，它虚拟出来的环境一般被称为 Docker 容器，而不是虚拟机。Docker 容器直接运行在宿主系统的操作系统内核之上，启动一个新的 Docker 容器能在秒级完成。<!--more-->

由于 Docker 轻量、快速和高效，除了用于搭建开发环境，Docker 容器也非常适合用来部署线上服务。最近我将本博客程序改用 Docker 部署，你现在看到的页面正是由 Docker 容器提供服务。本文介绍这一过程。

### 安装 Docker

[Docker 官方文档](https://www.docker.com/products/overview#/install_the_platform)详尽地列出了各个系统下的 Docker 安装说明，请直接点过去看，本文不做搬运。

对于 Windows/Mac 用户而言，推荐安装 Docker for Window/Mac，而不是 Docker Toolbox。前者可以直接利用宿主系统的虚拟化机制，拥有更好的性能；后者需要借助 VirtualBox 运行的 linux虚拟机。

### 镜像和容器

Docker 基于 Docker 镜像运行容器，通常我们所需大部分镜像都可以在 [hub.docker.com](https://hub.docker.com/) 找到。

在装好 Docker 的终端中，运行以下命令就可以启动容器：

```bash
docker run ubuntu uname -a
```

不出意外，可以看到这样的输出：

```
Unable to find image 'ubuntu:latest' locally
latest: Pulling from library/ubuntu
2f0243478e1f: Pull complete
d8909ae88469: Pull complete
820f09abed29: Pull complete
01193a8f3d88: Pull complete
Digest: sha256:8e2324f2288c26e1393b63e680ee7844202391414dbd48497e9a4fd997cd3cbf
Status: Downloaded newer image for ubuntu:latest
Linux 99bebffc2678 4.4.16-moby #1 SMP Tue Aug 9 17:20:17 UTC 2016 x86_64 x86_64 x86_64 GNU/Linux
```

`docker run` 命令用来从指定镜像启动容器。由于我本地没有 ubuntu 镜像，Docker 首先会从官方 Hub 下载它；然后启动容器并执行 `uname -a` 命令。这个命令是在 Docker 容器内执行，输出的是容器系统信息。

查看和管理 Docker 镜像及容器，主要有这些命令：

* `docker images`：查看本地已经存在的镜像，`-a` 列出所有（默认不包括中间镜像）；
* `docker rmi IMAGE`：删除指定的镜像，`-f` 强制删除，IMAGE为：resository:tag，  也可以通过image id删除；
* `docker ps`：查看运行中的 Docker 容器，`-a` 列出所有（默认不包括未运行的容器）；
* `docker rm CONTAINER`：删除指定的容器，`-f` 强制删除；
注意，当用`docker rmi  images`命令，如果镜像已经生成过容器，不管容器是不是在运行中，则都无法删除，需要先将容器删除，才可以删镜像。

使用 Docker 的最佳实践是保持职责单一，一个容器只提供一个服务。我的博客主要有这些服务：

* Nginx（80/443）；
* MySQL（3306）；
* Memcached（11211）；
* ElasticSearch（9200）；
* ThinkJS（8085）；

考虑到我经常折腾 Nginx，我选择把它留在宿主系统，剩余四个服务则改用 Docker 容器来运行。

当然如果要运行一个Nginx容器也简单，有几点注意：由于Nginx需要对外提供web服务，启动时，肯定要绑定端口，方式是
```bash
docker run nginx:tag -it -P --name webserver
```
其中`-P`表示自动绑定端口，要想访问到该容器的Nginx，访问方式是本地的servername加被绑定到的端口
如上面所示，我启动了一个Nginx，绑定的本机的32771端口到容器的80端口，因此我的访问方式是http://servername:32771

### 构建镜像

我需要的 Mysql、Memcache、ElasticSearch 容器都可以使用官方镜像来运行。但我的博客系统，使用官方 Node.js 镜像存在两个问题：1）官方镜像中的 npm 是 v2，我希望换成 v3；2）官方镜像没有 libvips 库，无法安装本博客程序所依赖的 sharp npm 包。

遇到这种情况，可以在 Docker Hub 看看有无第三方 Docker 镜像能够满足需求，也可以构造自己的镜像。我选择后者。

要构建自己的 Docker 镜像，一般都会选定一个已有的镜像做为基础，再在上面增加自己的修改。我的 DockerFile 如下：

```dockerfile
FROM marcbachmann/libvips
MAINTAINER quguangyu@gmail.com

RUN apt-get update

# 修改时区
RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai  /etc/localtime

# 安装依赖
RUN apt-get install -y \
  python \
  curl \
  build-essential

# 安装 Node.js v4.x.x LTS
RUN curl -sL https://deb.nodesource.com/setup_4.x | bash -
RUN apt-get install -y nodejs

# 安装 npm v3 和 pm2
RUN npm install -g npm@3 pm2

# 解决 npm 在 docker 下经常 rename 失败的问题。详见：
# https://forums.docker.com/t/npm-install-doesnt-complete-inside-docker-container/12640/3
RUN cd $(npm root -g)/npm \
  && npm install fs-extra \
  && sed -i -e s/graceful-fs/fs-extra/ -e s/fs\.rename/fs.move/ ./lib/utils/rename.js
```

这份 DockerFile 作用是在 `marcbachmann/libvips` 镜像上增加了我需要的 Node.js，将 npm 升级到了 v3，还安装了 pm2。

在 DockerFile 所在目录，执行以下命令就可以构建镜像，并将其推送至 [Docker Hub](https://hub.docker.com/)（这里略过注册和登录过程）：

```shell
docker build -t qgy18/node .
docker push qgy18/node
```

### Docker Compose

Docker Compose 是一个小工具。我们可以在一个文件里定义多个容器，使用 `docker-compose` 命令让它们全部运行就绪。Docker Compose 非常适合用来部署 WEB 系统这种需要多个容器配合工作的服务。

如果你使用的是 Docker for Windows/Mac，`docker-compose` 命令应该直接可用。对于 Linux 平台，请参考[官方文档](https://docs.docker.com/compose/install/)安装 Docker Compose。

当前，我的博客系统目录结构如下：

```
├── blog
│   ├── app
│   ├── node_modules
│   ├── package.json
│   ├── pm2.json
│   ├── view
│   └── www
├── db
│   ├── ...
│   ├── ququ_blog
│   └── sys
├── docker-compose.yml
├── esroot
│   ├── config
│   ├── data
│   └── plugins
└── shell
    ├── backup_blog_database.sh
    └── install_blog_package.sh
```

我将所有需要持久化存储的文件都放在了宿主系统，例如代码目录（blog），数据库文件（db），ElasticSearch 配置、插件及数据文件（esroot）。这样数据更加安全，也更易于管理。

shell 目录下的 `install_blog_package.sh` 用来安装博客 npm 依赖，我的宿主系统没有安装 Node.js，运行 `npm install` 也需要借助 Docker 容器，一行命令搞定：

```shell
docker run -it --rm -v "$PWD/../blog":/app -w "/app" qgy18/node npm install --registry=http://registry.npm.taobao.org --production
```

这行命令首先基于前面构建好的镜像运行了一个拥有 Node.js 和 npm3 的容器；然后将宿主系统的 `blog` 目录映射为容器的 `/app` 目录；再将容器的工作目录设置为 `/app`；最后执行 `npm install` 安装依赖。最为神奇的是，由于指定了 `--rm` 参数，这个容器在完成工作之后就会被彻底销毁，不留任何痕迹。

类似的，由于宿主系统不再需要安装 MySQL，备份数据库也需要在容器内完成，这时候可以使用 `docker exec` 命令在已经运行的容器内执行指令。以下是 `backup_blog_database.sh` 文件的内容：

```shell
docker exec imququ_db mysqldump -uroot -p****** ququ_blog | gzip > ../backup/ququblog.`date +%H`.sql.gz
```

`docker-compose.yml` 文件内容如下，它定义了每个容器基于什么镜像运行，映射哪些目录，开放哪些端口：

```yaml
version: '2'
services:
  es:
    image: elasticsearch:2.3.0
    container_name: imququ_es
    volumes:
      - ./esroot/data/:/usr/share/elasticsearch/data
      - ./esroot/config/:/usr/share/elasticsearch/config
      - ./esroot/plugins/:/usr/share/elasticsearch/plugins
    restart: always
    expose:
      - "9200"

  cache:
    image: memcached:1.4.29
    container_name: imququ_cache
    restart: always
    expose:
      - "11211"

  db:
    image: mysql:5.7.14
    container_name: imququ_db
    volumes:
      - "./db:/var/lib/mysql"
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ******
    expose:
      - "3306"
    ports:
      - "127.0.0.1:3306:3306"

  blog:
    depends_on:
      - es
      - cache
      - db
    image: qgy18/node
    container_name: imququ_blog
    volumes:
      - ./blog:/app
    restart: always
    working_dir:
      /app
    entrypoint:
      - pm2
      - start
      - pm2.json
      - --no-daemon
    links:
      - es:es
      - cache:cache
      - db:db
    ports:
      - "127.0.0.1:8085:8085"
```

在 blog 容器中，我通过 `links` 配置连接了前面几个容器。这样在代码中，就可以使用 `es` 做为 HOST 连接到 Elasticsearch 容器，使用 `db` 做为 HOST 连接到 MySQL，依此类推。

我定义了 db 容器的 `ports` 配置，将宿主系统的 3306 端口映射到了 db 容器内，这样我就可以在宿主系统管理 MySQL 服务。同样地，使用宿主系统的 8085 端口可以访问到 blog 容器提供的 WEB 服务。

通过 `docker-compose up -d` 命令就可以在后台启动所有容器。`docker ps` 可以用来查看各个容器的运行状态：

```
IMAGE                 COMMAND                  PORTS                      NAMES
qgy18/node            "pm2 start pm2.json -"   127.0.0.1:8085->8085/tcp   imququ_blog
elasticsearch:2.3.0   "/docker-entrypoint.s"   9200/tcp, 9300/tcp         imququ_es
mysql:5.7.14          "docker-entrypoint.sh"   127.0.0.1:3306->3306/tcp   imququ_db
memcached:1.4.29      "docker-entrypoint.sh"   11211/tcp                  imququ_cache
```



原文链接：[https://imququ.com/post/use-docker.html](https://imququ.com/post/use-docker.html)，[前往原文评论 »](https://imququ.com/post/use-docker.html#comments)
