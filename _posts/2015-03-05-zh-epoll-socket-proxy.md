---
layout: post
title: 使用 EPOLL 实现类 SOCKET 的反向代理（端口转发）
---

这几天忙英语和卖身，博客更新很慢，GITHUB 停更。

目前还在可行性实验阶段。
源码可见
[url]https://github.com/yangyuan/epoll-socket-proxy[/url]
适合场景主要是暴露内网某服务器端口，或者中间人攻击。

### SOCAT 缺点
年前把 ZeStack 的端口转发服务 Navigator 完善成了集群服务。
http://www.yangyuan.info/post.php?id=1067
如果使用 SOCAT 实现端口转发，实际在部署过程中，偶尔会出现僵尸进程，原因未知。IO 拥塞的情况下，可能会造成一些线程进程操作超时，估计是这个情况。在测试性能的时候，并发量上不去，其实想想也知道为什么，每个连接都产生一个进程，光这个进程维护就够呛了。

### EPOLL
很少搞 LINUX 系统开发，我是在研究 NGINX 的时候接触到了 EPOLL（感觉跟 Windows 的 IOCP 应用场景有点像）。
NGINX 的反向代理，跟端口转发的反向代理感觉蛮接近的，一个是 HTTP 协议，一个是 TCP/UDP 协议。TCP/UDP 处理起来肯定比 HTTP 要简单多了去了，应该一小段代码就可以实现核心功能了。NGINX 能实现那么高的性能，也许这个也行，所以就去试试。

EPOLL 基于事件的，创建一个 SOCKET 之后，注册到 EPOLL，当这个 SOCKET 有什么动静就可以收到消息，貌似很适合反向代理的情况。

### TCP 反向代理
	CLIENT <--SOCK_A--> PROXY <--SOCK_B--> SERVER
对于每个 TCP 连接来说，反向代理需要维护两个 SOCKET，一个跟客户端连上，一个跟被转发的服务端连上，那么在整个系统运转的过程中，这个 socket pair 是状态一致的（当然 SOCK_A 的创建要略早于 SOCK_B）。
PROXY 需要同时监听 SOCK_A 和 SOCK_B 传向 PROXY 的数据，并转发给对方。
那整个过程可以这么描述：
	PROXY 监听端口。
	CLIENT 连接 PROXY。
	PROXY 在接收 SOCK_A 之后，创建 SOCK_B，A、B 的配对关系需要存下来（我使用的是字典）。
	当 PROXY 检测到 SOCK_A 和 SOCK_B 有一方传来数据时，转发给另一方。
	当 PROXY 识别到 SOCK_A 和 SOCK_B 有一方关闭时，关闭另一方。
基本逻辑是没有问题的，当然要做好异常处理。

### 状态、性能和缓存
考虑一种情况，CLIENT 网络较差，SOCK_A 连接缓慢，SOCK_B 返回大量数据的时候，SOCK_A 可能来不及发送。形成的问题就是，大家都在等待 SOCK_A 慢慢发送，整体性能就慢了。
针对这种情况，使用非阻塞方式是必须的，换句话说要及时处理其他链路中的数据，当前这个未传输完成的数据，就以后再处理。
用这个图来表示：
[img]http://ww3.sinaimg.cn/large/73740544jw1eq7e5swduwj20ei0gejsr.jpg[/img]
好在 EPOLL 也可以监听可写状态，OUT 事件没有“一次性”的概念，需要手动添加和删除 OUT 监听。。
那么结构至少是如下的：
	STATE # 缓冲状态
	BUFF  # 缓冲，已经从一个 SOCK 取出，未来得及发送给另一个 SOCK。
	SOCK_A
	SOCK_B
以 A->B 为例，逻辑至少是这样的：
	A 有 IN：
	    若 BUFF 为空，则写入 BUFF，开始 SEND，若写缓冲区满，监听 B 的 OUT。
	    若 BUFF 不为空，则暂不处理。
	B 有 OUT：
	    必定 BUFF 不为空，SEND 直到写缓冲区满，若完成，关闭 B 的 OUT 监听。
这是双向的，逻辑就可以改成：
	X 有 IN：
		若 BUFF 为空，则写入 BUFF，开始 SEND，若写缓冲区满，监听 “对方” 的 OUT。
		若 BUFF 不为空，暂不处理。
	X 有 OUT：
		SEND 直到写缓冲区满，若 BUFF 为空，关闭 X 的 OUT 监听。
这么一来，事情就变简单了，只有一个地方用到了 “对方”，BUFF 也不需要加很多标志位。
当然，IN 事件不可以使用边缘触发。

### 操作细节
[b]EPOLL_CTL_ADD、EPOLL_CTL_DEL、EPOLL_CTL_MOD[/b]
用到的 EPOLL 操作就这仨，创建 socket 的时候 ADD，关闭 socket 的时候 DEL。默认情况下都是监听 IN，如果需要修改成 IN|OUT 或者改回来，就使用 MOD，逻辑非常简单。
[b]fcntl、O_NONBLOCK、EAGAIN[/b]
网上的 socket 编程例子大多是默认的阻塞模式。非阻塞模式相对难控制一些，fcntl 函数给 socket 加上 O_NONBLOCK 标志，就可以实现非阻塞。
EAGAIN 错误是判断缓存状态的主要方法，在 socket 为非阻塞的情况下，recv 触发 EAGAIN 代表有数据但缓冲区空，send 触发 EAGAIN 代表可写入但缓冲区已满。为了性能，两种情况均直接结束了当前操作。
[b]信号和管道[/b]
这个 signal 处理和操作是可选的，epoll_wait 在 signal 触发后能够停止阻塞，利用 `errno == EINTR` 就可以进行信号处理。
在这种服务，很可能需要多线程协助，每个线程监听一个端口，那么管道可能更适合一些，管道的监听可以放在主循环里，处理方法类似处理监听端口的 sockfd。

### 实测性能
没有认真测试过性能，在内网找了几台机器，在少量并发的情况下，跟直连效果一致，包括传输速度和延时，可以说是无感知。
还没在大并发情况下尝试。

### PENDING
差不多先这么多吧，最近忙到心塞。
待完