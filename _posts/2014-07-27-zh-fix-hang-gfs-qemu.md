---
layout: post
title: GLUSTERFS 3.5.1 在 KVM-QEMU 卡住的问题
---

GLUSTERFS 3.5 加入了单文件系统快照的功能，团队感到非常有必要升级，于是在某次部署的时候就尝试了一下（一起升级的还有libvirt和qemu），结果发现（OpenStack）云硬盘挂不上。
同事找问题找了很久，发现请求发给libvirt就没有了反馈。

鉴于libvirt底层调用了qemu，我就直接用qemu命令调用gluster存储。
	qemu-system-x86_64 --enable-kvm -m 256 --drive file=gluster://127.0.0.1/qemu/image.qcow2,if=virtio -vnc :1 -daemonize
结果呢，直接拥塞住了，没有任何提示。

抱着试一试的态度，我给qemu降级，没有任何区别，把qemu升级到2.1也一样。libvirt降级也是一样，把gluster降级到3.4就OK了。

网上翻了gluster 3.5 和 3.5.1 相关资料，发现了这个
[url]http://supercolony.gluster.org/pipermail/gluster-users/2014-June/040723.html[/url]
下部提到两个，1是Libgfapi的改动，qemu等需要调整gluster的权限啥的才能使用。
2是一个bug。
[url]http://review.gluster.org/#/c/7857/2/api/src/glfs.c[/url]
这个BUG直接导致了使用Libgfapi会产生阻塞，这是 qemu 卡住的真是原因。

照着这个review改代码重新编译，不会卡住了，但是会报错 invalid paramenter。
别的事情比较忙，暂时没时间分析这个问题细节，下一个gluster release再试好了。
