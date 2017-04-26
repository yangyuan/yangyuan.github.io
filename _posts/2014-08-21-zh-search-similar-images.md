---
layout: post
title: 相似图片比较和搜索的尝试
---


去年研究网盘的时候，发现百度和迅雷都有一定能力识别相似视频文件。百度能够识别出区别不大的两个视频文件（如P2P传输造成的数据错误），迅雷则比较强大，能够识别出一个视频的不同版本，除了它自己转码的版本，其他的不同版本也能识别，甚至能够识别出质量较好的枪版。

百度的实现我能想到的大概就是分片HASH，一个视频文件40个片有39个一样的，那基本肯定就是一个视频。
迅雷的实现就超出我能力判断了，我猜测呢，基本能确定是采样比较，但实现就不得而知了。也许是通过画面、声音的变化曲线来判断，也许实现了另一种专门用于比较的编码，甚至可能是通过全程截图来比较。
虽然全程截图的思路好像很蠢，但是我觉得还是有可能的，因为实现容易，而且迅雷的确有对视频进行了全程的截屏，不过依然只是猜测。

到此，虽然看不出迅雷视频比较是怎么实现的，但是我想试试相似图片识别，这里就用C#简单实现一个。

简单尝试
----
首先，相似图片比较一般用到一个被称为汉明距离的东西，这种技术很适合比较两个长度相同的东西差异有多大。
原理呢，就是每个位置一一比较，计算出一个距离来。汉明距离对于偏移神马的，没什么很好的办法。
图片如果要比较汉明距离，首先要做缩略图。两张图加入缩略图很相似，那么他们就很相似，这很好理解。
## 生成统一尺寸缩略图
	Image image = Image.FromFile(@"image.jpg");
	Bitmap thumbnail = new Bitmap(32, 32);
	Graphics graphics = Graphics.FromImage(thumbnail);
	Rectangle rect = new Rectangle(0, 0, 32, 32);
	graphics.DrawImage(image, rect);
	thumbnail.Save(@"thumbnail.bmp");
这里就是一段缩略图的示例代码，很关键的我没有使用GetThumbnailImage函数，这个函数非常适合生成120*120的缩略图，算法上对120*120做了优化，此外它会优先调用图片自身包含的缩略图信息。
要注意的是，这里生成的缩略图并不适合做汉明距离比较，因为官方的算法似乎有特意的锐化和变形，虽然可以有参数调整它，但是。。。怎么说呢，不同语言不同库里的实现不一样，所以兼容性考虑，还是最好生成一个较大的缩略图，然后自己生成用于计算距离的HASH值，在这里我先忽略这个问题。

好，再看这两个函数
	static int[] hash_compute(string path, int quality)
	{
	    Image image = Image.FromFile(path);
	    Bitmap thumbnail = new Bitmap(quality, quality);
	    Graphics graphics = Graphics.FromImage(thumbnail);
	    Rectangle rect = new Rectangle(0, 0, quality, quality);
	    graphics.DrawImage(image, rect);
	
	    int[] hash = new int[quality * quality];
	    for (int i = 0; i < quality; i++)
	    {
	        for (int j = 0; j < quality; j++)
	        {
	            Color c = thumbnail.GetPixel(i, j);
	            int value = c.R + c.G + c.B;
	            hash[i * quality + j] = value;
	        }
	    }
	
	    return hash;
	}
	
	static int hash_compare(int[] a, int[] b)
	{
	    int result = 0;
	    int length = Math.Min(a.Length, b.Length);
	
	    for (int i = 0; i < length; i++)
	    {
	        int distance = Math.Abs(a[i] - b[i]);
	        if (distance > 144)
	        {
	            result += 1;
	        }
	    }
	    Console.WriteLine(result + "\t" + ((float)result/length));
	    return result;
	}
来看细节：
hash_compute 根据图像生成了一个缩略图N*N，并且将其RGB值加起来，扔进数组里，最后生成N*N的一位数组。
hash_compare 对这个N*N数组，进行比较，如果distance > 144，则+1。

	int[] hash_1 = hash_compute(@"1.jpg", 16);
	int[] hash_2 = hash_compute(@"2.jpg", 16);
	int[] hash_3 = hash_compute(@"3.jpg", 16);
	int[] hash_4 = hash_compute(@"4.jpg", 16);
	
	hash_compare(hash_1, hash_2); // 22
	hash_compare(hash_1, hash_3); // 201
	hash_compare(hash_1, hash_4); // 74

