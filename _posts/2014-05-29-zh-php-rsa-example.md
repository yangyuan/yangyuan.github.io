---
layout: post
title: 一个RSA加密的实际数学和编程实现过程（累觉不爱）
---

作为一个开发人员，用到 RSA 是常有的事情。但大多数开发人员对 RSA 一知半解。看见同事讨论的时候我比较纠结，看着他们犯了明显的错误（比如把私钥拷贝的人手一份），但我又无法用知识去纠正说服，于是我决定深入了解一下。这TM是啥，这TM又是啥。。。我一晚上就是这么过来的。


PHP & 字符串
----
C语言里字符串的实现是通过char数组实现。'\0' 是它结束的标志，函数如strlen均以'\0'为参考。
这个特性决定了C语言里的字符串，跟char数组完全脱离了关系。
字符串里不会包含'\0'，并且字符串长度跟数组长度无关。很多情况，字符串并非存在数组里，只是可以看成是在数组里而已。

PHP里则是完全不一样的情况。
```
	echo strlen('xxx')."\r\n";
	echo strlen('xxx'."\0")."\r\n"; // 双引号哟
```
这样的代码输出分别是3、4。也就是在PHP中，可以认为字符串就是一个char数组。
这个特性也意味着所有字符串函数，都可以用来处理二进制块，而不需要担心里面存在"\0"（注意这里是双引号）。

M^E ≡ C (mod N)
----
### 加密过程
通常你会看到这么个公式： M[sup]e[/sup] ≡ C (mod N)
≡ 符合代表同余数，这里就是  M[sup]e[/sup] % N = C % N
实际情况下，我们会把被加密的东西，转化为M，E通常取如65537即0x10001，N为公钥。
求C这个东西在数学上叫模幂运算（Modular Exponentiation）。
### 公钥
这里，N就是公钥，如果我们加密数据是用客户端发到服务器，那么通常由服务器生成N和决定E，并传给客户端。
客户端拿着N和E，根据M来计算C，再发给服务器。N的长度，就是我们通常说的密钥位数。
### M 的生成
M由被加密的数据生成，由于公式M[sup]e[/sup] ≡ C (mod N)，那么M不能大于某个值，否则就没法解密了（为啥没法解密？。。。额，数学问题，我说不清）。
因此，通常把被加密数据切块，再填充，然后生成M。填充方式有几种，最常见通用的是PKCS1_PADDING，下面就以PKCS1_PADDING举例。
块的长度为密钥长度-11（数学决定的）。
M的最终二进制字符串形式为：
```
	// $type 为填充方式，通常默认为2，代表填充0，如果为1代表填充1。
	// $padding 为填充数据，具体取决于加密参数，通常为一串随机字符串，最终以"\0"结尾。
	$m = "\0".$type.$padding."xxxxxxxxxx";
	// 注意，最终$m的长度必然等于密钥长度
```
转化完了之后，M就可以作为一个大整数，去进行模幂运算了。
### 模幂运算
PHP5里自带的BC函数bcpowmod有大小限制，就算调用其他BC函数组合，依然是有大小限制的。
数学很简单，主要就是大数运算，但感觉性能不佳，在很多实现里，是调用非默认PHP组件实现的，最终没有采用。

调用 OPENSSL 组件
----
看过一个大数实现，其中模幂运算是调用openssl_public_encrypt实现的。。。openssl组件内置于PHP中，其性能肯定是很优秀的，主要是在KEY的格式上比较有限制，只能识别如PEM格式的key。
	bool openssl_public_encrypt ( string $data , string &$crypted , mixed $key [, int $padding = OPENSSL_PKCS1_PADDING ] )
其中第三参数可以为一个key资源，也可以是一个PEM格式的字符串。
如果是个资源，那么对需要通过函数生成，比如openssl_pkey_new，这些函数对环境要求较高。所以比较简单的方案，就是拼接一个PEM格式的公钥即可。
细节可参考这里 [url]post.php?id=1037[/url]
### 关于PADDING
之前说过对于M，是要采用切片和填充的方式，生成合适的数据进行模幂运算。
对于OPENSSL来说，常见的填错方式，如OPENSSL_PKCS1_PADDING、OPENSSL_NO_PADDING会生成不同的数据。因此一定要保证加密和解密过程中使用同一种PADDING。
```php
function rsa_encrypt($message, $e, $n) {
	$exponent = hex2bin($e);
	$modulus = hex2bin($n);
	$pkey = rsa_pkey($exponent, $modulus);
	openssl_public_encrypt($message, $result, $pkey, OPENSSL_PKCS1_PADDING);
	return $result;
}

function rsa_encrypt($message, $e, $n) {
	$exponent = hex2bin($e);
	$modulus = hex2bin($n);
	$pkey = rsa_pkey($exponent, $modulus);
	
	$length = strlen($modulus);
	$length_padding = $length - strlen($message) - 2;
	$padding = "\x00";
	while (strlen($padding) < $length_padding) {
		$padding = "\xFF".$padding;
	}
	$message = "\0\2".$padding.$message;
	
	openssl_public_encrypt($message, $result, $pkey, OPENSSL_NO_PADDING);
	return $result;
}
```
在数据不超出范围的情况下，两种函数的效果应该均有效。
当然这加密后的数据是二进制的，可以使用bin2hex转化并且显示。