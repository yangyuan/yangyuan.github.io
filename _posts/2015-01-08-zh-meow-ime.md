---
layout: post
title: 逗比的输入法实现
---

病好了，继续填坑。注意，这次只是实现了输入法的一个完整样板，并不包含高级输入法的候选算法，以及复杂的皮肤效果。

目录
----
[url=http://andrewyang.cn/post.php?id=1078]（一）：基本情况[/url]
[url=http://andrewyang.cn/post.php?id=1079]（二）：基础概念和常用接口[/url]
[url=http://andrewyang.cn/post.php?id=1080]（三）：整体构架[/url]
[url=http://andrewyang.cn/post.php?id=1081]（四）：编辑和候选[/url]
[url=http://andrewyang.cn/post.php?id=1082]（五）：界面管理和无界面模式[/url]
[url=http://andrewyang.cn/post.php?id=1083]（六）：词库和候选算法[/url]
[url=http://andrewyang.cn/post.php?id=1084]（七）：皮肤的实现[/url]
[url=http://andrewyang.cn/post.php?id=1085]（八）：其他杂事[/url]

Meow 输入法
----
### 目标
这套输入法的目标是为使用 TSF 实现输入法提供一个完整的样板，暂不考虑做成商业输入法。
在实现的过程中，为保证编译速度和可读性，我严格控制了文件数量和文件规模，在功能和代码可读上取了折衷。
我也避免使用第三方库，也避免了对 TSF 接口做再次包装，以便直观地看出 TSF 接口的使用方式。
### 纯 TSF 输入法
老早就听说在 Windows 下输入法实现有两套 API：IMM32 和 TSF，并且能看出了 TSF 有逐渐取代 IMM32 的趋势。
但 TSF 由于是 COM 接口实现输入法，显得过于灵活，接口也比较隐晦，操作难度大。加上潜在兼容性问题，目前主流的输入法，都是选择同时实现两套，缺点貌似就是复杂，容易出错。
纯 TSF 输入法的先驱不多，主流输入法更是没有这么干，微软自己的 TSF 输入法，更是没有一个是开源的。从 TSF 资料而言，样例缺失，文档随意、更新不及时，的确是平白无故添加了开发的难度。
抱着折腾不止的原则，这个输入法只含有 TSF 核心，也就是完完全全的 TSF 输入法。
### 兼容性
从下从 XP 到 WIN8 的 METRO 界面，都兼容，也兼容无界面模式。
不过在 XP 系统里，需要开启“高级文字服务”功能，另外 XP 里的 TSF Manager 使用一个兼容层，响应 TSF 接口转换为 IMM32 行为，所以 TSF 事件行为上并不完整。
### 窗口元素
和 IMM32 不一样，TSF 自身并不包含任何窗口元素，输入框、候选框、状态栏等窗口都需要自己实现。
目前纯 TSF 输入法普遍存在的问题如没有状态栏（官方不提供样例，主流输入法更是使用 IMM32 回避了这个问题）。在这个实现里面，对这些传统界面元素都是有的，并且严格管理。
### 皮肤、字库和候选算法
要啥自行车
### 可能存在的问题
个别应用程序会主动调用 IMM 接口与输入法交互，理论上兼容，但是需要大量实测。
个别应用程序会主动调用 TSF 接口但操作失当（即向输入法传递错误数据），这种情况尽量给予兼容处理。

参考
----
### SampleIME
Windows 8 Desktop Samples 中包含的实例 IME 代码，比较简单，可读性较高。
该样例兼容性较低，所以只适合学习用。有些包装很好的函数如注册表操作相关函数，可以直接拿来复用。
[url]https://code.msdn.microsoft.com/windowsdesktop/Windows-8-Desktop-Samples[/url]
### Google Input Tools
Google Input Tools 是一套 TSF、IMM 混合输入法，对我的开发有很大帮助。
[url]https://github.com/googlei18n/google-input-tools/[/url]
### MSDN
天杀的官方文档
[url]http://msdn.microsoft.com/en-us/library/windows/desktop/ms629032.aspx[/url]

源代码和技术选型
----
源代码开放于我的 GITHUB [url]http://github.com/yangyuan/meow[/url]
### 语言
TSF 接口使用了 COM 组件接口，COM 虽然本身支持 C++、C 两种方式，使用 C++ 接口似乎更正常一些，C 则更像是做了一层兼容。
另外输入法里有大量数据结构操作，利用 C++ 的 STL，也能够提高可读性。
最后选择 C++ 作为开发语言。
### SDK
整个项目没有使用第三方库。
Windows SDK 版本方面，在 7.1 和 8.1 均编译通过，能够兼容至 XP。
全程避免使用 CRT，尽量使用系统 API，如避免使用 malloc，而使用 HeapAlloc。
### 命名方式
请原谅我放荡不羁的命名方式，API 本身的命令就好几种，也没法统一。我自己的代码大致这样的：
全大写：常量
全小写 + 下划线：变量、类成员。全局变量尽量全拼，本地变量尽量缩写。
大小大小写：类名、方法名、Namespace。
文件名全小写。
个别地方会根据 API 习惯来调整命名法。
### 命名方式的解释
稍微解释下，这么命名方式可以说是参考了 C# 的命名习惯，但全小写的使用的更多。
### Namespace
为增加可读性，全局函数和全局变量尽量扔进 Namespace。
### 文件数量
严格控制文件数量、大小，不为每个类单独创建文件，减少编译压力，也方便阅读。


为什么叫 Meow？因为这是给猫用的输入法。。。
[!code=vc]

目录
----
[url=http://andrewyang.cn/post.php?id=1078]（一）：基本情况[/url]
[url=http://andrewyang.cn/post.php?id=1079]（二）：基础概念和常用接口[/url]
[url=http://andrewyang.cn/post.php?id=1080]（三）：整体构架[/url]
[url=http://andrewyang.cn/post.php?id=1081]（四）：编辑和候选[/url]
[url=http://andrewyang.cn/post.php?id=1082]（五）：界面管理和无界面模式[/url]
[url=http://andrewyang.cn/post.php?id=1083]（六）：词库和候选算法[/url]
[url=http://andrewyang.cn/post.php?id=1084]（七）：皮肤的实现[/url]
[url=http://andrewyang.cn/post.php?id=1085]（八）：其他杂事[/url]

TSF vs IMM32
----
输入法广泛使用 IMM32 接口，也发展成熟，XP 开始微软推广 TSF，Vista 操作系统默认开启了 TSF 管理器。
但 TSF 一直饱受非议，虽然设计的很通用，但使用 COM 组件、接口隐晦、操作麻烦，而且从输入法角度来说，能做的事情似乎并不比 IMM32 强多少。此外，TSF 文档不全，样例单一，个别输入法功能上（比如输入法窗口管理）甚至比 IMM32 还要弱。TSF 似乎一直不怎么受到输入法开发者待见。
直到 Win8 之后，METRO 界面只能使用 TSF 接口，于是主流输入法纷纷实现 TSF，用于处理全屏模式、游戏、以及 METRO。
### TSF 和 IMM32 之间的兼容性
[!html]
	<table>
	<tr><td>兼容性</td><td>TSF APP</td><td>IMM32 APP</td></tr>
	<tr><td>TSF IME</td><td>利用 msctf.dll 和 TSF Manager 交互</td><td>msctfime.ime（XP 下需要开启高级文字服务）</td></tr>
	<tr><td>IMM32 IME</td><td>msctf.dll 的 IMM32 兼容层</td><td>利用 imm32.dll 和操作系统交互</td></tr>
	</table>
msctfime.ime，能够把 TSF IME 模拟成 IMM32 输入法。唯一的例外的情况，是 XP 下，如果关闭高级文字服务，msctfime.ime 将被禁用。
尽管似乎一切都没有问题，但是实际情况下，由于 IMM32 和 TSF 本身的差异，在兼容模式下，一些事件的触发是不可靠的，所以依然不能认为他们完全兼容。
### TSF 特点
使用 COM 组件，扩展性非常好，但上手难度大。
本身着重文字服务，比如手写输入、语音输入，甚至纠错、翻译什么的，都是可以用 TSF 实现。
APP 和 IME 之间有更多信息可以通讯。
IME 相关功能提供不全，如只提供了输入字属性和语言栏修改，输入法窗口均需要自己实现。（因为这一点，主流的纯 TSF 输入法都放弃输入法状态栏）
大部分注册表相关任务（比如注册输入法，注册快捷键）需要自己实现。
### IMM32 特点
接口直白，操作上简单。
完全为 IME 设计的接口，拥有一些 IME 特有的功能，比如输入法窗口管理，系统输入法快捷键管理。
IME 单向为应用提供输入，交互功能受限。
接口扩展性低，已停止更新。

COM 和 DLL 基础概念
----
输入法文件的本质是个 dll，只要 dll 编译正确，就可以注册进操作系统。
（现在的主流输入法都跑了一堆 exe，感觉主要是为了更新和偷窥。对于输入法 DLL 来说，完全可以触发自己的工作线程，没必要额外的 exe）
而 TSF 输入法，则是一个可注册的，包含 COM 接口的 dll。

### COM
COM 是微软的核心接口方案，COM 在 Windows 和 Office 中使用非常广泛，比如看似笨重的 IE 其实在为整个操作系统实现了网页相关的接口。
COM 的一大特点是跨进程的，使用 COM 的时候，你不知道对面是跟进程，还是个被操作系统托管的 dll，而 COM 对象而言，也会在不同进程里被使用。

### 内存和引用
COM 接口都继承自 IUnknown，而 IUnknown 就干了一件事：引用管理。
当一个 COM 对象生成了之后，它可能被多个进程调用，过早释放肯定是危险的，不及时释放会出现内存泄漏。
因此，COM 接口的使用者需要严格把控引用计数操作，COM 接口自身也应该拥有自毁灭功能（既当无人引用自己时，主动销毁自己）。
实现任何 COM 接口都应该好好处理引用管理。对于一些特殊的情况，比如传递字符串 BSTR，则应该使用约定俗成的原则。

### 线程模型
ThreadingModel，DLL 在操作系统执行时，经常只占用一份内存，而实际每个实例又有自己的 hinstance 可以互相区分，那么这个 dll 是否多线程安全，完全取决于这个 dll 怎么写的。ThreadingModel 相当于告诉操作系统，我适用于什么线程模型。如果完全不知道自己该干嘛，应该使用 Apartment 模型，也就是支持单线程模式。 http://support.microsoft.com/kb/150777

### DLL DEF
编译 dll 需要暴露外部接口，暴露的方式就是在编译的时候指定 def 文件。一个 COM 组件的 def 文件至少是这样的：
	LIBRARY
	
	EXPORTS
	        DllGetClassObject               PRIVATE
	        DllCanUnloadNow                 PRIVATE
	        DllRegisterServer               PRIVATE
	        DllUnregisterServer             PRIVATE
// FIXME: 提供一个更详细的函数调用情况说明
其中 DllRegisterServer 和 DllUnregisterServer 是被注册（安装卸载），也就是调用 regsvr32.exe 注册时触发的函数。
而组件实际被调用的时候，DllGetClassObject 会被调用，通常你需要返回一个 ClassFactory，注意引用管理。
DllCanUnloadNow 则是用来计算能否卸载，需要跟引用管理配合。

### DllMain
除了那 4 个手动暴露的函数，DllMain 是个默认暴露的函数，但 DllMain 不是必须要实现的。
在 DllMain 通常发生于 Dll 载入、卸载 的时候，这时候进程的状态是非常不确定的，有可能都没有初始化完毕，因此在 DllMain 里调用的操作要非常小心。
一般来说，DllMain 里只会包含一些 HINSTANCE 相关操作，比如记录 HINSTANCE，初始化 CriticalSection 等。

### 引用管理
DLL 自身跟 COM 对象一样，需要实现应用管理。
DllGetClassObject 每返回一个对象（ClassFactory），引用应该 +1
当确保被引用的 ClassFactory 都已释放时，DllCanUnloadNow 才可以返回 S_OK。
监控 ClassFactory 的状态是比较麻烦的，特别是有多个不同 ClassFactory 的情况。


TSF 重要概念
----
这是官方的图，希望有帮助。
[img]https://i-msdn.sec.s-msft.com/dynimg/IC159252.gif[/img]
### 概要
先来直白看下 APP 和 IME 都需要干啥。（当然，APP 很多工作都由操作系统默认控件代为实现了）
APP：
	创建 ThreadMgr
	ThreadMgr->Activate
	创建 DocumentMgr，创建 Context。
	ThreadMgr->SetFocus(DocumentMgr)
	DocumentMgr->Push(Context)
IME：
	注册 TextInputProcessor
	实现 TextInputProcessor->Activate
	ThreadMgr->GetFocus(DocumentMgr)
	DocumentMgr->GetTop(Context)

核心 TSF 接口
----
// FIXME: 提供一个更详细的接口及其方法说明
COM 接口的松耦合性，导致其接口通常比较隐晦，很难直观地看出该怎么使用参数，组件是如何被调用的。
http://msdn.microsoft.com/en-us/library/windows/desktop/ms629037.aspx
这个网页列举了 TSF 的相关接口，自从我打开这个网页，我就知道我进了一个深坑。有些接口给应用程序用的，有些给输入法用的，混在一起，光接口就多达142个。
很多接口的网页打开之后只有基本是一句话描述，完全没有使用场景说明和样例。我只能从不同版本的 SDK 里寻找不同样例，尝试理解接口的使用场景和用法，把重要信息列举出来。
有些接口是 Application 专用的，有些是 Text Service 专用的，而有些是公用的，一般接口的一句话描述里会提到。

★ ITfTextInputProcessorEx、ITfTextInputProcessor
----
大致可以理解为输入法的进程管理接口。会触发激活、释放两个事件，对应的应该做出各种初始化和释放。
这是最基础的入口接口，APP 如果需要跟输入法交互，需要主动查询和调用 ITfThreadMgrEx，对于的 IME 响应便是 ITfTextInputProcessor。

★ ITfThreadMgrEventSink
----
输入法线程管理，有时候每个应用都使用独立的输入法线程，有的时候是公用的，跟操作系统设定有关，必须适应多种情况，必须实现。

★ ITfKeyEventSink
----
处理键盘事件的接口，输入法当然要有咯。
一般来说，需要利用ITfKeyEventSink，判断按键，决定是否触发 Composition Session。
如果当前没有任何 Composition Session 那么需要根据按键触发 Composition Session。
如果当前有 Composition Session，则需要根据按键决定是否终止 Composition Session（比如常用的按空格）。
当然，个别其他事件也需要终止 Composition Session，比如焦点转移了。

★ ITfContext、ITfEditSession
----
当键盘事件被触发时，获得的参数是ITfContext。但是ITfContext并不能直接修改内容添加文字等，需要调用 RequestEditSession，传入一个 ITfEditSession 才能实现内容的修改。
RequestEditSession 之后，ITfEditSession 的 DoEditSession 会被（迅速）调用，可以在这个时候实现对内容的修改，也可以干别的事情。比如创建或者结束 一个ITfComposition。
为什么这么设计，我猜测是从线程管理的角度。被输入的应用程序不可能锁住UI线程等待输入，但是多线程同时修改，可能会产生线程同步问题。操作系统可能会在你触发 RequestEditSession 的时候迅速锁住 UI 线程，输入，然后释放 UI 线程。

★ ITfContextComposition、ITfComposition
----
Composition 实现的接口，通常需要在一定的时机，调用 ITfContextComposition，并且生成 ITfComposition。
并且在合适的时候触发 ITfComposition 的 EndComposition，在 EndComposition 中生成一个 ITfEditSession，实现输入。
什么实际算合适呢，需要小心控制。在很多实现中，都是利用 ITfEditSession 的 DoEditSession 中创建和结束 ITfComposition。
就我目前的观察而言，Composition 并非必须的，也不能利用 Composition 直接修改文字，实际上你可以完完全全吞掉输入的按键。但 Composition 实际上是 TextService 和应用程序之间共享的接口。利用 ITfComposition 应用程序可知道你正在输入，并且知道正在输入的内容。所以从兼容性角度，应该实现 ITfComposition。
通常 TextService 主动利用 ITfContextComposition 创建 ITfComposition，然后利用 ITfCompositionSink，监听 OnCompositionTerminated。
应用程序可调用 ITfContextOwnerCompositionSink 监听 Composition 的事件。

★ ITfTextEditSink、ITfCompositionSink
----
常用的管理输入过程的接口，如触发文字改动，触发编码等等，理论上肯定会用到。
一般来说，这些事件都用来辅助 Composition Session 的管理。

ITfThreadFocusSink
----
被输入线程焦点（活动窗口）管理。用 ITfThreadMgrEventSink 管理活动窗口并不靠谱，因为无法确定操作系统是如何管理输入法线程的。如果需要在每次焦点变化时候做调整（如隐藏、显示状态栏），ITfThreadFocusSink 是比较好的处理接口。

ITfDisplayAttributeProvider、ITfDisplayAttributeInfo、IEnumTfDisplayAttributeInfo
----
在输入过程中，如果想为输入的字符串显示特殊的效果（比如颜色、下划线），则可以使用这两个接口。
因为考虑到各种兼容性，这两个接口提供的效果非常有限。

ITfUIElement、ITfCandidateListUIElement
----
从名字上很容易误以为这是输入法管理 UI 的接口，实际上这个是输入法允许应用程序自己托管 UI 所需的接口。比如全屏游戏，比如命令行模式。
程序希望自己绘制输入法界面时，如果输入法提供了这些接口，程序就可以用对应的接口获取输入法的 CandidateList，并且用自己的 UI 显示，比如魔兽世界就会如此。

ITfLangBarEventSink
----
用于管理语言栏相关事件，如果语言栏是万年不动的，可以不用。

ITfFnConfigure
----
配置接口。。。控制面板的输入法里，有个配置按钮。。。用于处理那个用的。

困。。。这篇从界面和系统的角度，介绍 Meow 输入法的整体构架。
[!code=vc]

目录
----
[url=http://andrewyang.cn/post.php?id=1078]（一）：基本情况[/url]
[url=http://andrewyang.cn/post.php?id=1079]（二）：基础概念和常用接口[/url]
[url=http://andrewyang.cn/post.php?id=1080]（三）：整体构架[/url]
[url=http://andrewyang.cn/post.php?id=1081]（四）：编辑和候选[/url]
[url=http://andrewyang.cn/post.php?id=1082]（五）：界面管理和无界面模式[/url]
[url=http://andrewyang.cn/post.php?id=1083]（六）：词库和候选算法[/url]
[url=http://andrewyang.cn/post.php?id=1084]（七）：皮肤的实现[/url]
[url=http://andrewyang.cn/post.php?id=1085]（八）：其他杂事[/url]

界面构成
----
一个常见输入法由以下界面构成。
// FIXME: 换掉这张美哭了的图。

![alt text]({{ site.url }}/assets/images/meow-ime-1.jpg)

不同输入法在细节的选择上会不一样，比有些输入法没有编辑窗口，而有些输入法没有状态栏。
### Meow 选择的界面元素
编辑窗口：包含编辑信息和候选数据。
语言栏：仅含输入法图标。
状态栏：由于控制了语言栏功能，还是需要一个语言栏辅助。
### 关于语言栏
个人觉得，界面上语言栏要谨慎使用。
一是因为语言栏涉及一个宽度的问题，不少应用也会去主动修改语言栏宽度，XP上语言栏也有宽度刷新 BUG。
二是不同操作系统语言栏有所差异。
三是因为任务栏本来就挺多东西的。。。

系统构架
----
由于缺乏经验，我只能大概设计结构如下，具体还要在实践编程中调整。
// FIXME: 这张图已经改了

![alt text]({{ site.url }}/assets/images/meow-ime-2.jpg)

总体来说，输入法窗口和输入候选引擎，应该独立于 TextService，这样方便开发测试，也方便皮肤和候选引擎自由扩展。
为避免不必要的复杂服，Meow 中避免创建线程，因此需要严格控制每个方法反应时间，这对候选引擎是一个挑战。

### TextService 文字服务
TextService 是输入法的基础入口，维护输入法自身的状态。
重要接口有 `ITfTextInputProcessorEx`、`ITfThreadMgrEventSink`、`ITfThreadFocusSink`。

### ConfigurationManager 配置管理器
配置管理器是个贯穿全局的管理器，任何模块都可以直接调用。

### WindowManager 窗口管理器
实现和管理输入法的窗口和皮肤。

### CompositionManager 编辑管理器
CompositionManager 通过处理键盘事件，配合 TextService 提供的状态信息，以及自身的状态机，处理按键输入的逻辑过程。
重要接口有 `ITfKeyEventSink`、`ITfTextEditSink`、`ITfCompositionSink`、`ITfEditSession`。
//FIXME: 是否需要处理 ITfDisplayAttributeProvider、IEnumTfDisplayAttributeInfo、ITfDisplayAttributeInfo 还有待观察。

### CandidateManager 候选管理器
CandidateManager 有两个任务。
一个当然是跟候选引擎配合，响应 CompositionManager，生成 CandidateList。
另一方面，CandidateManager 也负责将 CandidateList 的情况推送给其他模块，包括 WindowManager、CompositionManager 和生成 UIElement。

### 逻辑要点说明
ConfigurationManager 只是管理配置，并不维护当前输入法的状态。
CompositionManager，CandidateManager 的关系更像是流程的两个步骤，即：`按键事件->CompositionManager->CandidateManager->UI`。
在 UILess 模式下，CandidateManager 是 UIElement 的提供者，主要是因为 CandidateList 跟 ITfCandidateListUIElement 显然非常接近。
TextService，CandidateManager 均会对 WindowManager 操作，在一些问题（如是否显示）上，前者优先级高于后者。
WindowManager 主要任务是皮肤相关工作，跟输入法整体上处于松耦合。
Engine 的主要任务是候选算法和词库处理，跟输入法整体上也处于松耦合。

### CandidateManager 和 CompositionManager
从常理上说，CandidateList 的生成应该在 Composition 内部。但 CandidateManager 之所以独立于 CompositionManager，原因有以下几个：
1、让 CompositionManager 单纯安心地去维护 Composition 状态。（这个任务已经够艰巨了）
2、在 TSF 的概念里，Composition 本身就是跟 UI 和 CandidateList 无关的，TSF 里就没有 Composition Window 这个概念。
3、UILess 模式的存在，使得 ITfCandidateListUIElement、WindowManager 需要一定的配合，而这个“配合”恰好需要发生在他们跟 CandidateList 交互的时候，而 CandidateList 的生成需要用 CompositionManager 的字符串，以及候选引擎。因此用一个模块将 UIElement、WindowManager、CandidateList 联系起来，作为一个整体来跟 CompositionManager、候选引擎 交互，代码会更简洁好懂。

入口
----
DLL 入口也就是那几个 DLL 函数，DLL 入口需要完成注册表注册工作，并且向外界提供 ClassFactory，通过 ClassFactory 可以获取 TextService。

TextService
----
### 输入法初始化和释放
	// ITfTextInputProcessorEx
	HRESULT STDMETHODCALLTYPE ActivateEx(ITfThreadMgr *ptim, TfClientId tid, DWORD dwFlags);
	// ITfTextInputProcessor
	HRESULT STDMETHODCALLTYPE Activate(ITfThreadMgr *ptim, TfClientId tid);
	HRESULT STDMETHODCALLTYPE Deactivate(void);
TextService 被激活时，ActivateEx、Activate 会被调用，此时的工作便是初始化。
TextService 被释放时，Deactivate 会被调用，此时的工作便是清理工作。
可能会有多个 TextService 存在，但一个 TextService 只会被 Activate 一次，因此 Activate 之后，便可以使用类成员来存储当前输入法实例的状态。
但 TextService 和被输入程序不是一对一关系，这取决于操作系统配置，有可能多个程序共用一个 TextService。
### 输入法当前活动状态管理
	// ITfThreadFocusSink
	HRESULT STDMETHODCALLTYPE OnSetThreadFocus(void);
	HRESULT STDMETHODCALLTYPE OnKillThreadFocus(void);
	// ITfThreadMgrEventSink
	HRESULT STDMETHODCALLTYPE OnInitDocumentMgr(ITfDocumentMgr *pdim);
	HRESULT STDMETHODCALLTYPE OnUninitDocumentMgr(ITfDocumentMgr *pdim);
	HRESULT STDMETHODCALLTYPE OnSetFocus(ITfDocumentMgr *pdimFocus, ITfDocumentMgr *pdimPrevFocus);
	HRESULT STDMETHODCALLTYPE OnPushContext(ITfContext *pic);
	HRESULT STDMETHODCALLTYPE OnPopContext(ITfContext *pic);
[b]ITfThreadFocusSink[/b]：在 Windows 里，Focus 的定义就是开始接受输入。这里利用 ITfThreadFocusSink 决定输入法状态栏是否显示。
[b]ITfThreadMgrEventSink[/b]：输入法当前工作的目标只有可能是一个 ITfDocumentMgr，但这个 ITfDocumentMgr 可能是多个程序共用，也有可能一个程序拥有多个 ITfDocumentMgr，但必须只有一个是 Focus 的。如果 `ITfThreadMgrEventSink::OnSetFocus` 发生，则应该根据情况清理和初始化当前存储的所有 ITfContext 和 ITfDocumentMgr 相关的目标。OnPushContext、OnInitDocumentMgr 什么的，一般捕获不到，因为通常在输入法没有载入的时候，APP 已经完成了这些操作，所以输入法需要主动 GetFocus，取到 ITfDocumentMgr，再 GetTop，取 ITfContext。
### 接口提供
TextService 的 QueryInterface 为整个输入法提供接口查询，同时，各个 Manager 也是在 TextService 中初始化和保持，一般所有 Manager 都有一个指针找到自己所在的 TextService。

ConfigurationManager、WindowManager
----
目前还没有完整实现。

CompositionManager
----
CompositionManager 尝试从 TextService 分离出编辑相关的逻辑，从而方便和安全地管理编辑操作。
	// ITfKeyEventSink
	HRESULT STDMETHODCALLTYPE OnSetFocus(BOOL fForeground);
	HRESULT STDMETHODCALLTYPE OnTestKeyDown(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten);
	HRESULT STDMETHODCALLTYPE OnTestKeyUp(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten);
	HRESULT STDMETHODCALLTYPE OnKeyDown(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten);
	HRESULT STDMETHODCALLTYPE OnKeyUp(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten);
	HRESULT STDMETHODCALLTYPE OnPreservedKey(ITfContext *pic, REFGUID rguid, BOOL *pfEaten);
	// ITfTextEditSink
	HRESULT STDMETHODCALLTYPE OnEndEdit(ITfContext *pic, TfEditCookie ecReadOnly, ITfEditRecord *pEditRecord);
	// ITfCompositionSink
	HRESULT STDMETHODCALLTYPE OnCompositionTerminated(TfEditCookie ecWrite, ITfComposition *pComposition);
	// ITfEditSession
	HRESULT STDMETHODCALLTYPE DoEditSession(TfEditCookie ec);
Composition 的过程被分离成 KeyEvent 和 EditSession 两个部分。
[b]KeyEvent[/b]：处理发生在 ITfContext 上的键盘事件，正常情况下，一般只需要处理 KeyDown 事件。
[b]EditSession[/b]：则是用来修改 ITfContext 上的文字（包括正在 composite 的文字）。因为 APP 和 IME 同时拥有对 ITfContext 写权限， TSF Manager 便使用 EditSession 来协调。因此想要更新文字，就必须调用一次 EditSession。
正常情况下，Composition 的创建和销毁都是 IME 在 EditSession 中操作，但是在意外情况下，APP 会主动终止 Composition（比如 APP 关闭），此时 OnCompositionTerminated 会被调用。此外，EditSession 是可以异步执行的，`ITfTextEditSink::OnEndEdit()` 发生在每次 EditSession 终止。

CandidateManager
----
CompositionManager 会尝试拦截按键，并管理当前 composite 的状态，CandidateManager 则利用 CompositionManager 的 composite 结果，调用输入引擎生成 CandidateList，并调用对应 UI 模块（Window 或者 UIElement）。
暂时无法提供更详细的资料因为我忒么还没写完。

要按照常理出牌

目录
----
[url=http://andrewyang.cn/post.php?id=1078]（一）：基本情况[/url]
[url=http://andrewyang.cn/post.php?id=1079]（二）：基础概念和常用接口[/url]
[url=http://andrewyang.cn/post.php?id=1080]（三）：整体构架[/url]
[url=http://andrewyang.cn/post.php?id=1081]（四）：编辑和候选[/url]
[url=http://andrewyang.cn/post.php?id=1082]（五）：界面管理和无界面模式[/url]
[url=http://andrewyang.cn/post.php?id=1083]（六）：词库和候选算法[/url]
[url=http://andrewyang.cn/post.php?id=1084]（七）：皮肤的实现[/url]
[url=http://andrewyang.cn/post.php?id=1085]（八）：其他杂事[/url]

重要概念
====
如果您是按顺序看我的博客，想必已经理解了大部分概念。
### Context & TextStore
[b]Context：[/b]在 TSF 的概念里，APP 里希望被编辑的文字部分，便是 Context，Context 是由 TSF Manager 托管，但 APP 可以手工在 TSF Manager 创建 Context。
[b]TextStore：[/b]可以理解为 Context 里可以被读写的文字部分。
[b]ITextStoreACP：[/b] 读写 TextStore 的接口，只有 APP 能使用。（ACP 是指 Application Character Position，一种适合文字处理的规范）
[b]ITfRange：[/b]是另一种 TextStore 的读写接口，但需要在 EditSession 中使用。
### EditSession
ITextStoreACP 只能被 APP 直接使用，IME 如果需要读写 Context，则必须发起一个 EditSession，并且使用 ITfRange 接口。
TSF Manager 会决定何时调用处理该 EditSession，这是个异步的过程，当然也可以强制同步执行。
（其实很好理解，这是个多线程问题，TSF Manager 必须适当加锁才能安全完成整个过程，EditSession 则可以看成是这个锁的生命周期）
### Composition
Composition 是 TextStore 中正在被编辑（等待候选、纠正）的文字，大部分 IME 和 APP 会使用下划线来表明这段文字。
Composition 和 Context 一样，存在线程问题，因此 Composition 的创建、修改、结束必须在 EditSession 中完成。
（可以在一个 EditSession 中创建，在另一个 EditSession 中结束；一个 Context 只有一个 Composition）
Composition 并不是必须的，实际上你可以模拟自己的 Composition，并且在适当的时候利用 EditSession 插入文字，但是不建议这么做。。。要按照常理出牌。。。

键盘接口
====
ITfKeyEventSink 是 IME 捕获和处理键盘事件的接口。
### OnKey：OnKeyDown、OnKeyUp
KeyDown 一般是最主要的处理事件。一般来说，会将 KeyDown 事件当作 KeyStroke，而无视 OnKeyUp。（注意 KeyUp 事件不和 KeyDown 一一对应）
### OnTestKey：OnTestKeyDown、OnTestKeyUp
告诉操作系统是否准备处理这个 KeyDown、KeyUp 事件。
如果在 OnTestKey 的 Eaten 返回 FALSE，那么就不会触发 OnKey。
如果在 OnTestKey 的 Eaten 返回 TRUE，那么就算 OnKey 的 Eaten 返回 FALSE，APP 也不会接收到这个信息。
（貌似这个接口貌似比较多余，估计是利用 OnTestKey，TSF Manager 可迅速决定是否将该 Key 发送给 APP，而无需等待 IME 处理）
### OnSetFocus
获取或者失去键盘 Focus，该接口只能说明当前输入法拥有键盘 Focus，一般没啥用。
### OnPreservedKey
保留键，还没研究，可能是类似快捷键，或者捕获一些特殊键。反正是需要先注册相关的键，这里才能接收到消息。

KeyStroke & Composition
====
在输入法激活时，输入状态比较简单，可以认为只有两个状态，就是是否在 composition，并不需要复杂的状态机维护。

### KeyStroke 处理
KeyStroke 的按键参数为 WPARAM 和 LPARAM，其内容跟 WM_KEYXXX 事件一样，也就是可以通过 WPARAM 获得 Virtual-Key Code，同时可以使用 LPARAM 获得其他信息，比如 Scan Code。
如果不在 composition 中，那么以下状态会触发 composition。
 ● 字符键
 ● SHIFT + 字符键
如果已在 composition 中，则需要视情况而定。
 ● 字符键：参与 composition。
 ● SHIFT + 字符键：参与 composition。
 ● Candidate 操作键：如 `up down 9 0 - = [ ]` （取决于配置），为 candidate 操作，可能会结束 composition。
 ● 其他数字键：参与 composition 或丢弃。
 ● `'`：参与 composition。
 ● 其他符号键：结束 composition 并插入对于符合。
 ● 左右键、B-SPACE、DEL：调整 composition，如恢复空字符串，则结束 composition。
 ● SPACE、ENTER：结束 composition。
这只是大概一个列表，貌似没有什么漂亮规律的方法整理这些东西，这些东西还是可配置的。
此外要注意的是，在 Composition 阶段必须吞键，否则会触发 `OnCompositionTerminated`。

### Composition 操作
Composition 可以整理为以下操作：
 ● 补充 composition 字符串（在当前游标）。
 ● 删除 composition 中的字符（游标前删，游标后删）。
 ● 提交 composition （丢弃 composition、使用当前 composition）。
 ● 移动 composition 游标。
 ● 选择 candidate。
 ● 滚动 candidate（前后翻页）。
 ● 回退 candidate（将已经 candidate 的字符串回滚到 composition 字符串）。

### Composition 状态数据
Composition 激活时，字符串可以分为三部分。
 ● 已经决策了的字符串
 ● 当前正在等待决策的字符串
 ● 还未参与决策的字符串
比如 `mao'de'shu'ru'fa`，对 `mao` 进行决策后（仍在 composition 中），状态可能为：
	猫|de|shu'ru'fa
	1.的 2.得 3.德 4.地 5.の
其中，已经决策了的字符串必须同时记录原字符串和决策结果（因为要考虑回滚问题）

EditSession
====
通俗的讲，TSF Manager 利用 EditSession 协调应用程序、输入法、其他文字服务对输入文档的控制权。
他们在不同的进线程上，那必然存在写冲突，TSF Manager 要保证输入法线程和应用程序线程互不干扰，但又不可能允许输入法直接向应用程序加锁，输入法和其他文字服务则必须利用 EditSession，当 TSF Manager 来适时加锁处理。
让我们来看看 MSDN 对 EditSession 的介绍
http://msdn.microsoft.com/en-us/library/windows/desktop/ms538072.aspx
嗯。。。感觉跟没说一样，完全不知道要点是啥。

### 编辑修改
TSF 定位貌似更接近于一个文字辅助服务，输入只是它的一种功能。事实上 TSF 输入法可以完全阅读当前 Context 内的文字，并作任意修改。换句话说，你在这行输入，输入法悄悄把上一行删了，都是可以的。
ITfRange 是输入法主要修改 Context 的方式，此外，可选的方法是使用 ITfInsertAtSelection，但两者都需要一个东西：TfEditCookie，也就是说必须在 EditSession 生命周期里使用。我非常蛋疼的使用了假 Cookie 试了一下，发现会告诉你文档没有被锁住。

### ITfEditSession 的使用
EditSession 是输入法需要提供给 TSFManager 的接口，通常是自己继承 ITfEditSession，实现了 DoEditSession 方法。然后调用 RequestEditSession，TSF Manager 会为你锁住文档，并且调用 EditSession 的 DoEditSession 方法。
通常一种 EditSession 不太够，比如单纯按下一个数字键，比如创建和结束一个 Composition，都是需要完全不同的 DoEditSession。可以实现多种 EditSession 在不用情况下调用，就像官方的样例。。。
每次 EditSession 都会产生一个 TfEditCookie，利用该 TfEditCookie，可以在 EditSession 生命周期里做 Context 修改。

### ITfRange & ITfInsertAtSelection
现在已经在 DoEditSession 生命周期里了，改如何找到 ITfRange & ITfInsertAtSelection 两个接口实现输入呢？
大部分的输入是发生在 Composition 之后，可以利用 ITfComposition::GetRange() 得到 ITfRange。
InsertTextAtSelection 实际上很少被使用，如果的确需要，可以考虑触发一个 EditSession，然后利用 ITfContext 查询出 InsertTextAtSelection 调用。（没必要再触发 Composition，不然干脆用 ITfRange 得了）

CandidateList
====
和 Composition 一样，CandidateList 也是一个可选的实现。实际上你完全可以通过修改 Composition 以及吞下上下左右数字键什么的实现自己的 Candidate 效果，但是并不建议这么做。。。要按照常理出牌。。。

### ITfCandidateList
ITfCandidateList 看上去是个为 composition candidate 设计的接口，实际上它最初是 ITfFnReconversion 的辅助接口，跟这里的 candidate 并没有直接关系。但 ITfCandidateList 设计得非常通用，后来也为 ITfFnSearchCandidateProvider 和 ITfFnGetLinguisticAlternates 提供接口。
（注意他们提供的功能都跟 ImmGetConversionList 相似，但都属于 TSF Function，TSF APP 很可能无视 TSF Function）

### ITfCandidateListUIElement vs ITfCandidateList
ITfCandidateListUIElement 接口跟 ITfCandidateList 接口非常接近，但 ITfCandidateListUIElement 是特定为 UILess 设计的接口，是分页的，不需要提供完整的 CandidateList。
既然已经设计成这样了，从兼容性考虑，ITfCandidateListUIElement 内部也利用 ITfCandidateList 实现是一个不错的方案。也可以实现一个自己的 List，可快速转化为 ITfCandidateList 和 ITfCandidateListUIElement，同时方便自己的界面显示。


没有界面也是界面。。。

目录
----
[url=http://andrewyang.cn/post.php?id=1078]（一）：基本情况[/url]
[url=http://andrewyang.cn/post.php?id=1079]（二）：基础概念和常用接口[/url]
[url=http://andrewyang.cn/post.php?id=1080]（三）：整体构架[/url]
[url=http://andrewyang.cn/post.php?id=1081]（四）：编辑和候选[/url]
[url=http://andrewyang.cn/post.php?id=1082]（五）：界面管理和无界面模式[/url]
[url=http://andrewyang.cn/post.php?id=1083]（六）：词库和候选算法[/url]
[url=http://andrewyang.cn/post.php?id=1084]（七）：皮肤的实现[/url]
[url=http://andrewyang.cn/post.php?id=1085]（八）：其他杂事[/url]

激活和焦点
----
输入法是提供输入功能的。
被输入的应用需要被激活，也需要拥有焦点。
但是输入法自己的窗口，是不可以被激活的，否则就矛盾了。此外，点击输入法的工具栏，也不应该让当前窗口失去焦点，说白了，输入法的窗口就应该老老实实在那呆着，不参与任何焦点和激活的事情。
通常情况下，激活的窗口只有一个，焦点在窗口的某个控件中。但是在 WINDOWS 操作系统中有 WINDOW 这个概念，实际上，从底层来讲，激活的 WINDOW 可以有多个，焦点只有一个。通常来说这些同时激活的 WINDOW 都是父子关系，但可以通过编程手段，实现激活任意窗口。
（多少人记得早期的 PHOTOSHOP 的样子，多个窗口分布开，同时只有一个激活，其他都会灰色的。视觉上会有个问题，好像非激活的程序是别人的一样，后来就改进了，变成都激活。）

Window Style 和 Extended Window Style
----
上学那会，对比研究 WIN32 UI 和 GTK，发现简直一天一地，主要就是变化多样的 Window Style。
Window Style 大多是 9x 时代就存在的，Extended Window Style 大多是在 NT、2000 之后添加的，比如影响力非常大的 WS_EX_LAYERED （分层窗口）。
在激活和焦点管理上，有几个 Style 值得注意。

### WS_EX_NOACTIVATE
官方的解释是：点击这类窗口，不会导致原来的窗口失去激活和焦点，实际上并非如此。
如果原来的焦点是其他程序的窗口，效果的确如此。但是如果是同一个线程的多个窗口，是不管用的。。。不管用的。。。！！！

### WS_EX_TOOLWINDOW
这是一个经常被误用的 STYLE，甚至在一些官方样例中也存在误用。WS_EX_TOOLWINDOW 本身有些功能如隐藏任务栏，不能利用切换窗口功能切换，运行起来就像一个子窗口，但是对焦点激活管理用处不大。它和 WS_EX_NOACTIVATE 存在一定功能重复。

### WS_DISABLE
这是在相当长的一段时间内非常流行的做法，其实目前主流的输入法都是这么做的，就是完完全全禁止窗口激活。禁止之后并不能正常接收鼠标键盘事件，因此要自行捕获维护，甚至临时解禁。

### WS_BORDER
窗口可以分为两部分，外框区域和客户区域。在Windows管理上，外框区域是受到操作系统直接管理的，客户区域则随意控制。WS_BORDER 一般是独立窗口必备的，如果需要手动移除，可以使用 SetWindowLong 实现，比如。。。
	LONG style = GetWindowLong(hWnd, GWL_STYLE);
	style = style & ~(WS_BORDER);
	SetWindowLong(hWnd, GWL_STYLE, style);

### WS_CHILD
子窗口，一般嵌入在其他窗口内部。子窗口默认无法直接获得焦点，需要编程实现。常见的WINDOWS控件，比如按钮，输入框，都是自己主动捕获焦点。
网上有人声称利用强制 WS_CHILD 解决了激活和焦点的问题，实测无用。强制设置 WS_CHILD 会产生一种BUG状态，使得同线程其他程序不能激活该窗口，但 WS_EX_NOACTIVATE 一定程度失效，该窗口会导致其他线程程序失去焦点。

方案一：WS_DISABLE + 捕获鼠标
----
WS_DISABLE 的窗口不会影响焦点和激活，它就是一个完完全全透明的存在。
但是输入法窗口通常需要应对鼠标事件和键盘事件。
候选和编码窗口，键盘事件可以被输入法接口捕获，不需要通过窗口处理，状态栏窗口不需要键盘处理，所以整体来说，只要处理鼠标事件就可以了。难度可以说一般，有很多现成的代码可以模仿。主要的问题在于，由于事件不完整，系统控件大多无法使用，只能使用自绘控件的方法实现。
禁用状态的窗口，并不能直接得到输入事件，但是点击它，能够成功触发 WM_ACTIVATEAPP 和 WM_SETCURSOR。可以根据他配合鼠标Capture功能实现所需的大部分功能。

方案二：WS_EX_NOACTIVATE + 独立线程
----
这是一个奇特而有效的方法，但很少被人使用，估计也很少被人知道。关键在于操作系统维护活动的机制。
对于操作系统来说，活动的窗口和活动的线程是对应的。WS_EX_NOACTIVATE实际是阻止其他线程通过点击窗口获得活动，但是线程内部的活动，是无法控制的。
因为无论顶级窗口、子窗口，都是可能活动的，而操作系统无法判断什么样的窗口，就算这个线程的顶级窗口了（因为实际上子窗口和顶级窗口只有样式上的区别，并不是本质上互斥）。因此操作系统不会也无法阻止线程内部的焦点变化。
WS_EX_NOACTIVATE 能够阻止其他从线程激活窗口，我只要保证输入法的这几个程序在一个独立线程内，就可以保证他们不会抢占任何程序焦点。
对于 TSF 来说，这是一个挑战，但线程数量应该足够小。私以为让所有想输入法 UI 共用一个线程比较合适，Windows 并没有稳定的外置 KILL 线程的手段，因此对线程的使用要足够小心。

小结
----
方案一由于跟SKIN的实现有一点重合，是目前主流使用的方法。但如果不使用现有库，则需要大量代码维护鼠标事件。
方案二我还没有发现有什么开源项目在使用，输入法更是清一色的没有使用这个实现。这个方案从事件的处理上比较靠谱，因为是从操作系统的层面维护了焦点问题，又不会失去其他相关事件功能，但是跨线程的管理需要输入法在界面窗口和TSF接口之间做到完全的松耦合，有较大难度。

其他
----
对于输入法窗口而言，焦点处理是最重要了。
其次是界面行为控制，输入法窗口一般可以被拖动，并且不可以拖出客户区域（一般是桌面除了任务栏以外的地方）。
界面应该注意子WINDOW的事件处理，对于鼠标事件，最好使用统一的处理函数，或者转发一份给父窗口处理。



无界面模式的场景应用场景包括：全屏程序，游戏，命令行程序。
官方在这方面的介绍还是比较具体的：
http://msdn.microsoft.com/en-us/library/aa966970.aspx

无界面模式实现的关键点
----
### GUID_TFCAT_TIPCAP_UIELEMENTENABLED
必须注册 GUID_TFCAT_TIPCAP_UIELEMENTENABLED 分类。
### ITfTextInputProcessorEx
必须含有 ITfTextInputProcessorEx 接口。
注意 ActivateEx 会替代 ITfTextInputProcessor::Activate。通常的写法就是由 ActivateEx 调用 Activate，这样既有功能又兼容。
### ITfUIElement
ITfUIElement 是提供给应用程序的界面信息接口。
换句话说，你不需要绘制界面，你只需要提供 ITfUIElement（并且保持他们信息更新），应用程序会自己利用你的 ITfUIElement 绘制界面。
ITfCandidateListUIElement 和 ITfReadingInformationUIElement 是必须要实现的。（因为应用程序会默认他们存在，随时会调用。)
### ITFUIElementMgr
ITFUIElementMgr 是向应用程序通讯的接口，比如 BeginUIElement、EndUIElement、UpdateUIElement。
应用程序理论上会利用 ITfUIElementSink 相应事件。。。
### 内存管理
小心内存处理，不要轻易释放元素和创建新元素。谁知道那些天杀的 IME Aware 程序是怎么写的。


跟我一起念：`NG 嗯`，注意是 `ng` 不是 `en`，自己去查新华字典。

目录
----
[url=http://andrewyang.cn/post.php?id=1078]（一）：基本情况[/url]
[url=http://andrewyang.cn/post.php?id=1079]（二）：基础概念和常用接口[/url]
[url=http://andrewyang.cn/post.php?id=1080]（三）：整体构架[/url]
[url=http://andrewyang.cn/post.php?id=1081]（四）：编辑和候选[/url]
[url=http://andrewyang.cn/post.php?id=1082]（五）：界面管理和无界面模式[/url]
[url=http://andrewyang.cn/post.php?id=1083]（六）：词库和候选算法[/url]
[url=http://andrewyang.cn/post.php?id=1084]（七）：皮肤的实现[/url]
[url=http://andrewyang.cn/post.php?id=1085]（八）：其他杂事[/url]


待整理说明
====
本篇我是边试边写，以代码为准，重构之后我会回来整理此篇。

整体候选方案
----
以先分割，再查询，为基本方案。
该方案配合容错上有一定缺陷，就是不能通过常用程度给予优先。
比如 dianan 分割成 di an an 还是 dia nan，在分割的时候无法判断优先先后。

词元
----
### 缩写习惯
现在的输入法最大的优势就是缩写，也就是非全拼输入。在非全拼输入的情况下，用户有几个典型的缩写习惯。
1、不缩写（废话）
2、只写首字母。
3、只写声母。
4、统一倾向，比如全首字母、全全拼。
5、犯懒倾向，前面是全拼，后面就懒了，比如常见场景如 “zhonghuarmghg” 。。。。
也就是说，词元可以认为只有这三种组合。
特殊的情况有两种
1、输入的尾部，可能还没输入完，因此有半截韵母。
2，模糊音。
### 词元冲突
上述缩写习惯在大部分情况下能够良好的运转，但是常见会遇到以下冲突
1. 声母首字母冲突，只有以下情况 z zh，c ch，s sh，恰好和常见模糊音一致。
2. 韵母全拼冲突，如 xian 和 xi an。
3. 声母与全拼冲突，如 shuo 和 s huo，甚至 s hu o。
大部分输入法能够很好的处理前两种情况，但由于代码实现的问题，第三种情况被无视了。
我猜测大部分输入法的实现方法是：先做贪心匹配，再将部分全拼特殊处理，比如 xian，hua。
此外，第三种情况如果处理，还会大大增加候选可能，也许性能上也是问题，但我认为在长词的情况下，可以考虑触发。

拼音表分析
----
拼音表并非是一个单纯的匹配表，拼音表有些特性，就算在缩写情况下也是必须满足的。可以利用这些特性，有效地进行识别分割。
### 字母
	前缀 bcdfjklmpqstwxyz
	非前缀 iuv
	其他 aeoghnr 其中，g、r（er）只出现首尾。
前缀能够有效地分割输入，非前缀也能够辅助吞词，其他则需要自由发挥了。
### 声母
除了 zh ch sh，其他声母均为单个字母。
### 前缀
分割输入不用说，相当的有效。
如 shurufa，分出 shuru fa。
### 前后缀
g、r 来说，要么作为前缀，要么作为后缀。作为后缀 则必须存在 ng、er 组合，那么不符合条件的 g 和 r，必然是前缀。
h 而言，如果前面不是前缀，必然在 z，c，s 之后。
如 shuru fa，分出 shu ru fa。
### 非前缀
基于上述词元理论的假设，可以使用，加上这些非前缀必出现在韵母里，那么有时候可以往前吞到声母（或者韵母开头）。
一般可以有效识别出 gnr 的开始。 aeo 和 h 则无法识别。aeo 如 ai、ei、ou。h 还是双字声母的问题。
如 fangui，分出 fan gui。

分割方案 第一步：确定分割（成段）
----
先使用前缀、非前缀、前后缀的特性，做确定分割，此时分割必定是唯一解。
在使用非前缀逆推的时候，可能会发现无匹配，说明无解。
理论上丢弃该非前缀是可行的，但是不推荐，比较简单的实现是根据上下文，以及键盘位置，做个常用容错逻辑。

分割方案 第二步：猜测行为分割
----
对每个段分别进行全拼匹配、声母匹配、首字母匹配，并且优先组合以下结果。
全拼组合（包括前部全拼组合）
纯首字母组合
纯声母组合
如果上述组合都失败，则尝试全拼优先组合，按照全拼、全声母、其他的顺序匹配。
如果输入较长，此时可能有太多结果集，个人认为根据情况选几个结果集即可。
比如逗比会输入 hahahhhhahh。比如大部分输入法都能友好识别 zhrmghg，但是 zhrengmghg 。。。
### 全拼匹配
将全拼带入段，进行通配匹配。不要贪心，要遍历，比如 hangao，可能 hang ao 也可能 han gao。xian 也可分割为 xi an。
### 纯声母匹配、首字母匹配
两者的区别就是 zh ch sh，在一次缩写输入中，理论上不会出现混合，所以尝试一种即可。
### 韵母补全匹配
我们假设的前提是，即便在缩写中，如果出现韵母，那么也必定是完整的韵母。那么可以尝试补全韵母，补全之后的，必然是新的拼音的起始。
如 wenan，分割为 wen an。当然也有可能是 w e n，但因可能性太低被无视。
### 特殊处理
其中 ng 只有“嗯”一个字，而 ng 组合大量出现在各种韵母中，因此一般对 ng 特殊处理。
类似的经常特殊处理的还有 m，eng
### 总结
1 在全拼分割失败有剩余的情况下，通常是输入混乱和出错的情况，这时候输入通常就是一坨翔，何必纠结。。
2 缩写恰巧和全拼一致，比如 sha 说话啊。

分割方案 第二步 候选简易方案
----
刚才这个方案比较复杂，我很担心性能问题，普通输入法采取一种简易的方案。
由于用户可以自主选择使用'等字符强制分割，因此在不强制的情况下，优先选择全拼方案。
比如可能的方案如：
1. 每段进行全拼优先匹配，给出数个全拼方案。
2. 组合方案，如果该段存在完全匹配，则只采用完全匹配（全拼数越少优先级越高），否则选取一个贪心匹配（全拼覆盖越长，优先级越高）。
这样每段组合一半只有1、2个，顶多三四个。
这个简易方案在全拼情况下，跟上一个方案几乎一致，但非全拼情况下，则比较2。但鉴于很多时候，词库远比分割重要，倒也是不错的选择。

候选方案
----
### 少量分割候选可能
候选带入词库，再将候选结果按照权重排序即可。
### 大量分割候选
通常输入比较长，输入模式混乱，并且可能有错。因此只要给出 1-2 个预测结果即可。
根据分割候选自身的分级级以此寻找是否有解，一旦有解便结束，剩下作为单字逐个候选处理。




经过一段时间折腾，终于开始折腾词库和候选了。

词库格式和潜在需求
----
### 臆想
一开始我脑子里的词库是这样的，首先字库和词库分开，然后词频排序。
	不 bu
	是 shi
	长 chang,zhang # 多音字
	...

	可能 ke neng
	阈值 yu,fa zhi # 额。。。
	....
这样既适应了多音字，也适应拼写错误什么的，词频排序也很暴力简单。
### 寻找
那好吧，找找有没有比较大的开源的词库，带拼音的。。。最好带多音字的。。。
字库倒是有，还是按照常用程序排序，但是词库。。。没有。。。。
就算找到词库，要么太小，要么是别人分词研究的伴随品，质量很差，拼音也多是利用程序添加的，识别了部分多音字，很多还是不识别。
跟别说词频了。。。
### 额，借用
但我总得有个像样的词库，我才能知道自己的候选算法行不行撒。
看看别的输入法的词库吧，发现就算是开源输入法，词库部分也多是闭源的，能找到的几个开源词库貌似质量也很，跟经济适用房一样。。。
各种输入法官网下载的词库也都弱的很，完全不能代替核心词库。虽然最后逆向了比如搜狗输入法、百度输入法的内置词库，但是还是不符合我的词库要求。
### 思考
既然这样，我只能重新设计我的词库了，看看现在有啥？
字库。开源的很多，有 GB2313 级别的，也有 GBK 级别的，带多音字。也有字频排序，两者可以用程序合并。
带词频的常用词。都是常用词，词典里会有的那种。比如“知道”，不包含衍生词，比如“不知道”。
质量较差的大词库。大多没拼音，个别有拼音也不准。词的质量很差，比如“今晚吃”、“的不同”。。。。

重新设计词库格式
----
在此基础上，我重新设计了词库。
### 词库结构
字库：所有的字
常用字词库：常用的字词
额外字词库：奇葩的组合，用于辅助 “常用字词库”。
### 大字库
带拼音，带多音，字和多音均按照频率排序。
	不 bu
	是 shi
	长 chang,zhang # 多音字
大字库的作用，就是实现一个汉子《=》拼音的完全双向对照表。
在输入单字全拼的情况下，能够检索出所有的汉字。
在大词库不含拼音信息的情况下，能够预测出大部分读音，辅助检索。
### 常用字词库
常用词，包括单字词，这些字词库是有词性的，总数目测在一万以内。
	不 neg bu
	长 adj chang
	长 adv zhang
	可能 agv ke neng
	阈值 non yu zhi
常用字词库则是输入的核心，输入法中也应存在 80-20 定律，也就是 80% 的输入是有极少数常用词组成。
另一方面，常用字词库是有词性的，常用词应能够利用内置的定律实现新词，如 “不知道”、“吃苹果” 等词，应该能够自动识别，无需单独的词库。
（因为这种组合太多了，光 “吃xx”、“不xx”、“去xx” 就得有多少可能啊。。。。。，如果依赖纯粹的概率词库，要么词库无比大，要么效果呵呵）
常用字词库在算法、存储方面要十分严格，不能为了个别特例情况而拖累整体。
### 大词库
一般来说是是常用字词库超集，不带拼音，不带词性，可能有词频。比如各种 “吃xx”、各种人名地名，是可以出现在这里的。
还有一些流行语比如“臣妾就是夏雨荷”什么的。。。大词库由于没有拼音，必须和字的检索整合到一起，数据量比较大，触发条件也应该比较严谨。
一半输入法大概 20-30MB，解压后，词库一般也有20M+。算法只要处理得当，就算100M+，也不应该对性能有本质影响。

词库在内存里的样子
----
### 编码
汉字：对于 Windows 操作系统来说，UCS-2 LE（大致等效于 UTF-16 LE），是最佳的选择。UCS2 不包含的中文字，也是稀有到绝对用不到。宽字节定长，也拥有CPU处理优势。
拼音：用字母表存肯定不合适，拼音表、声母表+韵母表，都是可选的方案。两者都需要 2 字节，所以区别不大。
词性、词频：一字节足以。
### 汉字 -> 拼音 索引
一开始担心汉字范围太大，数组太长。实际上并不大，将 汉子+拼音 作为数组存储，再怎么整都不到200k的内存空间，足矣。
多音字3000多个，双音大概300个，高于3的只有20来个，最多的6个。
绝大多数汉子、包括繁体字坐落在 4E00 - 9FAF 的范围内，这样就可以以 4E00 作为 OFFSET。
剩下的汉子除了“〇”，其他基本用不到比如 “”，但有人就是喜欢用生僻字起名字啊，兼容性考虑，把它放在 51B0 之后。这样 51B0 就是个分界线，之前的直接索引，之后的查表。当然如果不在乎 3 倍空间，直接做全索引也完全没问题，这样核心逻辑比较直白。
### 拼音 -> 汉字 索引
拼音表并不长，500 不到。做500个不定长内存块（或者 std::vector），我觉得是可以接受的。
### 拼音 -> 常用词库 索引
道理一样，但是注意，常用词库里也有单字词，跟汉字重复。
### 拼音 -> 大词库 索引
大词库 是不带拼音的，所以我觉得，“拼音->大词库”用“拼音->汉字”+“汉字->大词库”实现就可以了。具体呢，既可以给汉字表添加一个大词库索引，也可以一次性将大词库映射到拼音表上。其实我试过，就算直接对大词库遍历，通过每个字比较读音，也不慢，可以认为是常数时间。
此外，大词库也可以一次性映射成字母（或者拼音）的树状表，或者查位表，主要目的是减少最终需要检测的结果集范围。
比如每个 shu 这个音，就含有 几个表：它出现在词第一个位置上的列表，出现在第二个位置上的列表。。。等等，这样处理 shu ru 的时候，就把 shu 的列表1 和 ru 的列表2 合并，这个列表就小很多了。使用打表法在常数时间内就能取到一个结果集，这肯定小多了。我就是怕树生成的时间过长，或者过占用内存。

附录
----
### 汉子全拼表
	a ai an ang ao
	ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu
	ca cai can cang cao ce cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo
	da dai dan dang dao de den dei deng di dia dian diao die ding diu dong dou du duan dui dun duo
	e ei en eng er
	fa fan fang fei fen feng fo fou fu
	ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo
	ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo
	ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun
	ka kai kan kang kao ke ken keng kong kou ku kua kuai kuan kuang kui kun kuo
	la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu lv luan lue lve lun luo
	m ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu
	na nai nan nang nao ne nei nen neng ng ni nian niang niao nie nin ning niu nong nou nu nv nuan nve nuo nun
	o ou
	pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu
	qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun
	ran rang rao re ren reng ri rong rou ru ruan rui run ruo
	sa sai san sang sao se sen seng sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo
	ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo
	wa wai wan wang wei wen weng wo wu
	xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun
	ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun
	za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo
增补
	kei lo fiao
其他
	lue lve 有区别，但 nve 也常等价于 nue。
	ng 只有一个字“嗯”，且一般做 en 处理。
	个别字有双读音，在此不考虑。
### 非前缀逆推表
	I : bi chi ci di ji li mi ni pi qi shi si ti xi yi zhi
	ui: dui chui cui dui gui hui kui shui sui tui zhui zui
	?i: ai ei
	U : bu cu du fu gu ju ku lu nu qu ru su tu wu yu zu
	iu: jiu liu niu qiu xiu 
	?u: ou hu
	V : lv nv
### 韵母补全表
	be -> i, n
	bia -> n, o
	chon -> g
	co -> ng, u
	cua -> n
	din -> g
	do -> ng, u
	dua -> n
	fe -> i, n, ng
	go -> ng, u
	ho -> ng, u
	jio -> ng
	jua -> n
	ko -> ng, u
	len -> g
	lo -> ng, u
	lua -> n
	mia -> n, o
	nia -> n, ng, o
	no -> ng, u
	nua -> n
	pe -> i, n, ng
	pia -> n, o
	qio -> ng
	qua -> n
	ra -> n, ng, o
	ro -> ng, u
	rua -> n
	sho -> u
	so -> ng, u
	sua -> n
	ten -> g
	tia -> n, o
	tin -> g
	to -> ng
	tua -> n
	we -> i, n, ng
	xio -> ng
	xua -> n
	yon -> g
	yua -> n
	zho -> ng, u
	zo -> ng, u
	zua -> n
### 单声母 双声母 唯一表
	zhua zhuai zhuang
	chua chuai chuang
	shei shua shuai shuang song
### 常见模糊音
	z zh
	c ch
	s sh
	// an ang 明明差好远好不。
	en eng ong on // 似乎好多人会读 风 feng 为 fong，也似乎好多人不知道 on 并不存在。
	in ing
	l n // 蓝方人。
	f h // 福男人，但基本可不考虑，因为他们一般知道怎么拼，只是读起来困难。
### 缩写对照表
	a,ai,an,ang,ao,ba,bai,ban,bang,bao,bei,ben,beng,bi,bian,biao,bie,bin,bing,bo,bu,
	ca,cai,can,cang,cao,ce,cen,ceng,cha,chai,chan,chang,chao,che,chen,cheng,chi,chong,
	chou,chu,chua,chuai,chuan,chuang,chui,chun,chuo,ci,cong,cou,cu,cuan,cui,cun,cuo,
	da,dai,dan,dang,dao,de,den,dei,deng,di,dia,dian,diao,die,ding,diu,dong,dou,du,duan,dui,dun,duo,
	e,ei,en,eng,er,fa,fan,fang,fei,fen,feng,fiao,fo,fou,fu,
	ga,gai,gan,gang,gao,ge,gei,gen,geng,gong,gou,gu,gua,guai,guan,guang,gui,gun,guo,
	ha,hai,han,hang,hao,he,hei,hen,heng,hong,hou,hu,hua,huai,huan,huang,hui,hun,huo,
	ji,jia,jian,jiang,jiao,jie,jin,jing,jiong,jiu,ju,juan,jue,jun,
	ka,kai,kan,kang,kao,ke,kei,ken,keng,kong,kou,ku,kua,kuai,kuan,kuang,kui,kun,kuo,
	la,lai,lan,lang,lao,le,lei,leng,li,lia,lian,liang,liao,lie,lin,ling,liu,lo,long,lou,lu,lv,luan,lue,lve,lun,luo,
	ma,mai,man,mang,mao,me,mei,men,meng,mi,mian,miao,mie,min,ming,miu,mo,mou,mu,
	na,nai,nan,nang,nao,ne,nei,nen,neng,ni,nian,niang,niao,nie,nin,ning,niu,nong,nou,nu,nv,nuan,nve,nuo,nun,
	o,ou,pa,pai,pan,pang,pao,pei,pen,peng,pi,pian,piao,pie,pin,ping,po,pou,pu,
	qi,qia,qian,qiang,qiao,qie,qin,qing,qiong,qiu,qu,quan,que,qun,
	ran,rang,rao,re,ren,reng,ri,rong,rou,ru,ruan,rui,run,ruo,
	sa,sai,san,sang,sao,se,sen,seng,sha,shai,shan,shang,shao,she,shei,shen,sheng,shi,shou,
	shu,shua,shuai,shuan,shuang,shui,shun,shuo,si,song,sou,su,suan,sui,sun,suo,
	ta,tai,tan,tang,tao,te,teng,ti,tian,tiao,tie,ting,tong,tou,tu,tuan,tui,tun,tuo,
	wa,wai,wan,wang,wei,wen,weng,wo,wu,xi,xia,xian,xiang,xiao,xie,xin,xing,xiong,xiu,xu,xuan,xue,xun,
	ya,yan,yang,yao,ye,yi,yin,ying,yo,yong,you,yu,yuan,yue,yun,
	za,zai,zan,zang,zao,ze,zei,zen,zeng,zha,zhai,zhan,zhang,zhao,zhe,zhei,zhen,zheng,zhi,zhong,zhou,zhu,
	zhua,zhuai,zhuan,zhuang,zhui,zhun,zhuo,zi,zong,zou,zu,zuan,zui,zun,zuo,
	b,c,d,f,g,h,j,k,l,m,n,p,q,r,s,t,w,x,y,z,ch,sh,zh,ng
	
	a  0   1-4
	b  412 5-20
	c  413 21-55
	ch 432 29-47
	d  414 56-78
	e  79  80-83
	f  415 84-93
	g  416 94-112
	h  417 113-131
	i      
	j  418 132-145
	k  419 146-164
	l  420 165-191
	m  421 192-210
	n  422 211-235
	o  236 237
	p  423 238-254
	q  424 255-268
	r  425 269-282
	s  426 283-317
	sh 433 291-309
	t  427 318-336
	u      
	v      
	w  428 337-346
	x  429 347-359   
	y  430 360-374
	z  431 375-411
	zh 434 384-403
	
8篇篇幅还是大了点，等输入法稍微成型后，重新整理8篇的内容，尽量精简和归类。

目录
----
[url=http://andrewyang.cn/post.php?id=1078]（一）：基本情况[/url]
[url=http://andrewyang.cn/post.php?id=1079]（二）：基础概念和常用接口[/url]
[url=http://andrewyang.cn/post.php?id=1080]（三）：整体构架[/url]
[url=http://andrewyang.cn/post.php?id=1081]（四）：编辑和候选[/url]
[url=http://andrewyang.cn/post.php?id=1082]（五）：界面管理和无界面模式[/url]
[url=http://andrewyang.cn/post.php?id=1083]（六）：词库和候选算法[/url]
[url=http://andrewyang.cn/post.php?id=1084]（七）：皮肤的实现[/url]
[url=http://andrewyang.cn/post.php?id=1085]（八）：其他杂事[/url]

MEOW 工程
----
源码里已经包含了 4 个目录。
### meow
主项目，编译成 meow.dll
### runtime
meow.dll 所需的运行环境，如果安装执行，需要和 meow.dll 一起打包。
### meow-cli
一个命令行程序，主要用于测试拼音候选算法，也包含了拼音和词库资源的预编译。
### meow-gui
一个窗口程序，用于测试皮肤和界面。
### meow-uiless
一个窗口程序，用于触发和测试无界面模式。

绘图、双缓冲、配色、皮肤
----
### GDI+
绘图方面，选择了PNG配合GDI+。
GDI+ 能够让我方便地控制字体渲染效果，因为有些字体是专为 ClearType 优化的，比如微软雅黑。而有些字体，在 AntiAlias 渲染下效果更好，比如加粗后的 Arial。ClearType 利用LED显示器的特性，将字体边缘粒度精确到 1/3 像素，让笔画较多的中文字体也能有接近英文字体的清晰度。而相对较粗的英文字体来说，ClearType 会让一些边缘细节比较突兀，反而怪怪的。
GDI+ 是利用 DC 绘图，并不自带双缓冲，在绘图过程中，如果其他事件触发了重绘，可能会导致控件出现画面闪烁。移除 WM_ERASEBKGND 并且使用内存 DC 可以对保证画面稳定变化不闪烁。DC 本身就是一种画面缓冲，这里又人工添加一个内存 DC，所以是双缓冲。
### 层状样式窗口
层状样式窗口虽然在设计上有点烂尾，但是却是目前最主要的异形窗体解决方案。如果一个窗体不是方的，或者客户区域需要半透明，则基本都会使用层状样式窗口。
### 配色
说到这个，不得不说配色表。其实利用 RGB 配色环，自己可以随意配出双色、三色搭配。比如谷歌大量使用的红青（不是红蓝）配色，就是在色环的两端。
但必须是红绿蓝配色环，不是什么红黄蓝配色环。
很多程序员知道 RGB，也就是光的三原色，但大众眼里，还有红黄蓝这个东西，有时会说它是物的三原色。
其实物的三原色并非是红黄蓝，二是青（蓝绿）品（紫红）黄。

![alt text]({{ site.url }}/assets/images/meow-ime-3.jpg)

所以其实用朱红色颜料和明黄色颜料，是配不出经典的橙色的，会偏黑褐，必须使用偏品色的深红才行，而且红黄蓝色环的暖色调明显高多于冷色调，也是这样的原因。
但红黄蓝并非全无道理，从光普图上可见，红黄蓝属于人可见光三个极端，尤其是黄色处在正中，人眼对黄色光非常敏感，在感知上接近白色，估计也是这个原因。

![alt text]({{ site.url }}/assets/images/meow-ime-4.jpg)

所以有很多研究，对 RGB 配色环进行微调，显示器也会做适当调整，其实上面那张 RGB 表就是微调之后的，纯净的RGB环看着会有点怪异。。。
### 皮肤
皮肤方案，我还没想好，目前打算是实现多种模板，利用换图的方式实现皮肤。

无界面模式测试
----
输入法的测试需要应用和输入法配合，大部分应用的输入通过 Windows Control 或者 WM_CHAR 实现，但默认都不是无界面模式。
测试无界面模式必须使用一个 IME Aware 程序，主动从输入法中提取输入信息显示，但这样程序并不容易找，官方样例不足，文档也有大量错误（应该是初期的文档，没有及时更新），没有办法，我只有自己写一个 TSF UILess 程序，也就是源码包里的 meow-uiless。
事实上，我是在系统里安装了系统的 日文输入法，和其他 TSF 输入法，来测试我的 UILess 程序。
基本原理就是创建一个空窗口程序，然后通过注册 ITfUIElementSink，然后捕获 UIElement 的 Begin、End、Update。当然有些细节，比如必须使用 TF_TMAE_UIELEMENTENABLEDONLY 参数来激活 ThreadMgrEx，而非文档里所说的 ITF_AE_UIELEMENTENABLEDONLY，这个值在 Windows SDK 里不存在。
对于窗口程序来说，如果程序没有主动 Focus 一个 Document，操作系统会触发一个系统输入框，比较违和，可以创建一个 DocumentMgr，压入一个 Context 之后主动 SetFocus。

LOCALE 和 cmd.exe
----
LOCALE 是 Windows 最重要的语言参数（其他 UI Language、Location、Locale Format 都只应在特定情况下使用），因为它会影响编码。
https://msdn.microsoft.com/en-us/library/windows/desktop/dd318716.aspx
有些程序和控件会根据系统 LOCALE 自动调整 IME 状态，典型的如 cmd.exe，cmd.exe 在 LOCALE 和输入法语言不一致的情况下，会禁止输入法的调用。
此外，cmd.exe 本身只是一个傀儡程序，实际接受输入的是 conhost.exe，在远程 debug 的时候会遇到这个问题。



### 图标
最少最少，得有个输入法图标。
在 WIN8 之前，最少只要提供一个尺寸的图标即可：16*16，也就是语言栏的默认大小。
对于 WIN8，由于场景不一样，官方要求基本是 16 到 48 全套。
### 界面适应
输入法在无界面模式的情况下，应该隐藏对应的窗口，此外，比如当有应用全屏的时候，只要没有输入，就不应该抢 TOPMOST。
TSF 下，除了语言栏有接口，其他都是需要自己实现的。其中 Composition Window、Candidate Window 拥有稳定的触发时机。
Status Windows 则需要通过 Focus 管理自己实现，基本没有资料。
### CLSID
由于是 COM 变量，大量需要 CLSID。
Microsoft Visual Studio ___\Common_\Tools
下有个 guidgen.exe 专门干这事的。

### COM 编程内存管理
COM 编程内存管理是个需要认证对待的问题，引用的错误增加会导致内存泄漏，引用的错误释放会导致对象读取错误。
一般来讲，COM 编程需要遵从以下规律：
 ● 构造函数引用置 1
 ● Release 当引用为 0 时释放自己
 ● 如果 COM 接口对象被查询返回，在返回前为返回的对象添加引用（典型的如 QueryInterface）；调用者使用后主动 Release。
CComPtr 能够很好的协助处理应用问题，但要切记小心使用 &CComPtr，通过 &CComPtr 赋值是不会自动触发 AddRef （但恰好可以跟 QueryInterface 配合），保险起见，在 &CComPtr 之前建议手动赋值 NULL。