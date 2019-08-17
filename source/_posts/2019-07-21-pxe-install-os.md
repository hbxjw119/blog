---
title: 使用 PXE 从网络安装操作系统
date: 2019-07-21 16:12:40
tag: [pxe, ipmi, dnsmasq, dhcp]
category: [Tech]
---

平时我们拿到一台新电脑后，第一件事就是安装操作系统，安装系统常规方式是用光盘或 U 盘，需要提前在 BIOS 里设置引导顺序，让 CDROM 或 U 盘为第一引导项，重启后就可以走安装系统流程了，安装过程中还需要手动设置一些选项，如设置时区，硬盘分区等。等安装完后，再设置 BIOS 从硬盘启动，系统就算安装好了。这是家庭或电脑店里的常规方式。试想下，企业采购一批服务器，100 台甚至上千台，如果仍然采用这种方式，那运维得累死。这时，我们可以采用 PXE 方式，从网络给服务器安装系统。

<!--more-->

## 什么是 PXE 

这里我不打算把维基百科中的概念性语言搬到这里，我们只需要知道，**PXE 也是一种装机技术，唯一和平时装机方式不同的地方是，PXE 使用的系统镜像和内核，不是放在光盘和 U 盘里，而是放在了远端网络上，装机过程中，PXE 会自动从远端下载文件到本地，然后完成系统安装。**
更重要的是，它可以在远端 ks 文件的指导下，完成无人值守，自动设置，自动装机。因此，企业中大部分都会采用这种方式来进行批量装机。

## 需要准备哪些东西

原理知道了，但具体需要哪些准备条件呢？既然是从网络引导安装，那么至少具备：
* 远端必须得有个存放系统镜像以及一些装机所需文件的服务器，并且提供下载服务
* 设置本地机器从网络引导
* 本地机器必须具备 IP，以便从远端下载文件到本地

第一个条件很好具备，拿一台机器起个 nginx 或 ftp 服务就好了。在 PXE 装机环境下，这个服务器被称为部署服务器（pxe server）。

第二个问题可以直接进 BIOS 设置，但如果要装机的数量庞大，也得累死。更通用的方式是通过机器的 IPMI 设备进行设置，IPMI 是一个通用接口标准，最重要的就是 BMC（Baseboard Management Controller），它是主板上的一块芯片，独立于 BIOS 和 OS ，并且可以配置 IP，通过这个 IP 可以对计算机进行远程控制，比如通电，断电，重启，设置引导项，查看计算机部件的物理信息，如 CPU 核数，甚至风扇温度等。BMC 配的这个 IP 我们称为**带外 IP**，看下面示意图。
![计算机上的bmc设备](/images/pxe/bmc.png)
使用方式也很简单，一般服务器厂商都会给 IPMI 配置一个简单的 UI，直接在浏览器里输入带外 IP 即可打开。或者`yum install ipmitool`，这是 shell 环境下的一个 IPMI 管理工具，自带基本命令。假设机器的带外 IP 是 10.0.0.1，端口为 623，登录账号密码都为 admin，常用命令如下
```bash
# 打开机器电源
ipmitool -I lanplus -H 10.0.0.1 -p 623 -U admin -P admin power On
# 关闭电源
ipmitool -I lanplus -H 10.0.0.1 -p 623 -U admin -P admin power Off
# 重启机器
ipmitool -I lanplus -H 10.0.0.1 -p 623 -U admin -P admin power reset
# 设置第一引导方式为 pxe
ipmitool -I lanplus -H 10.0.0.1 -p 623 -U admin -P admin chassis bootdev pxe
```
带外 IP 非常有用，很大程度上避免了需要去机房人肉操作的麻烦，比如线上一台物理机宕机，系统崩溃需要重启，打电话喊人进机房按重启键就太原始了，直接通过带外 IP，发条 reset 命令就可以重启了。

第三个问题看似不是什么问题，但不要忘了，在一个还没有装系统的机器上，是没有 IP 的，也没地方让你去执行 wget 之类的下载命令。
但每台机器上都有网卡设备，网卡有 mac 地址，我们可以在部署服务器上，起一个 DHCP 服务，让本地网卡发 DHCP 广播，部署服务器收到后，给本地机器网卡分配一个 IP。DHCP 工作原理大家可以翻大学的计算机网络，或者自行查看维基百科。这过程就像我们回到家里，手机自动连到家里 WIFI 一样，因为家里的路由器有 DHCP 服务，它帮手机自动分配了 IP，所以就可以上网了。自动分配 IP 的好处就是简单，免去人工配置，而且绝对不会有 IP 冲突。如果是手动配，效率低不说，还必须知道已经分了哪些 IP，避免再分配相同的 IP。但自动分配 IP 的弊端是，它分配的 IP 是临时的，比如今天给你手机分配的 IP 是 192.168.1.3，明天回来，给你分的可能就是 192.168.1.5 了。但只要你一直用，保持 WIFI 不断开，那这个 IP 也就不会变。在 PXE 装机环境中，总是会有个 DHCP 服务，由它给这个网络中的网卡分配 IP，为了节省，直接在部署服务器上起 DHCP 服务即可。

