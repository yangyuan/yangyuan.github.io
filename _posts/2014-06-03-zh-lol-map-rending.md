---
layout: post
title: 《英雄联盟》地图格式分析（含分析过程）
---




这些分析是参考赛季四早期地图制作，赛季五之后的地图没有做分析，估计已经完全不一样了。这些都是我自己的分析哇，不是官方的呀，被我误导了不要来找我啊啊啊啊。。。

这篇文章其实老早用英文发过，没啥关注度就没有继续研究，数据也采集自老版本的英文客户端，跟新版本应该有少量差距。
本身并没有太多D3D营养，只是数据的逆向分析。

一个地图场景主要由以下几部分组成
room.nvr, room.mat, room.dsc
.scb 和 .scos 文件
Texture 和 AuxTexture 文件夹
CFG 文件夹

ROOM.NVR
----
room.nvr 是地图的主文件，其内容大概可以由这个C语言结构来概括。
	struct lol_nvr {
		char magic[4];
		unsigned short unknown_1;
		unsigned short unknown_2;
		unsigned int count_material;
		unsigned int count_vertex_list;
		unsigned int count_index_list;
		unsigned int count_model;
		unsigned int count_unknown_3;
		lol_nvr_material * materials;
		lol_nvr_vertex_list * vertex_lists;
		lol_nvr_index_list * index_lists;
		lol_nvr_model * models;
		lol_nvr_unknow3 * unknown_3s;
	};
### magic
数值为 "NVR\0	"，
### unknown_1、unknown_2
数值为 9、1 应该是版本标志。
### count_*
对象的计数器。
其中 count_vertex_list 和 count_index_list 理论上应该相同。
### materials
材质数据
### vertex_lists 和 index_lists
定点和顶点索引数据
### models
模型，模型的定点和索引，在 vertex_lists 和 index_lists 中。
### unknown_3s
还不清楚咯。可能是一些地图细节动画呀，粒子信息啊啥的。

对象结构细节
----
	struct lol_nvr_material {
		char name[256];
		float emissive_color[3];
		float blend_color[4];
		char texture_filename[336];
		float opacity;
		char blend_filename[2364];
	};
	struct lol_nvr_vertex_list {
		int size;
		float * vertices;
	};

	struct lol_nvr_index_list {
		int size;
		unsigned d3dfmt; // = D3DFMT_INDEX16
		unsigned short * indices;
	};
	
	struct lol_nvr_model {
		int flag_1;
		int flag_2;
		float b[10];
		int material;
		int model[12];
	};
	
	struct lol_nvr_unknown_3 {
		float a[6];
		int b[4];
	};
熟悉3D的话，多数很容易看懂。
额外的，lol_nvr_vertex_list.vertices 和 lol_nvr_model.model有一些细节问题：

lol_nvr_vertex_list.vertices 可能有下面两种情况
	struct lol_nvr_vertex_1 {
		float position[3];
		float normals[3];
		float uv[2];
		char unknow[4];
	};
	struct lol_nvr_vertex_2 {
		float position[3];
	};
lol_nvr_model.model 则包含了两个这样的结构
	struct lol_nvr_model_model {
		int vetex_index;
		int vetex_offset;
		int vetex_length;
		int index_index;
		int index_offset;
		int index_length;
	};
第一个指向一个lol_nvr_vertex_1，第二个则指向一个lol_nvr_vertex_2。

其他信息
----
Material 的材质文件能够在 Texture 文件夹找到，但是是以 .dds 结尾，而非.tga。

## 场景构成

英雄联盟里，地图就是一个大场景（3D 里的 Scene）。这个 Scene 的核心就是 room，然后再加上一些边边角角的东西。
涉及到以下文件和文件夹：

* [b]ROOM[/b]：room.nvr、room.mat、room.dsc
* [b]其他场景文件[/b]：.scb & .scos
* [b]文理[/b]：texture 和 auxtexture 文件夹
* [b]配置[/b]：cfg 文件夹

## ROOM.NVR

room.nvr 可以看成是这样的 C 结构

```cpp
struct lol_nvr {
    char magic[4];
    unsigned short unknown_1;
    unsigned short unknown_2;
    unsigned int count_material;
    unsigned int count_vertex_list;
    unsigned int count_index_list;
    unsigned int count_model;
    unsigned int count_unknown_3;
    lol_nvr_material * materials;
    lol_nvr_vertex_list * vertex_lists;
    lol_nvr_index_list * index_lists;
    lol_nvr_model * models;
    lol_nvr_unknow3 * unknown_3s;
};
```
详细说明如下：


