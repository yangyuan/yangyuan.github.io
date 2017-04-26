---
layout: post
title: 一个 C# 电骡客户端/服务端的实现
---

去年实现一个小工程，就是基于网盘技术实现多种 P2P 下载技术的互通。后来发现坑有点大，主要是成本考虑，文件的存储是放在网盘上的，搜索引擎几分钟的样板，下载和计算 HASH 耗费了两个多月，所以放弃了。C# 电骡客户端是当时想做没有做的内容，出于填坑的角度现在把它弄完。
[!code=cs]

本篇不涉及协议分析，协议分析会总结在这里（它也是个坑）：
[url]http://www.yangyuan.info/post.php?id=1069[/url]
工程量较大，源码非常乱，还是命令行的。因为试了一下，因为兼容 Mono，功能十分受限，部分放弃 Mono 使用纯 Windows 实现。
不想进一步维护，我打算使用 JAVA/GO/PY/PHP 中的一个重写并且开源，貌似 Go 最合适。

通用
====
电骡协议的特性
----
电骡协议还算比较简单的，Packet + Tag 可以轻易地使用几个通用结构实现存放所有数据包。
但是这种通用性带来一定不确定性，也就是说收到包之后，不确定包是否含有你希望的数据，需要进一步检测（否则程序就会很脆弱）。
电骡无论是客户端、服务端，都可以抽象为三种类角色：客户端角色、服务端角色、点对点角色。（我这个总结是自创的，但我觉得这样分更合理。一般说法为“客户端<->服务端通讯”和“客户端<->客户端通讯”，但实际上客户端服务端之间也有“客户端<->客户端通讯”，并且存在冲突的包识别号。）
客户端包含了客户端角色和点对点角色，服务端包含了服务端角色和点对点角色。
当接收到包识别号之后，根据当前的角色，可判断包具体内容。

代码风格
----
我尽量少使用了 C# 特有的语言特性，我相信这样的东西，会有移植性需要（至少会有 C++ 移植需要把。。。）。
我尽量减少非必要封装，能使用静态函数解决的，就不包装成成员，这样代码可读性高，移植起来也方便，也避免内存浪费。
避免第三方包和非默认包。

常量处理
----
用类 Protocol 来保存协议常量，命名上参考 eMule、Hydranode，但我觉得两者命名都欠妥，会重新整理，当前的样子如：
	class Protocol
	{
	    public const byte PR_ED2K = 0xE3;
	    public const byte PR_EMULE = 0xC5;
	    public const byte TT_STRING = 0x02;
	    public const byte TT_UINT32 = 0x03;
	    public const byte TT_FLOAT = 0x04;
	    public const byte OP_LOGINREQUEST = 0x01;
	    public const byte CT_NICK = 0x01;
	    public const byte CT_VERSION = 0x11;
	    public const byte CT_FLAGS = 0x20;
	    public const byte CT_MULEVERSION = 0xFB;
	    ...
	}

Packet
----
在一些资料里，这些包使用的是 Message 这个名词，但是为了防止跟 0x38 Message 包混淆，我使用了 Packet 这个词。
Packet 本身可以存数据，有 Pack 和 Unpack 方法。
同时 Packet 也有一些静态函数，用于直接处理数据，这是出于兼容性考虑。
Packet 只能确保包数据是完整的，但是内部协议数据是否合法是不考虑的。Generate 和 Parse 是需要继承之后自己实现的，并且可能存在大量异常和特殊处理。
	class Packet
	{
	    byte protocol;
	    MemoryStream data;
	    public static byte[] TagEncode(byte tag, byte[] value) {...}
	    public static byte[] TagEncode(byte tag, string value) {...}
	    public static byte[] TagEncode(byte tag, uint value) {...}
	    public static byte[] TagEncode(byte tag, float value) {...}
	    public static byte[] PacketEncode(byte protocol, byte[] data) {...}
	    public byte[] Pack() {...}
	    public void Unpack(byte[] _data) {...}
		virtual public void Generate() { throw new NotImplementedException(); }
		virtual public void Parse() { throw new NotImplementedException(); }
	}

Packet 队列器
----
电骡协议包头是 5 字节，传统的流读写方式虽然可行，但是可能会有一些拥塞。于是我自己设计了这样的一个消息队列器，不断的写入二进制数据，就能得到解析出来的 Packet。这样可以轻松加上异常处理，基础代码是这样的。
	class PacketEnqueuer
	{
	    Queue<Packet> queue = new Queue<Packet>();
	    MemoryStream cache = new MemoryStream();
	
	    public void Write(byte[] buffer)
	    {
	        Write(buffer, 0, buffer.Length);
	    }
	    public void Write(byte[] buffer, int offset, int size)
	    {
	        cache.Write(buffer, offset, size);
	
	        while (true)
	        {
	            if (cache.Length < 5) break;
	            byte[] cache_array = cache.GetBuffer();
	            uint len = BitConverter.ToUInt32(cache_array, 1);
	            len += 5;
	            if (cache.Length < len) break;
	
	            byte[] data = new byte[len];
	            Buffer.BlockCopy(cache_array, 0, data, 0, (int)len);
	            Packet item = new Packet();
	            item.Unpack(data);
	            queue.Enqueue(item);
	
	            // new MemoryStream will help in GC
	            var _cache = new MemoryStream();
	            _cache.Write(cache_array, (int)len, (int)(cache.Length - len));
	            cache = _cache;
	        }
	    }
	    public uint Count
	    {
	        get
	        {
	            return (uint)queue.Count;
	        }
	    }
	    public Packet Next()
	    {
	        if (queue.Count > 0)
	        {
	            return queue.Dequeue();
	        }
	        else
	        {
	            return null;
	        }
	    }
	}

