---
layout: post
title: SSH2 协议二进制级别详解：数据、通讯和验证
---

SSH2 协议二进制级别详解：数据、通讯和验证


参考文献
----
http://en.wikipedia.org/wiki/Secure_Shell
http://tools.ietf.org/html/rfc4251 基本构架
http://tools.ietf.org/html/rfc4252 验证部分
http://tools.ietf.org/html/rfc4253 通讯部分
我的开源代码
https://github.com/yangyuan/terminal-sharp

连接的过程
----
1、创建TCP连接。
2、互相发送版本信息。
3、包交互。
### 包交互的过程
包分为两种，一种是互相协商信息的包（如Key交换包），一种是业务数据包（如Shell请求和数据）。
包的发送没有严格的顺序，因此假定对方安装某种顺序发包是不安全的。但是有些情况下，会要求两种包之间不允许发送其他类型包。
包是加过密的，官方建议先读取8字节，尝试解析，再处理。
### 关于Key交换和Key再次交换
Key交换一般发生在包交互的起始。Key再次交换可能发生在任意时候。Key交换会影响数据包加密，要格外小心。

数据类型
----
### network byte order、big-endian
也就是传说中的大端，如0x00b7f4aa 应该存为 00 b7 f4 aa。
x86构架下都使用小端，不同的C、C++编译器对大端小端处理是不一样的，有很多int会使用小端而long使用大端，而C#等托管语言一般使用小端。
### byte
额。。
### boolean
占一个字节，要求存的时候只能为1或者0，读取的时候非0都认为是TRUE。
### uint32、uint64
4字节大端整数、8字节大端整数。
### string
一个4字节大端整数（代表长度），加上一个字符串。
如 00 00 00 07 t e s t i n g，UTF-8编码，其中如果是用于关键词什么的，大多会要求必须ASCII。
注意，这个字符串尾部是没有\0的。
### mpint
一种任意长有符号整数，格式为一个4字节大端整数（代表长度），加上段大端数据。下面是官方的例子：
	value (hex)        representation (hex)
	-----------        --------------------
	0                  00 00 00 00
	9a378f9b2e332a7    00 00 00 08 09 a3 78 f9 b2 e3 32 a7
	80                 00 00 00 02 00 80
	-1234              00 00 00 02 ed cc
	-deadbeef          00 00 00 05 ff 21 52 41 11
### name-list
name-list是对string的扩展，name-list的字符串部分，是由逗号分隔多个字符串，每个字符串必须是纯 ASCII，并且长度不为0。下面是官方的例子：
	value                      representation (hex)
	-----                      --------------------
	(), the empty name-list    00 00 00 00
	("zlib")                   00 00 00 04 7a 6c 69 62
	("zlib,none")              00 00 00 09 7a 6c 69 62 2c 6e 6f 6e 65

连接的创建
----
### 版本识别字符串
	SSH-协议版本-软件版本 SP 注释说明 CR LF
SP 为空格，CL LF 分别为回车和换行，如。
	SSH-2.0-OpenSSH_6.6p1 Ubuntu-2ubuntu1\r\n
其中，“SP 注释说明”为可选的，某些实现可能丢失“CL”，整体最长不超过255，只有ASCII字符，不可包含NULL字符。
### 建立过程
1、创建TCP连接
2、（可选）服务器发送无关的提示消息（比如告诉你它肚子痛啥的），必须不以"SSH-"开头，必须以CR LF结尾，UTF-8编码
3、服务器发送“版本识别字符串”
4、客户端发送“版本识别字符串”
### 协议的确定
服务器一般是1.x 1.99 2.x 这几种情况，其中1.99代表他同时兼容1.x和2.x。
客户端应该选择服务器支持的，并且它支持的某个版本发回去，如果发错了，就认为协议协商失败，理应关闭连接。
### 关于无关的提示消息
客户端理论上需要尝试多次读取整行，直到发现一个"SSH-"开头的字符串，那么在这之前的这部分官方建议你随意处理，可以打印给客户端，也可以无视，也可以尝试读取出一些提示信息。

数据包的交互
----
### 数据包
数据包是SSH协议交互的基本单位，这点类似HTTP的包。
	uint32    包的长度（不包括自己和 MAC）
	byte      填充的长度
	byte[n1]  数据; n1 = 包的长度 - 填充的长度 - 1
	byte[n2]  填充; n2 = 填充的长度
	byte[m]   消息验证代码 (Message Authentication Code - 缩写 MAC) 可选，长度取决于验证算法，在协商算法之前，默认没有。
包最小长度为16，最大为35000。
数据部分可能使用了压缩，压缩之前也不能超过32768.
整个数据包使用商定好的加密算法加密，注意是整个数据包。那么数据包的长度必须是加密cinder block的整数倍，这个在生成包的时候就应该做好。
填充的长度应该高于cinder block。
如果有商定MAC算法，则应该额外发送和接受MAC数据。

KEY交换
----
### 加密协议的协商
KEY交换 以一方发送SSH_MSG_KEXINIT为开始，发生之后应该等待Key交换结束再发送业务包。
对面收到SSH_MSG_KEXINIT之后，应该主动停止业务包发送，并且回应自己的SSH_MSG_KEXINIT。
版本确立后，需要协商加密方式。（注意它本身是利用数据包来进行交互的）
	byte         SSH_MSG_KEXINIT
	byte[16]     cookie (random bytes)
	name-list    kex_algorithms
	name-list    server_host_key_algorithms
	name-list    encryption_algorithms_client_to_server
	name-list    encryption_algorithms_server_to_client
	name-list    mac_algorithms_client_to_server
	name-list    mac_algorithms_server_to_client
	name-list    compression_algorithms_client_to_server
	name-list    compression_algorithms_server_to_client
	name-list    languages_client_to_server
	name-list    languages_server_to_client
	boolean      first_kex_packet_follows
	uint32       0 (reserved for future extension)
服务器和客户端均会使用该数据包发送自己支持的协议，最终的协议协商，以客户端发送的为顺序，服务器挑选一个支持的协议。
当然这个地方，一般客户端可以选择等待服务器先发送，然后生成一个合适的列表返回去。
### Key的生成和计算
接下来各自发送KEY交换包，并且生成KEY。这部分比较繁杂，建议参考源码。
kex_algorithms（如Diffie-Hellman）和server_host_key_algorithms（如ssh-rsa）会用于生成KEY。
双方发送SSH_MSG_NEWKEYS，并且使用新KEY。注意，当收到或者发送SSH_MSG_NEWKEYS之前，都应该使用原来的加密方案，网上有些开源软件在这方面写的不标准，如果是后发SSH_MSG_NEWKEYS包，他们就会使用新的方案，但是一般服务器能够容错。
强调一下，发送 SSH_MSG_NEWKEYS 之后，才使用新的算法发送包。收到SSH_MSG_NEWKEYS之后，才使用新的算法解析包，两者相互独立。
细节建议参考 http://tools.ietf.org/html/rfc4253#section-7


验证登录
----
验证登录过程如下：
1、客户端发送 SSH_MSG_USERAUTH_REQUEST，请求 ssh-userauth 验证服务。
2、服务端发送 SSH_MSG_SERVICE_ACCEPT，允许验证服务。
3、客户端发送 SSH_MSG_USERAUTH_REQUEST，请求 ssh-connection 连接服务，并带有用户名密码。
4、服务端发送 SSH_MSG_USERAUTH_SUCCESS，验证通过。
