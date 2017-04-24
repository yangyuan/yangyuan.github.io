---
layout: post
title: 蛋疼的工程：利用正则表达式和词法分析来进行语法高亮
---

[!code=php]
写在前面
----
这几天完成了一个想做很久却一直没能实现的东西：使用正则表达式进行词法分析中的来词元分割工作，利用词法分析实现语法高亮。
该实现未在网上找到类似版本。这部分代码已经开源，包含在这个项目中：[url]https://github.com/yangyuan/cms-utils[/url]

理论基础：词法分析
----
学过编译原理的都知道，词法分析，通常做为编译的第一步，用来对源文件进行第一步分析。
一般来说，一个语言的语法可以复杂多样，但是词法却比较精炼有规律，通常词元的扫描器可以使用有限状态自动机实现，而有限状态自动机通常可以使用正则表达式实现。
（我理论学的不太好，好像是这么一回事）
反正软件LEX是一个常用的自动化词法分析器生成工具，其原理就是使用正则和普通C函数实现词法分析，然后可以配合yacc进行语法分析。LEX的存在对我来说是一个不错的理论参考，说明使用纯正则实现词法分析是可行的，但是大部分情况下，LEX并没有完全使用正则实现词法分析。我暂时也无法证明所有的语言都可以使用正则实现词法分析。

不过理论上来说，如果万一出现不可行的情况，词法分析可以做出适当让步。如我们假设AAABBB这种词元由于某种特性无法被识别，那么可以退一步，我们分别实现识别AAA和BBB，而把AAABBB作为两个词元处理。不过目前来看，这只是一个退路，还没遇到这种极端情况。

假设：词法可贪婪
----
这个假设对我至关重要，因为它严重影响了实现的难度。
可贪婪在这里简单描述就是：如果两个词元拥有一样的特性，那么必然有一个优先级高于另一个，且这跟上下文无关。
再换一个表述：一个词元如果符合两个正则，那么必然存在一个优先级，并且这个优先级跟上下文无关的。
再换一个表述：我可以按顺序用正则去匹配词元，找到第一个符合条件的即可。

程序设计
----
基于上面亮点假设，我写出了大致如下的程序结构。
	$list_regex = array ('xxxxxxxxx', 'xxxxxxx', 'xxxxxxxx');
一堆正则表达式，他们单独可以分别匹配比如：“注释”、“变量”、“关键词”之类。
	$regex = merge($list_regex);
把它们合并成一个大正则表达式
	$string = preg_replace_callback($regex,'_callback', $string);
利用正则替换调用它，理论上函数 _callback 能够顺序接收到每一个匹配的词元。我这里只是高亮，所以我在 _callback 函数里做高亮修改后就直接返回。
当然，出于网页显示的需要，数据在处理前，已经进行了一次 htmlspecialchars，所以正则里是需要匹配htmlspecialchars之后的字符串。
程序设计：细节
----
在实际程序设计的过程中，我想让他更加灵活，支持不同语言。
所以我的方案，是把一些共性和特性的正则，放到一个正则库里，并且给它归类。就像这样：
	private static $lib_grep = array (
		'comment_1' => '\/\/.*?(?:\R|$)',
		'comment_2' => '\/\*.*?\*\/',
		'string_1' => '&quot;.*?(?<!\\\\)(?:\\\\\\\\)*&quot;',
		'string_2' => '\'.*?(?<!\\\\)(?:\\\\\\\\)*\'',
		'operator_1' => '&gt;&gt;\=|&lt;&lt;\=|\+\=|\-\=|\*\=|\/\=|%\=|&\=|\^\=||\=|&gt;&gt;|&lt;&lt;|\+\+|\-\-|\-&gt;|&amp;&amp;|\|\||&lt;\=|&gt;\=|\=\=|!\=|;|\{|&lt;%|\}|%&gt;|,|:|\=|\(|\)|\[|&lt;:|\]|:&gt;|\.|&amp;|!|~|\-|\+|\*|\/|%|&lt;|&gt;|\^|\||\?',
		'number_1' => '(?<!\w)0x[\da-f]+|\d+(?!\w)',
		'token_1' => '(?<![\w\d])[a-zA-Z_]+\w*(?!\w)',
		'variable_1' => '(?<!\w)(?:\$)(?:\w)+(?!\w)',
		'macro_1' => '(?<!\w)(?:\#)(?:\w)+(?!\w)',
		'keyword_1' => '(?<![\w\d])(?:auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|NULL)(?!\w)',
	);
