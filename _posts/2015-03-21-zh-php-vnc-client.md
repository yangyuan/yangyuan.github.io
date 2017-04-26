---
layout: post
title: 记一次简易 PHP VNC 客户端实现
---

最近真心忙到有点伤，回来之后没有周末，都是 4 多点起床去学车，一去就是一天。工作日上班，晚上一般补补口语就没别的时间了。尝试去套了套磁，GPA 歧视，H1B 都表示没希望，好苦逼。

老板说其他 team 抱怨我们的产品 WEB VNC 不支持老浏览器，的确，我们目前的 VNC 是使用 Canvas + WebSocket 绘图的。
Canvas 其实早于 HTML5，具体有多早我不确定，反正那时候大家还在讨论 XHTML 1.1。那时候 Google 的 Doodle 已经做了很多 JS 的东西，既支持 Canvas 也支持 IE6。我记得不太清楚，应该是用 JS 控制 DIV 和 IMG 元素什么的，总之是实现了非常接近 Canvas 效果的东西。
至于 WebSocket，用的是 websockify 实现，对着东西我依然持保留态度。浏览器是肯定需要支持这样的东西才能实现某些应用的，但是服务端需要比对多请求和长连接的压力，才能决定是否采用 WebSocket。从长远角度，没准 SPDY 会比 WebSocket 更实用。

这个 VNC 客户端方案是个半成品，目的是实践思路是否可行，结论是 “内网可行”。
包含了一定程度的基于 PHP 的客户端实现，可以方便的拿来移植到别的东西里。

VNC（RFB）协议
----
我们经常说 VNC 协议，但其实这么说不准确，VNC 使用的是 RFB 协议 （https://tools.ietf.org/html/rfc6143）。
我要说下 RealVNC。VNC 虽然在很多地方在用，但是它并不是非常的开放，RealVNC 是 VNC 的主导者，但是除了 RFB 以外，VNC 很多技术细节（尤其是 RealVNC 软件中使用的 VNC 协议）是有专利的甚至不公开的。
TigerVNC 和 TigerVNC 都致力于 VNC 的社区化，但是标准方面，也有差别，你会发现服务器反馈的信息好像跟 RFC 有点差别。
目前 GNU 没有什么完美的替代方案，似乎 spice 有点希望，总是不能有把 VNC 当作业界标准什么的。

RFC 看起来可能有点伤神，我来大概简述一下流程。
1、客户端连接，服务端首先会发送版本信息，客户端也应该回应，目前可以假设大家都是用 3.8 。
	12 字节 "RFB 003.008\n"
2、服务器返回验证方式信息。
	常见的如 [LENGTH, 方案，方案。。。] 或者 [LENGTH, 失败原因]
	1 代表无验证，2 代表 VNC 验证。
3、双方验证，如果无验证就可以跳过了。
	服务器会发生一个16字节的串，你把这个串用你的密码 DES 加密一下发过去。
4、客户端申请初始化，服务器反馈基本信息。
	发送 1（代表 TRUE）或者 0，表明是否开启分享。
	服务器反馈的信息一般为 24 字节多些，也就是这样。
	+--------------+--------------+------------------------------+
	| No. of bytes | Type [Value] | Description                  |
	+--------------+--------------+------------------------------+
	| 2            | U16          | framebuffer-width in pixels  |
	| 2            | U16          | framebuffer-height in pixels |
	| 16           | PIXEL_FORMAT | server-pixel-format          |
	| 4            | U32          | name-length                  |
	| name-length  | U8 array     | name-string                  |
	+--------------+--------------+------------------------------+
接下来就是互相通讯了，客户端到服务端的基本命令便是
	+--------+--------------------------+
	| Number | Name                     |
	+--------+--------------------------+
	| 0      | SetPixelFormat           |
	| 2      | SetEncodings             |
	| 3      | FramebufferUpdateRequest |
	| 4      | KeyEvent                 |
	| 5      | PointerEvent             |
	| 6      | ClientCutText            |
	+--------+--------------------------+
