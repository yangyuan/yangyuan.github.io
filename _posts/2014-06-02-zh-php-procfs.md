---
layout: post
title: PHP-PROCFS
---

PHP 的简单解析 PROCFS 的东西，原本是要给单位的私有云添加简单的监控功能，可是单位团队的设计原则是把这功能加入 Ceilometer，所以这部分代码就用不到了。我自己觉得这个挺好用的，单向读取，PHP 权限较低也比较安全，所以就放出代码来。

相比纯字符串解析，PHP-PROCFS 使用正则简化代码和加速，生成 PHP 数据，可方便地转换为 JSON 等格式。

### MEMINFO
/proc/meminfo 大致长成这样
	MemTotal:        1010504 kB
	MemFree:          774888 kB
	Buffers:           11444 kB
	....
解析方法，注意Value部分没有做单位转换。
```php
	function proc_meminfo()
	{
		$meminfo = array();
		$count = preg_match_all('/(?<=^|[\r\n])([^:]+?)\s*:\s*(.*)(?=$|[\r\n])/', file_get_contents("/proc/meminfo"), $matches);
		for ($i=0; $i<$count; $i++) {
			$meminfo[$matches[1][$i]] = $matches[2][$i];
		}
		return $meminfo;
	}
```
事实上这个操作很通用，所以我改写成这样。
```php
	function general_map($content)
	{
		$map = array();
		$count = preg_match_all('/(?<=^|[\r\n])([^:]+?)\s*:\s*(.*)(?=$|[\r\n])/', $content, $matches);
		for ($i=0; $i<$count; $i++) {
			$map[$matches[1][$i]] = $matches[2][$i];
		}
		return $map;
	}
	function proc_meminfo()
	{
		return general_map(file_get_contents("/proc/meminfo"));
	}
```
开始考虑过是否需要做单位转换，但是考虑到我对这块不了解，怕有什么特例情况，所以先这样了。
当然一个转换函数还是有必要写的
```php
	function system_byteval($content)
	{
	    $count = preg_match('/(\d+)\s*(\w+)/', $content, $matches);
		if ($count == 0) return intval($content)
	    $unit = strtolower($matches[2]);
		$result = intval($matches[1]);
	    switch ($unit) {
	    case 'kb':
	        $result = $result*1024;
	        break;
	    case 'mb':
	        $result = $result*1024*1024;
	        break;
	    case 'gb':
	        $result = $result*1024*1024*1024;
	        break;
	    case 'tb':
	        $result = $result*1024*1024*1024*1024;
	        break;
	    default:
	        break;
	    }
	    return $result;
	}
```
### CPUINFO
/proc/cpuinfo 的格式跟 meminfo稍稍有点不同。
```
	processor       : 0
	vendor_id       : GenuineIntel
	cpu family      : 6
	model           : 69
	model name      : Intel(R) Core(TM) i5-4288U CPU @ 2.60GHz
	...
	cpuid level     : 13
	wp              : yes
	flags           : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts mmx fxsr sse sse2 ss syscall nx pdpe1gb ...
	bogomips        : 5199.99
	...
	power management:
```
如果没有特殊需求，可直接使用 general_map。
	function proc_cpuinfo()
	{
		return general_map(file_get_contents("/proc/cpuinfo"));
	}
同样的，flags字段是可以考虑做分割的，暂时也没有做分割。
### STAT
/proc/stat 则不一样，他实际上看上去像一片内存，总之是个数字数组。
```
	cpu  400 214 1003 282543 18 185 0 0 0 0
	cpu0 400 214 1003 282543 18 185 0 0 0 0
	intr 58560 53 10 0 0 0 0 2 0 1 0 0 0 152 0 0 0 0 4505 158 4592 .... 好多好多数字
	ctxt 123219
	btime 1401680123
	processes 1403
	procs_running 3
	procs_blocked 0
	softirq 48506 1 35077 571 4590 5818 0 57 0 15 2377

	function proc_stat()
	{
		$stat = array();
		$count = preg_match_all('/(?<=^|[\r\n])([^\s]+)\s+(.*)(?=$|[\r\n])/', file_get_contents("/proc/stat"), $matches);
		for ($i=0; $i<$count; $i++) {
			$stat[$matches[1][$i]] = preg_split ('/\s+/', $matches[2][$i], 0, PREG_SPLIT_NO_EMPTY);
		}
		return $stat;
	}
```
### DISKSTATS
/proc/diskstats 的第一个值（设备类型）和第二个值（设备索引），联合起来是一个键，并且跟第三个值（设备名称）意义相同，所以从使用角度，我使用第三个值作为键。
```
	   1       0 ram0 0 0 0 0 0 0 0 0 0 0 0
	   1       1 ram1 0 0 0 0 0 0 0 0 0 0 0
	...
	   7       0 loop0 0 0 0 0 0 0 0 0 0 0 0
	   7       1 loop1 0 0 0 0 0 0 0 0 0 0 0
	...
	   2       0 fd0 0 0 0 0 0 0 0 0 0 0 0
	   8       0 sda 5674 31 253478 4180 814 575 13304 144 0 2228 4324
	   8       1 sda1 5248 0 249834 4120 814 575 13304 144 0 2184 4264
	   8       2 sda2 2 0 4 0 0 0 0 0 0 0 0
	   8       5 sda5 243 31 2192 48 0 0 0 0 0 48 48
	  11       0 sr0 0 0 0 0 0 0 0 0 0 0 0
```
同样只做了分割字符串
```
	function proc_diskstats()
	{
		$diskstats = array();
		$count = preg_match_all('/(?<=^|[\r\n])\s+([\d]+)\s+([\d]+)\s+([\w\d]+)\s+([\d\s]+)(?=$|[\r\n])/', file_get_contents("/proc/diskstats"), $matches);
		for ($i=0; $i<$count; $i++) {
			$diskstats[$matches[3][$i]] = preg_split ('/\s+/', $matches[0][$i], 0, PREG_SPLIT_NO_EMPTY);
		}
		return $diskstats;
	}
```
### NET DEV
/proc/net/dev 这样的则比较复杂。
一般的解析脚本都认为它的字段是固定的，既然这样那我们也认为它的字段是固定的。所以思路是忽略前N行，直接取字段，一般重要的标识符号为冒号。
	function proc_net_dev()
	{
		$net_dev = array();
		$count = preg_match_all('/(?<=^|[\r\n])\s*([\w\d]+):([\d\s]+)(?=$|[\r\n])/', file_get_contents("/proc/net/dev"), $matches);
		for ($i=0; $i<$count; $i++) {
			$net_dev[$matches[1][$i]] = preg_split ('/\s+/', $matches[2][$i], 0, PREG_SPLIT_NO_EMPTY);
		}
		return $net_dev;
	}
### MOUNTS
/proc/mounts 这样的，则比较尴尬，因为它不存在类似ID的东西。
所以这里的做法就是分割成数组，注意这里使用了 PREG_SET_ORDER

```php
function proc_mounts()
{
	$mounts = array();
	$count = preg_match_all('/(?<=^|[\r\n])([\S]+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\d+)(?=$|[\r\n])/', file_get_contents("/proc/mounts"), $matches, PREG_SET_ORDER);
	for ($i=0; $i<$count; $i++) {
		array_push($mounts, array_slice($matches[$i], 1));
	}
	return $mounts;
}
```
## 总结
这些函数主要是对 /proc 下的文件进行简单的分割，代码非常省，没有做格式转换什么的，从实际应用的角度出发，应该对他们稍微加强再使用比较合适。
如可以对 proc_meminfo 进行单位转换，对 proc_net_dev 进行数据合并等等。