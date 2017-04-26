---
layout: post
title: 给 OpenStack 添加端口转发服务：Navigator
---

国内 IP 资源紧缺，我们这种管网络的单位，申请个独立 IP 都很麻烦。但端口转发功能感觉老外不感兴趣，我看到一个华人开发者两次在 Neutron 里提出实现端口转发，贴了几个核心代码，然后说 “这个加上去很简单的”，都被驳回了。

我去年做了一个 OpenStack 小模块，我管它叫 Navigator，用于实现端口转发功能。一开始只是在 Horizon 所在的节点弄了个转发，后来没想到要用的挺多，需求增长，于是干脆完善成一个独立的 OpenStack 模块，再后来还实现了可扩展集群模式，可以在单独服务器上跑转发，可靠多了。
Navigator 情况大概是这样的：
1、独立的 Keystone 身份，能注册到 Keystone 中，并且利用 Keystone 验证 Token 与其他 OpenStack 模块通讯。
2、完整的 python-navigatorclient，基本套用 OpenStack 其他模块的思路。
3、包含旧版本的 openstack-common，现在的 OpenStack 改用 oslo 了，所以并不通用，不过我的确考虑利用 oslo 重写一个开放给社区，大体比较了一下 openstack-common 和 oslo，可以认为差别不大，最大的好处就是 使用 oslo 后代码大量减少。
4、API、Service 的实现大量参考了 Glance 和 Nova，可以说是 copy 了大量 Glance 的 API 代码 + Nova 的 Service 代码。
5、Horizon 并不能自动识别 Navigator，我们在 Navigator 的 instances 面板里添加了几句话，调用 navigatorclient。
6、内置了 iptables 和 socat 两个方案，因为网络环境复杂，iptables 可能并不十分通用，所以使用了 socat 作为备选方案。我们只做了 TCP 转发，没去管 UDP 转发，试过可行。

Navigator 架构
----
### 模块（进程）
Navigator 内置两个模块，API 和 Proxy。
API 用于响应 python-navigatorclient，为 Horizon 和其他客户端提供接口。
Proxy 用于管理端口转发本身，比如管理 iptables 和 socat 进程。
架构上讲，API 和 Proxy 都可以是多个，单还是建议使用单个 API，因为存在潜在的数据库读写冲突问题。
如果规模较大，我觉得还是最好独立出一个线程安全的调度器模块，目前调度功能是集成到 API 中的。
### Navigator API
Navigator API 的实现参考了 Glance（毕竟 Navigator 不需要 Nova 那么复杂），在 paste.ini 中指定 router，再在 router 上映射路径和方法，搞定。
让接受到业务请求时，API 需要判定将请求转发到哪个 Proxy 服务器上，均散、哈希、空闲排序都是不错的方案。
### Navigator Proxy RPC
Proxy RPC 是用于给其他模块调用 Proxy 提供的接口，实现参考了 Nova Scheduler，使用 openstack.common.rpc 模块，利用 RabbitMQ 实现 RPC。
值得注意的是，RPC 绑定的 topic 需要和 Navigator Proxy 一致，并且确保使用同一个 RabbitMQ Exchange。
### Navigator Proxy Service
Proxy Service 是托管 Proxy Manager 进程的服务，基本是把 Nova Service 的代码原封不动搬过来，改改细节。
Proxy Manager 绑定 topic 的过程就是在 Proxy Service 中实现的。
### Navigator Proxy Manager
Proxy Manager 里的函数正是在 Proxy RPC 指定调用的函数，一半是关于转发的操作，比如创建转发，删除转发。利用我自己包装好的 iptables 和 socat 操作类，直接实现了在本机转发。

IPTABLES
----
去年实现了第一个版本，利用iptables。可以用 shell 这样表示：
	iptables -t nat -A PREROUTING -d $src_address/32 -p tcp -m tcp --dport $src_port -j DNAT --to-destination $des_address:$des_port
	iptables -t nat -A POSTROUTING -d $des_address/32 -p tcp -m tcp --dport $des_port -j SNAT --to-source $src_address
	iptables -A FORWARD -d $des_address/32 -o br100 -p tcp -m tcp --dport $des_port -j ACCEPT
	iptables -A FORWARD -s $des_address/32 -i br100 -p tcp -m tcp --sport $des_port -j ACCEPT
但是一直有问题，我对iptables这块不熟，也不知道怎么解决。
一个是有时候转发不起作用，不知道是不是跟网桥的配合问题，但是tcpdump一下br100就可以了，完全不知道为什么。
二是双网卡的问题，配起来非常麻烦。

SOCAT
----
后来我想，能不能在网络层的层面解决这个问题，毕竟如 ssh tunnel 都实现了类似的效果。
于是找到了socat，socat 可能是“socket cat”，实际上能干的事情很多，可以利用它直接和socket通讯，也可以转发包什么的。
这里利用了socat监听本机某个端口，并且代为连接到目标主机和端口，如利用本机 60022 转发到 192.168.0.1:22
	socat TCP-LISTEN:60022,fork TCP:192.168.0.1:22
这跟iptables最本质的区别就是，socat代为监听了tcp端口，转发了tcp数据，而iptables则直接把tcp包转发了。
由于使用了fork参数，当socat接收到并发连接的时候，会fork出新进程，并不能像iptables那么无压力。
但socat也可以很好的处理udp、ipv6，以各种形式复制转发包，甚至配置ssl链。在并发不大的情况下，我觉得是个不错的选择。
性能能不能用在生产环境，这还需要检测。


HORIZON
----
horizon/api/navigator.py
dashboards -> instances -> views.py 额外对每个 instance 进行 navigator 查询
修改 _detail_overview.html，显示额外的 IP 信息。
修改 table、form、view，提供在界面上操作的端口绑定功能。