客户端
====

包队列操作细节
----
上面的队列器只能维护一个连接的单向包队列，并不能保证一个 REQUEST 之后的包必定是一个反向的 RESPONSE。很多协议（比如 SSH）都涉及这样的问题，所以除了个别关键的地方（比如换KEY），其他地方都认为包的序列和反馈是不可靠的。
没有服务器的源码，从 eMule 客户端的源码看，这部分的处理是有隐患的，有很多地方是假定了服务器的反馈顺序。

我开始的处理方法是有一个 expect 列表，比如 search 之后，期待一个 response，但是完全是异步的。在这个 response 到来之前，拒绝下一次 search 请求，为了防止服务器丢弃这个请求（实测在访问频率较快的情况下，是会丢弃的，还会进黑名单），设定一段时间的等待，这个时间要尽量长于触发服务器的黑名单时间。

仔细研究之后，重新抽象了这部分功能，简化为三部分。
1. （隐藏的）接收数据包队列。
2. 发送接口
3. 异步接收接口
换句话说，模仿传统的异步 IO 操作设计接口，而利用发送接口和异步接收接口可以包装成一个同步发送 + 接收接口。.NET 中很多这样的接口以及更换为 Task 模式，这里考虑兼容性采用了传统的异步回调方式。
接收数据包队列会在连接活动期间一直独立工作，每接收一个一个包，都会检查异步池里是否有满足要求的请求，如果有，则触发异步完成。

服务端
====
写个差不多的客户端之后，我发现服务端的通讯逻辑其实更简单，通讯相关的东西大多是跟客户端对应的，客户端做包解析，服务端就做包封装。而 Packet 里是有 Generate 和 Parse 接口的，只要补全就可以。

客户端连接维护
----
服务端维护每个客户端连接并不需要使用单独的线程，不然并发量上不去。只需要存下 socket 和 clientid 就可以，实际上每个操作都是独立的，也就是说不需要记录上一次状态。
实测 Lugdunum 使用了多线程，但是并没有保证一个 client 数据只在一个线程中，因此当发送连续包时，会导致服务端异常，直接结果是进黑名单。
我使用的是三线程配合两个队列，第一个队列存需要反馈的连接和包，第二个队列为空闲链接。
主线程负责监听，发现数据包之后，放进队列一。
第一个队列和所在线程处理包，而第二个队列和所在线程处理空闲链接，如果发现有数据，则在多线程保护情况下放入第一个队列。
如果出现数据错误、长时间暂停，则强制断开连接。
第二个队列定期发送同步包，如果连接断开，则清理数据。

数据维护
----
服务端大难点在于如何维护这么多数据，为了简化起见我暂时没有实现文件搜索功能，Lugdunum 目测使用的是 split + 索引，不实用。实际上一个文件也有多个名字，在 P2P 下这个问题非常严重，搜索显得非常鸡肋。因此我认为这项功能应该移除，就像 eMule 聊天一样。

其他如文件管理和用户管理都可以使用直白的 key-value 方式，我丢弃了不必要的文件信息，数据结构简化为大概这样。
	class ItemFile
	{
	    public byte[] hash;
	    public ItemClient[] clients;
	}
	class ItemClient
	{
	    public uint id;
	    public TcpClient tcpclient;
	    public UdpClient udpclient;
	    public PacketEnqueuer queue;
	
	    public ItemFile[] files;
	}
	Dictionary<byte[], ItemFile> files;
	Queue<ItemClient> clients;

实际代码会复杂一些，但基本就是这样的结构。Clients 通过多级队列循环处理请求，无论是 Offer File 还是 Request File，都可以通过 KV 操作修改。
为了应对服务器重启数据清空的问题，实际上我有持久化 high id 信息到数据库。。。

我更倾向于使用第三方服务实现数据存储和索引，Lugdunum 服务器文件数量上不去带来的弊端很明显，使用数据库和索引系统能够很好地把这部分功能集群化，当然弊端就是再也不能一个 exe 就跑一个服务器了。

攻击防护
----
这方面我没有太多经验，目前我简化情况，只要每个连接都是活动的，有合理数据的，都认为是安全的客户端。
简化 quota，客户端轮询反馈，某个客户端事妈的话，就让他排队，明显消息堆积就断开连接。
此外可能影响性能的操作都添加 delay，没有黑名单，但是会延时反馈。
可能会加个 IP 限制，限制某些 IP 以及限制同一 IP 客户端数量，还没写。。。


## （坑）电骡协议和乱序加密细节分析
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
