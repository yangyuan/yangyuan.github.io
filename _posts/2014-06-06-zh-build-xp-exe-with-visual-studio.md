---
layout: post
title: 让 Visual Studio 支持 Windows XP （不需要额外安装部署环境）
---


上学那会，.NET 开始在学校流行，很多人终于开始不用 VC6 了。但是很多人发现 VS 编译出来的东西，在 XP 运行不了，就在论坛问为什么。
一个蛮有声望的老师说，VS 不适合开发 C++ 程序，要让编译出来的东西在 XP 能跑，只能用 VC6，非要用 VS 的话，只能把 MFC 库编译进去。
当时我刚接触 WIN32，看了点国外的书，感觉这个说法跟微软的一贯做法有点违背（感觉微软还是蛮看重兼容性这个问题的）。但是当时真的是找不到中文资料，于是找了几个国外网页，详细解释 VS 编译参数的，终于找到了办法。

### SDK 和 Runtime
熟悉 C++ 的人，应该都知道 Windows 下的 obj、lib、dll。
obj 代码是由 c、cpp 直接编译出来，最终生成 exe，需要和涉及到的所有 obj 和 lib 连接到一起。lib 里可能包含了完整实现，也可能会指向另外一个 dll。
VC6 编译出的程序，没有什么额外的 dll，但是从 VS 2003 开始，就引入了 SDK Runtime，目的是让编译出来的程序小很多，并且大家共享几个 dll。
SDK Runtime 可以单独下载安装，也可以把 dll 跟程序一起打包，这样一来就可以在没有安装 SDK Runtime 的操作系统上运行了。其实 DirectX SDK 什么的，也是使用了这样的方案。
但假如想把程序强制编译成一个 exe 呢，其实 VS 里是可以强制使用完整 lib 编译。

简单设置
----
### VS2010 之前的版本，只需要
	C/C++ » Code Generation » Runtime Library
	`/MD` => `/MT`
`/MD` 指的是使用 “多线程运行时，使用公用 DLL”
`/MT` 指的是使用 “多线程运行时”
线程安全就不多说了，多线程的运行时会在一些 CRT 上做锁，以防多线程线程冲突，经典的例子如 malloc：Windows 下，malloc 是使用 HeapAlloc 在进程全局堆里实现的，多线程同时操作一个堆，如果没有锁，是不安全的。为了解决这个问题，微软除了单线程版本的 C++ 运行时库外，又有了多线程版本的 C++ 运行时库。纯理论角度，单线程的运行时更快，新版的 VS 已经不再支持单线程运行时了。
### VS2012 之后的版本，额外需要
	General » Platform ToolSet
	选择带 XP ToolSet
	Linker » SubSystem
	选择 Console 或者 Windows
最后一个支持 XP 的 SDK 是 7.1，VS2012 之后，默认的 SDK 就是 8 以上了，必须手动选择 XP ToolSet 才能切换回 7.1。
修改 SubSystem 貌似只是个 SDK 切换的问题。
SDK 不一样，有些 API 就不一样，因此如果有 XP 兼容需要，一定要看清 API 的 SDK 要求。
