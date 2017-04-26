---
layout: post
title: （坑）电骡协议和乱序加密细节分析
---

大多数人都知道 eDonkey2000、eMule 的关系。eDonkey2000 支持多种 P2P 协议，ed2k 是 MetaMachine 设计给 eDonkey2000 的一种协议。
网上广泛认为 eMule 是 eDonkey2000 的开源兼容客户端。它自己也声称如此，但实际上，eMule 在协议上的扩充非常多，单纯的 eDonkey2000 客户端已经无法联入 eMule 客户端的网络了。比如 eMule 在协议上默认了客户端需要主动汇报状态，不这么做的客户端将会从队列删除。

MetaMachine 因版权压力关闭之后，eDonkey2000 停止开发和服务，将服务器软件交给另一个“小组”开发，也就是 Lugdunum，于 2006 年也停止开发。
目前而言，电骡的生态可以算是比较恶劣。
客户端是 eMule 控制，eMule 有自己的扩展协议，eMule 也引入 Kad 来回避服务端，三四年一更新的频率。
服务端普遍为闭源的 Lugdunum，Lugdunum 也有自己的扩展协议，之前 Lugdunum 配合 eMule 做服务端的协议扩展，但现在完全停止开发了。
### 总结
协议四处开花，连个整理汇总的人都没有。
服务端软件已死，客户端软件也不太活。
版权压力大，国外还好，国内其他软件吸血严重。
### 对于前景的个人见解
无中心的分享网络肯定会一直存在的，用 HASH 定位文件的方式也是没有问题的。那我感觉，技术停滞了这么多年，我认为问题其实在于 BT 方面，大多数网站还是会选择使用 BT 而非 ED2K，因为 BT、尤其是 PT 能够很好的控制用户。
换句话说，ED2K 专注文件分享，而 BT 牺牲了安全性，但兼顾了网站自身的生存。
所以，如果有替代品的出现，必须是要兼顾这方面的考虑。

概述
----
整体上，电骡网络里存在两种角色，Server。
其中 Server <-> Server 之间的通信资料非常少，并且非必要。所以关注点主要是 Client <-> Server，Client <-> Client 之间通信。
在原始 eDonkey2000 网络里，只使用 TCP 通信，eMule 网络里的 UDP 通信属于增补。不管是 TCP、DUP 通信，均以消息包为单位通信。
包结构为：
	PP SS SS SS SS .....
	PP 为协议，1 字节。
	SS 为包数据长度（不包括前面这个 5 字节） 小端存储。
其中数据段结构为
	OO XX XX XX ... XX XX TT XX XX XX ... XX XX
	OO 为操作指令，后面的数据样子和长度，由 OO 可直接确定。
	TT 为 Tag 的个数，后面的数据包含 Tag，但是需要解析提取。
如果是压缩数据（PP 指明是压缩）则是）
	OO ZZ ZZ ZZ ZZ ...
	OO 为操作指令
	ZZ 为 Zlib 压缩的数据。
对于 Tag 而言，结构是下面三个中一个。
	|  type  | opcode |  data  | 
	|  type  |  0x01  | opcode |  data  |               
	|  type  | length |  name  |  data  |
type 决定了 data 数据类型和长度。
opcode 或者 name 则代表了这个 tag 的含义。
其中第一个 tag 类型比较特殊，他通过 `type&0x80` 来识别，真实的 type 需要 `type&0x7F` 提取。

eMule Protocol Obfuscation
----
待续。。。