1、2是同一张图的不同大小版本，3是完全不同的一张，4则是1的另一个版本，一个是4：3,一个是1:1。
16、144这两个数字我没有精确调整，因为刚才说到一个问题，就是官方的缩略图算法问题。缩略图大了，比较就失去了意义，缩略图小了，容错性会变差。144就算是给他个容错性。


问题和解决方案
----
### 图片被拉升、大小变化的识别
缩略图是统一尺寸，图片被拉升、大小变化的情况不受影响。
### 图片明暗色调变化的识别
格式化图片的时候，可以尝试统一灰度，即找到平均灰度，再计算灰度差。
### 图片被截取的识别
我实在想不出有什么好办法，图像查找算法是有的，但是如果用于搜索，似乎不能做索引那就太费了。这个算法是不能解决了，通过颜色曲线来查找的办法，也只能对一部分图片试用。也许有其他合适的算法，在正儿八经的产品中应该会使用多个算法吧。
### 海量图像相似查询
可以进行多级索引搜索，如现将目标图片以8*8的方式索引，再以16*16的方式次级索引，等等，这样消耗降低为logN。

尝试和改进
----
上面讲的解决方案都是胡扯，我们来动手改进这个识别算法，要注明的是，图片被截取、明暗、对比度调整的情况都没有处理。
### 缩略图大小
刚才比较的时候，用的是16*16，两个完全一样的图片也有22点色差超过144。
假如调整大小会怎么样？我简单尝试发现，128*128时，1v2差异点达到16个，也就是0.0009左右，图片1大小为180，如果为256*256，则为0.0016，看来放大图片的算法会导致其识别有点影响，但是不是很大。

### 缩略图算法
依然使用128*128，然是使用自己的缩略图算法如何？想了想，在hash_compute里改成这样，大概就是生成256*256图片，然后自己做个1/4均值。
	static int[] hash_compute(string path, int quality)
	{
	    Image image = Image.FromFile(path);
	    Bitmap thumbnail = new Bitmap(quality * 2, quality * 2);
	    Graphics graphics = Graphics.FromImage(thumbnail);
	    Rectangle rect = new Rectangle(0, 0, quality * 2, quality * 2);
	    graphics.DrawImage(image, rect);
	
	    int[] hash = new int[quality * quality];
	    for (int i = 0; i < quality; i++)
	    {
	        for (int j = 0; j < quality; j++)
	        {
	            int value = 0;
	            Color c;
	            c = thumbnail.GetPixel(2 * i, 2 * j);
	            value += c.R + c.G + c.B;
	            c = thumbnail.GetPixel(2 * i, 2 * j + 1);
	            value += c.R + c.G + c.B;
	            c = thumbnail.GetPixel(2 * i + 1, 2 * j);
	            value += c.R + c.G + c.B;
	            c = thumbnail.GetPixel(2 * i + 1, 2 * j + 1);
	            value += c.R + c.G + c.B;
	            hash[i * quality + j] = value / 4;
	        }
	    }
	
	    return hash;
	}
结果，图片1v2的差异下降到0，其他基本不变，如果hash_compare里容错值降低为72，那么1v2的差异为0.0015。要知道distance最大差异是768,72也就是10%的差异我认为还是偏高，所以需要继续改进，仿个JPEG扩散算法（离散余弦）好了。
正式的DCT我写不出，而且比较耗CPU，我写了个弱智版的，也没有用到余弦，因为那算法我还没看懂。
	static int[] hash_compute(string path, int quality)
	{
	    Image image = Image.FromFile(path);
	    Bitmap thumbnail = new Bitmap(quality, quality);
	    Graphics graphics = Graphics.FromImage(thumbnail);
	    Rectangle rect = new Rectangle(0, 0, quality, quality);
	    graphics.DrawImage(image, rect);
	
	
	    int[,] values = new int[quality,quality];
	    for (int i = 0; i < quality; i++)
	    {
	        for (int j = 0; j < quality; j++)
	        {
	            Color c = thumbnail.GetPixel(i, j);
	            values[i, j] = c.R + c.G + c.B;
	        }
	    }
	
	    int[] hash = new int[quality * quality];
	
	    for (int i = 0; i < quality; i++)
	    {
	        for (int j = 0; j < quality; j++)
	        {
	            double value_base = values[i,j];
	            double value = 0;
	            for (int u = i - 2; u <= i + 2; u++)
	            {
	                for (int v = j - 2; v <= j + 2; v++)
	                {
	                    double value_share;
	                    if (u < 0 || v < 0 || v >= quality || u >= quality)
	                    {
	                        value_share = value_base;
	                    }
	                    else
	                    {
	                        value_share = values[u, v];
	                    }
	
	                    int distance = 0;
	                    if (Math.Abs(i - u) == 2 || Math.Abs(j - v) == 2)
	                    {
	                        distance = 4; // 4
	                    }
	                    else if (Math.Abs(i - u) == 1 || Math.Abs(j - v) == 1)
	                    {
	                        distance = 2; // 4
	                    }
	                    else
	                    {
	                        distance = 1; // 1
	                    }
	
	                    value += value_share / distance;
	                }
	            }
	            hash[i * quality + j] = (int)(value/9);
	        }
	    }
	
	    return hash;
	}
