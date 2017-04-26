---
layout: post
title: Detours Professional 3.0 逗比版
---


Detours Professional 3.0 是微软研究院的一个项目，用于实现复杂的 Hook 操作，达到一般 WIN32 API 实现不了的一些效果。
[url]http://research.microsoft.com/en-us/projects/detours/[/url]
在 Microsoft Store 价格是 $9,999.95，艹，没看错，是 一万！美元！三十万台币！一百多万日元！中国店没有出现。

Detours Express 3.0
----
有个体验版，免费下载，但是只有 X86 代码，完整版还有 X64、IA64 和 ARM。
[url]http://research.microsoft.com/research/downloads/details/d36340fb-4d3c-4ddd-bf5b-1db25d03713d/details.aspx[/url]
网上也有人讨论说 Express 版本还存在一个 BUG，会大面积扫内存，寻找合适位置。
### 试试编译
目前版本是 Build_316，使用 VS2013 x86 Native Tools Command Prompt 可以完美编译。

![alt text]({{ site.url }}/assets/images/create-detours-professional-1.jpg)

试了试 X64

![alt text]({{ site.url }}/assets/images/create-detours-professional-2.jpg)

我蛋疼地查看源码，发现其他类型CPU部分的专用代码都被这句话占位了：
	Feature not supported in this release.
于是我大胆假设，一定是一套代码，处理了一下，生成了 Express 版的代码。

![alt text]({{ site.url }}/assets/images/create-detours-professional-3.jpg)


找 Professional
----
搜了搜 Professional，找不到下载。因为这是库，所以 lib 或者源码均可。
看雪学院有先驱利用二进制修改的方法，把 X86 的 lib 改成了 X64 的 lib，不过评论说有问题，我也没敢用。
后来心想，会不会有人买了 Professional，然后手贱上传到 github 上了。我就以 “DETOURS_X64” 为关键词，在 github 上翻啊翻啊，但都是 Express 或者 Professional 2.1。
但是终于找到了一个 Build_306 版本的，竟然含有 X64 代码，打开一看，竟然是微软最近开源的 DotNetReference 源码！
可以在这里下载 [url]http://referencesource.microsoft.com/[/url]
源码位置为 Source/WPF/src/Shared/detours
但是有个问题：不全！是个子集，只有3个文件，完整应该是8个文件。
	detours.h
	detours.cpp
	disasm.cpp

合并出 Professional 版？
----
Express 是版本 Build_316，含有 “Feature not supported in this release”恰巧也是这3个文件，看来是核心文件。那理论上关键代码都在，版本又这么接近，有可能能吧X64代码合并进去升级咯？！
开始直接替换一下这仨文件，creatwth 无法编译通过，其他可以，看来差距不大。
### 合并！
开始使用的是 diff，我把 X64、IA64 和 ARM 的代码合并到 Express 版本里。但是后来发现一些旧代码也要升级，所以后来还是用了 Eclipse 的 GIT 工具。

![alt text]({{ site.url }}/assets/images/create-detours-professional-4.jpg)

其实 Visual Studio 什么的也行，没装高亮，抱歉。。

![alt text]({{ site.url }}/assets/images/create-detours-professional-5.jpg)

X64什么的代码合进来，并且参照 X86 部分的代码进行了一些升级。
我擦，竟然编译通过了！

![alt text]({{ site.url }}/assets/images/create-detours-professional-6.jpg)

版权和协议
----
Express 版本的协议是非商用、非生产环境使用。
DotNetReference 协议基本是不受限。
所以这个合并版，应该还是被要求是非商用、非生产环境使用。

DotNetReference 版 Detours 单独编译？
----
DotNetReference 版本是没啥限制的，而且应该算是稳定精简版。可以单独编译，比如使用下面的命令编译 X64 版本。
	cl /W4 /WX /Zi /MTd /Gy /Gm- /Zl /Od /DWIN32_LEAN_AND_MEAN /D_WIN32_WINNT=0x403 /D_WIN64 /DDETOURS_X64=1 /DDETOURS_64BIT=1 /D_AMD64_ /c detours.cpp disasm.cpp
	lib /NOLOGO /OUT:detours.lib detours.obj disasm.obj
然后拿着 detours.lib 和 detours.h 就可以了，没仔细研究，但应该够不少情况下使用了。

