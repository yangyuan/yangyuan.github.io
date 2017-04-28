---
layout: post
title: （坑）Rabbit API 简要说明
---

## 命名规范
以 c 标准库为基准，但是避免缩写。
可以看出 rabbit 的基本函数命名非常不规范，从规范的角度，至少是这样的。
```
keyboard_press
system_sleep
mouse_moveto
mouse_leftclick mouse_rightclick 或者 mouse_click(int button)
```
但是从我个人认为，一个内置基础库没必要这样，类似于 print, require, echo 这些函数。所以这些常用基本函数上，都是使用单个词。
非基本函数一般遵循以下原则。
```
[prefix_]action[_target][_by_param]()
[prefix_]target_action()
```
如：
```
button_fetch_name_by_id() 或者 fetch_button_name_by_id()
window_fetch_position_by_name() 或者 get_window_position_by_name()
color_fetch_by_position 或者 fetch_pixl()
```

### 关于 fetch 和 get
一般只读的东西，使用 fetch，使用 get 的，一般也会有 set。
从 rabbit 需求的角度，大部分使用的 fetch，虽然从实现的角度可以 set，但是超出了 Rabbit 的 “模拟人的行为” 的定位。

## 基本函数
```
void sleep(uint time)
void keypress(string key)
void moveto(uint x, uint y)
void click()
void doubleclick()
void rightclick()
uint,uint findcolor(uint color, uint x, uint y, uint w, uint h, double tolerance)
// 参考 screen_search_color，这里使用find一词，主要是继承 WindowsAPI 的命名方式。
```
## 标准函数

### 键盘函数
```
void keyboard_skey_press(string skey)
void keyboard_skey_up(string skey)
void keyboard_skey_down(string skey)
void keyboard_vkey_press(uint vkey)
void keyboard_vkey_up(uint vkey)
void keyboard_vkey_down(uint vkey)
```
### 鼠标函数
```
void mouse_moveto(uint x, uint y) // 移动到指定位置
void mouse_move(int cx, int cy) // 移动（偏移值）
void mouse_button_click(uint button) // 按一次，
void mouse_button_down(uint button)
void mouse_button_up(uint button)
void mouse_scroll(int offset)
uint mouse_fetch_cursor()
```
### 屏幕查找函数
```
uint,uint screen_search_color(uint mode, uint color, uint x, uint y, uint w, uint h, double tolerance)
```

## 个别函数或者参数细节说明

### 基本函数中的 string key

符合以下情况的字符会触发相应vkey事件

	"A" - "Z"
	"F1" - "F12"
	各个美式键盘符号
	shift，return，delete，home 等美式键盘。

其他情况会触发相应的skey事件

### keyboard_key* string skey

	指定字符的键（只取第一个字符，注意文件要UTF-8编码）

### keyboard_vkey* uint vkey

参考 Virtual Key 值。
http://msdn.microsoft.com/en-us/library/windows/desktop/dd375731.aspx

### uint button

button 是一个鼠标按键ID，一个ID代表一个鼠标键。值的设计参考了 Virtual Key 值

	左键：VK_LBUTTON 0x01
	右键：VK_RBUTTON 0x02
	// 保留：0x03
	中键：VK_MBUTTON 0x04
	侧键1：VK_XBUTTON1 0x05
	侧键2：VK_XBUTTON2 0x06
	
目前只支持这几个鼠标键，其他键建议使用键盘api发起。

### screen_search_color

mode：0,由中心向四周查找第一个匹配的像素;（1,查找范围内最接近的像素，无视tolerance）。

color：按照 0x00RRGGBB的方式存放。

查找范围是默认是 (x,y)-(x+w,y+h) 的矩形。

tolerance 为 0-1 的浮点数，0代表严格，1代表宽松。0-1 的变化通常不是线性的，也不能保证为1时能匹配任意像素。

### mouse_fetch_cursor

获取的是鼠标指针图案的采样值。理论上采样值跨计算机通用，除非做了特殊设置，或者采用特殊的屏幕颜色（如256色、16位色）。

采样值相同，基本可以确认是同一个鼠标图案。