<table border="1" cellpadding="3" cellspacing="0" style="width: 100%;">
<tbody>
<tr><th>SEGMENT</th><th>SAMPLE</th><th>INFO</th></tr>
<tr><td>magic</td><td>NVR\0</td><td></td></tr>
<tr><td>unknown_1<br />unknown_2</td><td>9<br />1</td><td>应该是版本号</td></tr>
<tr><td>count_material<br />count_vertex_list<br />count_index_list<br />count_model<br />count_unknown_3</td><td></td><td>各种 count<br />count_vertex_list 和 count_index_list 相等</td></tr>
<tr><td>materials</td><td></td><td></td></tr>
<tr><td>vertex_lists<br />index_lists</td><td></td><td></td></tr>
<tr><td>models</td><td></td><td>model 数组，model 里包含了 vertex 和 index 的索引。</td></tr>
<tr><td>unknown_3s</td><td></td><td>不确定是什么，但是可以确定有 models 的索引，可能是 model 的 particle 或者 animation 什么的。</td></tr>
</tbody>
</table>

### MATERIAL 材质
```cpp
struct lol_nvr_material {
    char name[256];
    float emissive_color[3];
    float blend_color[4];
    char texture_filename[336];
    float opacity;
    char blend_filename[2364];
};
```
模型的材质都存放在 Texture 文件夹下，格式有很多种，但大多数是 dds 格式的，结构里所用的后缀名可能跟实际资源文件不一致。如果自己渲染，可以手动统一转换成 dds 什么的。

### VERTEX
```cpp
struct lol_nvr_vertex_list {
    int size;
    float * vertices;
};
```
`vertices` 是以下可能性二选一
```cpp
struct lol_nvr_vertex_1 {
    float position[3];
    float normals[3];
    float uv[2];
    char unknow[4];
};
struct lol_nvr_vertex_2 {
    float position[3];
};
```
### INDEX
```cpp
struct lol_nvr_index_list {
    int size;
    unsigned d3dfmt; // = D3DFMT_INDEX16
    unsigned short * indices;
};
```
### MODEL 模型
```cpp
struct lol_nvr_model {
    int flag_1;
    int flag_2;
    float b[10];
    int material;
    int model[12];
};
```
`model` 包含两个这个的结构 struct:
```cpp
struct lol_nvr_model_model {
    int vetex_index;
    int vetex_offset;
    int vetex_length;
    int index_index;
    int index_offset;
    int index_length;
};
```
第一个指向一个 `lol_nvr_vertex_1`，第二个指向一个 `lol_nvr_vertex_2`，这两个结构合成了一个物体模型。
### 其他
```cpp
struct lol_nvr_unknown_3 {
    float a[6];
    int b[4];
};
```

## 渲染结果

基于刚才的渲染数据，熟悉 D3D 的人可以很快渲染出这样的效果。
渲染的时候我电脑快卡死了，因为我是靠 CPU 来解析模型，实际上是可以使用 Shader 的，这样可以用 GPU 来辅助大部分计算工作。
[s]（我才不会告诉你我不会用 Shader 奈）[/s]

<img src="{{ site.url }}/assets/images/lol-map-rending-1.jpg" width="500">
<img src="{{ site.url }}/assets/images/lol-map-rending-2.jpg" width="500">

## 逗比过程

流水账。。。
### 解压缩素材文件
使用 Dargon 工具解压缩了所有素材文件, 国外有很多研究和制作 LOL 英雄模型的网站, 他们提供了一些工具也可用.
### 找到地图素材
简单搜索发现 LEVELS 目录下有几个 Map 打头的文件夹, 应该就是地图目录了.
里面理论上应该有模型, 材质, 其他素材, 还有部分逻辑.
里面有个文件夹叫 Scene, 做 3D 都知道这是 3D 场景的术语, 那里面应该基本上都是场景相关的东西了.
### 分析场景文件夹
打开里面有 AuxTextures、CFG、Textures 三个文件夹，一堆 scb 和 sco 文件，以及 room.dsc、room.mat、room.nvr。
Aux 不知道代表啥，但应该都是材质和配置文件，果然 AuxTextures 和 Textures 里基本都是dds文件。
scb 和 sco 有一大部分是一一对应的，但是有个别 scb 没有对应sco，一般都是1-2k大小。我猜测他们是一个个小素材，后来证明我错了。

![alt text]({{ site.url }}/assets/images/lol-map-rending-6.jpg)

room.nvr 异常的大，而且是唯一一个大的能容纳的下地图的文件，所以我猜地图文件就是它了。
网上搜 `lol nvr`，资料非常的少。一般国外论坛改 LOL 只是改改皮肤，很少有人研究 nvr 文件，个别有人问也没有结果。leaguecraft 有个帖子指向了一个韩国论坛，一个韩国人似乎研究出了模型的网格格式，并且给出了杂色渲染图。

![alt text]({{ site.url }}/assets/images/lol-map-rending-3.jpg)

