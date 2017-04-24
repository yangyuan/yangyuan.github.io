---
layout: post
title: 不用SDKAPI直接调用网页接口实现发微博（PHP实现）
---

我感觉有时候就像写个东西小东西能够从程序发个微博，但并不想去为这个小功能注册APP，安装SDK。
比如当这个博客还是 PHP 程序的时候，我就弄了一个按钮可以发布一个消息为“我发布了博客《...》”。
这里利用 PHP 模拟网页登录、用发微博的 API 直接发微博，理论上可以轻松翻译为其他语言。

源代码
----
[url]https://github.com/yangyuan/weibo-publisher[/url]
[!code=php]

不要纠缠这有没有意义是啥，什么的。这套API最大的好处我看应该是伪装。
原本是我个人之前一个项目（我管它叫 HASH，利用 HASH 库实现跨协议分享文件，成本太高玩不起水掉了）的一部分。

身份验证
----
RSA加密是关键，需要使用PKCS1填充方式，加密的本身实现如下。
	function rsa_encrypt($message, $e, $n) {
		$exponent = hex2bin($e);
		$modulus = hex2bin($n);
		$pkey = rsa_pkey($exponent, $modulus);
		openssl_public_encrypt($message, $result, $pkey, OPENSSL_PKCS1_PADDING);
		return $result;
	}
其中$message的格式为
	$servertime."\t".$nonce."\n".$password;
E 为 0x010001
而 $servertime、$nonce、N（$pubkey）等参数，均从登录页面里获取。
加密结束之后按照指定格式发送到 http://login.sina.com.cn/sso/login.php 即可，如果成功，则给出登录一次性入口的地址，访问地址即可实现登录。

发布微博
----
发布微博提供了两个方案：
1、使用一个widget界面，通过该界面可以发布微博，并且可以指明APP的ID，并且受到较少的权限控制。
2、完全模拟人登入微博的状态，模拟在微博首页发微博的数据。
第一个方案非常通用和稳定，但是最近新浪似乎在逐渐撤下该入口，目前使用该入口虽然可以发表成功，但是会提示错误信息。
代码就不贴了，主要三点。
1、REFERER 必须存在，服务端会验证。
2、HTTP 头要包含 `X-Requested-With: XMLHttpRequest`
3、POST 格式如下，可以适当修改，补充功能。
	$data = array(
		'text'=>$content,
		'pic_id'=>'',
		'rank'=>'0',
		'rankid'=>'',
		'_surl'=>'',
		'hottopicid'=>'',
		'location'=>'home',
		'module'=>'stissue',
		'_t'=>'0'
	);

上传图片
----
新浪微博目前被一些网站当图床用，主要图片上传了之后没有盗链检测，这点类似 Flickr。
所以我提供了上传图片的接口。
也是在COOKIE、REFERER合格的情况下把数据发送到指定URL就行了。
	$url = "http://picupload.service.weibo.com/interface/pic_upload.php?&mime=".$mime."&data=1&url=0&markpos=1&logo=&nick=0&marks=1&app=miniblog";
细节：
mime必须认真填的。
url、nick、logo是控制水印内容的。
data指明数据类型。这边比较灵活，支持BASE64上传什么的。

图片PID转URL
----
来看下官方的实现，这段代码是JAVASCRIPT里提取出来了，做过混淆，我适当修改成可读。
	function pid2url (pid, size) {
		if (typeof pid == "string") {
			var g = {
				ss: {
					middle: "&690",
					bmiddle: "&690",
					small: "&690",
					thumbnail: "&690",
					square: "&690",
					orignal: "&690",
					thumb180: "&690"
				},
				ww: {
					middle: "bmiddle",
					large: "large",
					bmiddle: "bmiddle",
					small: "small",
					thumbnail: "thumbnail",
					square: "square",
					orignal: "large",
					thumb180: "thumb180",
					mw690: "mw690",
					mw1024: "mw1024"
				}
			};
			var h = pid.charAt(9) == "w";
			var i = pid.charAt(21) == "g" ? ".gif" : ".jpg";
			var j = h ? crc32(pid) % 4 + 1 : hex2int(pid.substr(19, 2)) % 16 + 1;
			var k = "http://" + (h ? "ww" : "ss") + j + ".sinaimg.cn/" + (h ? g.ww[size] : size) + "/" + pid + (h ? i : "") + (h ? "" : g.ss[size]);
			return k;
		}
	}
可以看出PID本身具有一些信息，比如图片类型，上传的库ID之类。函数hex2int和crc32是他们自己实现的。
	function crc32(data) {
		data = data.replace(/\r\n/g, "\n");
		var hex = "";
		for (var i = 0; i < data.length; i++) {
			var charcode = data.charCodeAt(i);
			if (charcode < 128) hex += String.fromCharCode(charcode);
			else if (charcode > 127 && charcode < 2048) {
				hex += String.fromCharCode(charcode >> 6 | 192);
				hex += String.fromCharCode(charcode & 63 | 128)
			} else {
				hex += String.fromCharCode(charcode >> 12 | 224);
				hex += String.fromCharCode(charcode >> 6 & 63 | 128);
				hex += String.fromCharCode(charcode & 63 | 128)
			}
		}
		data = hex;
		var d = "00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D";
		var b = 0;
		var e = 0;
		var f = 0;
		b = b ^ -1;
		for (var g = 0, h = data.length; g < h; g++) {
			f = (b ^ data.charCodeAt(g)) & 255;
			e = "0x" + d.substr(f * 9, 8);
			b = b >>> 8 ^ e
		}
		var i = b ^ -1;
		i < 0 && (i = 4294967296 + i);
		return i;
	}
	function hex2int(hex) {
		hex = (hex + "").replace(/[^a-f0-9]/gi, "");
		return parseInt(hex, 16)
	}
相对来说，我觉得我自己的PHP实现比较易懂一些。
	function weibo_get_image_url($pid) {
		$zone = 0;
		$pid_zone = crc32 ($pid);
		$type = 'large'; //bmiddle
		if ($pid[9] == 'w') {
			$zone = ($pid_zone & 3) + 1;
			$ext = ($pid[21] == 'g') ? 'gif' : 'jpg';
			$url = 'http://ww'.$zone.'.sinaimg.cn/'.$type.'/'.$pid.'.'.$ext;
		} else {
			$zone = (hexdec(substr($pid, -2)) & 0xf) + 1;
			$url = 'http://ss'.$zone.'.sinaimg.cn/'.$type.'/'.$pid.'&690';
		}
		return $url;
	}
关于返回值
----

### 发布微博
发布的请求的返回值是一个JSON串，大部分是一个HTML，用于在返回后显示在界面，可以通过JSON中的code字段识别是否发生成功。
有的时候，code的字段返回的是服务器的错误，但是并不意味着微博没有发出去。
尝试过从这个返回值中提取新微博的ID，但由于是一段HTML，可能经常被修改，所以打消了这个想法。

### 发布图片
同样是个JSON串，如果成功，必然能找到PID。
所以我在包装的时候，成功则返回PID。