---
layout: post
title: 在 LLVM/CLANG 的解释器上添加内存读写统计
---

连着快一周清早起来去驾校，快累趴了。。。已拿到马路杀手证。。。已拿到 MS OFFER。。。

我就不解释我为什么突然研究这个了。。。
[!code=cpp]

最早听说 LLVM 是看到报道说 FB 实现了基于 LLVM 的 PHP 编译器，注意是编译器。再一次看到 LLVM 是据说 XCODE 使用了 LLVM 辅助了代码编辑，当时大概看了看 LLVM，感觉像 .NET 那套，定义一套中间语言，适当使用 JIT，当时没想到这个东西有什么特别的使用场景。
最近再去看 LLVM 主页，才注意到有 CLANG 这个东西。
而且 LLVM 上面的东西让人感觉有点乱，上面有 10 多个项目，感觉 LLVM 已经包含了从分析、编译、运行、诊断、移植一整套方案套件了。

LLVM
----
官方对 LLVM 定义为。。。LLVM SYSTEM
官方把项目分为三部分：
1、LLVM 套件，一些编译、运行、分析的基本功能的解决方案和工具。
2、CLANG 前端，不仅仅是编译器，其实是 LLVM 一整套东西，封装实现给 C, C++, Obj-C。理论上可以模仿 CLANG 实现各种 XLANG。
3、测试套件。

目标
----
我的目标是统计下程序/函数的内存读写操作。

### 臆想方案
我第一反应是修改 LLVM IR 源码，这是基于 LLVM 编译的一大优势。操作的过程，就像某些 DEBUG 系统一样，在重要的操作前后补上额外的辅助操作。
我可以把任何程序编译成 LL 文件，再修改 LL 文件，在内存读写操作面前加上计数器。再汇编成本地代码。感觉肯定可行。

### CLANG
从介绍看，我以为 CLANG 只是个编译器。但是看到 CLANG 源码里有个 C 解释器 sample 的时候，才发现 CLANG 还是能做很多很多事情的。
作为编译器，CLANG 肯定需要实现语法树。在这个过程中，CLANG 能够第一时间发现语法里的错误和威胁，并且可以拿到最终的语法分析结果。那对于代码补全，预测都是有用的。
CLANG 本身也可以直接解释/执行编译结果，方便诊断。CLANG 本身利用 C++ 实现，并且每个模块都独立编译成静态库，很多类和接口可以被直接使用。基于 CLANG 的源码和接口，很容易实现出一个自定义的编译、诊断工具。

统计内存读写的任务，很有可能利用 CLANG 的诊断接口就可以实现了（实际上发现只能做编译时诊断，不是运行时诊断）。
如果不行，那可能需要深入 LLVM 执行字节码相关的地方，在执行时候做统计。
如果还不行，那么也可以修改 CLANG 编译的逻辑，在语法树操作的合适位置添加统计代码。

操作记录
====

Windows 编译
----
终于成功编译了，编译的过程异常漫长，好想去借个服务器。
官方的 Windows 成品是基于 mingw，不想去折腾，所以编译一个本地版。
llvm 本身源码并是依赖某个操作系统，使用 cmake 便可编译出 Visual Studio 项目来。
llvm clang 也是可以一起编译的。参照 http://llvm.org/docs/GettingStarted.html
编译完了之后，就可以使用 clang 命令在 windows 上直接编译 c 代码了，跟 GCC 用法类似。

使用的时候基本OK，就是环境变量不太好控制，也没找到 Windows 下插件编译使用样例，强制 cmake 编译时看到。
	Loadable modules not supported on this platform.
额。。估计没解，直接换平台。

Ubuntu 二进制部署
----
大概试了一下，下载预编译包就可以，解压然后放到 /usr/local/ 下。
	tar xvfJ xxx.tar.xz
	cd xxx
	cp -R * /usr/local/
	apt-get install build-essential
安装 build-essential 主要是为了一些基本工具 make、ld 以及一些类库什么的。
能够使用，但是 clang-plugin 编译还是比较折腾的，主要是 standalone 的 cmake 写法，竟然没有提供样板。
最后又重新编译一份，使用了现成的 cmake。

尝试
----
试着做了一个 plugin，感觉 plugin 只能深入到编译阶段，语法树处理和生成。也就是静态诊断，并没看到什么运行时诊断方法。

clang 样例里面有个 clang 解释器，感觉有戏。
尝试修改 clang 解释器，这个 clang 解释器是以 Module 为单位解释，用 ExecutionEngine 调用。仔细一看根本不是解释器，就是个编译 + 执行。

