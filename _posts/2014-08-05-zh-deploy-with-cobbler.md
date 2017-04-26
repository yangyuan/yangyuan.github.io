---
layout: post
title: COBBLER 批量部署的一次尝试
---

单位需要批量部署一批机器，我来帮忙。
使用Cobbler，先在Vmware里试验下。启用NAT网络，关闭自带DHCP。
在ubuntu平台默认安装了之后没有效果。

确认VMWARE的虚拟机支持PXE
----
额外安装一个dnsmasq服务器试试看。
目标机器MAC为 00:0C:29:B8:11:C5，NAT网段为 192.168.192.0/24。
	domain=localdomain
	listen-address=192.168.192.99
	except-interface=lo
	interface=eth0
	dhcp-range=192.168.192.0,192.168.192.255,12h
	dhcp-host=00:0C:29:B8:11:C5,192.168.192.101,24h
	dhcp-option=3,192.168.192.2
	dhcp-lease-max=1000
	
	enable-tftp  
	tftp-root=/opt/tftproot
	
	dhcp-authoritative
	dhcp-boot=pxelinux.0
要注意的是只有dhcp-range等参数被正确配置的情况下才能使用。
开始没意识到，直到使用 dhcpdump -i eth0 抓包才意识到这个问题

好吧，到此为止，说明VMWARE的NAT网络及其虚拟机支持PXE启动。

COBBLER 调试
----
照着这个思路，看上去是Cobbler这边DHCP功能没有管理好。ps一下发现根本没有hdcpd或者dnsmasq进程。
研究了一下发现需要在/etc/cobbler/settings开启。默认使用isc-dhcp。
同步，进程还是不在，直接运行dhcpd，发现报错了，原来需要改dhcp模版dhcp.template。
然后OK了。

SEED 和 REPOS
----
Seed文件定义了安装的时候具体细节，这个无论是Cobbler默认的seed还是ubuntu安装盘里的seed都不太合适。如果有时间，一定要好好调整，能够大大节约安装时间。文章后面的 Seed Sample 是一个比较简朴的配置。只安装操作系统，从cobbler的apt源安装，启用root密码root启用ssh。时间紧急可以以它为蓝本。
Repos也是一样，默认我们都是从光盘里取Repos。如果是从Server光盘取Repos，是不需要外部源就可以安装的，也不需要在cobbler同步源。
Seed里面手动指定apt的source和security-source到cobbler，能够大大减少安装时间，我在VMWARE里整个安装过程为2分30秒，普通PC机+SSD，不是工作站。

高级编程 和 SNIPPET
----
KickStart能干的事情比较有限，如果需要使用复杂的脚本，通常考虑使用Snippet。但是在安装Debian\Ubuntu的时候，这边的SNIPPET脚本可以认为是作废的。所以通常在用 d-i  preseed/late_command 的方法在尾部写一段脚本，或者在这里远程下载调用一段脚本，并且late_command只能有一句。
无论是seed文件还是SNIPPET，在cobbler均可使用变量编程，变量可以使用
	cobbler system dumpvars --name=rat
命令显示

COBBLER 安装过程
----
### 安装 cobbler
COBBLER服务器我用的是官方 14.04，各种配置尽量默认，需要安装以下软件。
	apt-get install apache2-utils isc-dhcp-server cobbler
可以安装web，但是这里没用到。
	apt-get install cobbler-web
http://192.168.192.100/cobbler_web
如果需要修改默认帐号cobbler密码：
	htdigest /etc/cobbler/users.digest "Cobbler" cobbler
注意大小写

### 配置 cobbler
开启cobbler管理DHCP
/etc/cobbler/settings
manage_dhcp :1
/etc/cobbler/dhcp.template
根据网络合理配置 subnet 部分
	cobbler sync

### 准备Profile（导入iso信息和机器信息）
把需要的镜像上传到opt下
	ubuntu-12.04.4-server-amd64.iso
	ubuntu.seed
导入一个ubuntu iso的profile
	mount -o loop /opt/ubuntu-12.04.4-server-amd64.iso /mnt
	cobbler import --name=ubuntu-12.04.4-server --path=/mnt --breed=ubuntu
