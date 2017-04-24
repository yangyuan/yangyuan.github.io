---
layout: post
title: 编程生成PEM格式的RSA公钥（PHP实现）
---

PEM 格式是一个常见通用的密钥格式，可惜目前 PHP 内置的函数并不支持直接生成一个 PEM 文件。但这个需求是偶尔会出现的，比如用一个系统可能希望支持用密钥登录，那么系统很可能就需要生成 PEM 让用户下载。这里介绍如何从一个 KEY 生成到一个 PEM 格式文件。

PEM 格式RSA公钥细节
----
### 整体结构
一个PEM格式的公钥通常看上去是这个样子

	-----BEGIN PUBLIC KEY-----
	MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgOsqOFaGYYh/oYC921yr1fIce/1ZwJDLLSRah6wl
	MGKIJykpPlUGNQUI5/mqO7d/QzMjFJD5FfbWPFX+LwikmzU/RErTmTyswC23hKu7jkKpsbv/+zi+
	GNeOh6DkG5uPc6ko7gzO4fZzmIS5d35P6eiKG75JWSesSnmbMYHWRCRDAgMBAAE=
	-----END PUBLIC KEY-----

头尾除外，中间是一段base64，其二进制数据如下。

	30 81 9e 30 0d 06 09 2a 86 48 86 f7 0d 01 01 01
	05 00 03 81 8c 00 30 81 88 02 81 80 eb 2a 38 56
	86 61 88 7f a1 80 bd db 5c ab d5 f2 1c 7b fd 59
	c0 90 cb 2d 24 5a 87 ac 25 30 62 88 27 29 29 3e
	55 06 35 05 08 e7 f9 aa 3b b7 7f 43 33 23 14 90
	f9 15 f6 d6 3c 55 fe 2f 08 a4 9b 35 3f 44 4a d3
	99 3c ac c0 2d b7 84 ab bb 8e 42 a9 b1 bb ff fb
	38 be 18 d7 8e 87 a0 e4 1b 9b 8f 73 a9 28 ee 0c
	ce e1 f6 73 98 84 b9 77 7e 4f e9 e8 8a 1b be 49
	59 27 ac 4a 79 9b 31 81 d6 44 24 43 02 03 01 00
	01

它是一段嵌套的数据，基本可以归类为：
	[标识] [长度] [数据]
当然，[数据]的格式是啥样，取决于[标识]
事实上，这里使用的是一个叫ASN.1的格式，该格式基本遵从以上原则。

### 公钥头部
30 标识
81 9e 长度（ASN.1格式）
30 0d 06 09 2a 86 48 86 f7 0d 01 01 01 05 00，即 MA0GCSqGSIb3DQEBAQUA，为 RSA OID，其中 00 猜测为结尾标识
剩下的为公钥正文

### 公钥正文1
	03
	81 8c
	00
	30 81 88 02 81 80 eb 2a 38 56 86 61 88 7f a1 80
	bd db 5c ab d5 f2 1c 7b fd 59 c0 90 cb 2d 24 5a
	87 ac 25 30 62 88 27 29 29 3e 55 06 35 05 08 e7
	f9 aa 3b b7 7f 43 33 23 14 90 f9 15 f6 d6 3c 55
	fe 2f 08 a4 9b 35 3f 44 4a d3 99 3c ac c0 2d b7
	84 ab bb 8e 42 a9 b1 bb ff fb 38 be 18 d7 8e 87
	a0 e4 1b 9b 8f 73 a9 28 ee 0c ce e1 f6 73 98 84
	b9 77 7e 4f e9 e8 8a 1b be 49 59 27 ac 4a 79 9b
	31 81 d6 44 24 43 02 03 01 00 01
03 一个标识。
81 8c 长度
00 应该代表某个结尾
30 依然是个固定头，暂时不知道啥意思。
81 88 则是长度

### 公钥正文2
	30
	81 88
	
	02
	81 80
	eb 2a 38 56 86 61 88 7f a1 80 bd db 5c ab d5 f2
	1c 7b fd 59 c0 90 cb 2d 24 5a 87 ac 25 30 62 88
	27 29 29 3e 55 06 35 05 08 e7 f9 aa 3b b7 7f 43
	33 23 14 90 f9 15 f6 d6 3c 55 fe 2f 08 a4 9b 35
	3f 44 4a d3 99 3c ac c0 2d b7 84 ab bb 8e 42 a9
	b1 bb ff fb 38 be 18 d7 8e 87 a0 e4 1b 9b 8f 73
	a9 28 ee 0c ce e1 f6 73 98 84 b9 77 7e 4f e9 e8
	8a 1b be 49 59 27 ac 4a 79 9b 31 81 d6 44 24 43
	
	02
	03
	01 00 01
30 标识。
81 88 长度
02 标识。
81 80 长度
剩下的为N
02 标识。
03 长度
剩下的为E

### ASN.1 长度
刚才涉及到一些长度，如
	81 9e
	81 88
	03
这个长度使用的是专用的格式。
如81的二进制是 1000 0001，03的二进制是 0000 0011。
前者的第一位是1，后者的第一位是0，这是代表两种不同的意义。
第一位是0，代表它本身就是数据的长度。如03就代表长度为3。
第一位是1，表示这个字节里的数据（除了第一位的1），代表了长度部分的长度。
如 81 88，拆分成3部分，80，01，88。其中80就是第一位的1，01代表长度部分有1个字节，88则代表长度。
[!code=php]
在大部分开源项目中大多使用这样的实现。
	function asn1_length($length)
	{
		if ($length <= 0x7F) {
			return chr($length);
		}
		
		$temp = ltrim(pack('N', $length), chr(0));
		return pack('Ca*', 0x80 | strlen($temp), $temp);
	}
并不完全符合标准，主要是
	pack('N', $length);
限制了其范围，但是基本够用了。关键点也在pack('N');转为大头长整形之后，利用ltrim去除左边多余的0，然后在pack打包。

编程生成公钥
----
下面是根据上面的分析写出来的一个生成代码。
没有严谨的包装，纯粹是拼接，所以仅供参考。（理论上这段代码可以写成很漂亮的递归打包。）
	function rsa_pkey($exponent, $modulus) {
		$modulus = pack('Ca*a*', 0x02, asn1_length(strlen($modulus)), $modulus);
	    $exponent = pack('Ca*a*', 0x02, asn1_length(strlen($exponent)), $exponent);
		$oid = pack('H*', '300d06092a864886f70d0101010500'); // MA0GCSqGSIb3DQEBAQUA，这段我也特么不知道是啥
		
		$pkey =	$modulus.$exponent;
		$pkey = pack('Ca*a*', 0x30, asn1_length(strlen($pkey)), $pkey);
		$pkey = pack('Ca*', 0x00, $pkey);
		$pkey = pack('Ca*a*', 0x03, asn1_length(strlen($pkey)), $pkey);
		$pkey = $oid.$pkey;
		$pkey = pack('Ca*a*', 0x30, asn1_length(strlen($pkey)), $pkey);
		$pkey = '-----BEGIN PUBLIC KEY-----'."\r\n".chunk_split(base64_encode($pkey)).'-----END PUBLIC KEY-----';
		return $pkey;
	}
其中$exponent和$modulus分别是二进制状态下的E和N，可以使用hex2bin函数转化。