---
layout: post
title: APC、APCu 和 一个逗比在线计数器
---

APC 是 PHP 自带的 Cache 解决方案之一，它本身和 WinCache 是一类东西（我觉得 WinCache 在很大程度上参考了 APC），包含了系统加速和用户缓存两大功能。
系统加速：基本可简单理解为利用巧妙缓存在减少执行过程中的文件和多余的编译操作。
用户缓存：能够被用户使用的缓存，这点功能在跟 Memcached 差不离，但是APC和WinCache是在进程内部解决了缓存，而不是调用第三方组件。
两个都是很好的功能，第一个竞争太激烈，在 Linux 基本被 Zend OPcache 取代，在 Windows 上被 WinCache 取代。在用户缓存方面，除了 Windows 下的 WinCache，没有合适的替代方案。如今 APC 官方打退堂鼓，APC 的用户缓存功能就被移植到一个叫 APCu 的项目上。
APCu 官方主页：[url]https://github.com/krakjoe/apcu[/url]

至此这一切行为我觉得都是正常的，但是 APCu 却有一点恶心。从 GIT 和 PECL 历史来看，显得很不正规，没有积极性，发布也不严谨，近一段时间更是重构大改，改完不留文档，一些变量和参数我都得dump或者看源码才看出来。

刚刚又说，在进程级别的用户缓存上，PHP没有很好的替代品，APCu这么搞法，真是让人担心。

一个逗比在线计数器
----
曾经的版本
	<?php
	function count_online($key='', $cookie='live')
	{
		$time = time();
		$online = array();
		
		$online = apc_fetch ($key.'_online');
		if (false == $online || !isset($online['count']) || !isset($online['time'])) {
			$online = array('count'=> 0, 'time' => $time);
		}
		if (!isset($_COOKIE[$cookie]) || ($time - $_COOKIE[$cookie])> 900 ) {
			$online['count'] ++;
			setcookie($cookie, time());
		} else {
			$time_last = $online['time'];
			$time_s = $time- $time_last;
			if ($time_s > 0) {
				$online['count'] = intval($online['count'] * (900-$time_s)/900);
				if ($online['count'] < 0) $online['count'] =0;
			}
		}
		
		$online['time'] = $time;
		apc_store ($key.'_online' , $online);
		
		return $online['count'];
	}
	
	echo count_online();
这个版本一点也不科学，我只是希望凭借数学和统计学，利用最小的代价估算出大致在线人数。
这个版本在15分钟内800-2400人在线的网站上运转的非常好，但是低于这个数值和高于这个数值的情况下，会出现数据的急剧上升和下滑。

于是，我还是照着正常的方法写了一个。
	<?php
	function count_online($key='', $cookie='live', $timespan=60)
	{
		$time = time();
		$online = array();
		
		$online = apc_fetch ($key.'_online');
		if (false == $online || !isset($online['count'])) {
			$online = array('count'=> 0);
		}
		
		if (!isset($online[$time])) {
			$online_tmp = $online;
			$online = array('count'=> 0);
			for ($i=0; $i<$timespan; $i++) {
				if (isset($online_tmp[$time-$i])) {
					$online[$time-$i] = $online_tmp[$time-$i];
					$online['count'] += $online_tmp[$time-$i];
				} else {
					$online[$time-$i] = 0;
				}
			}
		}
		
		if (!isset($_COOKIE[$cookie]) || ($time - $_COOKIE[$cookie])> $timespan ) {
			$online[$time] ++;
			setcookie($cookie, $time);
		}
		
		apc_store ($key.'_online' , $online);
		return $online['count'];
	}
	
	echo count_online();
这个非常中规中矩的东西，以秒为单位，计算$timespan以内的在线人数，还算正常吧，数据也可靠。