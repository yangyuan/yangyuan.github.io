---
layout: post
title: HMAC算法：常用的消息验证算法
---

HMAC 本身并没有什么特殊之处，我也不知道为什么这么常用，可能就是简单好用吧。
写SSH客户端的时候，先不知道C#自带了HMAC算法，就生看C++代码写出来了这么一段。

	byte[] data;
	byte[] key;
	
	byte[] key_buffer = new byte[64];
	Array.Clear(key_buffer, 0, key_buffer.Length);
	Array.Copy(key, 0, key_buffer, 0, key.Length);
	
	byte[] padding1 = new byte[64];
	for (int i = 0; i < 64; i++)
	    padding1[i] = (byte)(key_buffer[i] ^ 0x36);
	byte[] padding2 = new byte[64];
	for (int i = 0; i < 64; i++)
	    padding2[i] = (byte)(key_buffer[i] ^ 0x5C);
	
	hash.Initialize();
	hash.TransformBlock(padding1, 0, padding1.Length, padding1, 0);
	hash.TransformFinalBlock(data, 0, data.Length);
	data = (byte[])hash.Hash.Clone();
	hash.Initialize();
	hash.TransformBlock(padding2, 0, padding2.Length, padding2, 0);
	hash.TransformFinalBlock(data, 0, data.Length);

后来用C#自带的HMAC比较了一下，结果一样，为了代码简洁，最后还是用的官方的。