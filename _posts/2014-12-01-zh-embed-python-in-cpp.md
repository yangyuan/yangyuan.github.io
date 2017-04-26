---
layout: post
title: 在 C++ 程序中嵌入 Python 脚本
---

需求呢，比如我需要为程序提供一个“脚本扩展”功能，比如游戏插件，一些设计软件的导入导出插件，编辑器的批量操作插件等等。
让对方使用脚本就能自由扩展，但是提供非常严格的 API 环境。
从需求的角度，Lua 比 Python 更适合这个任务，Lua 具有更加轻量级的执行环境，官方对 Lua 的定义就是：
	Lua is a powerful, fast, lightweight, embeddable scripting language.
但。。。谁让现在有这么多 Python 迷呢。

Extending and Embedding the Python Interpreter
----
官方为这个主题提供了一个文档。
[url]https://docs.python.org/2/extending/[/url]
但是。。。但是你懂的。。。文档是一回事，实际是一回事。。。

### Python Runtime
首先你得装个 Python，我的 Python 在 C:\Runtimes\Python27 目录下，用官方安装包安装的，里面的 include 文件夹和 libs 文件夹是我们开发需要的。
其实默认安装的 Python27 目录并不是完整的 Python 执行环境，还有个 python27.dll，它是 Python 的解释器的核心。默认塞到了 C:\Windows\System32\python27.dll 目录下。
我习惯会把 python27.dll 复制一份到 Python27 目录下，然后打个包，就是个完整的可移植的 Python 执行环境。你开发个软件不能总要求别人手动装个 Python 吧，所以这个打包还是很方便的。但还有个更机智的打包方式，下面会提到。
[!code=vc]
### C++ 执行 Python 脚本
我用 Visual Studio 建个项目，照着官方的说明写这么个代码
	#include <tchar.h>
	#include <Python.h>
	
	int _tmain(int argc, _TCHAR* argv[])
	{
		Py_SetProgramName("test");
		Py_Initialize();
		PyRun_SimpleString("from time import time,ctime\nprint 'Today is', ctime(time())\n");
		Py_Finalize();
		return 0;
	}
关键是 Py_Initialize 初始化、PyRun_SimpleString 执行、Py_Finalize 结束。
其中 PyRun_SimpleString 可以多次分段执行，也就是可以一行一行来。
够简单吧，可就是编译不过。第一个报错是 python27_d.lib 找不到，看源码，原来是 Debug 模式下，默认调用 python27_d.lib，但实际上 python27_d.lib 在Python 安装包里并不存在，存在的是 python27.lib。所以要么改成 Release（它会调用python27.lib），要么复制一个 python27.lib 成 python27_d.lib，要么改官方的源码。
不过我选择这么干，在#include <Python.h>周围改成这样。
	#ifdef _DEBUG
	#undef _DEBUG
	#define _DEBUG_PYTHON
	#endif 
	#include <Python.h>
	#ifdef _DEBUG_PYTHON
	#define _DEBUG
	#endif
相当于临时取消 _DEBUG，算是个 BUGFIX，因为除了python27_d.lib，还有很多地方存在类似问题，对于。

此外，我试了一下不安装 Python 执行程序，首先会报 python27.dll 找不到。
复制 python27.dll 到程序目录，可以执行了，但是 Py_Initialize 失败。原来是因为我环境变量没有 PYTHONPATH（当然，正常安装是有的）。
解决方案是 Py_Initialize 之前，手动调用
	Py_SetPythonHome("?????????\\Python27");
绿色执行的话，用这个函数可以自行选择Python环境。
额外要注意的是，如果VS的工程是32位的（x86，默认就是x86） ，Python 则必须是32位的，不然会link不上。

### Python 调用 C++ 函数
来看这段浅显易懂的代码。
	static PyObject * hello (PyObject *self, PyObject *args)
	{
		return Py_BuildValue("s", "hello world");
	}
	static PyMethodDef methods[] = {
		{ "hellocpp", hello, METH_VARARGS, NULL },
		{ NULL, NULL, 0, NULL }
	};
	Py_InitModule("rabbit", methods);
Py_BuildValue 第一个参数是类型，第二个是值。 s 就代表字符串。具体可参考 https://docs.python.org/2/c-api/arg.html
PyMethodDef 则是可以看成方法定义。 4个参数分别是：（Python）类方法名、（c++）函数名、FLAG、描述。 参考 https://docs.python.org/2/c-api/structures.html
通常会定义一个 PyMethodDef 数组，其中最后一个全是0，代表结束。
Py_InitModule 则是 创建一个名为第一个参数的 module，方法是第二个参数传进来。
对于的，Python脚本就可以这么用。
	import rabbit
	print rabbit.hellocpp()
但注意，Py_InitModule 必须在 Py_Initialize 之后。

### python27.zip
pythonXX.zip 是 Python 的一个神奇方案。将 Python 的 Lib 和 DLLs 的目录下的东西（不包含Lib、DLLs目录本身），打包成zip，就可以自动被识别。
也就是说一个 pythonXX.zip、pythonXX.dll，加上自己的exe，就可以直接执行了。
pythonXX.zip、pythonXX.dll 放到一个目录，就可以 Py_SetPythonHome 到这个目录，然后执行自己的exe了。
pythonXX.zip+pythonXX.dll+python.exe，就是一个完整的python环境！

总。。。结
----
	#include <tchar.h>
	
	#ifdef _DEBUG
	#undef _DEBUG
	#define _DEBUG_PYTHON
	#endif 
	#include <Python.h>
	#ifdef _DEBUG_PYTHON
	#undef _DEBUG_PYTHON
	#define _DEBUG
	#endif 
	
	static PyObject * hello (PyObject *self, PyObject *args)
	{
		return Py_BuildValue("s", "hello world");
	}
	
	static PyMethodDef methods[] = {
		{ "hellocpp", hello, METH_VARARGS, NULL },
		{ NULL, NULL, 0, NULL }
	};
	
	int _tmain(int argc, _TCHAR* argv[])
	{
		Py_SetProgramName("test");
		Py_SetPythonHome("..\\Dependencies\\Python27\\");
		Py_Initialize();
		Py_InitModule("rabbit", methods);
		PyRun_SimpleString("from time import time\nprint time()\n");
		PyRun_SimpleString("import rabbit");
		PyRun_SimpleString("print rabbit.hellocpp()");
		Py_Finalize();
		return 0;
	}
### 输出
	1417417731.4
	hello world

### 跟 Lua 比的缺陷
Python：程序需要一个 Python 执行环境，可以要求单独装，也可以在程序里打包一个小 Python。经过精简压缩可以缩小到 4MB 左右，python27.dll本身2.4MB，最最最精简的 python27.zip 不到100k，但基本啥都干不了。。。完整zip大概 5.5MB，稍微精简下，把ssl、sqlite、bsddb、xml、test 什么删了，弄到 1.5 MB还是可以的。
Lua：则完全嵌入到 exe 中，100多k。

Python：编译需要使用官方lib。
Lua：可以随意嵌入项目，源码嵌入、lib嵌入、dll都行。Lua 源码严格遵循 ANSI C，攒。