>需要注意的是，一个 PXE 装机网络中，只能有一个 DHCP 服务，这是由 DHCP 工作原理决定的。如果有多个 DHCP，会导致 IP 分配失败。

## 开始安装

上面的问题都有解答，可以来实际操作了，条件所限，本文使用 VirtualBox 来搭建 PXE 装机环境，所以没有真实的 IPMI 设备，但好在 VirtualBox 可以设置让 VM 从网络启动，因此不影响效果。
我们需要至少两个 VM，一个作为 pxe server，一个作为 client 待装系统。先来看下 PXE 装机流程图
![PXE 装机流程](/images/pxe/pxe-boot.png)
可以看到，整个过程大致可分两步
1. client 端申请 IP，这是执行后续步骤的先决条件
2. client 在指定目录拉取内核和必要的装机文件

### 注意事项

必须得确保这两个 VM 所在的网络中，只有 pxe server 提供 DHCP 服务，如果你选择桥接模式，即 VM 和宿主机在同一个网络，那么得保证这个网络中没有其他 DHCP 服务，如果你在家里装，需要关掉家里路由器上的 DHCP；如果是在公司办公网装，那就得谨慎了，办公网的网络配置一般不能由自己规划，一不小心，可能导致办公网瘫痪，但可以用 VirtualBox 的内部网络，即 VM 和宿主机网络隔离，VM 之前互通，那么这天然就是一个良好的装机环境，但这种情况下，VM 是没法通外网的，要装一些包就很麻烦，要么让 VM 和宿主机共享一个目录，把包导入到 VM，要么先把 VM 设为桥接模式通外网，把需要的包装好后再设为内部网络模式。为了方便，下文用家庭桥接模式，网络拓扑如下
![PXE 装机网络拓扑](/images/pxe/network-top.png)

### 步骤

* 准备 CentOS 的 ISO 安装包，创建一个 centOS 的 VM，设置网络为桥接模式，装好系统，作为 pxe server，暂称为 A，假设其 IP 为 192.168.1.5。装完后，将 ISO 安装包从宿主机传到 A 某目录，如 /tmp，后面需要用。
* 安装 dnsmasq，用来提供 DHCP 服务。
```bash
yum install dnsmasq 
```
   将原来的 /etc/dnsmasq.conf 备份，重新生成一个配置，内容如下：
```
# 网卡名，这里根据你的网卡填写
interface=eth0

# 固定
dhcp-boot=pxelinux.0
port=0
enable-tftp
tftp-root=/var/lib/tftpboot/
log-facility=/var/log/dnsmasq.log

# dhcp 分配的 ip 范围
dhcp-range=192.168.1.100,192.168.1.110
# netmask
dhcp-option=1,255.255.255.0
# DNS
dhcp-option=6,233.5.5.5,8.8.8.8
```
* 安装 syslinux，tftp-server，vsftpd 提供内核和镜像下载服务
```bash
yum install syslinux, tftp-server, vsftpd
```
  拷贝相关文件
```bash
cp -r /usr/share/syslinux/* /var/lib/tftpboot
```
* 生成必要的目录和文件，上面的 dnsmasq 配置会从这里读取
```bash
mkdir /var/lib/tftpboot/pxelinux.cfg
mkdir /var/lib/tftpboot/centos7
touch /var/lib/tftpboot/pxelinux.cfg/default
```
  default 文件内容为：
```
default menu
prompt 0
label pxe
kernel centos7/vmlinuz
append initrd=centos7/initrd.img method=ftp://192.168.1.5/pub
```
  注意上面的 IP 地址为 pxe server 的 IP
* 挂载 ISO 文件，拷贝内核文件和镜像到指定目录
```bash
mount -o loop /tmp/centos-dvd.iso  /mnt 
cp /mnt/images/pxeboot/vmlinuz  /var/lib/tftpboot/centos7
cp /mnt/images/pxeboot/initrd.img  /var/lib/tftpboot/centos7
cp -r /mnt/* /var/ftp/pub/
chmod -R 755 /var/ftp/pub
```
* 启动所有服务
```bash
systemctl start dnsmasq
systemctl start vsftpd
systemctl enable dnsmasq
systemctl enable vsftpd
```
  ps 命令查看进程，确保上述服务都已经启动，并能从浏览器能访问到 ftp 中的文件，如果没法访问，查看是否因为防火墙的原因。到这一步 pxe server 就准备好了。