服务端到客户端的基本命名是
	+--------+--------------------+
	| Number | Name               |
	+--------+--------------------+
	| 0      | FramebufferUpdate  |
	| 1      | SetColorMapEntries |
	| 2      | Bell               |
	| 3      | ServerCutText      |
	+--------+--------------------+
比如我要修改 Encodings，我就发送。
	[2, 0, 1, 0]（C2n1N1）分部代表 SetEncodings，No padding，1 Encoding，Raw。
比如我要截屏，我就发送。
	[3, 0, x, y, w, h]（C2n4）

用 PHP 实现网页客户端？
----
这的确有点难度。因为 HTTP 是无状态的，而 VNC 连接是 TCP 长连接。
很多 HTML5 的方案是把 VNC 协议直接（或者简单转码）之后，利用 WebSocket 转给浏览器，JavaScript 做解析。
不使用 WebSocket 并非不行，关键在于如何保存当前的连接，也就说我需要一个反向代理，代为帮我建立连接。纯 PHP 方案可以考虑 Worker，当然可能需要一个 pipe 来连上 worker，也可以使用其他辅助工具如 socat 协助。也可以参考 shellinabox 自己弄一个代理。
这样一来，浏览器只要定期和 PHP 交互，PHP 利用一些信息找回 TCP 连接，就可以实现一个 VNC 客户端了。

[!code=php]
很无脑的方案
====
图像的显示
----
上面的方案肯定可行，但是我时间并不多，所以我使用了一个很无脑的方案：直接无状态直接请求 frame。
这个方案只要搭建一个普通普通的 Web Server 就可以了，理论上如果再保持了连接，就是完整方案了。
创立连接，就像我刚才说的流程，但是没有验证信息。
	function init() {
		$resource = fsockopen('tcp://'.'127.0.0.1', '5900', $errno, $errstr, 5);
		if ($resource === FALSE) {
			echo 'fsockopen failed';
			exit();
		}
		$data = fread($resource, 12);
		$version = substr($data, 4, 7);
		fwrite($resource, "RFB 003.008\n");
		$data = fread($resource, 4);
		$stypes = unpack('c*', $data);
		if(!in_array(1, $stypes, TRUE)) {
			echo 'not support no password';
			exit();
		}
		fwrite($resource, "\01");
		$data = fread($resource, 24); // don't ask me why, it seems the server has a bug
		fwrite($resource, "\01");
		$data = fread($resource, 24);
		$config = unpack('n2size_/C2color/Cbig_endian/Ctrue_color/n3rgb_max/C3rgb_shift/x3skip/Nslen', $data);
		$config['hostname'] = fread($resource, $config['slen']);
		$message = pack('C2n1N1', 2, 0, 1, 0);
		fwrite($resource, $message);
	}
获取 frame，这是一个无状态的 demo，我在第一时间强制发起一个 frameupdate，服务器返回当前截屏。
	function fetch_frame() {
		$message = pack('C2n4', 3, 0, 0, 0, $config['size_1'], $config['size_2']);
		fwrite($resource, $message);
		$data = fread($resource, 1);
		$data .= fread($resource, 3);
		$update = unpack('Cflag/x/ncount', $data);
		$img = imagecreatetruecolor ($config['size_1'], $config['size_2']);
		for ($rects=0; $rects < $update['count']; $rects++) {
			$data = fread($resource, 12);
			$rect = unpack('nx/ny/nwidth/nheight/Ntype', $data);
			$size_total = $rect['width']*$rect['height']*4;
			$total_rgb = $rect['width']*$rect['height']*3;
			$total_piexl = $rect['width']*$rect['height'];
			$rgb = '';
			$cache = '';
			$pix_last = 0;
			while($size_total>0) {
				$data = fread($resource, $size_total);
				$size_total -= strlen($data);
				$cache.=$data;
				$pix_target = strlen($cache)/4;
				for ($i=$pix_last; $i<$pix_target; $i++) {
					$offset = $i*4;
					$rgb .= $cache[$offset+2].$cache[$offset+1].$cache[$offset];
				}
				$pix_last = $pix_target;
			}
			$png = rgb2png($rect['width'], $rect['height'], $rgb);
			$im = imagecreatefromstring($png);
			imagecopy ($img, $im , $rect['x'] , $rect['y'], 0, 0 ,$rect['width'] , $rect['height'] );
		}
		header('Content-Type: image/png');
		imagepng ($img);
	}