Express 缺陷和修复？
----
刚才我有提到“大面积扫内存”缺陷，我在升级代码的时候，发现了 Build_306 和 Build_316 有以下改动。
Express 目前下载到的版本用的是 Build_316，应该很容易看出来了这块是在寻找内存，并且搜寻顺序不同。但这块不熟，具体哪一个是有缺陷的我也不知道。
[!code=vc]
### Build_306
	// First, we try looking 1GB below.
	if (pbTry == NULL && pbTarget > (PBYTE)0x40000000) {
		pbTry = detour_alloc_region_from_lo(pbTarget - 0x40000000, pbTarget);
		if (pbTry == NULL) {
			pbTry = detour_alloc_region_from_hi((PBYTE)pLo, pbTarget - 0x40000000);
		}
	}
	// Then, we try looking 1GB above.
	if (pbTry == NULL && pbTarget < (PBYTE)0xffffffff40000000) {
		pbTry = detour_alloc_region_from_hi(pbTarget, pbTarget + 0x40000000);
		if (pbTry == NULL) {
			pbTry = detour_alloc_region_from_lo(pbTarget + 0x40000000, (PBYTE)pHi);
		}
	}
	// Then, we try anything below.
	if (pbTry == NULL) {
		pbTry = detour_alloc_region_from_hi((PBYTE)pLo, pbTarget);
	}
	// Then, we try anything above.
	if (pbTry == NULL) {
		pbTry = detour_alloc_region_from_lo(pbTarget, (PBYTE)pHi);
	}
### Build_316
	// Try looking 1GB below or lower.
	if (pbTry == NULL && pbTarget > (PBYTE)0x40000000) 
		pbTry = detour_alloc_region_from_hi((PBYTE)pLo, pbTarget - 0x40000000);
	}
	// Try looking 1GB above or higher.
	if (pbTry == NULL && pbTarget < (PBYTE)0xffffffff40000000) {
		pbTry = detour_alloc_region_from_lo(pbTarget + 0x40000000, (PBYTE)pHi);
	}
	// Try looking 1GB below or higher.
	if (pbTry == NULL && pbTarget > (PBYTE)0x40000000) {
		pbTry = detour_alloc_region_from_lo(pbTarget - 0x40000000, pbTarget);
	}
	// Try looking 1GB above or lower.
	if (pbTry == NULL && pbTarget < (PBYTE)0xffffffff40000000) {
		pbTry = detour_alloc_region_from_hi(pbTarget, pbTarget + 0x40000000);
	}
	// Try anything below.
	if (pbTry == NULL) {
		pbTry = detour_alloc_region_from_hi((PBYTE)pLo, pbTarget);
	}
	// try anything above.
	if (pbTry == NULL) {
		pbTry = detour_alloc_region_from_lo(pbTarget, (PBYTE)pHi);
	}
此外，两个版本在 detour_skip_jmp 上也有更新，但是由于只有 X86 版的，X64 版本只是照着改了，不熟悉这块，IA64 和 ARM 就无能为力了。

Detours Professional 3.0 逗比版 完成！
----
上面就是完成一个 Detours Professional 3.0 逗比版的整个过程。我还不确定协议里是否允许再打包发布，所以先不打包发布了。找个流程自己弄就行，就跟在 git 合并分支似得。

其实。。。故事其实是这样的
----
### 卡死人了
前几天 NALOL 更新，封掉了我平时用的加速器，据说是防止DDOS。今天打 Teemo 特别卡，所以心想自己有个主机呢，也许可以自己做个代理。
### 代理的实现
LOL 本身不支持使用代理，又不想架设 VPN，一般这种时候都使用第三方工具，比如著名的 GameCap，ProxyCap，各种 SSH Tunnel，当然还有国内的各种加速器。
大部分加速器以及 ProxyCap 都使用了驱动，但是的确有一些是不需要驱动的。并且从输出看，应该是拦截了单个进程的包。
### HOOK
于是我问 Gavin（[url]https://github.com/4con[/url]）：能不做驱动拦截一个进程的网络包，然后转发到别的地方么。Gavin 表示 Hook 掉 Socket 函数应该就可以，谁会那么蛋疼自己写网络协议库呢。我：好久没写 Hook 了，不太会了。Gavin：试试 Detours，哦对，专业版蛮贵的。。
蛮贵的。。
贵。。
Gavin：哦对，我们公司买了。。。
