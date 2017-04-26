---
layout: post
title: Windows 下 Putty 的编译和改造
---

项目本身能够在 [url]https://github.com/yangyuan/putty-meow[/url] 被发现。

Putty 本身小巧好用，并且得到了一些主流商业公司的认可。我对Putty有一点点不满意：
### 不够 Portable，信息是存在注册表的。
我经常把程序放在移动硬盘，但是换个地方Putty存的信息都没了。就是session信息备份啥的不方便，网上有一些对Putty做的Portable改进，基本原理要么是自动备份注册表，要么是利用第三方软件生成一个沙盒。
### 右键粘贴
右键复制的设计很方便，但是同时粘贴就让我很尴尬了。
### 其他小细节
比如默认字体、默认不开启 KeepAlive。

源码编译
----
[url]http://www.chiark.greenend.org.uk/~sgtatham/putty/download.html[/url] Putty 官方下载页，是的，奇怪的域名。
下载源码后，其Readme包含了编译方法。
在Windows下，如果要用VS、VC编译，需要VC7（VS2003）以上版本，我使用的是VS2013（VS12）。
### 命令行编译（官方）
Visual Studio Tools里，有个叫“Developer Command Prompt for VS2013”的东西。这玩意儿会自动调用一个脚本，能够把nmake、cl各种参数环境都帮你准备好，你就可以在里面直接使用nmake啥的编译了。
双击打开，然后cd到你的 putty-src/WINDOWS 这个目录下
执行 nmake MAKEFILE.VC 等待结束即可。在这个目录下会生成包括putty.exe在内的所有软件。
如有兴趣可以编译以下 MAKEFILE.VC，把版本代号啥的加进去。
### VS工程编译
这个就稍微麻烦些，你首先知道，VS里一个项目只能生成一个最终文件，exe、dll或者lib。而这坨源码是包含多个软件的，所以理论上每个软件都要生成一个工程。
MAKEFILE.VC 能看出 putty 需要那些 obj 文件。
C语言里，C文件是会生成obj的，H文件只为C文件提供额外信息，最后把一些obj链接起来，就是可执行文件了。默认情况下，VS会把工程下的所有c文件编译成obj，再全部链接起来。
所以，我就建了一个工程，然后把需要的C文件包含进来，然后在加了些兼容性的参数，就可以生成 putty.exe 了。具体请参考 [url]https://github.com/yangxiaohao/putty-meow[/url]
### 二次开发
刚才提到，默认情况下，VS会把工程下的所有c文件编译成obj，再全部链接起来。如果我要改某个文件，我完全可以重新找个地方写一个C文件，然后加进工程，再把原来的文件从工程移除（不需要删除），就可以了。
所以你会发现 putty-src 里面基本不变，新的文件放在VS工程的文件夹下。（开始想保持putty-src完全不变，后来觉得意义不是很大，没有强制这么做）

改造：配置存储方式
----
Putty使用的是操作系统推荐的存储方式：Unix下使用/home/user目录下生成配置信息文件、Windows 下使用注册表保存信息。当然这两种方式都不适合移动硬盘（也就是传说中的不够Portable、绿色）
Unix下的存储基本使用了C标准库实现，这使得我可以直接使用 Unix 的存储代码和存储方式。我在工程里新建个C文件 _WINSTORE.C，然后把 UXSTORE.C 的内容复制进去，网上找了一个 dirent.h，再改了改一些不兼容的函数（比如字体，比如存储的默认文件夹，比如rename函数），把 WINSTORE.C 从项目里移除，就编译成功了。
### rename
	if (rename(tmpfilename, filename) < 0)
改为
	if (MoveFileEx(tmpfilename, filename, MOVEFILE_REPLACE_EXISTING) == 0)
难道linux下rename会自动覆盖？

改造：默认右键行为
----
WINDOW.C 文件里有 WndProc 函数（也就是传统Windows编程中的窗口主函数），其右键行为有一段这样：
	if (message == WM_RBUTTONDOWN &&
		((wParam & MK_CONTROL) ||
		(conf_get_int(conf, CONF_mouse_is_xterm) == 2))) {
		...
		TrackPopupMenu
		...
	}
大致就是说如果右键同事按着CTRL，就弹出菜单，但弹出菜单的时候不会触发自动PASTE。
	if (message == WM_RBUTTONDOWN &&
		(!(wParam & MK_CONTROL) ||
		(conf_get_int(conf, CONF_mouse_is_xterm) == 2))) {
		...
		TrackPopupMenu
		...
	}
于是仅仅改成这样，就基本满足需要了。
当然理想情况下，我希望如果有选中：右键出发COPY；没选中，右键则PASTE。不过发现这块检测选中有困难（其实是我没太看懂，因为需要跨平台，封装比较多，还没足够注释），所以先这样了。大致理清其原理和依赖，我觉得有空我可以自己试试玩个轻量级的。
