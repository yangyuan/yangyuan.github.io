---
layout: post
title: 利用 StrongSwan 搭建多终端实用 VPN
---

最近离职和 on-board 一起忙，唯一一点时间都拿去无氧了，基本没研究业余技术。目测这种状态至少还会维持一个月。谢谢美帝的教授支持，不过今年真的来不及了，来年再做决定吧。

## 常见 VPN 名词解释

* PPTP：古老的 VPN 模式，其基本原理就是在原 IP 包的基础上加个包装。未加密，易拦截，依赖 GRE 协议，加上 MTU 问题，感觉只有内网使用场景。
* L2TP：其实跟 PPTP 类似，但使用 UDP，并且可以配合使用其他加密方式加密。注意 Windows 上的 L2TP 是指 L2TP/IPSec。
* IPSec：IPsec 原本是指（一种）IP 加密传输（的方案）。有的时候特指基于 Cisco 的一套 VPN 方案，配合 IKEv1、ESP，使用 DES 实现加密 VPN。
* L2TP/IPSec：特指 Windows 上的一套 VPN 方案，混合了 L2TP 和 Cisco 的 IPsec 方案。
* IKE：IPsec 的 Key 交换（方式或者说协议），有时候 IKE 也特指 IKEv1。
* IKEv1：IKEv1 有时候特指使用 IKEv1 的 IPsec VPN。
* IKEv2：IKEv2 有时候特指使用 IKEv2 的 IPsec VPN。
* SSTP：上面方式都使用比较复杂协议，只考虑安全性几乎不考虑穿透性。* SSTP 则强调穿透性，使用 SSTP，VPN 被因此在 HTTPS 协议里，HTTPS 协议的特殊性导致这样的 VPN 几乎无能力过滤，但代价是有多余流量消耗。目前只有 Windows 内置支持。
* OpenVPN：加上一个 Open 好像很厉害的样子，我目前的分析来看没有啥优势。

## 常见 VPN 方案比较

好吧剩下就是来比较方案了，注意这里使用的都是名词的特定 VPN。
* PPTP：。。。会被墙，MTU，GRE
* L2TP（纯L2TP）：。。。会被墙，Windows 不支持纯 L2TP
* L2TP/IPSec：除了 Windows 没人这么干。
* IPsec（IPsec IKEv1 + PSK + XAUTH，IOS 等设备支持）：目前客户端普遍支持。
* IKEv2（IPsec IKEv2 + EAP + RSA）：目前 Windows 以及一些较新的操作系统支持。
* SSTP：Windows 支持，没有开源服务端。
* OpenVPN：服务端客户端均专用。

综合来看，IPsec、IKEv2 基本覆盖所有设备，并且不容易被和谐。StrongSwan 恰合适。

## StrongSwan

StrongSwan 是各个 Swan 中比较活跃的一个，他自己的定位是 IPsec for Linux。也就是说纯粹的 IPsec 方案。目前来讲，各大设备和较新的操作系统都不同程度支持 IKEv1、IKEv2，StrongSwan 也可配合 L2TPD 实现 L2TP/IPSec，不过比较折腾我就没配置这个。
以 Ubuntu 为例介绍安装过程，请使用 5.0 之后的版本，5.0 之前的版本配置写法差太远，我使用的是 14.04 里的 5.1。(16.04, 5.3 测试通过。)
按照基本包，和 xauth、eap-mschapv2 插件

安装：
```
apt-get install strongswan strongswan-plugin-xauth-generic strongswan-plugin-eap-mschapv2
```

安装完了之后，其实只要改两个文件，就可以支持 IPsec 了。

ipsec.secrets
```
: PSK "secret"
user : XAUTH "pass"
```

ipsec.conf
```
conn %default
	left=%any
	leftsubnet=0.0.0.0/0
	right=%any
	rightsourceip=10.1.0.0/24
	rightdns=8.8.8.8,8.8.4.4
conn ikev1
	keyexchange=ikev1
	leftauth=psk
	rightauth=psk
	rightauth2=xauth
	auto=add
```

然后重启服务 `ipsec restart` 就可以了。
登录的使用用户名密码分别是 `user`、`pass`，预共享密钥是 `secret`
要支持 IKEv2 就比较麻烦，因为需要使用证书。
如果购买证书，需要在 openssl 的请求里添加选项 `extendedKeyUsage = serverAuth`，可以使用 `subjectAltName` 添加多个支持地址。
自签名证书则比较简单了，网上有很多脚本，我不列举了，不行就请别人帮忙。
总之拿到了 server.key 和 server.crt，分别放到以下地方

```
/etc/ipsec.d/certs/server.crt
/etc/ipsec.d/private/server.key
```

ipsec.secrets
```
: RSA server.key
: PSK "secret"
user : XAUTH "pass"
user : EAP   "pass"
```

ipsec.conf
```
conn %default
	left=%any
	leftsubnet=0.0.0.0/0
	right=%any
	rightsourceip=10.1.0.0/24
	rightdns=8.8.8.8,8.8.4.4
conn ikev1
	keyexchange=ikev1
	leftauth=psk
	rightauth=psk
	rightauth2=xauth
	auto=add
conn ikev2
	keyexchange=ikev2
	ike=aes256-sha1-modp1024! 
	rekey=no
	leftauth=pubkey
	leftcert=server.crt
	rightauth=eap-mschapv2
	rightsendcert=never
	eap_identity=%any
	auto=add
```
## 关于配置

* left、right 并不特指客户端和服务端，left、right 完全交换也是可以的。
* conn 后面的名字随便起的，%default 是默认的。
* ikev1 里要求 right 做 psk、xauth，是因为大部分客户端是这么设定的，如果客户端支持，其实这些验证方式、顺序都是随意的。
* ikev2 里 ike=aes256-sha1-modp1024!、rightauth=eap-mschapv2、rekey=no 都是为 Windows 客户端定制的。
* 大部分操作系统都不同程度支持 ikev1、ikev2，关键是要知道 auth 设定呀什么的，写出对应的 conn 就行，网上一般有现成的。
* StrongSwan 也可以用 ikev1 直接接上 L2TP，我实验成功过，这样 Windows XP 什么的也可识别，但我把配置丢了，祝好运。