此外有个库，用来记录每种类型词元用什么css类进行高亮。
	private static $lib_style = array (
		'comment' => 'c_c',
		'string' => 'c_s',
		'operator' => 'c_o',
		'number' => 'c_n',
		'variable' => 'c_v',
		'keyword' => 'c_k',
		'function' => 'c_f',
		'macro' => 'c_k',
		'tag' => 'c_t',
		'xml' => 'c_x',
	);
当然还得有个方法，用来把他们拼成两个长度相同的数组（这里为了效率考虑我使用的是两个数组）。
	private function prepare_preg($type, $grep) {
		array_push($this->list_preg, self::$lib_grep[$grep]);
		array_push($this->list_style, self::$lib_style[$type]);
		array_push($this->list_type, $type);
	}
这样一来，就可以使用这样的方法，生成一套词法分析器，这里是C语言的。
	$this->prepare_preg('comment', 'comment_1');
	$this->prepare_preg('comment', 'comment_2');
	$this->prepare_preg('string', 'string_1');
	$this->prepare_preg('string', 'string_2');
	$this->prepare_preg('operator', 'operator_2');
	$this->prepare_preg('operator', 'operator_3');
	$this->prepare_preg('number', 'number_1');
	$this->prepare_preg('keyword', 'keyword_1');
	$this->prepare_preg('macro', 'macro_1');
拼接执行的代码也很简单
	$regex = '/('.(implode(')|(', $this->list_preg)).')/s';
	// echo htmlspecialchars($regex); // 这里生成的也可以单独拿出来用
	$string = preg_replace_callback($regex, array( &$this, '_callback'), $string);
	private function _callback( $matches ) {
		$index = count($matches)-2;
		$token = $matches[0];
		return '<span class="'.$this->list_style[$index].'">'.$token.'</span>';
	}
### 注意：
_callback 函数，利用了两个特性：
1、$matches数量-2，能够识别出是第一个正则匹配出来的。（这句话如果看不到，可以尝试 print_r($matches);）非常直观。
2、第一个正则匹配出来的，对应的css类就在$this->list_style的第几个元素中。

程序设计：扩展
----
### 扩展词法
不同的语言有共性的，也有不共性的，比如PHP的大部分是和C语言一样的，第一个明显的不同，就是变量的识别。PHP使用$符号识别变量，那么就可以使用下面的正则匹配。
	'variable_1' => '(?<!\w)(?:\$)(?:\w)+(?!\w)',
再加一点关键词
	'keyword_2' => '(?<![\w\d])(?:public|private|class|self|function|null|foreach|as|new|TRUE|true|FALSE|false|global|try|catch|array)(?!\w)',
### 识别常用函数、常量
这本身应该是语法的一部分，但是鉴于高亮的需要，加一点常用函数不影响大局。
	'function_1' => '(?<![\w\d])(?:echo|require|include|count|strlen)(?!\w)',
但私以为这是复发的部分，如果通过词法关键词来识别，是个无底洞，而且不靠谱，不应该加太多。只要加echo、count这种常用的即可。
类似的方法可以处理如 $_REQUEST 之类的全局常量变量。

程序设计：用其他语言实现
----
一般来说，用PHP实现了，用其他语言都应该可类似实现，又不是做库，没必要每个语言写一遍。
但是JAVASCRIPT的实现有两个特殊的意义：
1、网页上的渲染，有延时但不占用服务器CPU。
2、可以利用实现网页上的词法、语法分析！