* 再创建一个 centOS 的 VM，称为 B，注意 B 的内存必须设置大于 1 G，否则会导致安装失败。设置 B 也为桥接模式，启动时按 F12，设置从网络引导。
* 如果一切顺利，可以看到 B 先广播了一个 DHCP 包，被 A 上的 dnsmasq 收到，响应了一个 DHCPOFFER，并给 B 分配了 IP，然后 B 从 A 的 tftp 目录下载内核，最后就进入到熟悉的装机界面了。

## ks 自动安装

上面的安装流程，实现了从网络装机目的，但有个问题：进入装机界面后，仍然需要我们手动选择一些配置，批量装机的话，一台一台配置，还是很麻烦。我们可以通过 ks（kickstart） 文件，实现自动配置，即在需要选择的步骤时，由 ks 自动帮我们选择。

ks 文件实际就是个装机模板，它定义了系统装机时的一些配置选项，比如时间，网络，分区，用户名，密码等。一份典型的 ks 文件如下：
```
install 
url --url=ftp://192.168.1.5/pub/

################################
# BASIC CONFIGURATIONS
################################
# System language
lang en_US.UTF-8

# Keyboard layout
keyboard --vckeymap=us --xlayouts='us'

# System timezone
timezone Asia/Shanghai --isUtc

# SELinux configuration
selinux --disabled

# System services
services --enabled="chronyd"
firstboot --disable

# Use graphical install
graphical

# Reboot after installation
reboot

# System authorization information
auth --enableshadow --passalgo=sha512

################################
# ROOT PASSWORD
################################

rootpw --iscrypted $1$TzIdo.bL$rjBu.XWo38VS0xQ/QWOYI.

################################
# NETWORK CONFIGURATIONS
################################
network --hostname=localhost

network --bootproto=dhcp --device=eth0 --onboot=on

################################
# DISK PARTITIONS
################################

autopart --type=lvm
clearpart --all --initlabel

################################
# POST SCRIPTS
################################
%post
systemctl enable sshd

%end

################################
# PACKAGES
################################
%packages
@core
chrony
kexec-tools
%end

%addon com_redhat_kdump --enable --reserve-mb='auto'
```
将上述内容写入到 /var/ftp/pub/ks/centos.ks 文件中，并修改上面第 4 部的 default 文件，指明 ks 文件的路径
```
default menu
prompt 0
label pxe
kernel centos7/vmlinuz
append initrd=centos7/initrd.img devfs=nomount ksdevice=bootif ks=ftp://192.168.1.5/pub/ks/centos.ks
```
这样，当 client 下载内核后，会从指定路径下载 ks，然后在 ks 的引导下，自动装机，这样就不需要人工做任何操作了。更重要的是，只要共用一份想相同的 ks，那么所有的机器装好系统后，设置都是一样的。

> CentOS 系统的模板类型叫 kickstart，而 ubuntu 的话，称 preseed，二者的格式有所不同

## 裸金属服务器

现在公有云和私有云中，有一类称为裸金属服务器的产品，特点是具备了虚拟机的弹性，又有物理机的性能。实际上它就是一种物理机托管，云平台通过 IPMI 设备将这些物理机管理起来，用户要用服务器时，在云平台上选择好规格，点击创建，后端会根据规格，选择一台实际的物理机，通电，然后 PXE 装系统，装好后交付给用户。当用户用完，后端直接给该物理机断电，相当于销毁过程。后面如果又有用户用，重新走通电装系统流程。在 openstack 项目中，有个叫 ironic 的子项目，就是裸机管理。

## 总结

本文介绍了 PXE 装机的基本原理和使用场景，这也是企业 IDC 机房大规模安装系统的方式，运维只要准备一个 pxe server，然后通过 ipmi 批量设置所有机器都从 PXE 引导，这样就不需要拿着光盘 U 盘在机房人肉操作了。实际使用中，可能会有更多的定制化，比如在 ks 里自动安装一些必备软件，比如装机前后，向某个 log server 发请求，表明装机情况。更进一步，甚至可以直接把安装好系统的 ghost 或 qcow2 文件放在 pxe server，装机时直接释放到所有机器，就像我们恢复系统样，更加便捷效率更高。


#### 参考
* https://blog.51cto.com/itwish/2154820
* https://www.tecmint.com/install-pxe-network-boot-server-in-centos-7/

