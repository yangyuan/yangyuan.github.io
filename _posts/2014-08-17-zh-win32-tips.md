---
layout: post
title: （坑）WIN32 日常开发常用小技巧
---

WIN32 并非仅仅是使用一套库，很多技巧和要求书上不会讲，文档里也不会写在显要位置。好多东西我自己时间长了也忘，所以记下来。

Windows API 入门
----
官方通常使用 Windows API 这个词。准确的说是 Windows SDK 里提供的接口，都可以看成是 Windows API。如果想靠书籍入门的话，Jeffrey Richter 的《Windows via C/C++》我觉得是这方面最好的书。Jeffrey Richter 还有类似的 .NET 的书，也很实用。
有些是系统接口，而有些则是常用组件，跟操作系统无关的。Windows API 不仅仅是一套接口，有很多组件、模块是有自己独特的体系思维，并非很多人想象的 “就一套 API 而已”。有 C++ 基础，10 分钟可以看懂如何创建一个窗口，但是如果去研究 GDI、Uniscribe、WinINet、DirectShow、Hooks，则又是完全重新开始。（我毕业那年去百度面试，提到我有很多 WIN32 经验的时候，面试官就表示 “就一套 API 而已”，我也不好多说什么。）
还有一本书叫《Windows Internals》，会介绍一些 Windows 内部的概念和机制，想深入 Windows 开发，这个算是高阶点的参考书。

Windows Controls
----
### V5 控件 和 V6 控件
XP 之前默认控件是 V5 控件，XP 之后是 V6 控件，但可以使用 Classic 主题触发 V5 控件。
好多人认为 VC6 编译出的 MFC 不好看，其实是因为默认使用 V5 控件。对于 WIN32 程序来说，钓鱼 V6 控件需要主动在 manifest 文件中指明，可以在任意头文件中添加如下。
	#include <Commctrl.h>
	#pragma comment(lib,"comctl32.lib")
	#pragma comment(linker,"/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'\"")
### 系统字体
就算开启V6控件（XP Style），有些控件的字体依然是系统默认字体，而非系统主题字体，需要手动设置字体。
	HFONT hfont = (HFONT)GetStockObject(DEFAULT_GUI_FONT);
	SendMessage(xxxx, WM_SETFONT, (WPARAM)hfont, MAKELPARAM(FALSE, 0));
### 自定义控件消息处理
SetWindowSubclass 可以为控件指定一个处理函数，类似 WINPROC，调用 DefSubclassProc 可以触发调用默认处理函数。

GDI、GDI+
----
### GDI+ 双缓冲
将  Gdiplus::Graphics graphics(hdc); 替换为
	HDC memhdc = CreateCompatibleDC(hdc);
	RECT rect;
	GetClientRect(hwnd, &rect);
	HBITMAP membitmap = CreateCompatibleBitmap(hdc, rect.right, rect.bottom);
	SelectObject(memhdc, membitmap);
	Graphics graphics(memhdc);
函数尾部刷新缓冲释放资源
	BitBlt(hdc, 0, 0, rect.right, rect.bottom, memhdc, 0, 0, SRCCOPY);
	DeleteDC(memhdc);
	DeleteObject(membitmap);
如果性能要求较高，可以考虑复用资源，多线程刷新等。
### GDI+ 字体渲染
AntiAlias 和 ClearType
	SetTextRenderingHint(TextRenderingHintAntiAlias);
	SetTextRenderingHint(TextRenderingHintAntiAliasGridFit); // 没感觉到有多少区别
	SetTextRenderingHint(TextRenderingHintClearTypeGridFit);
如果需要分段绘制，需要使用统一的 format 作为参数。比如
	Gdiplus::StringFormat::GenericTypographic();
不过我自己怎么能配都配不出来跟 GenericTypographic 等效的 StringFormat
