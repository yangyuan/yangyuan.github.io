---
layout: post
title: 加摩尔会保护大家的！一个逗比魔兽世界插件！
---

源码在此：[url]https://github.com/yangyuan/wowaddon-gamon[/url]

基本概念
====
语言是忒么 LUA 哟，作为一个内嵌式语言 LUA 还是很好用的。

### TOC
TOC 是 WOW 插件的入口，必须跟插件目录同名。里面是一些 META 参数，以及所有入口 LUA 文件名。
	## Interface: 60000
	## Title: Gamon
	## Notes: ......
	
	Gamon.lua
	Font.lua
	Interrupt.lua
	Collaboration.lua
看上去，WOW 会首先访问你的 TOC 文件，阅读 META 参数之后，依次读取 LUA 文件。
Interface 是版本号，貌似格式是 0 00 00。

### Frame
Frame 就像 COM 里的 Interface，像 Unity3D 里的 GameObject。
WOW 插件的全局函数非常少，大部分操作都是被动的，无论是监听消息，还是显示界面元素，你都需要给 WOW 一个对象，这个对象就是 Frame。
比如你要监听 login 事件，你就需要 `CreateFrame`，然后 `Frame::RegisterEvent("PLAYER_LOGIN")` 最后 `SetScript("OnEvent",...)`。

### SlashCmd
SlashCmd 就是用在处理你在聊天区输入 `/xxx` 的命令。SlashCmdList 本身是跟全局对象数组，你只需要在这个数组里添加一个就可以。但是你却需要额外为这个元素定义全局的命令名。
	SlashCmdList["GAMON"] = function(msg, editbox)
	
	end
	SLASH_GAMON1 = "/gamon"
	SLASH_GAMON2 = "/wtf"

PENDING
====
