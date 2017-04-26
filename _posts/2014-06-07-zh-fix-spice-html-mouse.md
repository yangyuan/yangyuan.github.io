---
layout: post
title: SPICE-HTML5 鼠标指针BUG修复
---

[!code=js]
闲来无事研究SPICE，找到了他们官方指定的HTML5客户端。
下载下来用一下，发现跟网页VNC的水平差不多了。
[url]http://www.spice-space.org/page/Html5[/url]

服务端直接用QEMU起了一个WINDOWS XP，设定SPICE、再启动一个websockify。
但是一连上就发现鼠标不正常，反映总比实际的距离短。

于是看了下源码，鼠标支持两种模式：
模式1是客户端向服务器发出消息，告诉他鼠标移动了多少。
模式2是客户端向服务器发出消息，告诉他鼠标的具体位置。

追踪了一个，发现SPICE-HTML5最终和QEMU协商为模式1，然后打开inputs.js，发现这么一段代码。
	if (this.sc.mouse_mode == SPICE_MOUSE_MODE_CLIENT)
	{
	    move = new SpiceMsgcMousePosition(this.sc, e)
	    msg.build_msg(SPICE_MSGC_INPUTS_MOUSE_POSITION, move);
	}
	else
	{
	    move = new SpiceMsgcMouseMotion(this.sc, e)
	    msg.build_msg(SPICE_MSGC_INPUTS_MOUSE_MOTION, move);
	}
	if (this.sc && this.sc.inputs && this.sc.inputs.state === "ready")
	{
	    if (this.sc.inputs.waiting_for_ack < (2 * SPICE_INPUT_MOTION_ACK_BUNCH))
	    {
	        this.sc.inputs.send_msg(msg);
	        this.sc.inputs.waiting_for_ack++;
	    }
	    else
	    {
	        DEBUG > 0 && this.sc.log_info("Discarding mouse motion");
	    }
	}
基本可以确定就是无论模式一还是模式2，都先生成消息，然后再发给服务器。
但是在发送之前有个检测
	if (this.sc.inputs.waiting_for_ack < (2 * SPICE_INPUT_MOTION_ACK_BUNCH))
	{
	    this.sc.inputs.send_msg(msg);
	    this.sc.inputs.waiting_for_ack++;
	}
貌似是“如果还在等待反馈（阈值之前），就先不发送”。
没仔细看SpiceMsgcMouseMotion，但是我做个VNC的网页客户端，做一个队列来缓存事件是常有的，如果不做队列，那么必须要记录下上一次发送消息时的状态。因此我猜测这个地方很有可能在SpiceMsgcMouseMotion里面有个状态记录上一次鼠标状态，如果这个消息被丢弃，那么就会丢弃一个鼠标移动事件。
代码整体改写如下：
	if (this.sc && this.sc.inputs && this.sc.inputs.state === "ready")
	{
	    if (this.sc.inputs.waiting_for_ack < (2 * SPICE_INPUT_MOTION_ACK_BUNCH))
	    {
			if (this.sc.mouse_mode == SPICE_MOUSE_MODE_CLIENT)
			{
			    move = new SpiceMsgcMousePosition(this.sc, e)
			    msg.build_msg(SPICE_MSGC_INPUTS_MOUSE_POSITION, move);
			}
			else
			{
			    move = new SpiceMsgcMouseMotion(this.sc, e)
			    msg.build_msg(SPICE_MSGC_INPUTS_MOUSE_MOTION, move);
			}
	        this.sc.inputs.send_msg(msg);
	        this.sc.inputs.waiting_for_ack++;
	    }
	    else
	    {
	        DEBUG > 0 && this.sc.log_info("Discarding mouse motion");
	    }
	}
试了一下，完美运行。。。
怎么给这些家伙提供bug修复？！