打开应该能看到目录生成了
http://192.168.192.100/cobbler/ks_mirror/
添加一个节点的信息的profile
	cobbler system add --name=rat --mac=00:0C:29:B8:11:C5 --ip-address=192.168.192.101 --subnet=255.255.255.0 --gateway=192.168.192.2 --interface=eth0 --static=1 --profile=ubuntu-12.04.4-server-x86_64 --dns-name=rat.localdomain --hostname=rat.localdomain --netboot-enabled=true --name-servers="8.8.8.8" --kickstart=/opt/ubuntu.seed
注意每次操作都需要使用同步命令才能生效，毕竟cobbler需要调用第三方软件同步这些信息。
	cobbler sync

额外说明
----
通过刚才见到几部配置的cobbler，安装后的效果非常接近于光盘安装。网上能看到一些奇怪的教程，包括配置源什么的，并非是必须的。
但是cobbler有能力管理出一个ubuntu的源，安装debmirror配合cobbler reposync即可。
### 参考
ubuntu官方的cobbler说明 https://help.ubuntu.com/community/Cobbler
cobbler check，cobbler自检。
cobbler system add参数
	cobbler system add --name=string --profile=string [--mac=macaddress] [--ip-address=ipaddress] \
	[--hostname=hostname] [--kopts=string] [--ksmeta=string] [--kickstart=path] [--netboot-enabled=Y/N] \
	[--server-override=string] [--gateway=string] [--dns-name=string] [--static-routes=string] \
	[--power-address=string] [--power-type=string] [--power-user=string] [--power-password=string] \
	[--power-id=string]

Seed Sample
----
	# UBUNTU COBBLER INSTALL by YANGYUAN
	# DESIGNED for ECCP and UBUNTU 12.04 SERVER
	
	# BASIC
	d-i  debian-installer/locale    string en_US.UTF-8
	d-i  debian-installer/splash    boolean false
	d-i  console-setup/ask_detect   boolean false
	d-i  console-setup/layoutcode   string us
	d-i  console-setup/variantcode  string
	d-i  clock-setup/utc            boolean true
	d-i  clock-setup/ntp            boolean true
	
	# DISKPART
	d-i  partman-auto/method                string regular
	d-i  partman-lvm/device_remove_lvm      boolean true
	d-i  partman-lvm/confirm                boolean true
	d-i  partman/confirm_write_new_label    boolean true
	d-i  partman/choose_partition           select Finish partitioning and write changes to disk
	d-i  partman/confirm                    boolean true
	d-i  partman/confirm_nooverwrite        boolean true
	d-i  partman/default_filesystem         string ext3
	
	# SOFTWARE
	d-i  mirror/country             string manual
	d-i  mirror/http/hostname       string $http_server
	d-i  mirror/http/directory      string /cobbler/ks_mirror/ubuntu-12.04.4-server/ubuntu
	d-i  mirror/http/proxy          string
	d-i  apt-setup/security_host    string $http_server
	d-i  apt-setup/security_path    string /cobbler/ks_mirror/ubuntu-12.04.4-server/ubuntu
	d-i  apt-setup/services-select  multiselect none
	d-i  pkgsel/upgrade             select none
	d-i  pkgsel/language-packs      multiselect
	d-i  pkgsel/update-policy       select none
	d-i  pkgsel/updatedb            boolean true
	d-i  pkgsel/include             string openssh-server
	
	# USER
	d-i  passwd/root-login                  boolean true
	d-i  passwd/make-user                   boolean false
	d-i  passwd/root-password               password root
	d-i  passwd/root-password-again         password root
	d-i  user-setup/allow-password-weak     boolean true
	
	# FINISH
	d-i  grub-installer/skip                boolean false
	d-i  lilo-installer/skip                boolean false
	d-i  grub-installer/only_debian         boolean true
	d-i  grub-installer/with_other_os       boolean true
	d-i  finish-install/keep-consoles       boolean false
	d-i  finish-install/reboot_in_progress  note
	d-i  cdrom-detect/eject                 boolean true
	d-i  debian-installer/exit/halt         boolean false
	d-i  debian-installer/exit/poweroff     boolean false
	
	# EXTRA
	d-i  preseed/late_command       string echo "UseDNS no" >> /target/etc/ssh/sshd_config
### 注意
这个sample里：
网络是dhcp控制
使用cobbler导入的iso的mirror作为源，没有额外安装源。
只开启了root，不新建其他用户。
额外安装了openssh
安装完了之后禁掉了ipv6和ssh的dns。