去源码里看 ExecutionEngine 和 Module，看到了 llvm Interpreter。Interpreter 里面的 run 方法似乎是可以逐个到 Instruction。
在拿到 Instruction 做判断、识别、统计，也许就可以了，但是这个 Interpreter 是私有的。

结论呢，就是一个自称是 Clang 解释器，其实是一个 编译 + LLVM 解释执行，其中 LLVM 解释执行部分还是不可扩展的。
除非自己利用 LLVM 接口实现一个解释器，忒么意义是啥。

还有一个方法是继承 LLVM 解释器，然后强制重写一些函数，非常幸运的，这些函数都是 pub 的，大概重写了 3-4 个函数的时候，已经能取到单个指令了。但是需要访问一个私有成员 ECStack。

C++ 你知道，私有成员是无法通过继承暴露的，如果添加友元，就需要修改源码，作为接口开发，还是避免修改源码。
经过一些简单搜索发现这个
https://github.com/sampsyo/llvm-ei
这代码在新版本里用不了，但是思路还是可以用的，就是使用内存映射的方法，强制吧 ECStack 所在的位置取出来。
	class PublicInterpreter : public ExecutionEngine, public InstVisitor < Interpreter > {
	public:
		GenericValue ExitValue; 
		DataLayout TD;
		IntrinsicLowering *IL;
		std::vector<ExecutionContext> ECStack;
		std::vector<Function*> AtExitHandlers;
	};
我的实际代码比他的简单的多，我使用继承的方法，重写关键函数，利用 namespace 就可以控制了。然后利用 PublicInterpreter 暴露我需要的私有成员。
这样一来，我使用一个 ExecutionEngineX 继承 ExecutionEngine，就可以强制修改 run 函数，然后 `PublicInterpreter * pubinterp = (PublicInterpreter *) this;` 就可以取出 ECStack，完成 run 函数了。
	class ExecutionEngineX : public llvm::Interpreter {
	public:
	int runFunctionAsMain(Function *Fn, const std::vector<std::string> &argv, const char * const * envp) {...}
	GenericValue runFunction(Function *F, const std::vector<GenericValue> &ArgValues) {...}
	void run() {
		PublicInterpreter * pubinterp = (PublicInterpreter *) this;
		Analyser * aser = new Analyser();
		while (!pubinterp->ECStack.empty()) {
			ExecutionContext &SF = pubinterp->ECStack.back();
			Instruction &I = *SF.CurInst++;
			aser->process(I, pubinterp->ECStack);
			visit(I);
		}
		aser->report();
	}

Analyser 是我自己写的类，利用 ECStack 可以看出函数栈，利用 Instruction 可以取到当前指令，分析统计，完毕！
Analyser 有个小技巧就是使用 ECStack 来判断当前函数，我同时使用了 栈 和 map 来统计 io 操作。`func_sync` 就会根据 `ECStack` 来调整 `cache` 这个栈。统计的时候都是在 `cache.top()` 上统计的。
	void Analyser::process(llvm::Instruction &I, std::vector<llvm::ExecutionContext> &ECStack) {
		func_sync(ECStack);
		
		unsigned int opcode = I.getOpcode();
		if (opcode == llvm::Instruction::Store) {
			cache.top().store++;
		}
		else if (opcode == llvm::Instruction::Load) {
			cache.top().load++;
		}
	}

Windows 下和 Linux 下均 OK，截图和测试函数如下。

![alt text]({{ site.url }}/assets/images/llvm-io-counter-1.jpg)

![alt text]({{ site.url }}/assets/images/llvm-io-counter-2.jpg)

	int test (int depth) {
		if (depth <=0) return 0;
		return test (depth-1);
	}
	
	void test0 () {
		int k = 0;
		for (int i=0; i<10; i++) { 
			k = i + k*2;
		}
	}
	
	int * test1 (int * b, int * c) {
		int * a = b;
		for (int i=0; i<10; i++) { 
			a[i] = b[i] + c[i]; 
		} 
		return a; 
	}
	
	int test2 (int depth) {
		if (depth <=0) return 0;
		test0 ();
		return test2 (depth-1);
	}
	
	int main () {
		int b[10] = {1,2,3,4,5,6,7,8,9,0};
		int c[10] = {0,1,2,3,4,5,6,7,8,9};
		test (5);
		test0 ();
		test1 (b, c);
		test2 (3);
		return 1;
	}