这里用到了一个函数，把 rgb 转为 png。
	function rgb2png($width, $height, $data, $gd = false) {
		// png header
		$png = pack('C*', 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
		// compose IHDR chunk
		$IHDR = pack('NN', $width, $height);	// image size
		$IHDR .= pack('C*', 8, 2, 0, 0, 0);		// 8bpp, truecolor, compression, filter, interlace
		// write IHDR chunk
		$png .= pack("N", strlen($IHDR));
		$png .= "IHDR";
		$png .= $IHDR;
		$png .= pack("N", crc32("IHDR".$IHDR));
		// write data
		$img = "";
		for ($i=0;$i<$height;$i++) {
			// prepending a filter type byte (0) to each scanline
			$img .= "\0" . substr($data, ($i * $width * 3), ($width * 3));
		}
		//$img = $data;
		// compress data
		$img = gzcompress($img ,0);	// no compression to get better performance
		$png .= pack("N", strlen($img) );
		$png .= "IDAT";
		$png .= $img;
		$png .= pack("N", crc32("IDAT".$img));
		// end
		$png .= pack("N",0 );
		$png .= "IEND";
		$png .= pack("N", crc32("IEND"));
		return($png);
	}
现在，我只要网页上定期请求帧就可以了。一些最基本的方法如图片压缩，对比，减少图片大小，区域更新等等。
鼠标控制
----
在网页上，利用 `onmousemove`、`onmousedown`、`onmouseup` 就可以捕获鼠标信息，这没什么好说的。但是没必要每次都将 onmousemove 的信息发过去。
比较实际的方案就是做一个压缩队列，把事件放在队列里面，如果比较空闲就慢慢发生，如果堆积就压缩掉一些可能没有用的 onmousemove。
我使用了一个临时简单的方案，定期发送鼠标事件，无视多余 onmousemove，这只能算是临时方案。
	var mouse_x = 0;
	var mouse_y = 0;
	var mouse_down = 0;
	var mouse_down_pending = 0;
	var mouse_down_x = 0;
	var mouse_down_y = 0;
	
	function update() {
		temp_x = mouse_x;
		temp_y = mouse_y;
		if (mouse_down_pending ==1) {
			temp_x = mouse_down_x;
			temp_y = mouse_down_y;
		}
		$.ajax({
			url: './mouse.php?d=' + (mouse_down|mouse_down_pending) + '&x=' + temp_x + '&y=' + temp_y,
			success: function(data) {
				if (data == '1') mouse_down_pending = 0;
			}
		});
	}
	$(document).ready(function() {
		window.ondragstart = function() { return false; }
		setTimeout(update, 50);
	});
	function on_screenshot_mouseover (x, event) {
		mouse_x = event.offsetX;
		mouse_y = event.offsetY;
	}
	function on_screenshot_click (x, event, down) {
		mouse_down = down;
		if (down == 1 && mouse_down_pending == 0) {
			mouse_down_pending = 1;
			mouse_down_x = event.offsetX;
			mouse_down_y = event.offsetY;
		}
	}
注意我使用了 `window.ondragstart = function() { return false; }` 来屏蔽了浏览器的 drag 事件。
而 mouse.php 就很简单了，在 `init` 之后发生 mouse 事件就可以。
	$message = pack('C2n2', 5, intval($_REQUEST['d']), intval($_REQUEST['x']), intval($_REQUEST['y']));
	fwrite($resource, $message);
	echo intval($_REQUEST['d']);
总结
----
再在 javascript 的 update 添加 frame 的更新，整体就是一个单纯的 php 的 VNC 客户端方案。
PHP 部分使用单纯 PHP 默认包即可，无状态，浏览器对于更新 frame 和 捕获鼠标键盘事件都是没啥问题。经过整理，应该可以弄一个不错的方案。
有时间再弄吧。。。
