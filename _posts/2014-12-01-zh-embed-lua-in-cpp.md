---
layout: post
title: 在 C++ 程序中嵌入 Lua 脚本
---

[!code=vc]
刚写了个 Python 版本的，这里弄个 Lua 版本。
	#include <tchar.h>
	#include <lua.hpp>
	
	int hello (lua_State *L)
	{
		lua_pushstring(L, "hello world");
		return 1;
	}
	
	int _tmain(int argc, _TCHAR* argv[])
	{
		lua_State * L = luaL_newstate();
		luaL_openlibs(L);
		lua_register(L, "hellocpp", hello);
		luaL_loadstring(L, "str = hellocpp() io.write(str)");
		int status = lua_pcall(L, 0, LUA_MULTRET, 0);
		lua_close(L);
		return 0;
	}
相比Python版本，是不是在函数处理方面精简了很多。

### lua.hpp
首先注意到，我 include 的是 lua.hpp，lua.hpp 的代码是这样的。
	extern "C" {
		#include "lua.h"
		#include "lualib.h"
		#include "lauxlib.h"
	}
其实就是引用了几个 lua 头文件，但是这里单独弄出来可不是因为方便。
一个 lib 想同时支持c和cpp编译，比较麻烦，一般使用 __cplusplus 宏区分，但lib本身必须使用c方式编译。lua 回避了这种方式，可以强制使用 cpp 模式编译 lua。代价就是，cpp 代码必须手工以 extern "C" 的方式调用 lua 头文件。

### 基本调用过程
	lua_State * L = luaL_newstate();
	luaL_openlibs(L);
	luaL_loadstring(L, "print 'hello'");
	int status = lua_pcall(L, 0, 0, 0);
	lua_close(L);
luaL_newstate 类似于 Py_Initialize
luaL_openlibs 载入标准库，当然如果只是算一下 1+1=2 就不用载入了，不过只能干类似 Lisp 什么的事情。如果只想载入个别库，参考 lualib.h 
luaL_loadstring 载入脚本，当然可可以 luaL_loadfile
注意这几个函数都是有 L 的。他们都来自于 lauxlib.h
我第一次看这个代码有点担心，我用的是 luaL_newstate 创建，缺使用 lua_close 销毁。
看了源码，其实有 lua_newstate 的，luaL_newstate 调用了 lua_newstate，并且做了一些防护措施，luaL_newstate 只是为了方便而存在。
另外注意我使用变量名 L 。。。貌似是传统。

### 栈的世界
	lua_register(L, "hellocpp", hello);
这个函数，理解起来很简单，在 L 这个实例中，用“hellocpp”这个名字，绑定到 hello 这个 C 函数。一开始我一个会跟 C 的实现一样，会有个全局对象表。在里面加一项就可以。
实际上怎么实现的呢，lua_register 其实是个宏。
	#define lua_register(L,n,f) (lua_pushcfunction(L, (f)), lua_setglobal(L, (n)))
也就是其实是吧这个方法压到栈里，然后给栈的当前位置绑定一个全局名字。
这个其实就有助于理解添加 lib 的过程
	luaL_Reg cpplib[] = {
		{ "hellocpp", hello},
		{ NULL, NULL }
	};
	luaL_newlib(L, cpplib);
	lua_setglobal(L, "cpp");
这时候 Lua 就可以用 cpp.hellocpp 来调用了。。。
这根 luaL_Reg 和 Python PyMethodDef 非常相似，但是这边显式调用栈。

### 栈的世界：参数
Lua 是支持多参数多返回值的， 比如：
	local var1, var2 = ... -- 三个点代表函数的默认参数
	local ret1, ret2 = func(nil, 1, '2')
其实在每一次调用的时候，参数和返回值都被压到一个栈里面。
到了 C++ 这边，则使用类似操作取参数和返回值
	int func (lua_State *L)
	{
		int argc = lua_gettop(L); // 当前栈的大小，正是函数参数的个数，应该是2。
		int arg1 = lua_tointeger(L, 1); // 注意从 1 开始
		const char * arg2 = lua_tostring(L, 2); // 指针一般都是 const
		lua_pushstring(L, "ret1"); 
		// lua_gettop(L) 应该为 3
		lua_pushstring(L, "ret2");
		// lua_gettop(L) 应该为 4
		return 2; // 返回值的个数
	}
至此，应该都很明白了。
但有一点我一直不明白，正常情况下，栈的最终大小明显应该等于函数的 参数个数 + 返回值个数。
不过实测，C++ 函数的返回值如果大于实际给的lua返回值数量，那么参数也会被作为lua返回值传回去。也就是说，最终的返回值个数标准以c++函数返回值为准。
其实本质上，大多数语言的函数处理都是用的栈，只不过这里有点太明显了点。。。。