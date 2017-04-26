---
layout: post
title: SHARPAGENT：一个为 CEILOMETER 准备的监控客户端
---

源码可见 [url]https://github.com/yangyuan/sharpagent[/url]

碎碎念
----
### WMIAGENT
准确的讲，这是为 ZESTACK 设计的 WINDOWS 监控服务，并不通用，是 [url]https://github.com/kevinjs/wmiagent[/url] 的 alternative 方案。
老板的这个原方案，受到 pywin32 和 WMI 约束，内存处理有点问题，我估计写这两个包的人对 COM 编程也不是很熟悉。

后来我弄了个改进版，利用 ctype，直接调用 WIN32，回避了 WMI，[url]https://github.com/yangyuan/wmiagent[/url]。
http://yangyuan.duapp.com/post.php?id=1041
基本算可用的，但是依然遇到一些问题，比如在部分系统下，一些跟驱动相关的函数无数据，比如 DeviceIoControl，猜测是 virtio 驱动的问题。
还有就是在一些老系统，比如 2003 64bit下，ctype 在引用 dll 的时候貌似加了锁，具体我没去研究，总之偶尔异常时候会触发dll读冲突。pywin32 的 service 更是会直接报错，所以打算重写一个。

### SHARPAGENT
经过简单测试，发现 WMI 本身是能在 XP 以后的系统上良好运行的，并且不会出现 DeviceIoControl 的那种空数据问题。
以我的性格肯定是要 C++ 直接写个，但是有两个问题：
1 是跟 ZESTACK 的 CEILOMETER 交互，我是需要提供 HTTP Server 的，并且提供 JSON 格式，估计得要第三方库。
2 是要考虑可读性问题，开发也得快。
综合考虑了一下，我决定用 C# 配合 .NET 4。
1 C# 简单易懂，.NET 4 能够支持 XP 以后的操作系统，并且协助安装了 WMI。
2 System.Threading 好用得一塌糊涂。。。。
3 System.Management 良好包装了 WMI，官方的包装，计数器使用方面应该可靠很多。
4 System.Net.HttpListener 实现了基本的 HTTP Server，用过很多次，很不错。
5 System.ServiceProcess 实现了 Windows 服务。
6 System.Runtime.Serialization 实现了 JSON 序列化 （虽然最后还是被迫放弃了）

SHARPAGENT 细节
----
### 服务实现
首先我没有使用官方的 Windows 服务项目模板，而是使用了普通命令行程序模板，因为我打算内置服务的安装和卸载。
安装和卸载比较简单，使用 ManagedInstallerClass 的 InstallHelper 即可实现。
单独利用继承 ServiceBase 和继承 Installer 实现了服务本体和辅助安装类。

### HTTP Server 实现
HttpListener 虽然包含了异步方法，但是依然不能满足我对可靠性的要求，因此我单独写了一个 AsyncHttpListener 类。此类内置一个 HttpListener，但是 AsyncHttpListener 能够随时随地地执行 Terminate，并且保证 Terminate 能够在 Timeout 以内成功。（但依然建议给予充足 Timeout，因为我不确定线程内部使用的是何种堆来分配内存） 
AsyncHttpListenerCallback 可以传入一个 delegate：
	void AsyncHttpListenerCallback(string path, ref byte[] body, ref string contenttype);
非常方便地进行反馈处理。

### 监控的实现
AsyncProcMonitor 是跟 AsyncHttpListener 性质一样的东西，也含有一个 AsyncProcMonitorCallback 代理。AsyncProcMonitor 分别使用 System.Net.NetworkInformation 和 System.Management 获取不同的数据，最终生成 JSON 格式，传给代理。

### 监控的细节：PerfFormattedData vs PerfRawData
在 KVM 虚拟机中，PerfFormattedData 表现得异常不稳定，我依然猜测是 virtio 驱动的问题。所以网络和硬盘的 IO 数据我都采用了 PerfRawData 自己计算，并且做了防抖。说到防抖，我告诉老板我做了防抖的时候，老板说“我还降噪呢”。。。解释了半天，不过感觉老板罪人依然觉得我是个逗比，算了，反正在老板眼里，我就是个逗比。。。。

### 监控的细节：NetworkInformation
除了使用 System.Managemen 以外，我还使用了 System.Net.NetworkInformation。主要是因为网络这块的很多接口，是 2003 以后才有的，为兼容性考虑，我还是避免使用，所以使用 NetworkInformation 这种硬件无关接口，来实现网络信息遍历。

### 监控的细节：JSON 生成
原本想使用 System.Runtime.Serialization，但这毕竟是一个强类型的序列化方案，老板的 CEILOMETER 用到的格式是没法转化为强类型的，跟老板商量了一下，决定先不改动，因此我使用了 Newtonsoft.Json 作为替代方案，为了使编译最终只有一个 exe，我使用内置源码的方案。

### 二进制文件
项目编译之后，有两个文件：sharpagent，sharpagentcli。两者区别就是 sharpagent 是一个可安装的服务，但调试不是很方便，需要看系统日志，而 sharpagentcli 是一个命令行程序，专门用于调试。

其他碎碎念
----
这个东西应用场景不大，但是小心使用了三个线程确保整个过程不会出现任何阻塞，线程之间共享的部分属于单项一次赋值的字符串，线程安全。
最后取到的数据配合前端界面效果还是不错的。
[img]http://ww4.sinaimg.cn/large/73740544jw1eovw34rhrnj20ai05dq34.jpg[/img]


