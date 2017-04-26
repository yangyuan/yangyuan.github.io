---
layout: post
title: （坑）HOWTO：给 Eclipse 编写简易的语法高亮插件
---

生命不息 折腾不止 我自己对于 Eclipse 本身并没有什么大爱，体积巨大，而且设计过于通用，用起来不够人性化，但是鉴于是一个跨平台的通用 IDE，还是经常用的。
但我本身做开发并不依赖调试功能，所以通常是使用 notepad++ 这样的编辑器。但它毕竟是编辑器，不方便管理整个项目。所以大项目，特别是 git 项目，我还是会导入 Eclipse 管理。

官方的 PDT、CDT 着实用起来有点奇怪。Python 没辙用第三方 PyDev，最近几个版本的 PyDev 有点高调，装上之后加各种菜单，项目里加配置文件。刚才说了，其实我只需要高亮编辑器而已。。。压根不需要它帮我编译调试，所以心想能不能简单做个语法高亮插件，纯语法（或者纯词法）高亮。毕竟直接做个纯正则的语法高亮，也弄过早期notepad++的高亮配置。

探索
----
鉴于完全没有经验，还是像看看其他语法高亮怎么做的。发现 Eclipse 好像没啥单纯的语法高亮插件，有的话，大多也是调用第三方软件（就是本地装个别的软件，然后Eclipse调用它）实现语法高亮。
看了看 PyDev 底层的源码，也调用了 Python 自身实现了一些反射功能。CDT 的源码更是乱到没法看。
最后没办法，只能从 Plugin 自带的例子开始尝试学习。

自带样例 XMLEditor 分析
----
Eclipse 下载的时候能选很多版本，早期的默认版本是 Classic，也就是现在的“Eclipse IDE for Eclipse Committers”，后来的默认版本是 “Eclipse IDE for Java Developers”，开发的话，要么去装 Plugin-in 开发插件，要么就直接下载 Eclipse IDE for Eclipse Committers。
### 自带样例
使用新项目的向导，可以创建一个 “Plugin-in with an editor” 该向导会创建一个简单的 XML 编辑器。
### plugin.xml 和 XMLEditor
plugin.xml 是插件的入口配置文件。在默认向导下，xml里写的是一个 “Sample XML Editor”，入口类是 XMLEditor。
XMLEditor 继承于 org.eclipse.ui.editors.text.TextEditor，可以看出 TextEditor 是 Eclipse 的编辑机基础类。
XMLEditor 只是在构造函数里设置了 setSourceViewerConfiguration 和 setDocumentProvider
### SourceViewerConfiguration DocumentProvider
SourceViewerConfiguration 算是 TextEditor 的核心配置，核心到我不理解为什么要把它抽离出 TextEditor，可能只是方便切换 TextEditor 的状态。
SourceViewerConfiguration 包含了一些对于程序员编码来说很常见的属性，如 TAB 宽度 getTabWidth，缩减的代码（tab还是多个空格） getIndentPrefixes。
之外，有些行为复杂的事情，比如 undo 管理 getUndoManager，双击策略 getDoubleClickStrategy。都是在这里设定，只不过传进去的是一个类。
比较特别的
	public IPresentationReconciler getPresentationReconciler(ISourceViewer sourceViewer);
这是干嘛的呢？可以看见传进来的是个 ISourceViewer，ISourceViewer 可以看出是一个段代码片段，它是由 DocumentProvider 从文件（或者其他地方）生成，这段代码片段足够完整可以进行词法语法分析。
关于 DocumentProvider，它本质只是一个为 TextEditor 提供数据源的地方，默认当然是本地文件，全部载入。假如想要处理海量文件，或者远程文件什么的，都可以在 DocumentProvider 上做手脚。 
### Reconciler 和 Scanner
Scanner 就是基本把这段代码抽取出一个个词元来，一般是词元啦，注意这个过程跟词法分析相似，但并不一一对应，你也可以定义自己的概念。
Reconciler（调解器）的概念，是词法语法分析里没有的，因为编辑器面对的是正在编辑的代码，Scanner 扫出来的东西很有可能完全不对头，Reconciler 会尝试进行一些修复，具体的过程我还不清楚，反正它是由 Repairer 和 Damager，都是基于 Scanner 生成的。因此，剩下的关键点就是 Scanner 了。
### RuleBasedScanner，ITokenScanner
Scanner 的基本接口是 ITokenScanner，顾名思义，ITokenScanner 只要做好切割 Token 就好了。
实际大量使用的是 RuleBasedScanner，它继承于 ITokenScanner 和 ICharacterScanner，但是我还不清楚 ICharacterScanner 到底在哪些地方用了。
RuleBasedScanner 用起来超级简单
	IToken string = new Token(new TextAttribute(manager.getColor(IXMLColorConstants.STRING)));
	
	IRule[] rules = new IRule[3];
	
	// Add rule for double quotes
	rules[0] = new SingleLineRule("\"", "\"", string, '\\');
	// Add a rule for single quotes
	rules[1] = new SingleLineRule("'", "'", string, '\\');
	// Add generic whitespace rule.
	rules[2] = new WhitespaceRule(new XMLWhitespaceDetector());
	
	setRules(rules);
这段代码就能让这个 Scanner 够识别出引号段，空格段。注意了，高亮在这个时候同时处理了。

KernelSyntax
----
在这基础上，写个个简单的语法高亮插件 KernelSyntax。
https://github.com/yangyuan/eclipse-kernelsyntax
pending
