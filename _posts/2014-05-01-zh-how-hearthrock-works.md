---
layout: post
title: Hearthrock 炉石传说简易机器人 实现原理
---

这段时间我开启了一个项目，起名叫 Hearthrock。由于自己有 .NET Assembly 的研究经验，加上 Hearthstone 是基于 Mono 的，简单分析了一下就发现了一个做炉石机器人的可能性。但是该项目仅限AI研究和技术学习，禁止商业化使用。

https://github.com/yangyuan/hearthrock

## 实现原理：修改游戏文件

感谢Unity3D、感觉Mono，额外地还要特别感谢MonoCecil。

### MonoCecil

大四的时候做过一个项目，就是把编译好的 .NET 文件，变成 MSIL 文件。虽然当时已有现成的工具，但是因为环境的因素，不得不使用C语言完全重写。所以仔细研究了.NET的 Assembly 和 MSIL，两者的设计都非常漂亮。
MonoCecil 利用 .NET 本身实现了一个 .NET 的 Assembly 修改，远比官方的只读的反射机制强大。一般这种工具都多少有点不稳定，但是 MonoCecil 我从使用至今都未发现任何问题，而且跨版本通用。

### Unity3D 和 .NET Assembly

Unity3D 是个不错的商业化引擎，早期在做iOS游戏时候接触到。我没做过大型游戏项目，在这方面没有啥发言权。但是我知道 Unity3D 是利用Mono项目，实现了跨平台。Unity3D 支持使用不同的语言编写逻辑（写出来的有点像状态机），然后使用 Mono 编译成 .NET Assembly，再利用Mono在不同平台下的虚拟机实现执行.NET Assembly。Unity3D 写出来的东西本身是模块化的，类似插件，每个模块都有初始化、入口，通常在入口注册事件，然后就是等待被调用了。
### 注入机器人

到现在应该注入的方法就出来了，使用 MonoCecil，修改 Unity3D 生成的 Assembly 文件，在内部注入我们自己编写的Unity3D模块！

实现细节：修改游戏文件
----
其实主要是 MonoCecil 的使用
通过文件名、类名、方法名，取出方法的定义
```csharp
static MethodDefinition fetch_method(string file, string type, string method)
{
	// find hook method
	try
	{
		AssemblyDefinition ad = AssemblyDefinition.ReadAssembly(file);
		TypeDefinition td = null;
		foreach (TypeDefinition t in ad.MainModule.Types)
		{
			if (t.Name == type)
			{
				td = t;
				break;
			}
		}
		if (td == null) return null;
		MethodDefinition md = null;
		foreach (MethodDefinition t in td.Methods)
		{
			if (t.Name == method)
			{
				md = t;
				break;
			}
		}
		return md;
	}
	catch (Exception e)
	{
		Console.WriteLine(e.ToString());
		return null;
	}
}
```
通过文件名和方法定义实现注入
```csharp
static AssemblyDefinition inject_method(string file, MethodDefinition method, MethodDefinition method_tobe_inject)
{
	try
	{
		AssemblyDefinition ad = AssemblyDefinition.ReadAssembly(file);
		ILProcessor ilp = method.Body.GetILProcessor();
		Instruction ins_first = ilp.Body.Instructions[0];
		Instruction ins = ilp.Create(OpCodes.Call, ad.MainModule.Import(method_tobe_inject.Resolve()));
		ilp.InsertBefore(ins_first, ins);
		return ad;
	}
	catch (Exception e)
	{
		Console.WriteLine(e.ToString());
		return null;
	}
}
```
注入完了之后，利用
	`AssemblyDefinition.Write();`
方法，把修改后的Assembly再写到一个文件里。

实现原理：游戏状态获取
----
这部分的内容不是很通用，完全取决于程序员的写法。
### 单例类
HearthStone有几个重要的类，如SceneMgr、MulliganManager、GameState、InputManager等等。
单例哎，直接调用Get()方法就可以了！
### 状态的识别
通常来说，可以使用SceneMgr取得当前的场景情况，可以使用GameState获得当前对战的游戏状态。两者一结合，基本就是整个游戏的状态的了。
通过状态就可以知道哪些类当前是有实例的，哪些是没有的。

实现原理：场上卡牌的数据
----
GameState可以获得当前的两个玩家Player，而Player可以活动当前的卡牌，如Player.GetHandZone().GetCards()取得手上的卡牌。
额外的，不能看见对方手牌的数据哟，只能拿到ID，甭想拿这个作弊。

实现原理：机器人自动执行
----
首先，通过分析场上的数据就可以算出该怎么走牌，这是AI的部分，我只写了个有啥走啥的简单AI。
我们代码是使用组建的方式注册在游戏里的，会被定时调用，调用的时候，进行操作（如走牌）然后及时返回即可。

## 实现原理：走牌和攻击

走牌和攻击的实现，虽然我能够完全模仿客户端逻辑，但是总觉得不太靠谱，因为客户端更新，我可能没发现，就会出错。因此我走牌和攻击的实现是直接调用了InputManager。

InputManager包含了一些方法，用于处理鼠标和键盘事件，我直接调用这些函数。

当然这么做的缺陷也是很明显的：InputManager的能力范围有限，并且我不能组织InputManager不去处理一些事件。比如当鼠标滑出窗口时，InputManager默认会把牌放回手里。

## 总结

原理其实很简单，关键点有两个。

1. MonoCecil，利用其修改Assembly。
2. Unity的MonoBehaviour，利用里写出一个游戏组建，注册到游戏中。

当然额外地，需要获取分析当前状态，并且模拟人操作实现自动机器人。