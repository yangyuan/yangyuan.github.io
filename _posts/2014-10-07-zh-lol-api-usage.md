---
layout: post
title: 英雄联盟（北美）数据抓取
---

北美官网上线了 Match 历史，无需登录，这样就不用官方 API 即可实现很多数据的抓取。

网页上看得见的是三个入口
* https://acs.leagueoflegends.com/v1/stats/player_history/{region}/{accountid}
* https://acs.leagueoflegends.com/v1/stats/game/{region}/{gameid}
* https://acs.leagueoflegends.com/v1/stats/game/{region}/{gameid}/timeline

- {region}：如 NA1
- {accountid}：非 summoner id，也不是 summoner name，不能搞混。
- {gameid}：同 match id

由此可以看出，{accountid}、{gameid} 是爬取的重点。两者都可以作为遍历的入口，不过当然理论上讲，第二个 API 的数据更有参考性。
{gameid} 看上去特别像 timestamp，我猜测可能早期设计就是 timestamp，后来改掉了。

数据爬取
----
这里以第二个 API 为主。

二分遍历一下，{gameid} 有记录的起始点为 1364960984，创建时间为2014年5月1号（1398902401616），正是 Team Builder 也就是 Patch 4.7 上线的时间，猜测是早期数据不一致就没有导入了。 

简单试了一下写出这样的代码，用 php cli 可执行，也可以稍加修改作为 web api 执行。原本使用c#写的，后来发现在自己电脑上频率大概是1秒1个，但是到亚马逊加州主机上大概每秒10个，所以就放在主机上远程执行了。

数据的检测比较严格，基本不会出现记录错误数据不被发现的情况。
性能很有可能卡在json解析和curl处理，但cpu占有率又不高，所以理论上可以使用多线程加速，我这边的方法是多个进程并行执行，根据参数决定起始id。

```php
function leagueoflegends_fetch ($region, $gameid) {
	$ch = curl_init('https://acs.leagueoflegends.com/v1/stats/game/'.$region.'/'.$gameid);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
	$body = curl_exec($ch);
	curl_close($ch);
	return $body;
}

function leagueoflegends_store ($region, $gameid, $data) {
	$folder = substr($gameid, 0, -9).'/'.substr($gameid, -9, 3).'/'.substr($gameid, -6, 3);
	$folder = './data/game/'.$region.'/'.$folder;
	if(!is_dir($folder)) mkdir($folder, 0755, TRUE);
	$file = fopen($folder.'/'.$gameid, 'wb');
	fputs($file, $data);
	fclose($file);
}

$gameid = 1364960984;
if(isset($argv[1])) {
	$gameid_tmp = intval($argv[1]);
	if ($gameid_tmp > 1364960984 && $gameid_tmp <= 2147483647 ) {
		$gameid = $gameid_tmp;
	}
}

while (TRUE) {
	echo $gameid;

	$data = leagueoflegends_fetch ('NA1', $gameid);
	$json = json_decode($data, TRUE);
	//print_r($json);

	if (isset($json['gameId']) && $json['gameId'] === $gameid) {
		echo " OK\r\n";
		leagueoflegends_store ('NA1', $gameid, $data);
	} else if (isset($json['httpStatus']) && $json['httpStatus'] === 404) {
		echo " N/A\r\n";
	} else {
		echo " ERROR\r\n";
		exit;
	}

	$gameid++;
}
```

```fastcgi_buffers 8 4k|8k;```