并且提供了一个不知道哪里来的 NVRFormat.txt
```cpp
	struct NVR {
		char magic[4] = 'NVR\0';
		unsigned short unk1 = 9;
		unsigned short unk2 = 1;
		unsigned nLayers = 26;
		unsigned unk3 = 33;
		unsigned unk4 = 33;
		unsigned unk5 = 1413; // mapx?
		unsigned unk6 = 984; // mapy?
		material_layer layers[nLayers];
		unsigned unk7 = 504;
		// lotsa floating-point data starts here!
		float data[???];
	}
	// size = 2988
	struct material_layer {
		char materialname[256];
		float3 emissiveColor;
		// I suspect this corresponds with the Color24 field of the room.mat materials file
		float4 blendcolor; // either RGBA or BGRA
		char filename[336];
		float one1; = 1.0f // This is probably the Opacity value from room.mat
		// This corresponds with EmissiveTexture in room.mat
		char transparency_filename[2364]; // optional, starts with '\0' if not present
	};
```
这个TXT非常粗略，但是却给了我很好的思路，很快我发现这个格式跟其它 LOL 模型格式有着相似的特性：
```cpp
	{
		magic
		some data like version
		item1_count;
		item2_count;
		...
		item1_list;
		item2_list;
		...
	}:
```
在各个 item list 里，也是以典型的 `{length; data;}` 的格式存放。

照着这个思路，我很快发现了这个文件有 4 个大的 list，前两个 list 长度一样，第一个里面是一个个 float 数组，第二个里是一个个 short int 数组。（至于怎么看出来的，这就是经验和直觉了，如果你是程序员，你会怎么安排这些二进制数据，你会用什么精确程度云云。）

那我猜测整个地图模型是由多个模型组成，每个模型有 vertex 列表和 index 列表，vertex 是 float，index 似乎是 short int，但是前面始终有个int 101，它应该是 `D3DFMT_INDEX16`。

vertex 内部又是什么格式呢？简单解析后发现，vertex 段数据里，每隔 8 个 float 就出现一个 `0xFF000000`，很显然这 9 个 float 属于一个结构体。这 9 个 float，前三个一般在 0-3000 之间，后五个在 0-1 之间，那我猜格式八成是：
```cpp
	{
		float position[3];
		float normal[3];
		float texcoord[2];
		dword unknow;
	}
```
依据这个猜测带回去解析，发现个别不符合，并且他们的索引里最高都达到理论值的 3 倍。
那我猜测，还有一部分 vertex 格式是这样：
```cpp
	{
		float position[3];
	}
```
这样就说得通了，但是游戏是靠什么来识别的呢？没有材质？！猜测八成是靠配合 sco 和 scb 来显示。
接下来我用随机颜色渲染整个地图, 果然跟我想的一样：

![alt text]({{ site.url }}/assets/images/lol-map-rending-4.jpg)

这样整个模型的基本架构就出来了。

### 分析材质

接下来是材质，材质也是个列表，但是怎么跟这些模型对应呢？我先尝试手动匹配，树比较好识别，就用树了。

树在模型里的索引是 11-16，树在材质里的索引是 10-14，很显然在数量上就不匹配，应该不是一一对应的。

Map1 为例，前 85 个模型是有 normal 和 nv 的，材质描述有76个。room.mat 里面是一个个纯文本材质描述，刚好也是85个，这你妹再不是一一对应我就去撞墙了。

可是这 85 个有 82 个有材质图片，有 6 个还有额外的材质图片。前3个没有材质图片，却有似乎有意义的名字，比如 Wall_Of_Grass，lambert1 什么的。room.mat 里面树的描述在20个左右。

那我猜，材质有两种情况，一种是直接一个图片，一种是一组图片，用名字识别。

![alt text]({{ site.url }}/assets/images/lol-map-rending-5.jpg)

要解释这些东西，就必须搞懂 `dword unknow`，或者后面未识别的两个 list。

两个 list 长度分别是 3982 和 2629，我唯一能确定的就是他们肯定不是长和宽，他们的格式可能分别是这样：```cpp
	struct lol_unk5 {
	       int a[2];
	       float b[10];
	       int c[13];
	};
	struct lol_unk6 {
	       float a[6];
	       int b[4];
	};
```
`lol_unk6` 比较诡异，`b[3]`在大多数情况下数值为 0，到大概 2611 开始变成 4。`b[0]` 一直保持增长，并且数值都比自己在 unk6 的索引大大概 50% 左右，到最后一个突然变成 0。`b[1]` 变化无规律，但是在最后一个数值为 3982，刚好是 unk5 的长度，所以我猜测，整个 b 就是 lol_unk5 的索引。什么情况下会有这么个索引呢？ 还是绑定多个，常见的如骨骼动画，vertex 绑定 bone。难道这地图里还有骨骼动画....恐慌中... 反正最后没看出来。

`lol_unk5` 就更诡异了，a 基本都是 `{-100, 0}`，但 `a[0]` 也有 1-3，基本能确定是个标志位。

`c[0]` 的变化范围是 0-75，材质刚好 76 个，所以应该是材质的 id。剩下的 12 个变化诡异了，不过能看出来是 4 个 "索引, 偏移, 大小"

进一步研究发现，是两个 `{ index索引, index偏移, index大小, vertex索引, vertex偏移, vertex大小}` 之类的东西。是两个哟，我猜可能后者对应的是前者的不同状态，或者额外渲染参数，比如特效或者模型细节什么的，反正最后我只渲染了前面前者。
