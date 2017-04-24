---
layout: post
title: ZAM 的【英雄联盟人物模型】格式分析
---

该格式分析是我原创逆向，转载请留个链接。

ZAM Network
----
ZAM Network 在国外还是相当知名的，大致可以看成是国内的大脚和多玩，但是他们更偏向技术和服务，著名的 WOWHEAD 和 LOLKING 就是他们旗下网站。
在 ZAM Network 的旗下网站里，大量使用 Flash 来显示游戏里的 3D 人物模型，我不知道他们是通过官方获取了 3D 模型，还是像我一样逆向出来的，我猜测应该是后者，因为很多东西显示是有问题的。反正我就顺便逆向了一下他们的 3D 模型和渲染过程，虽然逆向的结果不忍直视，但是对我学习 3D 感觉是非常有帮助的。

模型文件
----
模型文件分为三部分，网格、动画、纹理。跟一般 3D 骨骼动画模型里的概念基本一致。
• 网格：.lemsh，包含 vertex、index、bones。
• 动画: .lanim，包含骨骼动画。
• 纹理: .png
这个模型跟 LOL 的原始模型文件 skn 和 skl 是比较接近的，[url]https://code.google.com/p/lolblender/wiki/fileFormats[/url]。

### 二进制格式 FORMAT
所有文件的二进制无外乎使用以下几种格式
[!html]
	<table>
	<tbody>
	<tr><th>CODE   </th><th>LENGTH</th><th>EXTRA</th></tr>
	<tr><td>BYTE   </td><td>8 bit </td><td>     </td></tr>
	<tr><td>UINT16 </td><td>16 bit</td><td>     </td></tr>
	<tr><td>UINT32 </td><td>32 bit</td><td>     </td></tr>
	<tr><td>FLOAT32</td><td>32 bit</td><td>     </td></tr>
	<tr><td>UTF8   </td><td>N/A   </td><td>UINT16 长度 + UTF8 字符串</td></tr>
	</tbody>
	</table>

注意 UTF8 格式里，如果是使用 JAVA 读取，可直接使用 `DataInputStream.readUTF()`，但 C# 的 `BinaryReader.ReadString()` 是不可以的，因为它使用 32bit 的长度定义，C# 可以使用这样的读取方式。
[!code=cs]
	public class DataInputString : BinaryReader
	{
	    public DataInputString(Stream input) : base(input) { }
	    public string ReadUTF()
	    {
	        return new string(ReadChars(ReadUInt16()));
	    }
	}

### .LMESH 文件
[!html]
	<table>
	<tbody>
	<tr><th>ITEM</th><th>FORMAT</th><th>EXTRA</th></tr>
	<tr><td>magic</td><td>UINT32</td><td>为 604210091</td></tr>
	<tr><td>version</td><td>UINT32</td><td> </td></tr>
	<tr><td>animation file</td><td>UTF8</td><td>.lanim</td></tr>
	<tr><td>texture file</td><td>UTF8</td><td>.png</td></tr>
	<tr><td>number meshes</td><td>UINT32</td><td> </td></tr>
	<tr><td>meshes block</td><td>{UTF8, UINT32*4} [ ]</td><td>分别为 名字、vertex 位置、数量、index 位置、数量。</td></tr>
	<tr><td>number vertices</td><td>UINT32</td><td> </td></tr>
	<tr><td>vertices block</td><td>{FLOAT32*3, FLOAT32*3, FLOAT32*2} [ ]</td><td>x, y, z、r, g, b、u, v</td></tr>
	<tr><td>number indices</td><td>UINT32</td><td> </td></tr>
	<tr><td>indices block</td><td>UINT16 [ ]</td><td> </td></tr>
	<tr><td>number bones</td><td>UINT32</td><td> </td></tr>
	<tr><td>bones block</td><td>{UTF8, INT32, FLOAT32, FLOAT32*16} [ ]<br />
	if version >=2 : {UTF8, INT32, FLOAT32, FLOAT32*16, FLOAT32*16} [ ]</td><td>分别为 名字、父级、缩放、base matrix、increase matrix（version >=2）。</td></tr>
	</tbody>
	</table>
 
### .LANIM 文件
[!html]
	<table>
	<tbody>
	<tr><th>ITEM</th><th>FORMAT</th><th>EXTRA</th></tr>
	<tr><td>magic</td><td>UINT32</td><td>为 604210092</td></tr>
	<tr><td>version</td><td>UINT32</td><td> </td></tr>
	<tr><td>animations block</td><td>{UINT32, ANIMATION [ ]}</td><td>动画数量、动画</td></tr>
	</tbody>
	</table>
 
### ANIMATION
若 version >= 2，ANIMATION 是 zlib 压缩的。
[!html]
	<table border="1" cellpadding="3" cellspacing="0" style="width: 100%;">
	<tbody>
	<tr><th>ITEM</th><th>FORMAT</th><th>EXTRA</th></tr>
	<tr><td>name</td><td>UTF8</td><td> </td></tr>
	<tr><td>fps</td><td>UINT32</td><td> </td></tr>
	<tr><td>number bones</td><td>UINT32</td><td> </td></tr>
	<tr><td>bones</td><td>{UINT32, UTF8, UINT32, FRAME [ ]} [ ]</td><td>FRAME 数量、骨骼名称、FLAG、FRAMES</td></tr>
	</tbody></table>
 
### FRAME
[!html]
	<table border="1" cellpadding="3" cellspacing="0" style="width: 100%;">
	<tbody>
	<tr><th>ITEM</th><th>FORMAT</th><th>EXTRA</th></tr>
	<tr><td>pos</td><td>UINT32, UINT32, UINT32</td><td>x, y, z</td></tr>
	<tr><td>rot</td><td>UINT32, UINT32, UINT32, UINT32</td><td>x, y, z, w</td></tr>
	</tbody>
	</table>

### 渲染
这些东西怎么渲染，就不罗嗦了，凡是了解 3D 基础的应该都没有问题，这几天研究 WEBGL，看能不能用 WEBGL 渲染出来。