这么个玩意儿显得就有点复杂了，关键点呢，原理就是。。。自己的灰度，加上相邻的颜色灰度，以一定权重均匀一下，这样容错性更高，我猜估计跟PS里面的模糊差不多咯。注意一点 GetPixel() 是提前调用了，这玩意儿比较费。
这样的代码在容错144的情况下，普遍相似度都提高了，容错72的情况如下，图1v2为3，图1v3,1v4的差异基本没变。
	3       0.0001831055
	12463   0.7606812
	4575    0.2792358
索性将容错降低到48。
	8       0.0004882813
	14199   0.8666382
	5919    0.3612671
24？
	53      0.003234863
	15872   0.96875
	8764    0.5349121
图1v4明显提升了，这是我不希望的，看来48左右是阈值。
这里是模糊了距离为2的25个点，距离为3呢？试了一下没有明显改进，看到模糊的效果已经过了阈值了。

hash_compare 试了一下变成下面的样子，这样在1v2不变的情况下，1v4数值下降的比1v3块。
	static int hash_compare(int[] a, int[] b)
	{
	    double result = 0;
	    int length = Math.Min(a.Length, b.Length);
	
	    for (int i = 0; i < length; i++)
	    {
	        int distance = Math.Abs(a[i] - b[i]);
	        if (distance <= 32)
	        {
	            result += 0;
	        }
	        else if (distance <= 48)
	        {
	            result += 0.125;
	        }
	        else if (distance <= 64)
	        {
	            result += 0.5;
	        }
	        else if (distance <= 80)
	        {
	            result += 0.875;
	        }
	        else
	        {
	            result += 1;
	        }
	    }
	    Console.WriteLine((int)result + "\t" + (result / length));
	    return (int)result;
	}
输出如下
	8       0.00048828125
	13641   0.832603454589844
	5547    0.338607788085938
刚才说了，1v4的判断没什么能力，因为1是4的一部分，缩略图肯定有大量移位，改进的目的是让移位中重叠接近的部分有更高的分值。

### 额外分析
再次把缩略图宽度改为32呢
	20      0.0196533203125
	840     0.8209228515625
	282     0.275390625
也就是说，在相同图片的情况下，缩略图越大，相似比较越有效。
在近似图片的情况下，缩略图较小，相似度较高。
不同的图片对缩略图大小影响不大。

### 假如
假如做个没技术的搜索，不必要像百度识图那么强大，简单的比较（比如防止别人冒用照片这种需求），怎么样搜索比较方便呢。
我觉得还是之前说的，先采用小缩略图，如4*4，先过滤掉比如1/16的完全不一样的图片，再用32*32过滤，云云，最后确定出数量有限的图片，再采用其他算法比较。
就算4*4，灰度为2，也有65536个可能值，8*8就是天文数字，4*4灰度为3也有四千万个值，有个比较可行的折衷方案呢，就是使用不同算法多次过滤，比如，2*2灰度768 配合 3*3灰度4 配合 4*4灰度2，不过在这种超低分辨率下就不能使用刚才那种缩略图扩散算法了，不然结果都会集中在中庸的灰色！。

总结
----
这是一段很没有啥学术含量，一个码农的瞎掰掰的东西。。。。纯盲人摸象，有空改进改进，再用多点数据试试。
