---
layout: post
title: 一个无脑的用 QEMU 建立虚拟机并且桥接网络的过程
---

主要留给自己看的，怕以后忘了。

### 准备环境
一个 Linux 。。。
QEMU-KVM 不用说了。
apt-get install qemu-kvm
安装用的 ISO 不用说了。

### 准备主硬盘镜像
追求性能可考虑 raw 格式，不然 qcow2 最佳。
	qemu-img create -f qcow2 ubuntu-12.04.5-server-amd64.img 8G

### 安装系统
	qemu-system-x86_64 --enable-kvm -m 8048 -smp 4 -hda ubuntu-12.04.5-server-amd64.img -cdrom ubuntu-12.04.5-server-amd64.iso -vnc :1 -daemonize -boot d
	-m 8048：8G内存
	-smp 4：虚拟4核
	-hda -cdrom 不用说
	-vnc :1：:5901 端口
	-daemonize：deamon 模式（不阻塞shell）
	-boot d：光盘启动
这时候 VNC 连接服务器的 :5901 端口，就可以去装系统了。
安装完成后，去除 -boot 和 -cdrom 参数，就是正常启动的脚本了。
	qemu-system-x86_64 --enable-kvm -m 8048 -smp 4 -hda ubuntu-12.04.5-server-amd64.img -vnc :1 -daemonize

### 使用 USER 网络
如果只是要上外网，不需要对外提供服务，可以使用 USER 网络
使用参数 -net user 即可，他会使用内置的 NAT 网络提供上网环境，实测跟宿主机互通。

### 使用 TAP 网络（类似 VMWARE 桥接模式）
QEMU 这方面就弱了，它表示这需要手动在操作系统设置好 TAP 设备，才能使用 TAP 网络。
qemu 默认提供了两个脚本 qemu-ipup 和 qemu-ipdown
来看看内容
	#!/bin/sh
	
	nic=$1
	
	if [ -f /etc/default/qemu-kvm ]; then
	    . /etc/default/qemu-kvm
	fi
	
	if [ -z "$TAPBR" ]; then
	    switch=$(ip route list | awk '/^default / { print $5 }')
	    if [ ! -d "/sys/class/net/${switch}/bridge" ]; then
	        switch=virbr0
	    fi
	else
	    switch=$TAPBR
	fi
	
	ifconfig $nic 0.0.0.0 up
	brctl addif ${switch} $nic
差不多就是利用已知的网桥，手动再设置一个网桥。
脚本怎么用呢，是用 -net 参数传进去的
	-net tap,script=/etc/qemu-ifup,downscript=/etc/qemu-ifdown
说明启动、关闭TAP网络时要调用这些脚本。
NET参数可以有多个，并不是代表多跟网卡。比如可以再加。。
	-net nic,model=virtio,macaddr=1A-2B-3C-4D-5E-6F 
只是设定网卡型号和MAC地址。

那就先建立跟网桥吧，既然默认名字叫virbr0，那我们就virbr0。
	auto virbr0
	iface virbr0 inet static
	address 192.168.96.1
	netmask 255.255.255.0
	gateway 192.168.96.254
	dns-nameservers 114.114.114.114
	bridge-ports eth0

/etc/init.d/networking restart 之后能在网卡中看见这个设备
	6: virbr0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP
	    link/ether ec:f4:bb:c6:a3:e0 brd ff:ff:ff:ff:ff:ff
	    inet 192.168.96.1/24 brd 192.168.96.255 scope global virbr0
	       valid_lft forever preferred_lft forever
	    inet6 fe80::eef4:bbff:fec6:a3e0/64 scope link
	       valid_lft forever preferred_lft forever
这时调用脚本
	qemu-system-x86_64 --enable-kvm -m 8048 -smp 4 -hda ubuntu-12.04.5-server-amd64.img -net nic,model=virtio,macaddr=1A-2B-3C-4D-5E-6F -net tap,script=/etc/qemu-ifup,downscript=/etc/qemu-ifdown -vnc :1 -daemonize
网络就这样了
	6: virbr0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP
	    link/ether de:e5:35:e6:85:1d brd ff:ff:ff:ff:ff:ff
	    inet 192.168.96.1/24 brd 192.168.96.255 scope global virbr0
	       valid_lft forever preferred_lft forever
	    inet6 fe80::eef4:bbff:fec6:a3e0/64 scope link
	       valid_lft forever preferred_lft forever
	8: tap0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast master virbr0 state UNKNOWN qlen 500
	    link/ether de:e5:35:e6:85:1d brd ff:ff:ff:ff:ff:ff
	    inet6 fe80::dce5:35ff:fee6:851d/64 scope link
	       valid_lft forever preferred_lft forever
进虚拟机之后，如果没有DHCP，手动设置一下网络就OK了。
	auto eth0
	iface eth0 inet static
	address 192.168.96.250
	netmask 255.255.255.0
	gateway 192.168.96.254
	dns-nameservers 8.8.8.8

