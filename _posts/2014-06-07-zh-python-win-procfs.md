---
layout: post
title: Python 调用系统 API 获取 Windows 性能状态（无第三方组件依赖）
---

此篇是对 [url]https://github.com/kevinjs/wmiagent[/url] 的改进，替换了原有的WMI模块。
在实际使用中，发现WMI组件比较慢，所以我先尝试直接使用系统API实现。
WIN32编程本身没有什么难度，熟悉系统API就行，我写了段C++的试验代码公开在此 [url]https://github.com/yangxiaohao/win-procfs[/url]。

后来我就去查如何利用这些代码给Python提供信息，不使用第三方组件的话，最合适的方法就是使用ctype。后来一想，既然能调用DLL，那为什么不python直接调用系统的DLL呢。。。
后来就去试了一下，果然可行。
临时源码地址 [url]https://github.com/yangxiaohao/wmiagent[/url]，是从一个不太正常的同事的项目 [url]https://github.com/kevinjs/wmiagent[/url] 里直接fork，然后改写的。
[!code=python]
CTYPE 和 运行时动态链接技术
----
CTYPE是整个过程的桥梁，它为Python提供了Windows的运行时动态链接技术的接口。
动态链接技术不用多讲，Windows的实现就是DLL。DLL的连接通常在编译时就利用LIB文件确定了，但是Windows API还提供运行时动态链接技术，允许程序在运行时动态指定DLL，访问其方法。CTYPE里就允许使用运行时动态链接技术载入Windows的DLL。
	from ctypes import *
	from ctypes.wintypes import *
ctypes.wintypes本身提供了一些常见Windows数据类型宏的定义，我在使用中还补充了个别需要的数据类型。
	SIZE_T = c_ulong
	PWCHAR = c_wchar_p
	PCHAR = c_char_p
	UCHAR = c_byte
获取CPU信息
----
以CPU为例，我简述一下实现过程。
### WinDLL
首先，我们需要调用系统ntdll的NtQuerySystemInformation方法。其说明可以在这里查到 [url]http://msdn.microsoft.com/en-us/library/windows/desktop/ms724509.aspx[/url]，里面有大量Windows宏，所以第一次接触的话可能会觉得看上去怪怪的，我不想赘述，因为需要蛮多WIN32基础。
调用它超级方便
	ntdll = WinDLL('ntdll.dll')
其中，WinDLL是ctype提供的一个包装好的函数（还是类，忘了），可以使用当前运行时载入dll，并以类的方法返回。然后就可以这样调用了：
	ntdll.NtQuerySystemInformation(........)
这个函数有两种用法（事实上大多数WIN32函数都有类似的用法，有空我再夸夸WIN32的API设计，除了恶心的命名法，这么多年基本不用变，当时的设计真心漂亮）：
第一个参数指明我要查询什么信息，第二个参数给段分配好的内存，然后利用结构体和指针返回信息，第三个参数指明第三个参数的大小，第四个参数是个指针，函数会返回写入数据的实际大小。
第一个参数指明我要查询什么信息，第二个参数为NULL，第三个参数是0，第四个参数返回。
可以看出我们需要两个额外的Python没有的东西：结构体和指针。
### 结构体
需要的结构体原始定义是这样，典型的微软风格，一次性把类型和指针一起定义了，还包含了几个保留参数：
	typedef struct _SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION {
	    LARGE_INTEGER IdleTime;
	    LARGE_INTEGER KernelTime;
	    LARGE_INTEGER UserTime;
	    LARGE_INTEGER Reserved1[2];
	    ULONG Reserved2;
	} SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION, *PSYSTEM_PROCESSOR_PERFORMANCE_INFORMATION;
由于没有用到，指针和原始结构体都可以舍弃，所以我只定义了SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION。
	class SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION(Structure):
	    _fields_ = [
	        ('IdleTime', LARGE_INTEGER),
	        ('KernelTime', LARGE_INTEGER),
	        ('UserTime', LARGE_INTEGER),
	        ('Reserved1', LARGE_INTEGER * 2),
	        ('Reserved2', ULONG),
	    ]
看得出来很简单，一一对应的，注意数组的处理。
### 指针
	size = ULONG()
	ntdll.NtQuerySystemInformation(8, 0, 0, byref(size))
8 是枚举类型 SYSTEM_INFORMATION_CLASS::SystemProcessorPerformanceInformation 的实际数字，为了简化我就没有单独定义，byref则能取出一个指针来。
这样的话，size 就包含了实际需要存下的结构数组空间的长度。
	count = size.value/sizeof(SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION)
	# 便是需要的结构体的个数（也就是CPU的内核数）。
	sppis = (SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION * count)()
	# 这样就弄出了一个结构数组
	ntdll.NtQuerySystemInformation(8, byref(sppis), sizeof(sppis), byref(size))
	# 取出信息
	for i in range(0, count):
	    print sppis[i].IdleTime
	# 遍历信息，做出应该的处理。
### 额外说明
当然我们这里假定了size.value必然是sizeof(SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION)的整数倍，这样做是不安全的：
最佳的方案是使用其他API取出CPU的内核数，而这里使用WIN32的堆来分配内存。
	lpvoid = windll.kernel32.HeapAlloc(windll.kernel32.GetProcessHeap(), 0, size.value)
然后再使用cast方法吧 void * 转化为数组指针
	cast(lpvoid, POINTER(SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION))[0]
其他
----
其他模块基本原理一致，不过取出来的基本都是系统开机以来的统计值，需要自己计算速率的问题。
需要说明的是，Windows API提供的这些内存、CPU、Drive数据都是抽象过后的概念，如果需要获取硬件级别的数据，需要使用设备管理相关的API。